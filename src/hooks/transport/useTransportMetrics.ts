import { useMemo } from 'react';
import { differenceInMinutes, getHours, getDay } from 'date-fns';
import type { RequestHistoryRow, TripHistoryRow } from './useTransportHistory';

export interface TransportMetrics {
  // Request metrics
  totalRequests: number;
  completedRequests: number;
  cancelledRequests: number;
  noShowRequests: number;
  completionRate: number;
  cancellationRate: number;
  noShowRate: number;
  
  // Wait time metrics
  avgWaitTimeMinutes: number;
  minWaitTimeMinutes: number;
  maxWaitTimeMinutes: number;
  
  // Peak hours (0-23)
  requestsByHour: number[];
  peakHour: number;
  
  // Day of week distribution (0=Sun, 6=Sat)
  requestsByDay: number[];
  peakDay: number;
  
  // Volume
  totalPassengers: number;
  avgPartySize: number;
}

export interface TripMetrics {
  totalTrips: number;
  avgTripDurationMinutes: number;
  avgStopsPerTrip: number;
  avgRequestsPerTrip: number;
  totalStops: number;
}

export interface DriverPerformance {
  driverId: string;
  driverName: string;
  tripsCompleted: number;
  totalStops: number;
  avgTimePerStopMinutes: number;
  totalPassengers: number;
  noShowRate: number;
  avgTripDurationMinutes: number;
}

export function useTransportMetrics(
  requests: RequestHistoryRow[],
  trips: TripHistoryRow[]
) {
  const requestMetrics = useMemo((): TransportMetrics => {
    if (requests.length === 0) {
      return {
        totalRequests: 0,
        completedRequests: 0,
        cancelledRequests: 0,
        noShowRequests: 0,
        completionRate: 0,
        cancellationRate: 0,
        noShowRate: 0,
        avgWaitTimeMinutes: 0,
        minWaitTimeMinutes: 0,
        maxWaitTimeMinutes: 0,
        requestsByHour: Array(24).fill(0),
        peakHour: 0,
        requestsByDay: Array(7).fill(0),
        peakDay: 0,
        totalPassengers: 0,
        avgPartySize: 0,
      };
    }

    let completedRequests = 0;
    let cancelledRequests = 0;
    let noShowRequests = 0;
    let totalPassengers = 0;

    let totalWaitTime = 0;
    let validWaitTimesCount = 0;
    let minWaitTimeMinutes = Infinity;
    let maxWaitTimeMinutes = -Infinity;

    const requestsByHour = Array(24).fill(0);
    const requestsByDay = Array(7).fill(0);

    for (let i = 0; i < requests.length; i++) {
      const r = requests[i];
      totalPassengers += r.party_size;

      const createdDate = new Date(r.created_at);
      const hour = getHours(createdDate);
      const day = getDay(createdDate);

      requestsByHour[hour]++;
      requestsByDay[day]++;

      if (r.status === 'completed') {
        completedRequests++;
        const waitTime = differenceInMinutes(new Date(r.updated_at), createdDate);
        if (waitTime >= 0 && waitTime < 120) {
          totalWaitTime += waitTime;
          validWaitTimesCount++;
          if (waitTime < minWaitTimeMinutes) minWaitTimeMinutes = waitTime;
          if (waitTime > maxWaitTimeMinutes) maxWaitTimeMinutes = waitTime;
        }
      } else if (r.status === 'cancelled') {
        cancelledRequests++;
      } else if (r.status === 'no_show') {
        noShowRequests++;
      }
    }

    const avgWaitTimeMinutes = validWaitTimesCount > 0
      ? Math.round(totalWaitTime / validWaitTimesCount)
      : 0;

    if (validWaitTimesCount === 0) {
      minWaitTimeMinutes = 0;
      maxWaitTimeMinutes = 0;
    }

    let peakHour = 0;
    let maxRequestsByHour = -1;
    for (let i = 0; i < 24; i++) {
        if (requestsByHour[i] > maxRequestsByHour) {
            maxRequestsByHour = requestsByHour[i];
            peakHour = i;
        }
    }

    let peakDay = 0;
    let maxRequestsByDay = -1;
    for (let i = 0; i < 7; i++) {
        if (requestsByDay[i] > maxRequestsByDay) {
            maxRequestsByDay = requestsByDay[i];
            peakDay = i;
        }
    }

    return {
      totalRequests: requests.length,
      completedRequests,
      cancelledRequests,
      noShowRequests,
      completionRate: (completedRequests / requests.length) * 100,
      cancellationRate: (cancelledRequests / requests.length) * 100,
      noShowRate: (noShowRequests / requests.length) * 100,
      avgWaitTimeMinutes,
      minWaitTimeMinutes,
      maxWaitTimeMinutes,
      requestsByHour,
      peakHour,
      requestsByDay,
      peakDay,
      totalPassengers,
      avgPartySize: totalPassengers / requests.length,
    };
  }, [requests]);

  const tripMetrics = useMemo((): TripMetrics => {
    if (trips.length === 0) {
      return {
        totalTrips: 0,
        avgTripDurationMinutes: 0,
        avgStopsPerTrip: 0,
        avgRequestsPerTrip: 0,
        totalStops: 0,
      };
    }

    const durations = trips
      .filter(t => t.start_at && t.end_at)
      .map(t => differenceInMinutes(new Date(t.end_at!), new Date(t.start_at!)))
      .filter(d => d >= 0 && d < 180);

    const totalStops = trips.reduce((sum, t) => sum + t.stop_count, 0);
    const totalRequests = trips.reduce((sum, t) => sum + t.request_count, 0);

    return {
      totalTrips: trips.length,
      avgTripDurationMinutes: durations.length > 0 
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) 
        : 0,
      avgStopsPerTrip: Math.round((totalStops / trips.length) * 10) / 10,
      avgRequestsPerTrip: Math.round((totalRequests / trips.length) * 10) / 10,
      totalStops,
    };
  }, [trips]);

  return { requestMetrics, tripMetrics };
}

