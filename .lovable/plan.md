

## Perfect Demo Resort — Final Plan (3 rotated demo users)

### Concept
One canonical DEMO resort. **Pool of 3 demo guest identities + 3 demo staff identities** rotated per visitor (round-robin via atomic counter). Auto-login, no passwords visible. On exit/entry, that visitor's transactional slice resets. No cron.

### Investigation summary (already explored)
- `provision-demo` has many modes — will collapse to one `enter-demo` flow.
- `demo-reset` exists with cron at `0 4 * * *` — will remove cron, keep function for per-visitor reset.
- `useDemoWorkspace` + `useDemoInstanceGuard` + `DemoLoginPage` + `BookDemoPage` are the entry surface — will simplify.
- DEMO resort already exists (`code='DEMO'`, `is_demo=true`); catalog stays untouched.

### Approach

**1. Pool of 3 demo identities (seeded once)**
- Migration creates 3 demo guests in DEMO resort: `room=101/Wilson`, `room=102/Chen`, `room=103/Patel`. Stays rebased relative to today on every reset.
- Migration creates 3 demo staff users (`demo-staff-1@propera.cc`, `demo-staff-2`, `demo-staff-3`) with random server-side passwords stored in a new `demo_credentials` table (RLS: service_role only). Each maps to the DEMO resort with RESORT_ADMIN role.
- New `demo_assignment_counter` table (single row) — atomic `counter = (counter + 1) % 3` returns slot index `0/1/2`.

**2. Single edge function: `demo-enter`** (replaces most `provision-demo` modes)
- Public, no JWT.
- Input: `{ portal: 'guest' | 'staff' }`.
- Logic:
  1. Atomically increment counter → slot `i`.
  2. Wipe transactional rows scoped to `(resort_id=DEMO, guest_id=demo_guests[i])` for guest portal, or all staff-created rows tagged with that staff slot for staff portal.
  3. Rebase that guest's stay to today-centered (check_in = today-1, check_out = today+3).
  4. Return:
     - Guest: `{ guestSession: { guest_id, room, last_name, resort_id, slot } }` → client writes localStorage → redirects to `/resort/demo/guest`.
     - Staff: `{ email, password, slot }` (from `demo_credentials`, fetched server-side) → client calls `signInWithPassword` immediately, never displays creds → redirects to `/staff/dashboard`.

**3. Reset on exit + safety net on entry**
- "Exit Demo" button (header, both portals when `is_demo`) → calls `demo-reset` with `{ slot }` → clears localStorage → signs out → redirects home.
- `pagehide` → `navigator.sendBeacon` to `demo-reset` with slot.
- Every `demo-enter` call also wipes the slot first → safety net for orphaned sessions.

**4. Drop the cron**
- Migration: `SELECT cron.unschedule('demo-reset-daily');` (or actual job name — find via `cron.job` table).
- Remove `[functions.demo-reset] schedule = ...` from `supabase/config.toml`.
- Keep `demo-reset` function (now slot-aware, called on-demand only).

**5. Bookable verification (no code changes expected)**
- Each demo guest has their own `guest_id` → bookings naturally isolated per slot.
- Activities/dining write to `activity_bookings` / `restaurant_reservations` with that `guest_id` → "My Bookings" reads same → works.

**6. Simplified entry UX**
- `BookDemoPage` → two buttons: "Enter as Guest" / "Enter as Staff". Click → `demo-enter` → auto-redirect.
- Remove email capture, magic link UI, password display.
- `DemoLoginPage` → keep for legacy token URLs (410-style fallback that just redirects to `/demo`).

**7. Hardcoded catalog reseed (manual)**
- Single SQL file `supabase/seeds/demo-catalog.sql` (committed). Run manually via migration tool when you want to refresh activities/restaurants/branding. Not automated.

### Files touched

**Database (migrations):**
- New migration: create `demo_credentials` (id, slot, email, password, role) + `demo_assignment_counter` (singleton row) + `demo_get_next_slot()` RPC (atomic) + `demo_get_credentials(slot)` RPC (security definer) + seed 3 guests + 3 staff users + `cron.unschedule(...)` the daily job.

**Edge functions:**
- `supabase/functions/demo-enter/index.ts` — **new**.
- `supabase/functions/demo-reset/index.ts` — refactor to accept `{ slot }`, scope wipe to that slot's guest_id + staff_id; remove cron coupling.
- `supabase/functions/provision-demo/index.ts` — keep as thin shim returning 410 Gone (preserves any in-flight magic links gracefully) OR delete entirely.

**Config:**
- `supabase/config.toml` — remove `schedule = "0 4 * * *"` from `[functions.demo-reset]`.

**Client:**
- `src/lib/demoSingleton.ts` — extend with slot constants + `DemoSlot` type.
- `src/hooks/useDemoEnter.ts` — **new**, wraps `demo-enter` invoke + auto-login + redirect.
- `src/hooks/useDemoExit.ts` — **new**, wraps `demo-reset` + storage clear + signOut.
- `src/hooks/useDemoWorkspace.ts` — **delete** (or thin re-export shim).
- `src/hooks/useDemoInstanceGuard.ts` — **delete**.
- `src/pages/demo/BookDemoPage.tsx` — single-page UX, two CTAs.
- `src/pages/demo/DemoLoginPage.tsx` — simplified fallback.
- `src/components/guest/GuestLayout.tsx` — "Exit Demo" button when `currentResort?.is_demo`.
- Staff shell (find header) — same "Exit Demo" button.

**Memory:**
- `mem://features/demo/auto-reseed-policy` → rewrite as `mem://features/demo/perfect-demo-policy`.
- Update `mem://index.md` reference.

### Secrets
None needed — passwords generated server-side during migration, stored in `demo_credentials` (service_role-only RLS), fetched only inside `demo-enter` edge function.

### Risk
Low. Slot isolation prevents concurrent demo users from clobbering each other (up to 3 simultaneous). Beyond 3, slots cycle and the next visitor inherits a freshly-wiped slot. Catalog never touched. Cron removal is reversible.

### Verification after build
- Click "Enter as Guest" → land on guest portal as one of 3 personas, no login UI.
- Book an activity + a dining slot → see them in "My Bookings".
- Click "Exit Demo" → next "Enter as Guest" gives clean state (next slot).
- Open in 2 tabs simultaneously → different personas, isolated bookings.
- Confirm `cron.job` table no longer lists demo-reset.

