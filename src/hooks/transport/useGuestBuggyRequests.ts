import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BuggyRequestStatus, BuggyRequestType, BuggyPriority } from '@/types/database';
import { toast } from 'sonner';

// Local interface matching the query shape (not extending BuggyRequest to avoid type conflicts)
export interface GuestBuggyRequest {
  id: string;
  resort_id: string;
  guest_id: string | null;
  request_source: string;
  request_type: BuggyRequestType;
  party_size: number;
  needs_accessible: boolean;
  pickup_stop_id: string | null;
  pickup_text: string | null;
  dropoff_stop_id: string | null;
  dropoff_text: string | null;
  scheduled_for: string | null;
  route_id: string | null;
  priority: BuggyPriority;
  status: BuggyRequestStatus;
  status_reason: string | null;
  eta_minutes: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  pickup_stop?: { id: string; name: string; zone: string | null } | null;
  dropoff_stop?: { id: string; name: string; zone: string | null } | null;
}

export function useGuestBuggyRequests(guestId: string | undefined, resortId: string | undefined) {
  return useQuery({
    queryKey: ['guest-buggy-requests', guestId],
    queryFn: async () => {
      if (!guestId || !resortId) return [];
      
      const { data, error } = await supabase
        .from('buggy_requests')
        .select(`
          id, resort_id, guest_id, request_source, request_type, party_size,
          needs_accessible, pickup_stop_id, pickup_text, dropoff_stop_id, dropoff_text,
          scheduled_for, route_id, priority, status, status_reason, eta_minutes,
          created_at, updated_at,
          pickup_stop:buggy_stops!buggy_requests_pickup_stop_id_fkey(id, name, zone),
          dropoff_stop:buggy_stops!buggy_requests_dropoff_stop_id_fkey(id, name, zone)
        `)
        .eq('guest_id', guestId)
        .eq('resort_id', resortId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as GuestBuggyRequest[];
    },
    enabled: !!guestId && !!resortId,
    staleTime: 10000,
    refetchInterval: 30000, // Poll every 30s for status updates (Phase 6 will add realtime)
  });
}

export function useActiveGuestRide(guestId: string | undefined, resortId: string | undefined) {
  const { data: requests, isLoading } = useGuestBuggyRequests(guestId, resortId);
  
  // Find the active ride (not completed/cancelled/failed/no_show)
  const activeStatuses: BuggyRequestStatus[] = [
    'requested', 'queued', 'assigned_to_trip', 'driver_en_route', 'arrived', 'picked_up'
  ];
  
  const activeRide = requests?.find(r => activeStatuses.includes(r.status));
  
  return { activeRide, isLoading };
}

interface CreateBuggyRequestParams {
  resortId: string;
  guestId: string;
  requestType: BuggyRequestType;
  partySize: number;
  pickupStopId?: string | null;
  pickupText?: string | null;
  dropoffStopId?: string | null;
  dropoffText?: string | null;
  scheduledFor?: string | null;
  routeId?: string | null;
  needsAccessible: boolean;
}

export function useCreateBuggyRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: CreateBuggyRequestParams) => {
      // Generate client-side idempotency key
      const idempotencyKey = `guest_${params.guestId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      
      const { data, error } = await supabase.rpc('create_buggy_request_idempotent', {
        _resort_id: params.resortId,
        _guest_id: params.guestId,
        _created_by_staff_user_id: null,
        _request_source: 'guest',
        _request_type: params.requestType,
        _party_size: params.partySize,
        _pickup_stop_id: params.pickupStopId || null,
        _pickup_text: params.pickupText || null,
        _pickup_location: null,
        _dropoff_stop_id: params.dropoffStopId || null,
        _dropoff_text: params.dropoffText || null,
        _dropoff_location: null,
        _scheduled_for: params.scheduledFor || null,
        _route_id: params.routeId || null,
        _priority: 'normal' as BuggyPriority,
        _needs_accessible: params.needsAccessible,
        _idempotency_key: idempotencyKey,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['guest-buggy-requests', params.guestId] });
      toast.success('Ride requested successfully!');
    },
    onError: (error: Error) => {
      console.error('Failed to create buggy request:', error);
      toast.error(error.message || 'Failed to request ride');
    },
  });
}

export function useCancelBuggyRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      requestId, 
      guestId, 
      resortId,
      reason 
    }: { 
      requestId: string; 
      guestId: string; 
      resortId: string;
      reason?: string;
    }) => {
      // Use new atomic RPC with reconciliation
      const { data, error } = await supabase.rpc('rpc_transport_cancel_request', {
        p_resort_id: resortId,
        p_request_id: requestId,
        p_actor_type: 'guest',
        p_actor_id: guestId,
        p_reason: reason || 'Cancelled by guest',
      });
      
      if (error) {
        let message = error.message;
        
        if (message.includes('Cannot cancel a completed request')) {
          message = 'This ride has already been completed.';
        } else if (message.includes('Could not acquire lock')) {
          message = 'Please try again in a moment.';
        }
        
        throw new Error(message);
      }
      
      return data;
    },
    onSuccess: (result, { guestId }) => {
      queryClient.invalidateQueries({ queryKey: ['guest-buggy-requests', guestId] });
      
      const data = result as { already_cancelled?: boolean };
      if (data?.already_cancelled) {
        toast.info('Ride was already cancelled');
      } else {
        toast.success('Ride cancelled');
      }
    },
    onError: (error: Error) => {
      console.error('Failed to cancel ride:', error);
      toast.error(error.message || 'Failed to cancel ride');
    },
  });
}

// Get stops grouped by zone for the picker
export function useGuestTransportStops(resortId: string | undefined) {
  return useQuery({
    queryKey: ['guest-transport-stops', resortId],
    queryFn: async () => {
      if (!resortId) return [];
      
      const { data, error } = await supabase
        .from('buggy_stops')
        .select('id, name, zone, sort_order')
        .eq('resort_id', resortId)
        .eq('is_active', true)
        .order('zone', { ascending: true, nullsFirst: true })
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!resortId,
  });
}

// Get active routes for fixed-route mode
export function useGuestTransportRoutes(resortId: string | undefined) {
  return useQuery({
    queryKey: ['guest-transport-routes', resortId],
    queryFn: async () => {
      if (!resortId) return [];
      
      const { data, error } = await supabase
        .from('buggy_routes')
        .select(`
          id, name, color_tag,
          route_stops:buggy_route_stops(
            id, sort_order,
            stop:buggy_stops(id, name)
          )
        `)
        .eq('resort_id', resortId)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      
      // Sort stops by sort_order
      return (data || []).map(route => ({
        ...route,
        route_stops: (route.route_stops || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      }));
    },
    enabled: !!resortId,
  });
}
