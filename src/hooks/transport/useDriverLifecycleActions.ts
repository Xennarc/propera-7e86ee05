import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type TripLifecycleState = 
  | 'assigned'
  | 'enroute_to_pickup'
  | 'arrived_pickup'
  | 'enroute_to_dropoff'
  | 'completed';

interface StateTransitionResult {
  success: boolean;
  trip_id: string;
  previous_state: string;
  current_state: string;
}

interface RpcError {
  message: string;
  code?: string;
}

// Human-friendly labels for states
export const LIFECYCLE_STATE_LABELS: Record<TripLifecycleState, string> = {
  assigned: 'Assigned',
  enroute_to_pickup: 'En Route to Pickup',
  arrived_pickup: 'Arrived at Pickup',
  enroute_to_dropoff: 'En Route to Dropoff',
  completed: 'Completed',
};

// Next action labels for each state
export const NEXT_ACTION_LABELS: Record<TripLifecycleState, string | null> = {
  assigned: 'Start Trip',
  enroute_to_pickup: 'Arrived at Pickup',
  arrived_pickup: 'Passengers Picked Up',
  enroute_to_dropoff: 'Complete Trip',
  completed: null,
};

// Get valid next state
export function getNextState(current: TripLifecycleState): TripLifecycleState | null {
  const transitions: Record<TripLifecycleState, TripLifecycleState | null> = {
    assigned: 'enroute_to_pickup',
    enroute_to_pickup: 'arrived_pickup',
    arrived_pickup: 'enroute_to_dropoff',
    enroute_to_dropoff: 'completed',
    completed: null,
  };
  return transitions[current];
}

/**
 * Normalize database lifecycle_state / status values to canonical TripLifecycleState.
 * Handles legacy values like 'en_route' and 'active' from the buggy_trip_status enum.
 */
export function normalizeLifecycleState(
  lifecycleState: string | null | undefined,
  tripStatus: string
): TripLifecycleState {
  const state = (lifecycleState || tripStatus || '').toLowerCase();
  switch (state) {
    case 'assigned':
      return 'assigned';
    case 'enroute_to_pickup':
      return 'enroute_to_pickup';
    case 'en_route':
      return 'enroute_to_pickup'; // legacy mapping
    case 'arrived_pickup':
      return 'arrived_pickup';
    case 'active':
      return 'enroute_to_dropoff'; // legacy mapping
    case 'enroute_to_dropoff':
      return 'enroute_to_dropoff';
    case 'completed':
      return 'completed';
    case 'planning':
      return 'assigned'; // planning = not yet started
    default:
      return 'assigned';
  }
}

/**
 * Hook for driver trip lifecycle state transitions.
 * Uses the new atomic RPC with state machine validation.
 */
export function useDriverLifecycleActions(resortId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const invalidateDriverData = () => {
    queryClient.invalidateQueries({ queryKey: ['driver-trips', resortId, user?.id] });
    queryClient.invalidateQueries({ queryKey: ['driver-session', resortId, user?.id] });
    queryClient.invalidateQueries({ queryKey: ['transport-trips', resortId] });
  };
  
  /**
   * Transition trip to next lifecycle state.
   */
  const updateTripState = useMutation<
    StateTransitionResult,
    RpcError,
    { tripId: string; nextState: TripLifecycleState }
  >({
    mutationFn: async ({ tripId, nextState }) => {
      if (!resortId) throw { message: 'Resort ID is required' };
      if (!user?.id) throw { message: 'Driver must be logged in' };
      
      const { data, error } = await supabase.rpc('rpc_transport_driver_update_trip_state', {
        p_resort_id: resortId,
        p_trip_id: tripId,
        p_driver_user_id: user.id,
        p_next_state: nextState,
      });
      
      if (error) {
        let message = error.message;
        
        if (message.includes('Invalid state transition')) {
          message = 'This action is not available right now. Please refresh.';
        } else if (message.includes('not assigned to this driver')) {
          message = 'This trip is not assigned to you.';
        } else if (message.includes('Could not acquire lock')) {
          message = 'Another operation is in progress. Please try again.';
        }
        
        throw { message, code: error.code };
      }
      
      const result = data as unknown as StateTransitionResult;
      
      if (!result.success) {
        throw { message: 'State transition failed unexpectedly' };
      }
      
      return result;
    },
    onSuccess: (result) => {
      const label = LIFECYCLE_STATE_LABELS[result.current_state as TripLifecycleState] || result.current_state;
      
      if (result.current_state === 'completed') {
        toast.success('Trip completed! Great job.');
      } else {
        toast.success(`Trip updated: ${label}`);
      }
      
      invalidateDriverData();
    },
    onError: (error) => {
      console.error('Trip state transition error:', error);
      toast.error(error.message || 'Failed to update trip');
    },
  });
  
  /**
   * Convenience method to advance to the next state.
   */
  const advanceToNextState = (tripId: string, currentState: TripLifecycleState) => {
    const nextState = getNextState(currentState);
    if (!nextState) {
      toast.error('No next state available');
      return;
    }
    updateTripState.mutate({ tripId, nextState });
  };
  
  return {
    updateTripState,
    advanceToNextState,
    isUpdating: updateTripState.isPending,
  };
}
