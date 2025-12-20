/**
 * URL utilities for generating consistent links across the application.
 * All external-facing links should use the production domain.
 */

const PRODUCTION_URL = 'https://propera.cc';

/**
 * Get the base URL for generating links.
 * Always returns the production URL for consistency.
 */
export function getBaseUrl(): string {
  return PRODUCTION_URL;
}

/**
 * Generate a guest portal login URL for a resort
 */
export function getGuestPortalUrl(resortCode: string): string {
  return `${PRODUCTION_URL}/resort/${resortCode}/guest/login`;
}

/**
 * Generate a guest activities URL for a resort
 */
export function getGuestActivitiesUrl(resortCode: string): string {
  return `${PRODUCTION_URL}/resort/${resortCode}/guest/activities`;
}

/**
 * Generate a guest activity detail URL
 */
export function getGuestActivityUrl(resortCode: string, activityId: string): string {
  return `${PRODUCTION_URL}/resort/${resortCode}/guest/activities/${activityId}`;
}

/**
 * Generate a staff invite URL
 */
export function getStaffInviteUrl(token: string): string {
  return `${PRODUCTION_URL}/staff/invite/${token}`;
}

/**
 * Generate a pre-arrival link URL
 */
export function getPrearrivalUrl(token: string): string {
  return `${PRODUCTION_URL}/prearrival/${token}`;
}

/**
 * Generate a resort marketing page URL
 */
export function getResortMarketingUrl(resortCode: string): string {
  return `${PRODUCTION_URL}/resorts/${resortCode.toLowerCase()}`;
}
