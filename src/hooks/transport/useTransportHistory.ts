import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays } from 'date-fns';

// Filter state type
export interface TransportHistoryFilters {
  dateRange: { from: Date; to: Date };
  status?: string;
  isVip?: boolean;
  zoneId?: string;
  driverId?: string;
  buggyId?: string;
  searchQuery?: string;
}

// Request history row
export interface RequestHistoryRow {
  id: string;
  resort_id: string;
  guest_id: string | null;
  request_type: string;
  request_source: string;
  status: string;
  priority: string;
  party_size: number;
  pickup_text: string | null;
  dropoff_text: string | null;
  pickup_stop_id: string | null;
  dropoff_stop_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  // Joined data
  guest_name: string | null;
  room_number: string | null;
  pickup_stop_name: string | null;
  dropoff_stop_name: string | null;
  pickup_zone: string | null;
  dropoff_zone: string | null;
}

// Trip history row
export interface TripHistoryRow {
  id: string;
  resort_id: string;
  trip_type: string;
  status: string;
  buggy_id: string | null;
  driver_user_id: string | null;
  start_at: string | null;
  end_at: string | null;
  capacity_total: number | null;
  created_at: string;
  updated_at: string;
  // Joined data
  buggy_name: string | null;
  driver_name: string | null;
  request_count: number;
  stop_count: number;
}