export function useDriverPerformance(
  trips: TripHistoryRow[],
  requests: RequestHistoryRow[]
): DriverPerformance[] {
  return useMemo(() => {
    const driverMap = new Map<string, {
      driverName: string;
      trips: TripHistoryRow[];
      noShows: number;
    }>();

    // Group trips by driver
    trips.forEach(trip => {
      if (!trip.driver_user_id) return;
      
      if (!driverMap.has(trip.driver_user_id)) {
        driverMap.set(trip.driver_user_id, {
          driverName: trip.driver_name || 'Unknown Driver',
          trips: [],
          noShows: 0,
        });
      }
      driverMap.get(trip.driver_user_id)!.trips.push(trip);
    });

    // Count no-shows per driver (from requests that were assigned to trips with that driver)
    // Note: This is an approximation since we don't have direct driver-request linking
    const noShowCount = requests.filter(r => r.status === 'no_show').length;
    const avgNoShowsPerDriver = driverMap.size > 0 ? noShowCount / driverMap.size : 0;

    return Array.from(driverMap.entries()).map(([driverId, data]): DriverPerformance => {
      const { driverName, trips: driverTrips } = data;
      
      const totalStops = driverTrips.reduce((sum, t) => sum + t.stop_count, 0);
      const totalPassengers = driverTrips.reduce((sum, t) => sum + (t.capacity_total || 0), 0);
      
      const durations = driverTrips
        .filter(t => t.start_at && t.end_at)
        .map(t => differenceInMinutes(new Date(t.end_at!), new Date(t.start_at!)))
        .filter(d => d >= 0 && d < 180);
      
      const totalDuration = durations.reduce((a, b) => a + b, 0);
      
      return {
        driverId,
        driverName,
        tripsCompleted: driverTrips.length,
        totalStops,
        avgTimePerStopMinutes: totalStops > 0 ? Math.round(totalDuration / totalStops) : 0,
        totalPassengers,
        noShowRate: Math.round(avgNoShowsPerDriver * 10) / 10, // Approximation
        avgTripDurationMinutes: durations.length > 0 
          ? Math.round(totalDuration / durations.length) 
          : 0,
      };
    }).sort((a, b) => b.tripsCompleted - a.tripsCompleted);
  }, [trips, requests]);
}
