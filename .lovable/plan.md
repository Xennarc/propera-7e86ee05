
## Goal
Guest-created requests should show up in the Staff Requests Dashboard and Staff Requests Inbox immediately (or within a few seconds at worst), for Front Office, Managers, Resort Admins, and Super Admins—without changing request creation logic/flows.

---

## What I found (why this can happen)
There are two separate “layers” that can prevent staff from seeing new guest requests:

1) **Backend access (visibility / RLS):**
- Staff access to `service_requests` is controlled by RLS.
- There is a policy `staff_select_service_requests` that uses `staff_can_view_request(...)`.
- We already updated `staff_can_view_request` to include `FRONT_OFFICE` in the “view all resort requests” role list, and it already allows `MANAGER`, `RESORT_ADMIN`, and `SUPER_ADMIN`.
- So on paper, the backend visibility rules are correct.

2) **Frontend “immediate sync” behavior (realtime invalidation + polling):**
- Staff Requests Dashboard (`useRequestsDashboard`) has both:
  - realtime subscription, and
  - 5-second polling fallback (`refetchInterval: 5000`)
- Staff Requests Inbox (`useStaffServiceRequests`) has realtime subscription, but:
  - **no polling fallback**
  - and the subscription invalidates a query key prefix that may not cover all active filter variants in a predictable way across TanStack Query v5 usage patterns.

This creates a common failure mode: if the realtime subscription doesn’t fire (temporary disconnect, tab in background, transient auth/resort scope timing, channel not subscribed yet, etc.), the Inbox may never refresh unless there’s manual refetch.

Your symptom is stronger (“never appears even after refresh”), so we’ll also add **diagnostics** and **verify staff resort scoping** in the UI, because the second most common cause is that staff is viewing a different resort than the guest is creating requests in (the staff portal uses a “current resort” selector stored in localStorage).

---

## Immediate fix strategy (no logic/flow changes, only correctness + resilience)

### A) Make Staff Inbox behave like Dashboard: realtime + polling fallback
**File:** `src/hooks/useStaffServiceRequests.ts`

1. Add a polling fallback mirroring dashboard:
   - `staleTime: 2000` (or similar)
   - `refetchInterval: 5000`
   - `refetchIntervalInBackground: false`
   This ensures that even if realtime misses an event, the inbox self-heals within seconds.

2. Strengthen invalidation so it reliably refreshes all “filtered variants”:
   - On realtime change, invalidate:
     - `['staff-service-requests']` (broad)
     - and also `['requests-dashboard', resortId]` (so the dashboard lanes update even if user is currently on the inbox page)
   This removes dependency on partial-key matching behavior for complex filter keys.

Why this helps:
- The inbox query key is `['staff-service-requests', resortId, filters]`. Invalidating `['staff-service-requests']` guarantees all variants get refreshed.

---

### B) Ensure the Staff Dashboard invalidation targets all filter variants too
**File:** `src/hooks/useRequestsDashboard.ts`

- On realtime payload, invalidate:
  - `['requests-dashboard', resortId]` (already done)
  - plus `['requests-dashboard']` (optional broad) or keep resort-scoped but broaden similarly to ensure all filter variants are covered.
- Keep existing 5s polling.

Why:
- If different dashboard filters are active (e.g., department filter sheet), you want all variants to refresh.

---

### C) Add a “Scope & Auth Debug” banner (only visible in non-production / behind a query param)
Because your report is “never appears”, we need to quickly confirm:
- Staff is authenticated (not anon)
- Staff has a resort selected (resortId is set)
- Staff is on the same resort as the guest request
- Staff queries are enabled (they’re disabled if `resortId` is missing or `isStaff` is false)

**Files:**
- `src/pages/staff/RequestsDashboardPage.tsx`
- `src/pages/staff/StaffRequestsInboxPage.tsx`
- (optional shared) `src/components/staff/ScopeDebugBanner.tsx`

Banner shows:
- current resort name/id (short)
- staff user id (short)
- role (super admin / resort role)
- whether realtime channel is “SUBSCRIBED” (from Supabase channel status callback)
- last updated timestamp

This is temporary but extremely helpful: it turns “not showing” into a clear cause within seconds.

---

### D) Fix a critical integrity issue from the prior attempt (types file)
You provided a diff showing we created a migration (good), but the system also indicates `src/integrations/supabase/types.ts` was edited (this should never happen and can cause broken builds or type drift).

**Action:**
- Revert any changes to `src/integrations/supabase/types.ts` back to its generated state (or remove the unintended diff).  
This is required for codebase integrity.

---

## Backend validation step (no new schema; just confirm)
Even though the visibility rules should be correct now, we will confirm:

1) Confirm the function definition in the backend matches the migration (FRONT_OFFICE included).
2) Confirm the staff account you’re using has a `resort_memberships` row for The Residence Falhumaafushi in the active environment (Test vs Live).

Important: Lovable Cloud has separate Test and Live environments. If a guest is creating requests in one environment and staff is viewing the other, requests will “never appear” even though everything is correct.

---

## Acceptance tests (what we’ll verify after implementation)

1) In guest portal, create a request.
2) In staff portal (same environment, same resort selected):
   - Requests Dashboard shows the new request within 0–5s.
   - Requests Inbox shows the new request within 0–5s.
3) Verify across roles:
   - Resort Admin: sees it
   - Manager: sees it
   - Front Office: sees it
   - Super Admin: sees it

---

## Files expected to change (minimal diffs)
1) `src/hooks/useStaffServiceRequests.ts`
   - add polling fallback
   - broaden invalidations on realtime change
   - optional: log channel subscribe errors

2) `src/hooks/useRequestsDashboard.ts`
   - minor invalidation hardening (optional)

3) `src/pages/staff/RequestsDashboardPage.tsx` (optional)
4) `src/pages/staff/StaffRequestsInboxPage.tsx` (optional)
   - temporary debug banner (guarded)

5) Revert unintended modifications:
   - `src/integrations/supabase/types.ts` (restore generated file, no manual edits)

---

## Risks / edge cases addressed
- Realtime channel sometimes fails to subscribe (network, tab background, auth refresh): polling ensures near-instant consistency anyway.
- Multiple filtered queries: broad invalidation ensures any filter state updates.
- Wrong resort selected: debug banner makes this obvious.
- Wrong environment (Test vs Live): debug banner + clear test steps catches it immediately.

