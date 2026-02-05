/**
 * Driver-only helper utilities for trip management.
 * These helpers do not affect existing logic or non-driver pages.
 */

import type { TripStopWithDetails, TripRequestWithDetails, StopLatLng } from '@/hooks/transport/useTripDetails';

/**
 * Status values that indicate a stop is still actionable (not yet completed).
 */
const ACTIONABLE_STOP_STATUSES = ['pending', 'en_route', 'arrived'] as const;

/**
 * Get the next actionable stop from a list of trip stops.
 * Returns the first stop that hasn't been completed yet, ordered by sequence.
 * 
 * @param tripStops - Array of trip stops, should be pre-sorted by sequence
 * @returns The next stop to action, or null if all stops are completed
 */
export function getNextStop(
  tripStops: TripStopWithDetails[] | undefined | null
): TripStopWithDetails | null {
  if (!tripStops || tripStops.length === 0) {
    return null;
  }

  // Find the first stop that is not completed
  const nextStop = tripStops.find(stop => {
    const status = stop.status?.toLowerCase() ?? '';
    // A stop is actionable if it's pending, en_route, arrived, or any non-completed status
    return status !== 'completed' && status !== 'skipped' && status !== 'cancelled';
  });

  return nextStop ?? null;
}

/**
 * Get the location of the next actionable stop.
 * Convenience wrapper around getNextStop.
 * 
 * @param tripStops - Array of trip stops
 * @returns The lat/lng of the next stop, or null if unavailable
 */
export function getNextStopLocation(
  tripStops: TripStopWithDetails[] | undefined | null
): StopLatLng | null {
  const nextStop = getNextStop(tripStops);
  return nextStop?.stopLatLng ?? null;
}

/**
 * Get the name/title of the next actionable stop.
 * 
 * @param tripStops - Array of trip stops
 * @returns The display name of the next stop, or null if unavailable
 */
export function getNextStopName(
  tripStops: TripStopWithDetails[] | undefined | null
): string | null {
  const nextStop = getNextStop(tripStops);
  return nextStop?.stop_name ?? nextStop?.title ?? null;
}

/**
 * Count remaining stops that are not yet completed.
 * 
 * @param tripStops - Array of trip stops
 * @returns Number of stops still to be completed
 */
export function countRemainingStops(
  tripStops: TripStopWithDetails[] | undefined | null
): number {
  if (!tripStops || tripStops.length === 0) {
    return 0;
  }

  return tripStops.filter(stop => {
    const status = stop.status?.toLowerCase() ?? '';
    return status !== 'completed' && status !== 'skipped' && status !== 'cancelled';
  }).length;
}

/**
 * Check if all stops in a trip have been completed.
 * 
 * @param tripStops - Array of trip stops
 * @returns True if all stops are completed (or list is empty)
 */
export function areAllStopsCompleted(
  tripStops: TripStopWithDetails[] | undefined | null
): boolean {
  if (!tripStops || tripStops.length === 0) {
    return true;
  }

  return tripStops.every(stop => {
    const status = stop.status?.toLowerCase() ?? '';
    return status === 'completed' || status === 'skipped' || status === 'cancelled';
  });
}
