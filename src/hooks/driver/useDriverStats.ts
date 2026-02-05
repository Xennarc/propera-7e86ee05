import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, subDays, differenceInMinutes } from 'date-fns';

export interface DriverStats {
  tripsToday: number;
  tripsLast7Days: number;
  passengersToday: number;
  passengersLast7Days: number;
  avgDurationMinutes: number | null;
}

/**
 * Lightweight hook to fetch driver stats from completed trips.
 * Uses a minimal query to avoid slowing down the home page.
 */
export function useDriverStats(
  resortId: string | undefined,
  userId: string | undefined
) {
  return useQuery({
    queryKey: ['driver-stats', resortId, userId],
    queryFn: async (): Promise<DriverStats> => {
      if (!resortId || !userId) {
        return {
          tripsToday: 0,
          tripsLast7Days: 0,
          passengersToday: 0,
          passengersLast7Days: 0,
          avgDurationMinutes: null,
        };
      }

      const todayStart = startOfDay(new Date()).toISOString();
      const sevenDaysAgo = startOfDay(subDays(new Date(), 7)).toISOString();

      // Fetch minimal data for stats - only completed trips
      const { data, error } = await supabase
        .from('buggy_trips')
        .select(`
          id,
          status,
          start_at,
          end_at,
          completed_at,
          capacity_total,
          created_at,
          trip_requests:buggy_trip_requests(party_size)
        `)
        .eq('resort_id', resortId)
        .eq('driver_user_id', userId)
        .eq('status', 'completed')
        .gte('created_at', sevenDaysAgo)
        .order('completed_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const trips = data || [];

      // Compute stats client-side
      let tripsToday = 0;
      let tripsLast7Days = 0;
      let passengersToday = 0;
      let passengersLast7Days = 0;
      let totalDurationMinutes = 0;
      let tripsWithDuration = 0;

      for (const trip of trips) {
        const tripDate = trip.completed_at || trip.created_at;
        const isToday = tripDate >= todayStart;

        // Count trips
        tripsLast7Days++;
        if (isToday) tripsToday++;

        // Sum passengers from trip_requests or use capacity_total as fallback
        const requestsArray = Array.isArray(trip.trip_requests) ? trip.trip_requests : [];
        const passengerCount = requestsArray.reduce(
          (sum: number, req: any) => sum + (req.party_size || 0),
          0
        ) || trip.capacity_total || 0;

        passengersLast7Days += passengerCount;
        if (isToday) passengersToday += passengerCount;

        // Calculate duration if timestamps exist
        if (trip.start_at && trip.end_at) {
          const duration = differenceInMinutes(
            new Date(trip.end_at),
            new Date(trip.start_at)
          );
          if (duration > 0 && duration < 300) { // Sanity check: < 5 hours
            totalDurationMinutes += duration;
            tripsWithDuration++;
          }
        }
      }

      const avgDurationMinutes = tripsWithDuration > 0
        ? Math.round(totalDurationMinutes / tripsWithDuration)
        : null;

      return {
        tripsToday,
        tripsLast7Days,
        passengersToday,
        passengersLast7Days,
        avgDurationMinutes,
      };
    },
    enabled: !!resortId && !!userId,
    staleTime: 60_000, // Cache for 1 minute
    refetchOnWindowFocus: false,
  });
}
