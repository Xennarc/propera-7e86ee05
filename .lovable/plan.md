
## What’s most likely happening (root cause)
The Guest Portal “My Bookings” page depends entirely on the backend RPC `guest_get_room_bookings(p_guest_id)`.

From the codebase, that RPC is currently **internally inconsistent with the actual database schema** in at least two ways:

1) **Rate limit call signature mismatch**
- `guest_get_room_bookings` calls:
  - `PERFORM check_rate_limit('guest_get_room_bookings', 100, 3600);` (3 arguments)
- But `check_rate_limit` is defined as:
  - `check_rate_limit(p_endpoint TEXT, p_identifier TEXT, p_max_attempts INTEGER, p_window_minutes INTEGER)` (4 arguments)
- Result: the RPC will error at runtime before returning any data.

2) **Restaurant reservations column mismatch**
- The `restaurant_reservations` table uses `restaurant_slot_id`, and has `num_adults`, `num_children`.
- But the RPC uses `rr.slot_id` and `rr.party_size`, and also joins `restaurant_time_slots ts ON ts.id = rr.slot_id`.
- Result: the RPC will error at runtime (column does not exist), so the UI receives no bookings.

When the RPC errors, `GuestMyBookings.tsx` logs `Failed to fetch room bookings:` and returns `null`, which produces an empty “no bookings” experience. That would affect **both demo and live resorts** (permanent issue) because it’s a core data access function.

## Goal
Fix the issue permanently so:
- Guest Portal “My Bookings” works for demo and live resorts.
- Demo seeding actually appears (once RPC is fixed, the seeded data will show).
- The UI provides a clear error state if the RPC fails in the future (no silent empty page).

## Implementation plan (approved changes to be done in default mode)

### 1) Create a database migration to correct `guest_get_room_bookings`
Create a new migration that:
- Replaces the RPC with a correct version that:
  - Calls `check_rate_limit` with the correct 4-arg signature, using `p_guest_id::text` (or `v_guest.id::text`) as identifier.
  - Uses correct restaurant reservation columns:
    - `rr.restaurant_slot_id` (not `rr.slot_id`)
    - `rr.num_adults`, `rr.num_children` (not `rr.party_size`)
  - Joins:
    - `JOIN restaurant_time_slots ts ON ts.id = rr.restaurant_slot_id`
  - Returns JSON payload fields consistent with the UI mapping:
    - For restaurant objects, include `num_adults` and `num_children` (or include `party_size` computed as `rr.num_adults + rr.num_children` but we’ll standardize to actual columns to reduce confusion).
- Keeps SECURITY DEFINER + `GRANT EXECUTE` to anon/authenticated as it currently does.

This step is the “permanent fix” for both demo and live.

### 2) Make `GuestMyBookings.tsx` handle RPC failures explicitly (UI resilience)
Update the query logic so that when the RPC errors:
- We show a visible error state on the page (banner/card) with a “Retry” button (calls `refetch`).
- Also keep console logging for debugging.
This prevents the “empty page that looks like no data” problem.

Additionally, align the restaurant mapping in `GuestMyBookings.tsx` to whatever we return:
- If RPC returns `num_adults`/`num_children`, the UI should use those directly (instead of `party_size || 2`).
This prevents hiding valid data due to transformation mismatch.

### 3) Verify demo seeding + live behavior end-to-end
After the RPC fix:
- Demo:
  - Confirm the demo guest (Room 101) sees:
    - 5 activity bookings (CONFIRMED/PENDING, future dates)
    - 3 dining reservations (CONFIRMED, future dates)
  - Confirm staff portal pages show the same seeded bookings.
- Live:
  - Log in as any real guest with bookings and ensure “My Bookings” populates.
  - Confirm cancellations/edits still work (since those call separate RPCs).

### 4) Optional hardening (only if needed after verification)
If “still empty” for some users after the RPC fix, the next most likely cause is UI filtering:
- Upcoming only shows:
  - status in {CONFIRMED, PENDING}
  - date >= today
So if data is all in the past or CANCELLED/NO_SHOW, it may be hidden behind the past/cancelled sections.
If this becomes an issue in practice, we can:
- Improve empty-state messaging to say “No upcoming bookings” and show a button to reveal Past/Cancelled sections.

## Why this fixes the problem permanently
- The core reason nothing shows is that the “single source of truth” RPC is failing due to schema/signature mismatches.
- Fixing the RPC fixes every caller (demo + live) without needing special demo-only logic.
- Adding explicit UI error display prevents silent failures if anything regresses later.

## Files we will touch in implementation (default mode)
- `supabase/migrations/<new_migration>.sql` (new) — fix `guest_get_room_bookings`
- `src/pages/guest/GuestMyBookings.tsx` — improve error handling + align restaurant mapping

## Quick validation checklist (what I will do right after implementing)
- Open Guest Portal → My Bookings:
  - See bookings list populated (demo and/or live).
- Confirm network call to RPC succeeds (no 500/400).
- Confirm no console errors about `guest_get_room_bookings` or missing columns.
- Confirm demo-reset still reseeds and then the guest portal shows seeded bookings.

