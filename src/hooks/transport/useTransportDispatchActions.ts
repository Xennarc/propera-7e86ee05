import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { showTransportErrorToast, showTransportSuccessToast } from '@/utils/transportErrorUtils';

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

interface StaffUpdateTripResult {
  success: boolean;
  trip_id: string;
  action: 'complete' | 'cancel';
  affected_requests: number;
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
        throw { message: 'Resort ID is required', code: 'MISSING_RESORT' };
      }
      
      if (!requestIds || requestIds.length === 0) {
        throw { message: 'At least one request must be selected', code: 'NO_REQUESTS' };
      }
      
      const staffUserId = user?.id || null;
      
      const { data, error } = await supabase.rpc('rpc_transport_create_trip_from_requests', {
        p_resort_id: resortId,
        p_request_ids: requestIds,
        p_created_by_staff_id: staffUserId,
      });
      
      if (error) {
        throw { message: error.message, code: error.code };
      }
      
      // The RPC returns jsonb, which comes back as an object
      const result = data as unknown as CreateTripResult;
      
      if (!result || !result.success || !result.trip_id) {
        throw { message: 'Trip creation failed unexpectedly', code: 'UNEXPECTED_FAILURE' };
      }
      
      return result;
    },
    onSuccess: (result) => {
      showTransportSuccessToast(
        'Trip created',
        `${result.attached_request_count} request(s) added to trip`
      );
      invalidateAll();
    },
    onError: (error, variables) => {
      console.error('Create trip error:', error);
      showTransportErrorToast('Create Trip', error, {
        resortId,
        requestIds: variables.requestIds,
      });
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
        throw { message: 'Resort ID is required', code: 'MISSING_RESORT' };
      }
      
      const { data, error } = await supabase.rpc('rpc_transport_assign_trip', {
        p_resort_id: resortId,
        p_trip_id: tripId,
        p_buggy_id: buggyId,
        p_driver_user_id: driverUserId,
      });
      
      if (error) {
        throw { message: error.message, code: error.code };
      }
      
      const result = data as unknown as AssignTripResult;
      
      if (!result || !result.success) {
        throw { message: 'Assignment failed unexpectedly', code: 'UNEXPECTED_FAILURE' };
      }
      
      return result;
    },
    onSuccess: (result) => {
      showTransportSuccessToast(
        'Trip assigned',
        `${result.assigned_request_count} request(s) ready for pickup`
      );
      invalidateAll();
    },
    onError: (error, variables) => {
      console.error('Assign trip error:', error);
      showTransportErrorToast('Assign Trip', error, {
        resortId,
        tripId: variables.tripId,
        buggyId: variables.buggyId,
        driverUserId: variables.driverUserId,
      });
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
        throw { message: 'Resort ID is required', code: 'MISSING_RESORT' };
      }
      
      if (!requestIds || requestIds.length === 0) {
        throw { message: 'At least one request must be selected', code: 'NO_REQUESTS' };
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
      
      if (!result || !result.success) {
        const errorMsg = result?.error || 'Failed to attach requests';
        throw { message: errorMsg, code: 'ATTACH_FAILED' };
      }
      
      return result;
    },
    onSuccess: (result) => {
      showTransportSuccessToast(
        'Requests added',
        `${result.attached_count} request(s) added to trip`
      );
      invalidateAll();
    },
    onError: (error, variables) => {
      console.error('Attach requests error:', error);
      showTransportErrorToast('Add Requests to Trip', error, {
        resortId,
        tripId: variables.tripId,
        requestIds: variables.requestIds,
      });
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
        throw { message: 'Resort ID is required', code: 'MISSING_RESORT' };
      }
      
      const { data, error } = await supabase.rpc('rpc_transport_cancel_empty_trip', {
        p_resort_id: resortId,
        p_trip_id: tripId,
      });
      
      if (error) {
        throw { message: error.message, code: error.code };
      }
      
      const result = data as unknown as CancelTripResult;
      
      if (!result || !result.success) {
        throw { message: result?.error || 'Failed to cancel trip', code: 'CANCEL_FAILED' };
      }
      
      return result;
    },
    onSuccess: () => {
      showTransportSuccessToast('Trip cancelled', 'Empty trip has been removed');
      invalidateAll();
    },
    onError: (error, variables) => {
      console.error('Cancel trip error:', error);
      showTransportErrorToast('Cancel Trip', error, {
        resortId,
        tripId: variables.tripId,
      });
    },
  });
  
  /**
   * Staff-initiated trip completion.
   */
  const staffCompleteTrip = useMutation<
    StaffUpdateTripResult,
    RpcError,
    { tripId: string; reason?: string }
  >({
    mutationFn: async ({ tripId, reason }) => {
      if (!resortId) {
        throw { message: 'Resort ID is required', code: 'MISSING_RESORT' };
      }
      
      const { data, error } = await supabase.rpc('rpc_transport_staff_update_trip_status', {
        p_resort_id: resortId,
        p_trip_id: tripId,
        p_action: 'complete',
        p_staff_user_id: user?.id || null,
        p_reason: reason || null,
      });
      
      if (error) {
        throw { message: error.message, code: error.code };
      }
      
      const result = data as unknown as StaffUpdateTripResult;
      
      if (!result || !result.success) {
        throw { message: result?.error || 'Failed to complete trip', code: 'COMPLETE_FAILED' };
      }
      
      return result;
    },
    onSuccess: (result) => {
      showTransportSuccessToast(
        'Trip completed',
        `${result.affected_requests} request(s) marked as done`
      );
      invalidateAll();
    },
    onError: (error, variables) => {
      console.error('Staff complete trip error:', error);
      showTransportErrorToast('Complete Trip', error, {
        resortId,
        tripId: variables.tripId,
      });
    },
  });
  
  /**
   * Staff-initiated trip cancellation (returns requests to queue).
   */
  const staffCancelTrip = useMutation<
    StaffUpdateTripResult,
    RpcError,
    { tripId: string; reason?: string }
  >({
    mutationFn: async ({ tripId, reason }) => {
      if (!resortId) {
        throw { message: 'Resort ID is required', code: 'MISSING_RESORT' };
      }
      
      const { data, error } = await supabase.rpc('rpc_transport_staff_update_trip_status', {
        p_resort_id: resortId,
        p_trip_id: tripId,
        p_action: 'cancel',
        p_staff_user_id: user?.id || null,
        p_reason: reason || null,
      });
      
      if (error) {
        throw { message: error.message, code: error.code };
      }
      
      const result = data as unknown as StaffUpdateTripResult;
      
      if (!result || !result.success) {
        throw { message: result?.error || 'Failed to cancel trip', code: 'CANCEL_FAILED' };
      }
      
      return result;
    },
    onSuccess: (result) => {
      showTransportSuccessToast(
        'Trip cancelled',
        `${result.affected_requests} request(s) returned to queue`
      );
      invalidateAll();
    },
    onError: (error, variables) => {
      console.error('Staff cancel trip error:', error);
      showTransportErrorToast('Cancel Trip', error, {
        resortId,
        tripId: variables.tripId,
      });
    },
  });

  return {
    createTripFromRequests,
    assignTrip,
    attachRequestsToTrip,
    cancelEmptyTrip,
    staffCompleteTrip,
    staffCancelTrip,
    isCreatingTrip: createTripFromRequests.isPending,
    isAssigningTrip: assignTrip.isPending,
    isAttachingRequests: attachRequestsToTrip.isPending,
    isCancellingTrip: cancelEmptyTrip.isPending,
    isCompletingTrip: staffCompleteTrip.isPending,
    isStaffCancellingTrip: staffCancelTrip.isPending,
  };
}
