import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TripStopWithDetails {
  id: string;
  resort_id: string;
  trip_id: string;
  stop_kind: string;
  stop_id: string | null;
  title: string | null;
  location: unknown;
  sequence: number;
  related_request_id: string | null;
  status: string;
  arrived_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  stop_name: string | null;
  guest_name: string | null;
  room_number: string | null;
}

export interface TripRequestWithDetails {
  id: string;
  resort_id: string;
  trip_id: string;
  request_id: string;
  party_size: number;
  state: string;
  created_at: string;
  updated_at: string;
  guest_name: string | null;
  room_number: string | null;
  priority: string;
  pickup_name: string | null;
  dropoff_name: string | null;
}

export function useTripStops(tripId: string | undefined) {
  return useQuery({
    queryKey: ['trip-stops', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      
      const { data, error } = await supabase
        .from('buggy_trip_stops')
        .select(`
          *,
          stop:buggy_stops(name),
          related_request:buggy_requests(
            guest:guests(full_name, room_number)
          )
        `)
        .eq('trip_id', tripId)
        .order('sequence', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(stop => ({
        ...stop,
        stop_name: (stop.stop as any)?.name || stop.title || null,
        guest_name: (stop.related_request as any)?.guest?.full_name || null,
        room_number: (stop.related_request as any)?.guest?.room_number || null,
      })) as TripStopWithDetails[];
    },
    enabled: !!tripId,
  });
}

export function useTripRequests(tripId: string | undefined) {
  return useQuery({
    queryKey: ['trip-requests', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      
      const { data, error } = await supabase
        .from('buggy_trip_requests')
        .select(`
          *,
          request:buggy_requests(
            id,
            priority,
            pickup_text,
            dropoff_text,
            guest:guests(full_name, room_number),
            pickup_stop:buggy_stops!buggy_requests_pickup_stop_id_fkey(name),
            dropoff_stop:buggy_stops!buggy_requests_dropoff_stop_id_fkey(name)
          )
        `)
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(tr => {
        const req = tr.request as any;
        return {
          ...tr,
          guest_name: req?.guest?.full_name || null,
          room_number: req?.guest?.room_number || null,
          priority: req?.priority || 'normal',
          pickup_name: req?.pickup_stop?.name || req?.pickup_text || null,
          dropoff_name: req?.dropoff_stop?.name || req?.dropoff_text || null,
        };
      }) as TripRequestWithDetails[];
    },
    enabled: !!tripId,
  });
}
