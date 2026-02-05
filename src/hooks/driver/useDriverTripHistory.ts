import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export type HistoryDateRange = '7d' | '30d' | 'all';

export interface DriverTripHistoryRow {
  id: string;
  resort_id: string;
  trip_type: string;
  status: string;
  buggy_id: string | null;
  driver_user_id: string | null;
  start_at: string | null;
  end_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  capacity_total: number | null;
  created_at: string;
  // Derived
  buggy_name: string | null;
  request_count: number;
  stop_count: number;
  first_stop_name: string | null;
  last_stop_name: string | null;
}

/**
 * Hook for driver's own trip history (completed/cancelled trips only).
 * Read-only, does not affect staff/dispatch logic.
 */
export function useDriverTripHistory(
  resortId: string | undefined,
  userId: string | undefined,
  dateRange: HistoryDateRange = '7d'
) {
  return useQuery({
    queryKey: ['driver-trip-history', resortId, userId, dateRange],
    queryFn: async (): Promise<DriverTripHistoryRow[]> => {
      if (!resortId || !userId) return [];

      const days = dateRange === '30d' ? 30 : 7;
      const fromDate = startOfDay(subDays(new Date(), days));
      const toDate = endOfDay(new Date());

      const { data, error } = await supabase
        .from('buggy_trips')
        .select(`
          id,
          resort_id,
          trip_type,
          status,
          buggy_id,
          driver_user_id,
          start_at,
          end_at,
          completed_at,
          cancelled_at,
          capacity_total,
          created_at,
          buggy:buggies(name),
          trip_requests:buggy_trip_requests(id),
          trip_stops:buggy_trip_stops(id, sequence, title, stop:buggy_stops(name))
        `)
        .eq('resort_id', resortId)
        .eq('driver_user_id', userId)
        .in('status', ['completed', 'cancelled'])
        .gte('created_at', fromDate.toISOString())
        .lte('created_at', toDate.toISOString())
        .order('completed_at', { ascending: false, nullsFirst: false })
        .limit(100);

      if (error) throw error;

      return (data || []).map((t): DriverTripHistoryRow => {
        // Parse trip stops for first/last names
        const stopsArray = Array.isArray(t.trip_stops) ? t.trip_stops : [];
        const sortedStops = [...stopsArray].sort((a: any, b: any) => 
          (a.sequence ?? 0) - (b.sequence ?? 0)
        );
        
        const firstStop = sortedStops[0];
        const lastStop = sortedStops[sortedStops.length - 1];

        const getStopName = (stopData: any): string | null => {
          if (!stopData) return null;
          // Try nested stop.name first, then title
          return stopData.stop?.name || stopData.title || null;
        };

        return {
          id: t.id,
          resort_id: t.resort_id,
          trip_type: t.trip_type,
          status: t.status,
          buggy_id: t.buggy_id,
          driver_user_id: t.driver_user_id,
          start_at: t.start_at,
          end_at: t.end_at,
          completed_at: t.completed_at,
          cancelled_at: t.cancelled_at,
          capacity_total: t.capacity_total,
          created_at: t.created_at,
          buggy_name: (t.buggy as any)?.name || null,
          request_count: Array.isArray(t.trip_requests) ? t.trip_requests.length : 0,
          stop_count: stopsArray.length,
          first_stop_name: getStopName(firstStop),
          last_stop_name: getStopName(lastStop),
        };
      });
    },
    enabled: !!resortId && !!userId,
    staleTime: 60_000, // Cache for 1 minute
  });
}

/**
 * Group trips by date for display.
 */
export function groupTripsByDate(trips: DriverTripHistoryRow[]): Map<string, DriverTripHistoryRow[]> {
  const grouped = new Map<string, DriverTripHistoryRow[]>();

  for (const trip of trips) {
    const dateKey = trip.completed_at || trip.cancelled_at || trip.created_at;
    const day = dateKey ? dateKey.split('T')[0] : 'unknown';
    
    if (!grouped.has(day)) {
      grouped.set(day, []);
    }
    grouped.get(day)!.push(trip);
  }

  return grouped;
}
