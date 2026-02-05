import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  haversineMeters,
  formatDistance,
  formatETA,
  estimateETAFromDistance,
  safeNumber,
} from '@/lib/geo';

export interface DriverLocation {
  lat: number;
  lng: number;
}

export interface StopLocation {
  lat: number;
  lng: number;
}

export interface UseDriverETAAndDistanceParams {
  tripId: string | undefined;
  driverLocation: DriverLocation | null;
  nextStopLocation: StopLocation | null;
  etaMinutes?: number | null;
}

export interface DriverETAAndDistanceResult {
  distanceMeters: number | null;
  distanceLabel: string;
  etaMinutes: number | null;
  etaLabel: string;
  isCalculating: boolean;
}

/**
 * Hook to calculate and display ETA and distance to the next stop.
 * Used exclusively in the Driver Portal.
 * 
 * Gracefully handles:
 * - Missing GPS permission (driverLocation null)
 * - Missing stop coordinates (nextStopLocation null)
 * - Invalid coordinate values
 * - Missing explicit ETA (falls back to distance-based estimate)
 */
export function useDriverETAAndDistance({
  tripId,
  driverLocation,
  nextStopLocation,
  etaMinutes: providedETA,
}: UseDriverETAAndDistanceParams): DriverETAAndDistanceResult {
  // Memoize the calculation to prevent unnecessary recalculations
  const calculatedValues = useMemo(() => {
    // Early return with safe defaults if inputs are missing
    if (!driverLocation || !nextStopLocation) {
      return {
        distanceMeters: null,
        etaMinutes: null,
      };
    }

    // Calculate distance using Haversine formula
    const distance = haversineMeters(
      driverLocation.lat,
      driverLocation.lng,
      nextStopLocation.lat,
      nextStopLocation.lng
    );

    // Use provided ETA if valid, otherwise estimate from distance
    const safeProvidedETA = safeNumber(providedETA);
    const eta = safeProvidedETA !== null 
      ? safeProvidedETA 
      : estimateETAFromDistance(distance);

    return {
      distanceMeters: distance,
      etaMinutes: eta,
    };
  }, [
    driverLocation?.lat,
    driverLocation?.lng,
    nextStopLocation?.lat,
    nextStopLocation?.lng,
    providedETA,
  ]);

  // Use React Query for consistent caching and state management
  // This doesn't fetch anything, just provides a stable query structure
  const { data, isFetching } = useQuery({
    queryKey: ['driver-eta-distance', tripId, calculatedValues],
    queryFn: () => Promise.resolve(calculatedValues),
    enabled: Boolean(tripId),
    staleTime: 10_000, // 10 seconds
    gcTime: 30_000, // 30 seconds garbage collection
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Format labels with safe fallbacks
  const distanceLabel = formatDistance(data?.distanceMeters);
  const etaLabel = formatETA(data?.etaMinutes);

  return {
    distanceMeters: data?.distanceMeters ?? null,
    distanceLabel,
    etaMinutes: data?.etaMinutes ?? null,
    etaLabel,
    isCalculating: isFetching,
  };
}

/**
 * Standalone utility to get ETA and distance without React Query.
 * Useful for one-off calculations in callbacks.
 */
export function calculateETAAndDistance(
  driverLocation: DriverLocation | null,
  nextStopLocation: StopLocation | null,
  providedETA?: number | null
): { distanceMeters: number | null; etaMinutes: number | null } {
  if (!driverLocation || !nextStopLocation) {
    return { distanceMeters: null, etaMinutes: null };
  }

  const distance = haversineMeters(
    driverLocation.lat,
    driverLocation.lng,
    nextStopLocation.lat,
    nextStopLocation.lng
  );

  const safeProvidedETA = safeNumber(providedETA);
  const eta = safeProvidedETA !== null
    ? safeProvidedETA
    : estimateETAFromDistance(distance);

  return { distanceMeters: distance, etaMinutes: eta };
}
