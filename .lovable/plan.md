

# Guest Portal Routing Audit and Repair

## Current State Assessment

After a thorough audit, the Guest Portal routing is largely well-structured. Here are the findings:

### What's Working
- All core routes exist and are properly nested under `<GuestLayout />`
- Bottom nav links match actual routes
- Auth guard exists in `GuestLayout` (redirects to `/guest/login` if no session)
- Legacy pre-arrival routes have redirects via `LegacyPrearrivalRedirect`
- Resort-specific login (`/resort/:code/guest/login`) works
- No `/guest/dining` vs `/guest/restaurants` conflict (only `/guest/restaurants` is used consistently)

### Issues Found
1. **No `returnTo` support** -- if an unauthenticated guest hits a deep link (e.g., `/guest/activities/book/123`), after login they always land on `/guest` instead of the intended page
2. **No session expiry UI** -- when session validation fails, the guest silently loses their session with no feedback
3. **Hardcoded route strings everywhere** -- 130+ `to="/guest/..."` links and 170+ `navigate('/guest/...')` calls scattered across 17+ files with no central route constants
4. **No guest-specific 404** -- if a guest hits `/guest/nonexistent`, they see the generic Propera 404 page with "Return to Home" (landing page), not a guest-friendly recovery
5. **No alias redirects** for common legacy/typo paths like `/guest/dining`, `/guest/transport`, `/guest/rides`
6. **Missing `GuestActivitiesBrowser`** in routes -- it's lazy-imported (line 135) but never used in any route; `GuestActivitySessionsPage` is mounted at `/guest/activities` instead

## Plan

### Phase 1: Create `src/routes/guestRoutes.ts` -- Single Source of Truth

Create a constants file exporting all guest route paths, a `guestPath()` helper, and an `isGuestPath()` utility.

```text
GUEST_ROUTES = {
  // Public (unauthenticated)
  LOGIN:           '/guest/login',
  FIND_RESORT:     '/guest/find',
  RESORT_LOGIN:    '/resort/:code/guest/login',
  QR_LOGIN:        '/guest/qr',
  QR_CONFIRM:      '/guest/qr/:token',
  ACCESS:          '/guest/access',

  // Authenticated (inside GuestLayout)
  HOME:            '/guest',
  PROFILE:         '/guest/profile',
  ACTIVITIES:      '/guest/activities',
  ACTIVITY_CATALOGUE: '/guest/activities/catalogue',
  ACTIVITY_SESSIONS:  '/guest/activities/sessions',
  ACTIVITY_DETAIL: '/guest/activities/:activityId',
  ACTIVITY_BOOK:   '/guest/activities/book/:sessionId',
  RESTAURANTS:     '/guest/restaurants',
  RESTAURANT_BOOK: '/guest/restaurants/book/:slotId',
  BOOKINGS:        '/guest/bookings',
  REQUESTS:        '/guest/requests',
  MY_REQUESTS:     '/guest/requests/my',
  BUGGY:           '/guest/buggy',
  MY_RIDES:        '/guest/my-rides',
  NOTIFICATIONS:   '/guest/notifications',
  FEEDBACK:        '/guest/feedback',
  LOYALTY:         '/guest/loyalty',
  TRAVEL_PARTY:    '/guest/travel-party',
}
```

Plus helpers:
- `guestPath(route, params?)` -- replaces `:param` placeholders with actual values
- `isGuestPath(pathname)` -- returns true if path starts with `/guest`

### Phase 2: `returnTo` Support in Auth Flow

**GuestLayout** (auth guard):
- When redirecting to login, append `?returnTo=<current_path>` to the login URL

**GuestLogin + ResortGuestLogin**:
- After successful login, read `returnTo` from query params
- Navigate to `returnTo` if it starts with `/guest` (security check), otherwise `/guest`

**Session expiry handling**:
- In `GuestAuthContext`, when session validation fails, redirect to `/guest/login?expired=1` instead of silently clearing
- In `GuestLogin`, show a toast/banner when `?expired=1` is present: "Your session has expired. Please log in again."

### Phase 3: Alias Redirects for Legacy/Typo Paths

