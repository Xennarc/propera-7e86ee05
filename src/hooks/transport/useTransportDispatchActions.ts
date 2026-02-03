import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface CreateTripResult {
  success: boolean;
  trip_id: string;
  attached_request_count: number;
}

interface AssignTripResult {
  success: boolean;
  trip_id: string;
  buggy_id: string;
  driver_user_id: string;
  assigned_request_count: number;
}

interface AttachRequestsResult {
  success: boolean;
  trip_id: string;
  attached_count: number;
  request_ids: string[];
  validation_errors?: string[];
  error?: string;
}

interface CancelTripResult {
  success: boolean;
  trip_id: string;
  error?: string;
}

interface RpcError {
  message: string;
  code?: string;
}

/**
 * Hook for atomic transport dispatch actions.
 * Wraps the new SECURITY DEFINER RPCs with proper error handling.
 */
export function useTransportDispatchActions(resortId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['transport-queue', resortId] });
    queryClient.invalidateQueries({ queryKey: ['transport-trips', resortId] });
    queryClient.invalidateQueries({ queryKey: ['buggies', resortId] });
    queryClient.invalidateQueries({ queryKey: ['buggy-drivers', resortId] });
  };
  
  /**
   * Atomic trip creation from selected requests.
   * All-or-nothing: if any request fails validation, no trip is created.
   */
  const createTripFromRequests = useMutation<
    CreateTripResult,
    RpcError,
    { requestIds: string[] }
  >({
    mutationFn: async ({ requestIds }) => {
      if (!resortId) {
        throw new Error('Resort ID is required');
      }
      
      if (!requestIds || requestIds.length === 0) {
        throw new Error('At least one request must be selected');
      }
      
      const staffUserId = user?.id || null;
      
      const { data, error } = await supabase.rpc('rpc_transport_create_trip_from_requests', {
        p_resort_id: resortId,
        p_request_ids: requestIds,
        p_created_by_staff_id: staffUserId,
      });
      
      if (error) {
        // Parse Postgres error message for user-friendly display
        let message = error.message;
        
        // Extract validation failure details if present
        if (message.includes('Validation failed')) {
          const match = message.match(/Validation failed for (\d+) request\(s\)/);
          if (match) {
            message = `Cannot create trip: ${match[1]} request(s) failed validation. They may be cancelled or already assigned.`;
          }
        } else if (message.includes('Could not acquire lock')) {
          message = 'Another operation is in progress. Please try again.';
        } else if (message.includes('not found')) {
          message = 'Some selected requests were not found. Please refresh and try again.';
        }
        
        throw { message, code: error.code };
      }
      
      // The RPC returns jsonb, which comes back as an object
      const result = data as unknown as CreateTripResult;
      
      if (!result.success) {
        throw { message: 'Trip creation failed unexpectedly' };
      }
      
      return result;
    },
    onSuccess: (result) => {
      toast.success(`Trip created with ${result.attached_request_count} request(s)`);
      invalidateAll();
    },
    onError: (error) => {
      console.error('Create trip error:', error);
      toast.error(error.message || 'Failed to create trip');
      // Requests remain visible in queue since we didn't modify them
    },
  });
  
  /**
   * Atomic trip assignment with buggy and driver.
   * Validates availability and assigns atomically.
   */
  const assignTrip = useMutation<
    AssignTripResult,
    RpcError,
    { tripId: string; buggyId: string; driverUserId: string }
  >({
    mutationFn: async ({ tripId, buggyId, driverUserId }) => {
      if (!resortId) {
        throw { message: 'Resort ID is required' };
      }
      
      const { data, error } = await supabase.rpc('rpc_transport_assign_trip', {
        p_resort_id: resortId,
        p_trip_id: tripId,
        p_buggy_id: buggyId,
        p_driver_user_id: driverUserId,
      });
      
      if (error) {
        let message = error.message;
        
        if (message.includes('not available')) {
          message = 'Buggy is no longer available. Please select another.';
        } else if (message.includes('not online')) {
          message = 'Driver is no longer online. Please select another.';
        } else if (message.includes('Could not acquire lock')) {
          message = 'Another operation is in progress. Please try again.';
        } else if (message.includes('at least one attached request')) {
          message = 'Trip must have at least one request before assigning.';
        }
        
        throw { message, code: error.code };
      }
      
      const result = data as unknown as AssignTripResult;
      
      if (!result.success) {
        throw { message: 'Assignment failed unexpectedly' };
      }
      
      return result;
    },
    onSuccess: (result) => {
      toast.success(`Trip assigned with ${result.assigned_request_count} request(s)`);
      invalidateAll();
    },
    onError: (error) => {
      console.error('Assign trip error:', error);
      toast.error(error.message || 'Failed to assign trip');
    },
  });
  
  /**
   * Atomic attach requests to existing planning trip.
   */
  const attachRequestsToTrip = useMutation<
    AttachRequestsResult,
    RpcError,
    { tripId: string; requestIds: string[] }
  >({
    mutationFn: async ({ tripId, requestIds }) => {
      if (!resortId) {
        throw { message: 'Resort ID is required' };
      }
      
      if (!requestIds || requestIds.length === 0) {
        throw { message: 'At least one request must be selected' };
      }
      
      const { data, error } = await supabase.rpc('rpc_transport_attach_requests_to_trip', {
        p_resort_id: resortId,
        p_trip_id: tripId,
        p_request_ids: requestIds,
      });
      
      if (error) {
        throw { message: error.message, code: error.code };
      }
      
      const result = data as unknown as AttachRequestsResult;
      
      if (!result.success) {
        const errorMsg = result.error || 'Failed to attach requests';
        throw { message: errorMsg };
      }
      
      return result;
    },
    onSuccess: (result) => {
      toast.success(`Added ${result.attached_count} request(s) to trip`);
      invalidateAll();
    },
    onError: (error) => {
      console.error('Attach requests error:', error);
      toast.error(error.message || 'Failed to add requests to trip');
    },
  });
  
  /**
   * Cancel an empty planning trip.
   */
  const cancelEmptyTrip = useMutation<
    CancelTripResult,
    RpcError,
    { tripId: string }
  >({
    mutationFn: async ({ tripId }) => {
      if (!resortId) {
        throw { message: 'Resort ID is required' };
      }
      
      const { data, error } = await supabase.rpc('rpc_transport_cancel_empty_trip', {
        p_resort_id: resortId,
        p_trip_id: tripId,
      });
      
      if (error) {
        throw { message: error.message, code: error.code };
      }
      
      const result = data as unknown as CancelTripResult;
      
      if (!result.success) {
        throw { message: result.error || 'Failed to cancel trip' };
      }
      
      return result;
    },
    onSuccess: () => {
      toast.success('Empty trip cancelled');
      invalidateAll();
    },
    onError: (error) => {
      console.error('Cancel trip error:', error);
      toast.error(error.message || 'Failed to cancel trip');
    },
  });
  
  return {
    createTripFromRequests,
    assignTrip,
    attachRequestsToTrip,
    cancelEmptyTrip,
    isCreatingTrip: createTripFromRequests.isPending,
    isAssigningTrip: assignTrip.isPending,
    isAttachingRequests: attachRequestsToTrip.isPending,
    isCancellingTrip: cancelEmptyTrip.isPending,
  };
}
