import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface CreateTripResult {
  success: boolean;
  trip_id: string;
  attached_request_count: number;
}

interface CreateTripError {
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
    CreateTripError,
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
      const result = data as CreateTripResult;
      
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
  
  return {
    createTripFromRequests,
    isCreatingTrip: createTripFromRequests.isPending,
  };
}
