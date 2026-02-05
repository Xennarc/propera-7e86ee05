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

/**
 * Derived trip info when stops are unavailable.
 * Extracts pickup/dropoff info from trip requests.
 */
export interface DerivedTripInfo {
  pickupNames: string[];
  dropoffNames: string[];
  totalPassengers: number;
  firstGuest: { name: string | null; room: string | null } | null;
}

/**
 * Extract trip info from trip requests when stops are missing.
 * Provides fallback display data for the Driver Portal.
 * 
 * @param tripRequests - Array of trip requests with details
 * @returns Derived trip info with pickup/dropoff names and passenger count
 */
export function deriveTripInfoFromRequests(
  tripRequests: TripRequestWithDetails[] | undefined | null
): DerivedTripInfo {
  if (!tripRequests?.length) {
    return { pickupNames: [], dropoffNames: [], totalPassengers: 0, firstGuest: null };
  }

  const pickupNames = tripRequests
    .map(r => r.pickup_name || r.pickup_text)
    .filter(Boolean) as string[];
  
  const dropoffNames = tripRequests
    .map(r => r.dropoff_name || r.dropoff_text)
    .filter(Boolean) as string[];
  
  const totalPassengers = tripRequests.reduce((sum, r) => sum + (r.party_size || 0), 0);
  
  const firstReq = tripRequests[0];

  return {
    pickupNames: [...new Set(pickupNames)],
    dropoffNames: [...new Set(dropoffNames)],
    totalPassengers,
    firstGuest: firstReq ? { name: firstReq.guest_name, room: firstReq.room_number } : null,
  };
}

/**
 * Get contextual button label based on lifecycle state.
 * 
 * @param lifecycleState - Current trip lifecycle state
 * @param status - Trip status as fallback
 * @returns Object with label and icon hint
 */
export function getContextualActionLabel(
  lifecycleState: string | null | undefined,
  status: string
): { label: string; sublabel: string } {
  const state = lifecycleState?.toLowerCase() ?? status.toLowerCase();
  
  switch (state) {
    case 'assigned':
      return { label: 'Start Trip', sublabel: 'Head to pickup location' };
    case 'enroute_to_pickup':
      return { label: 'View Trip', sublabel: 'Heading to pickup' };
    case 'arrived_pickup':
      return { label: 'View Trip', sublabel: 'Waiting for passengers' };
    case 'enroute_to_dropoff':
      return { label: 'View Trip', sublabel: 'Driving to dropoff' };
    case 'en_route':
      return { label: 'View Trip', sublabel: 'Trip in progress' };
    case 'active':
      return { label: 'View Trip', sublabel: 'Trip active' };
    case 'planning':
      return { label: 'View Trip', sublabel: 'Awaiting assignment' };
    default:
      return { label: 'Continue Trip', sublabel: '' };
  }
}