Add these redirect routes in `App.tsx`:
- `/guest/dining` -> `/guest/restaurants`
- `/guest/transport` -> `/guest/buggy`
- `/guest/rides` -> `/guest/my-rides`

These are simple `<Route path="..." element={<Navigate to="..." replace />} />` entries placed before the main guest layout route, ensuring old bookmarks/links don't 404.

### Phase 4: Guest-Specific 404 Page

Create `src/pages/guest/GuestNotFound.tsx`:
- Guest-themed 404 with the resort branding style
- Buttons: "Go Home" (`/guest`), "My Bookings" (`/guest/bookings`)
- Uses `GUEST_ROUTES` constants

Add a catch-all route inside the `<Route path="/guest" element={<GuestLayout />}>` block:
```
<Route path="*" element={<GuestNotFound />} />
```

This ensures any unmatched `/guest/*` path shows a guest-friendly recovery page instead of the generic Propera 404.

### Phase 5: Migrate Hardcoded Strings to Constants

Update all files that contain hardcoded `/guest/...` strings to import from `GUEST_ROUTES`:

| File | Approximate changes |
|------|---------------------|
| `GuestBottomNav.tsx` | 5 nav item hrefs |
| `GuestLayout.tsx` | Login redirect, profile link |
| `GuestHome.tsx` | 8+ links/navigates |
| `GuestPrearrivalHome.tsx` | 4 links |
| `GuestLogin.tsx` | 2 navigates |
| `ResortGuestLogin.tsx` | 3 navigates |
| `GuestBuggyRequestPage.tsx` | 2 navigates |
| `GuestRestaurantBookingPage.tsx` | 6 navigates |
| `GuestMyRidesPage.tsx` | 1 link |
| `GuestMyRequestsPage.tsx` | 1 link |
| `GuestLoyaltyPage.tsx` | 3 navigates |
| `GuestNotificationBell.tsx` | 2 navigates |
| `GuestTodayTimeline.tsx` | 3 links |
| `GuestAccessGate.tsx` | 1 navigate |
| `PrearrivalRequestsBlockedState.tsx` | 2 links |
| `TravelPartyCard.tsx` | 1 link |
| `ExpiredLinkScreen.tsx` | 1 navigate |

### Phase 6: Bottom Nav Active State Fix

Update `GuestBottomNav.tsx` to use `GUEST_ROUTES` constants for href values and ensure the active-state matching logic handles nested routes correctly (e.g., `/guest/activities/book/123` should highlight the "Activities" tab, `/guest/requests/my` should highlight "Requests").

## Files Summary

| File | Action |
|------|--------|
| `src/routes/guestRoutes.ts` | **Create** -- route constants + helpers |
| `src/pages/guest/GuestNotFound.tsx` | **Create** -- guest-specific 404 |
| `src/App.tsx` | **Edit** -- add alias redirects, add guest catch-all 404 route |
| `src/contexts/GuestAuthContext.tsx` | **Edit** -- redirect to login with `?expired=1` on session failure |
| `src/components/guest/GuestLayout.tsx` | **Edit** -- append `returnTo` when redirecting to login |
| `src/pages/guest/GuestLogin.tsx` | **Edit** -- handle `returnTo` + `expired` query params |
| `src/pages/guest/ResortGuestLogin.tsx` | **Edit** -- handle `returnTo` after login |
| `src/components/guest/GuestBottomNav.tsx` | **Edit** -- use GUEST_ROUTES constants |
| ~15 more component/page files | **Edit** -- replace hardcoded `/guest/...` strings with `GUEST_ROUTES` imports |

## What This Does NOT Change
- No database schema, RLS, RPC, or realtime changes
- No staff/superadmin/driver routing changes
- No feature removals -- purely additive
- No business logic changes -- all existing flows (booking, requests, buggy) work identically
- All existing URLs continue to work (aliases added, not replacements)

## Success Criteria
- Unauthenticated deep link -> login -> returnTo works
- Session expiry shows friendly message
- `/guest/dining`, `/guest/transport`, `/guest/rides` redirect correctly
- `/guest/anything-invalid` shows guest-themed 404 with recovery buttons
- All 130+ hardcoded route strings replaced with constants
- Bottom nav active state correct on all nested routes