// Request event row
export interface RequestEventRow {
  id: string;
  request_id: string;
  resort_id: string;
  actor_type: string;
  actor_user_id: string | null;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

// Trip event row
export interface TripEventRow {
  id: string;
  trip_id: string;
  resort_id: string;
  actor_type: string;
  actor_user_id: string | null;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

// Default filters - last 7 days
export function getDefaultHistoryFilters(): TransportHistoryFilters {
  return {
    dateRange: {
      from: subDays(new Date(), 7),
      to: new Date(),
    },
  };
}

// Hook for request history
export function useRequestHistory(resortId: string | undefined, filters: TransportHistoryFilters) {
  return useQuery({
    queryKey: ['request-history', resortId, filters],
    queryFn: async () => {
      if (!resortId) return [];
      
      // Terminal statuses for history
      const terminalStatuses: Array<'completed' | 'cancelled' | 'no_show'> = ['completed', 'cancelled', 'no_show'];
      
      let query = supabase
        .from('buggy_requests')
        .select(`
          *,
          guest:guests(full_name, room_number),
          pickup_stop:buggy_stops!buggy_requests_pickup_stop_id_fkey(name, zone),
          dropoff_stop:buggy_stops!buggy_requests_dropoff_stop_id_fkey(name, zone)
        `)
        .eq('resort_id', resortId)
        .in('status', terminalStatuses)
        .gte('created_at', startOfDay(filters.dateRange.from).toISOString())
        .lte('created_at', endOfDay(filters.dateRange.to).toISOString())
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (filters.status) {
        query = query.eq('status', filters.status as 'completed' | 'cancelled' | 'no_show');
      }
      
      if (filters.isVip) {
        query = query.eq('priority', 'vip');
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map((r): RequestHistoryRow => ({
        id: r.id,
        resort_id: r.resort_id,
        guest_id: r.guest_id,
        request_type: r.request_type,
        request_source: r.request_source,
        status: r.status,
        priority: r.priority,
        party_size: r.party_size,
        pickup_text: r.pickup_text,
        dropoff_text: r.dropoff_text,
        pickup_stop_id: r.pickup_stop_id,
        dropoff_stop_id: r.dropoff_stop_id,
        created_at: r.created_at,
        updated_at: r.updated_at,
        archived_at: r.archived_at,
        guest_name: (r.guest as any)?.full_name || null,
        room_number: (r.guest as any)?.room_number || null,
        pickup_stop_name: (r.pickup_stop as any)?.name || null,
        dropoff_stop_name: (r.dropoff_stop as any)?.name || null,
        pickup_zone: (r.pickup_stop as any)?.zone || null,
        dropoff_zone: (r.dropoff_stop as any)?.zone || null,
      })).filter(r => {
        // Client-side zone filter
        if (filters.zoneId) {
          const matchesZone = r.pickup_zone === filters.zoneId || r.dropoff_zone === filters.zoneId;
          if (!matchesZone) return false;
        }
        // Client-side search
        if (filters.searchQuery) {
          const q = filters.searchQuery.toLowerCase();
          const searchableText = [
            r.guest_name,
            r.room_number,
            r.pickup_stop_name,
            r.dropoff_stop_name,
            r.pickup_text,
            r.dropoff_text,
          ].filter(Boolean).join(' ').toLowerCase();
          if (!searchableText.includes(q)) return false;
        }
        return true;
      });
    },
    enabled: !!resortId,
  });
}

// Hook for trip history
export function useTripHistory(resortId: string | undefined, filters: TransportHistoryFilters) {
  return useQuery({
    queryKey: ['trip-history', resortId, filters],
    queryFn: async () => {
      if (!resortId) return [];
      
      let query = supabase
        .from('buggy_trips')
        .select(`
          *,
          buggy:buggies(name),
          driver:buggy_drivers!buggy_trips_driver_user_id_fkey(
            user:profiles(full_name)
          ),
          trip_requests:buggy_trip_requests(id),
          trip_stops:buggy_trip_stops(id)
        `)
        .eq('resort_id', resortId)
        .eq('status', 'completed')
        .gte('created_at', startOfDay(filters.dateRange.from).toISOString())
        .lte('created_at', endOfDay(filters.dateRange.to).toISOString())
        .order('end_at', { ascending: false, nullsFirst: false })
        .limit(100);
      
      if (filters.buggyId) {
        query = query.eq('buggy_id', filters.buggyId);
      }
      
      if (filters.driverId) {
        query = query.eq('driver_user_id', filters.driverId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map((t): TripHistoryRow => ({
        id: t.id,
        resort_id: t.resort_id,
        trip_type: t.trip_type,
        status: t.status,
        buggy_id: t.buggy_id,
        driver_user_id: t.driver_user_id,
        start_at: t.start_at,
        end_at: t.end_at,
        capacity_total: t.capacity_total,
        created_at: t.created_at,
        updated_at: t.updated_at,
        buggy_name: (t.buggy as any)?.name || null,
        driver_name: (t.driver as any)?.user?.full_name || null,
        request_count: Array.isArray(t.trip_requests) ? t.trip_requests.length : 0,
        stop_count: Array.isArray(t.trip_stops) ? t.trip_stops.length : 0,
      }));
    },
    enabled: !!resortId,
  });
}

// Hook for request events
export function useRequestEvents(requestId: string | undefined) {
  return useQuery({
    queryKey: ['request-events', requestId],
    queryFn: async () => {
      if (!requestId) return [];
      
      const { data, error } = await supabase
        .from('buggy_request_events')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as RequestEventRow[];
    },
    enabled: !!requestId,
  });
}

// Hook for trip events
export function useTripEvents(tripId: string | undefined) {
  return useQuery({
    queryKey: ['trip-events', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      
      const { data, error } = await supabase
        .from('buggy_trip_events')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as TripEventRow[];
    },
    enabled: !!tripId,
  });
}

// Hook for unique zones (for filter dropdown)
export function useTransportZones(resortId: string | undefined) {
  return useQuery({
    queryKey: ['transport-zones', resortId],
    queryFn: async () => {
      if (!resortId) return [];
      
      const { data, error } = await supabase
        .from('buggy_stops')
        .select('zone')
        .eq('resort_id', resortId)
        .eq('is_active', true)
        .not('zone', 'is', null);
      
      if (error) throw error;
      
      // Get unique zones
      const zones = [...new Set((data || []).map(s => s.zone).filter(Boolean))];
      return zones.sort();
    },
    enabled: !!resortId,
  });
}
