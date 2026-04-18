

## Goal
Make the demo a **fully isolated sandbox** that (a) cannot leak side-effects into the real world (no emails, push, webhooks, audit pollution) and (b) presents each visitor with a **per-visitor frozen virtual clock** — they enter at moment T, and "now" stays at T for their whole session. No visible demo signal in the UI.

## Why not a separate schema
We have 145 public tables, hundreds of RPCs, and 238 migrations. Mirroring all of them into a `demo` schema would double every future migration and break every existing query. We get the same isolation guarantee with a hard **opt-in writer boundary** keyed off `resort_id = DEMO_RESORT_ID` — cheaper, fully reversible, and no schema drift risk.

---

## Architecture

### 1. Per-visitor frozen virtual clock (the "time capsule")

When a visitor enters the demo, `demo-enter` mints a **virtual `now` timestamp** (current real-time in resort tz, rounded down to the minute) and returns it alongside their session payload. The client persists this in `localStorage` as `propera_demo_virtual_now` and never advances it. The guest's stay is rebased so this frozen `now` falls on stay-day-2 around 10:00 (a deterministic "mid-stay" moment).

A new helper `getVirtualNow()` in `src/lib/virtual-clock.ts`:
- Returns the frozen instant when a demo slot is active.
- Returns real `Date.now()` otherwise.

Then we route every UI date computation through it. The places that matter most (already audited):
- `src/lib/session-time-utils.ts` — `isSessionPast`, `filterUpcomingSessions`
- `src/lib/timezone-utils.ts` — wherever "today" / "now" is computed
- Booking eligibility, request blocking window, "Day N of stay" chips, restaurant slot filters

We do NOT replace `new Date()` everywhere blindly — only the time-of-decision call sites (already a small, known set documented in the activities/dining/requests memories).

### 2. Sandbox boundary on side-effects

Add a single **demo guard** that gates every outbound side-effect, both client-side and edge-function-side.

- **Client**: a `useIsDemoSession()` hook (slot present in localStorage OR active resort code = DEMO) wraps:
  - Push notification subscription (`navigator.serviceWorker` push registration → no-op in demo).
  - Any direct `fetch`/external integration call (rare — most go through edge functions).

- **Edge functions**: every function that produces side-effects checks the resort early:
  - `process-outbox` — when consuming `event_outbox` rows, skip rows where `resort_id = DEMO_RESORT_ID`. Mark them as `status = 'skipped_demo'` so they don't accumulate.
  - `send-staff-invite`, guest-credential emails, push senders, webhook dispatchers — early-return with a `{skipped:'demo'}` response when `resort_id` is the demo or the caller's auth user is a demo staff user.
  - PMS sync / payment / Resend in `provision-demo` is already demo-only and stays.

- **Audit/analytics**: add a Postgres BEFORE-INSERT trigger on `audit_logs`, `booking_audit_logs`, `staff_audit_logs`, `access_audit_log`, `admin_audit_logs`, `platform_audit_log` that **silently swallows inserts** where `resort_id = DEMO_RESORT_ID` (or, for tables without resort_id, where `actor_user_id` matches a demo staff user). One small SECURITY DEFINER helper `is_demo_context(uuid)` keeps the trigger logic uniform.

- **Notifications table**: same trigger pattern for `admin_notifications` and `notifications` — demo writes get dropped at the DB level. (Reads still work, so demo UI renders the empty state naturally.)

### 3. Strengthen tenant-data leak prevention

Add a hardening migration that asserts current behavior:
- Confirm every public-facing RPC that takes `p_resort_id` has a server-side check rejecting calls where the caller's session resort doesn't match. Most already do; we add a CI-style regression test (`src/__tests__/security/demo-isolation.test.ts`) that calls a sample of RPCs with `p_resort_id = DEMO_RESORT_ID` while authenticated as a non-demo staff user and asserts they're denied.
- This is the "namespace" guarantee the user is asking for, achieved via RLS rather than schema separation.

### 4. Per-visitor cleanup is unchanged

Existing slot-rotation + `demo-reset` already wipes the visitor's transactional slice on exit. No change.

---

## Files touched

**New**
- `src/lib/virtual-clock.ts` — `getVirtualNow()`, `getVirtualToday(tz)`, `setVirtualNow(iso)`, `clearVirtualNow()`.
- `src/hooks/useIsDemoSession.ts` — single source of truth for "am I in demo right now".
- `supabase/migrations/<ts>_demo_sandbox_isolation.sql` — `is_demo_context()` helper + drop-on-insert triggers for audit/notification tables + `event_outbox` skip-marker column default.
- `src/__tests__/security/demo-isolation.test.ts` — regression tests.

**Edited**
- `supabase/functions/demo-enter/index.ts` — return `virtualNow` in the response payload.
- `src/hooks/useDemoEnter.ts` — persist `virtualNow` to localStorage.
- `src/hooks/useDemoExit.ts` + `clearStoredDemoSlot()` — also clear virtual clock.
- `src/lib/session-time-utils.ts` — `isSessionPast` uses `getVirtualNow()`.
- `src/lib/timezone-utils.ts` — central "now" helper uses `getVirtualNow()`.
- `supabase/functions/process-outbox/index.ts` — skip demo rows.
- Any edge function that dispatches emails/push/webhooks — early demo bailout (small list, identified during implementation; mostly `send-staff-invite`, push senders).

**Untouched**
- All 145 public tables, RLS policies, and existing demo flow (slot rotation, wipe, rebase).
- UI shell — no banner, no chip, no badge.

---

## Verification

1. Enter demo as guest → reload page after 5 minutes → "today" / session times still reflect entry moment, nothing has expired or shifted.
2. As a real staff user on a real resort, attempt an RPC call with `p_resort_id = DEMO_RESORT_ID` → denied.
3. Trigger a demo action that would normally email (e.g. submit a service request) → check `event_outbox` row marked `skipped_demo`, check Resend dashboard → no send.
4. Inspect `audit_logs` after a demo session → zero new rows attributable to the demo resort.
5. Push subscription prompt does not fire inside demo.
6. UI looks identical to production — no demo banner.

