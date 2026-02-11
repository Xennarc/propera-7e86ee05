/**
 * Guest Portal Route Constants — Single Source of Truth
 *
 * Every guest-facing link, navigate(), and route definition MUST reference
 * these constants. No hardcoded "/guest/..." strings elsewhere.
 */

export const GUEST_ROUTES = {
  // ── Public (unauthenticated) ──────────────────────────────────
  LOGIN: '/guest/login',
  FIND_RESORT: '/guest/find',
  RESORT_LOGIN: '/resort/:code/guest/login',
  QR_LOGIN: '/guest/qr',
  QR_CONFIRM: '/guest/qr/:token',
  ACCESS: '/guest/access',

  // ── Authenticated (inside GuestLayout) ────────────────────────
  HOME: '/guest',
  PROFILE: '/guest/profile',
  ACTIVITIES: '/guest/activities',
  ACTIVITY_CATALOGUE: '/guest/activities/catalogue',
  ACTIVITY_SESSIONS: '/guest/activities/sessions',
  ACTIVITY_DETAIL: '/guest/activities/:activityId',
  ACTIVITY_BOOK: '/guest/activities/book/:sessionId',
  RESTAURANTS: '/guest/restaurants',
  RESTAURANT_BOOK: '/guest/restaurants/book/:slotId',
  BOOKINGS: '/guest/bookings',
  REQUESTS: '/guest/requests',
  MY_REQUESTS: '/guest/requests/my',
  BUGGY: '/guest/buggy',
  MY_RIDES: '/guest/my-rides',
  NOTIFICATIONS: '/guest/notifications',
  FEEDBACK: '/guest/feedback',
  LOYALTY: '/guest/loyalty',
  TRAVEL_PARTY: '/guest/travel-party',
} as const;

export type GuestRouteKey = keyof typeof GUEST_ROUTES;

/**
 * Build a concrete path by replacing `:param` placeholders.
 *
 * @example guestPath('ACTIVITY_BOOK', { sessionId: '123' }) → '/guest/activities/book/123'
 * @example guestPath('HOME') → '/guest'
 */
export function guestPath(
  route: GuestRouteKey,
  params?: Record<string, string>,
): string {
  let path: string = GUEST_ROUTES[route];
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`:${key}`, encodeURIComponent(value));
    }
  }
  return path;
}

/**
 * Returns true when `pathname` belongs to the guest portal tree.
 */
export function isGuestPath(pathname: string): boolean {
  return pathname === '/guest' || pathname.startsWith('/guest/');
}
