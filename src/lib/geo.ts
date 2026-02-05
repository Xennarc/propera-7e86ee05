/**
 * Geographic utility functions for distance and ETA calculations.
 * Used primarily by the Driver Portal for trip navigation.
 */

const EARTH_RADIUS_METERS = 6_371_000;

/**
 * Safely parse a number, returning null for invalid values.
 */
export function safeNumber(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  const num = typeof x === 'number' ? x : Number(x);
  if (!Number.isFinite(num)) return null;
  return num;
}

/**
 * Calculate the Haversine distance between two coordinates in meters.
 * Returns null if any coordinate is invalid.
 */
export function haversineMeters(
  lat1: number | null | undefined,
  lng1: number | null | undefined,
  lat2: number | null | undefined,
  lng2: number | null | undefined
): number | null {
  const safeLat1 = safeNumber(lat1);
  const safeLng1 = safeNumber(lng1);
  const safeLat2 = safeNumber(lat2);
  const safeLng2 = safeNumber(lng2);

  if (safeLat1 === null || safeLng1 === null || safeLat2 === null || safeLng2 === null) {
    return null;
  }

  // Validate coordinate ranges
  if (safeLat1 < -90 || safeLat1 > 90 || safeLat2 < -90 || safeLat2 > 90) {
    return null;
  }
  if (safeLng1 < -180 || safeLng1 > 180 || safeLng2 < -180 || safeLng2 > 180) {
    return null;
  }

  const toRadians = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRadians(safeLat2 - safeLat1);
  const dLng = toRadians(safeLng2 - safeLng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(safeLat1)) *
      Math.cos(toRadians(safeLat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_METERS * c;

  return Number.isFinite(distance) ? Math.round(distance) : null;
}

/**
 * Format a distance in meters to a human-readable string.
 * Returns "—" for null/invalid values.
 */
export function formatDistance(meters: number | null | undefined): string {
  const safeMeters = safeNumber(meters);
  if (safeMeters === null || safeMeters < 0) return '—';

  if (safeMeters < 1000) {
    return `${Math.round(safeMeters)} m`;
  }

  const km = safeMeters / 1000;
  if (km < 10) {
    return `${km.toFixed(1)} km`;
  }

  return `${Math.round(km)} km`;
}

/**
 * Format an ETA in minutes to a human-readable string.
 * Returns "—" for null/invalid values.
 */
export function formatETA(minutes: number | null | undefined): string {
  const safeMinutes = safeNumber(minutes);
  if (safeMinutes === null || safeMinutes < 0) return '—';

  if (safeMinutes < 1) {
    return '< 1 min';
  }

  if (safeMinutes < 60) {
    return `${Math.round(safeMinutes)} min`;
  }

  const hours = Math.floor(safeMinutes / 60);
  const remainingMins = Math.round(safeMinutes % 60);

  if (remainingMins === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMins} min`;
}

/**
 * Estimate travel time in minutes based on distance and average speed.
 * Uses a conservative resort buggy speed of ~15 km/h.
 */
export function estimateETAFromDistance(
  distanceMeters: number | null,
  speedKmh: number = 15
): number | null {
  const safeDistance = safeNumber(distanceMeters);
  const safeSpeed = safeNumber(speedKmh);

  if (safeDistance === null || safeSpeed === null || safeSpeed <= 0) {
    return null;
  }

  const distanceKm = safeDistance / 1000;
  const timeHours = distanceKm / safeSpeed;
  const timeMinutes = timeHours * 60;

  return Number.isFinite(timeMinutes) ? Math.ceil(timeMinutes) : null;
}
