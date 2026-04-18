

## Issues

### 1. "This session has already started" on every activity
**Root cause:** `src/lib/session-time-utils.ts → isSessionPast()` misuses `date-fns-tz`. It calls `toZonedTime(new Date(), resortTimezone)` then reads `.getFullYear()/.getHours()` etc. — but those getters apply the **browser's local timezone** to the returned Date, double-shifting the result.

In the demo (resort = Indian/Maldives, current Maldives time 09:46), a session at 10:00 is correctly returned by the server RPC (which filters past sessions in Postgres). But on the client, if the browser is in UTC+5 or higher, `nowHours` ends up shifted forward and the 10:00 session looks past → `SessionExpiredState` renders.

**Fix:** Rewrite `isSessionPast` to compute "now in resort tz" using a reliable formatter (`Intl.DateTimeFormat` with `timeZone` option) and compare YYYY-MM-DD HH:mm strings as numeric tuples. No double conversion. Same approach already used in `demo-enter` edge function (`nowInTz`).

### 2. Duplicate exit button in demo header
**Root cause:** `GuestLayout.tsx` (lines 314–327) renders `<DemoExitButton />` (the demo "Exit") AND the standard `<Button onClick={logout}>` (the guest sign-out). Both show similar arrow-out icons. In demo mode there is no real guest session to sign out of — the demo exit is the canonical action.

**Fix:** Hide the standard logout button when running in demo mode (i.e., when `getStoredDemoSlot() != null`). Keep `<DemoExitButton />` as the only exit affordance during demo. Outside demo, behavior unchanged.

## Files touched

1. `src/lib/session-time-utils.ts` — rewrite `isSessionPast()` using `Intl.DateTimeFormat` to correctly compute resort-tz now. Keep API/exports identical (`filterUpcomingSessions`, `countPastSessions` reuse it).
2. `src/components/guest/GuestLayout.tsx` — wrap the standard logout `<Button>` so it renders only when `getStoredDemoSlot() == null`. `<DemoExitButton />` stays as-is.

No DB changes. No edge function changes.

## Verification

- In demo, click an activity card from Activities tab → booking page loads with session details, no "already started" screen.
- Confirm only one exit icon appears in the top-right header during demo.
- Outside demo (a real guest login), the standard logout icon still appears.

