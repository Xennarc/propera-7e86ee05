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
 * Generate a pre-arrival link URL (legacy system)
 * @deprecated This function is deprecated. Use getGuestPortalUrl instead.
 * Kept for backward compatibility but will be removed in a future version.
 */
export function getPrearrivalUrl(token: string): string {
  console.warn('getPrearrivalUrl is deprecated. Use getGuestPortalUrl instead.');
  return `${PRODUCTION_URL}/prearrival/${token}`;
}

/**
 * Generate a unified guest access link URL (legacy stay-based system)
 * @deprecated This function is deprecated. Use getGuestPortalUrl or getSignedQrLoginUrl instead.
 * Kept for backward compatibility but will be removed in a future version.
 */
export function getGuestAccessUrl(token: string): string {
  console.warn('getGuestAccessUrl is deprecated. Use getGuestPortalUrl or getSignedQrLoginUrl instead.');
  return `${PRODUCTION_URL}/guest/access?t=${token}`;
}

/**
 * Generate a QR login URL for instant login (query param format)
 */
export function getQrLoginUrl(token: string): string {
  return `${PRODUCTION_URL}/guest/qr?t=${token}`;
}

/**
 * Generate a QR login URL for confirmation flow (path param format)
 * @deprecated Use getSignedQrLoginUrl for new implementations
 */
export function getQrConfirmUrl(token: string): string {
  return `${PRODUCTION_URL}/guest/qr/${token}`;
}

/**
 * Generate a signed QR login URL with auto-fill credentials
 * This is the preferred method for staff-generated QR codes
 */
export function getSignedQrLoginUrl(params: {
  resortCode: string;
  room: string;
  last: string;
  pin: string;
  exp: number;
  sig: string;
}): string {
  const { resortCode, room, last, pin, exp, sig } = params;
  const encodedRoom = encodeURIComponent(room);
  const encodedLast = encodeURIComponent(last);
  return `${PRODUCTION_URL}/resort/${resortCode.toLowerCase()}/guest/login?room=${encodedRoom}&last=${encodedLast}&pin=${pin}&exp=${exp}&sig=${sig}&autologin=1`;
}

/**
 * Generate a resort marketing page URL
 */
export function getResortMarketingUrl(resortCode: string): string {
  return `${PRODUCTION_URL}/resorts/${resortCode.toLowerCase()}`;
}
