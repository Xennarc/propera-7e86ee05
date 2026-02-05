import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StopLatLng {
  lat: number;
  lng: number;
}

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
  // Original derived fields
  stop_name: string | null;
  guest_name: string | null;
  room_number: string | null;
  // New additive fields
  stop_zone: string | null;
  stop_lat: number | null;
  stop_lng: number | null;
  stopLatLng: StopLatLng | null;
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
  // Original derived fields
  guest_name: string | null;
  room_number: string | null;
  priority: string;
  pickup_name: string | null;
  dropoff_name: string | null;
  // New additive fields
  notes: string | null;
  pickup_text: string | null;
  dropoff_text: string | null;
  scheduled_for: string | null;
  eta_minutes: number | null;
}

/**
 * Parse location data to extract lat/lng coordinates.
 * Handles various formats: {lat, lng}, {latitude, longitude}, GeoJSON Point.
 */
function parseLocationToLatLng(location: unknown): StopLatLng | null {
  if (!location || typeof location !== 'object') return null;

  const loc = location as Record<string, unknown>;

  // Handle {lat, lng} format
  if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
    return { lat: loc.lat, lng: loc.lng };
  }

  // Handle {latitude, longitude} format
  if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
    return { lat: loc.latitude, lng: loc.longitude };
  }

  // Handle GeoJSON Point format: { type: "Point", coordinates: [lng, lat] }
  if (loc.type === 'Point' && Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
    const [lng, lat] = loc.coordinates as number[];
    if (typeof lat === 'number' && typeof lng === 'number') {
      return { lat, lng };
    }
  }

  return null;
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
          stop:buggy_stops(name, zone, lat, lng),
          related_request:buggy_requests(
            guest:guests(full_name, room_number)
          )
        `)
        .eq('trip_id', tripId)
        .order('sequence', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(stop => {
        const stopData = stop.stop as any;
        const stopLat = stopData?.lat ?? null;
        const stopLng = stopData?.lng ?? null;
        
        // Try to get coordinates from stop, fallback to trip_stop location field
        let stopLatLng: StopLatLng | null = null;
        if (typeof stopLat === 'number' && typeof stopLng === 'number') {
          stopLatLng = { lat: stopLat, lng: stopLng };
        } else {
          stopLatLng = parseLocationToLatLng(stop.location);
        }

        return {
          ...stop,
          // Original fields (unchanged)
          stop_name: stopData?.name || stop.title || null,
          guest_name: (stop.related_request as any)?.guest?.full_name || null,
          room_number: (stop.related_request as any)?.guest?.room_number || null,
          // New additive fields
          stop_zone: stopData?.zone || null,
          stop_lat: stopLat,
          stop_lng: stopLng,
          stopLatLng,
        };
      }) as TripStopWithDetails[];
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
            notes,
            scheduled_for,
            eta_minutes,
            party_size,
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
          // Original fields (unchanged)
          guest_name: req?.guest?.full_name || null,
          room_number: req?.guest?.room_number || null,
          priority: req?.priority || 'normal',
          pickup_name: req?.pickup_stop?.name || req?.pickup_text || null,
          dropoff_name: req?.dropoff_stop?.name || req?.dropoff_text || null,
          // New additive fields
          notes: req?.notes || null,
          pickup_text: req?.pickup_text || null,
          dropoff_text: req?.dropoff_text || null,
          scheduled_for: req?.scheduled_for || null,
          eta_minutes: req?.eta_minutes ?? null,
        };
      }) as TripRequestWithDetails[];
    },
    enabled: !!tripId,
  });
}
