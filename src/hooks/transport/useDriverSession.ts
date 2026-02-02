import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type DriverStatus = 'online' | 'offline' | 'on_trip' | 'break';

export interface DriverSession {
  id: string;
  resort_id: string;
  user_id: string;
  status: DriverStatus;
  assigned_buggy_id: string | null;
  last_seen_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined data
  assigned_buggy?: {
    id: string;
    name: string;
    capacity: number;
    status: string;
  } | null;
}

export function useDriverSession(resortId: string | undefined) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['driver-session', resortId, userId],
    queryFn: async (): Promise<DriverSession | null> => {
      if (!resortId || !userId) return null;

      // Query buggy_drivers with type assertion since table types might not be updated
      const { data, error } = await supabase
        .from('buggy_drivers')
        .select(`
          *,
          assigned_buggy:buggies(id, name, capacity, status)
        `)
        .eq('resort_id', resortId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching driver session:', error);
        throw error;
      }

      if (!data) return null;

      return {
        ...data,
        status: data.status as DriverStatus,
        metadata: (data.metadata as Record<string, unknown>) || {},
        assigned_buggy: data.assigned_buggy as DriverSession['assigned_buggy'],
      };
    },
    enabled: !!resortId && !!userId,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function useDriverStatusMutation(resortId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (newStatus: DriverStatus) => {
      if (!resortId || !user?.id) throw new Error('No session');

      // Call the atomic RPC
      const { data, error } = await (supabase.rpc as Function)(
        'driver_set_status_atomic',
        { _new_status: newStatus }
      );

      if (error) throw error;

      const result = data as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error || 'Failed to update status');

      return newStatus;
    },
    onMutate: async (newStatus) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['driver-session', resortId, user?.id] });
      
      const previous = queryClient.getQueryData<DriverSession>(['driver-session', resortId, user?.id]);
      
      if (previous) {
        queryClient.setQueryData(['driver-session', resortId, user?.id], {
          ...previous,
          status: newStatus,
          last_seen_at: new Date().toISOString(),
        });
      }

      return { previous };
    },
    onSuccess: (newStatus) => {
      const statusLabels: Record<DriverStatus, string> = {
        online: 'You are now Online',
        offline: 'You are now Offline',
        on_trip: 'You are now On Trip',
        break: 'You are now on Break',
      };
      toast.success(statusLabels[newStatus]);
    },
    onError: (error: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['driver-session', resortId, user?.id], context.previous);
      }
      toast.error(error.message || 'Failed to update status');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-session', resortId, user?.id] });
    },
  });
}

export function useDriverTrips(resortId: string | undefined) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['driver-trips', resortId, userId],
    queryFn: async () => {
      if (!resortId || !userId) return [];

      // Get trips assigned to this driver that are not completed/cancelled
      const { data, error } = await supabase
        .from('buggy_trips')
        .select(`
          *,
          buggy:buggies(id, name, capacity),
          trip_requests:buggy_trip_requests(
            id,
            party_size,
            state,
            request:buggy_requests(
              id,
              priority,
              pickup_text,
              dropoff_text,
              guest:guests(full_name, room_number)
            )
          ),
          trip_stops:buggy_trip_stops(
            id,
            sequence,
            stop_kind,
            status,
            title,
            stop:buggy_stops(name)
          )
        `)
        .eq('resort_id', resortId)
        .eq('driver_user_id', userId)
        .in('status', ['assigned', 'en_route', 'active'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching driver trips:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!resortId && !!userId,
    staleTime: 10_000,
    refetchInterval: 10_000,
  });
}

// Mutation to start a trip
export function useStartTripMutation(resortId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tripId: string) => {
      const { data, error } = await (supabase.rpc as Function)(
        'driver_start_trip_atomic',
        { _trip_id: tripId }
      );

      if (error) throw error;

      const result = data as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error || 'Failed to start trip');

      return tripId;
    },
    onSuccess: () => {
      toast.success('Trip started');
      queryClient.invalidateQueries({ queryKey: ['driver-trips', resortId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['driver-session', resortId, user?.id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to start trip');
    },
  });
}

// Mutation to complete a trip
export function useCompleteTripMutation(resortId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tripId: string) => {
      const { data, error } = await (supabase.rpc as Function)(
        'driver_complete_trip_atomic',
        { _trip_id: tripId }
      );

      if (error) throw error;

      const result = data as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error || 'Failed to complete trip');

      return tripId;
    },
    onSuccess: () => {
      toast.success('Trip completed');
      queryClient.invalidateQueries({ queryKey: ['driver-trips', resortId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['driver-session', resortId, user?.id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete trip');
    },
  });
}

// Mutation to update a stop status
export function useUpdateStopStatusMutation(resortId: string | undefined, tripId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ stopId, newStatus }: { stopId: string; newStatus: string }) => {
      const { data, error } = await (supabase.rpc as Function)(
        'driver_update_trip_stop_status',
        { 
          _trip_stop_id: stopId,
          _new_status: newStatus,
        }
      );

      if (error) throw error;

      const result = data as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error || 'Failed to update stop');

      return { stopId, newStatus };
    },
    onSuccess: ({ newStatus }) => {
      const labels: Record<string, string> = {
        arrived: 'Marked as arrived',
        completed: 'Stop completed',
        skipped: 'Stop skipped',
      };
      toast.success(labels[newStatus] || 'Stop updated');
      queryClient.invalidateQueries({ queryKey: ['driver-trips', resortId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['trip-stops', tripId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update stop');
    },
  });
}
