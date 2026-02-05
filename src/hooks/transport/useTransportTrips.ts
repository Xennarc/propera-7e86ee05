import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BuggyTripStatus } from '@/types/database';

export interface TransportTrip {
  id: string;
  resort_id: string;
  trip_type: string;
  status: string;
  buggy_id: string | null;
  driver_user_id: string | null;
  capacity_total: number | null;
  start_at: string | null;
  end_at: string | null;
  notes: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
  buggy_name: string | null;
  buggy_capacity: number | null;
  driver_name: string | null;
  request_count: number;
  total_party_size: number;
  trip_requests: TripRequestSummary[];
}

export interface TripRequestSummary {
  id: string;
  party_size: number;
  state: string;
  request: {
    id: string;
    priority: string;
    pickup_text: string | null;
    dropoff_text: string | null;
    guest_name: string | null;
    room_number: string | null;
    pickup_stop_name: string | null;
    dropoff_stop_name: string | null;
  } | null;
}

const ACTIVE_TRIP_STATUSES: BuggyTripStatus[] = [
  'planning',
  'assigned',
  'en_route',
  'active',
];

export function useTransportTrips(resortId: string | undefined) {
  return useQuery({
    queryKey: ['transport-trips', resortId],
    queryFn: async () => {
      if (!resortId) return [];
      
      const { data, error } = await supabase
        .from('buggy_trips')
        .select(`
          *,
          buggy:buggies(id, name, capacity, is_accessible, status),
          trip_requests:buggy_trip_requests(
            id,
            party_size,
            state,
            request:buggy_requests(
              id,
              priority,
              pickup_text,
              dropoff_text,
              guest:guests(full_name, room_number),
              pickup_stop:buggy_stops!buggy_requests_pickup_stop_id_fkey(name),
              dropoff_stop:buggy_stops!buggy_requests_dropoff_stop_id_fkey(name)
            )
          )
        `)
        .eq('resort_id', resortId)
        .in('status', ACTIVE_TRIP_STATUSES)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform to calculate totals
      return (data || []).map(trip => {
        const tripReqs = (trip.trip_requests || []) as any[];
        const activeRequests = tripReqs.filter(
          tr => tr.state === 'queued' || tr.state === 'picked_up'
        );
        
        const mappedRequests: TripRequestSummary[] = tripReqs.map(tr => ({
          id: tr.id,
          party_size: tr.party_size,
          state: tr.state,
          request: tr.request ? {
            id: tr.request.id,
            priority: tr.request.priority,
            pickup_text: tr.request.pickup_text,
            dropoff_text: tr.request.dropoff_text,
            guest_name: tr.request.guest?.full_name || null,
            room_number: tr.request.guest?.room_number || null,
            pickup_stop_name: tr.request.pickup_stop?.name || null,
            dropoff_stop_name: tr.request.dropoff_stop?.name || null,
          } : null,
        }));
        
        return {
          ...trip,
          buggy_name: (trip.buggy as any)?.name || null,
          buggy_capacity: (trip.buggy as any)?.capacity || null,
          driver_name: null, // Will be populated from profiles if needed
          request_count: activeRequests.length,
          total_party_size: activeRequests.reduce(
            (sum, tr) => sum + (tr.party_size || 0),
            0
          ),
          trip_requests: mappedRequests,
        } as TransportTrip;
      });
    },
    enabled: !!resortId,
    refetchInterval: 10000,
  });
}

/**
 * Fetch recently completed trips (last 24 hours) for staff visibility
 */
export function useCompletedTrips(resortId: string | undefined) {
  return useQuery({
    queryKey: ['transport-trips', resortId],
    queryFn: async () => {
      if (!resortId) return [];
      
      const { data, error } = await supabase
        .from('buggy_trips')
        .select(`
          *,
          buggy:buggies(id, name, capacity, is_accessible, status),
          trip_requests:buggy_trip_requests(
            id,
            party_size,
            state,
            request:buggy_requests(
              id,
              priority,
              pickup_text,
              dropoff_text,
              guest:guests(full_name, room_number),
              pickup_stop:buggy_stops!buggy_requests_pickup_stop_id_fkey(name),
              dropoff_stop:buggy_stops!buggy_requests_dropoff_stop_id_fkey(name)
            )
          )
        `)
        .eq('resort_id', resortId)
        .in('status', ACTIVE_TRIP_STATUSES)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform to calculate totals
      return (data || []).map(trip => {
        const tripReqs = (trip.trip_requests || []) as any[];
        const activeRequests = tripReqs.filter(
          tr => tr.state === 'queued' || tr.state === 'picked_up'
        );
        
        const mappedRequests: TripRequestSummary[] = tripReqs.map(tr => ({
          id: tr.id,
          party_size: tr.party_size,
          state: tr.state,
          request: tr.request ? {
            id: tr.request.id,
            priority: tr.request.priority,
            pickup_text: tr.request.pickup_text,
            dropoff_text: tr.request.dropoff_text,
            guest_name: tr.request.guest?.full_name || null,
            room_number: tr.request.guest?.room_number || null,
            pickup_stop_name: tr.request.pickup_stop?.name || null,
            dropoff_stop_name: tr.request.dropoff_stop?.name || null,
          } : null,
        }));
        
        return {
          ...trip,
          buggy_name: (trip.buggy as any)?.name || null,
          buggy_capacity: (trip.buggy as any)?.capacity || null,
          driver_name: null, // Will be populated from profiles if needed
          request_count: activeRequests.length,
          total_party_size: activeRequests.reduce(
            (sum, tr) => sum + (tr.party_size || 0),
            0
          ),
          trip_requests: mappedRequests,
        } as TransportTrip;
      });
    },
    enabled: !!resortId,
    refetchInterval: 10000,
  });
}
