
## Auto-reseed Propera Demo Resort daily

### Approach
Refresh **transactional data only** (guests, sessions, slots, bookings, reservations, feedback) every 24h. Catalog (activities, restaurants, rooms, branding, flags, settings) stays untouched. All dates rebased relative to "today" so the demo always looks current.

### Verification needed before edits
- Read `supabase/functions/demo-reset/index.ts` to see current wipe/seed logic and whether it already targets the shared `DEMO` resort.
- Read `supabase/functions/provision-demo/index.ts` `reseed` branch to reuse its seed logic.
- Confirm the seed in `src/lib/demo-seed.ts` can be invoked from an edge function (or port the date-rebasing logic into the function — edge functions can't import client-side code, so logic will be inlined).

### Changes

**1. `supabase/functions/demo-reset/index.ts` — rewrite as catalog-preserving daily refresh**
- Resolve shared resort: `SELECT id FROM resorts WHERE code = 'DEMO'`. Abort if not found.
- **Wipe (FK-safe order, scoped to demo resort_id only):**
  `activity_bookings` → `restaurant_reservations` → `stay_feedback` → `service_requests` → `room_service_orders` (if exists) → `activity_sessions` → `restaurant_time_slots` → `guests`
- **Re-seed transactional data** with dates anchored to `now()`:
  - 8 guests with check-in offsets `[-3, -2, -1, 0, 0, +1, -1, +2]` from today (mirrors `DEMO_GUESTS` in `src/lib/demo-seed.ts`)
  - Activity sessions for next 10 days across existing catalog activities
  - Restaurant slots for next 10 days across existing restaurants
  - Sample bookings (CONFIRMED/PENDING/COMPLETED/CANCELLED mix) and reservations
  - 2 stay-feedback entries for past guests
- Keep catalog rows (`activities`, `restaurants`, `rooms`, `resort_settings`, `branding`, feature flags, staff users) **completely untouched**.
- Return JSON summary `{ wiped: {...}, seeded: {...} }` for logs.

**2. `supabase/config.toml` — change schedule to daily**
- `[functions.demo-reset]`: `schedule = "0 4 * * *"` (was `"0 6 */4 * *"`). 04:00 UTC, off-peak, no collision with `retention-scheduler` at 03:00 or `process-outbox` (every minute).

**3. Memory**
- New: `mem://features/demo/auto-reseed-policy` — "Shared `DEMO` resort: `demo-reset` edge function runs daily at 04:00 UTC. Wipes transactional data only (guests, sessions, slots, bookings, reservations, feedback). Catalog (activities, restaurants, rooms, branding, settings, flags, staff) preserved. All dates rebased to current day so demo always looks live."
- Update `mem://index.md` Memories list with the new entry.

### Out of scope
- UI button for manual reseed (cron-only per your instruction)
- Catalog regeneration
- Touching any non-DEMO resort
- Provisioning new demo workspaces (handled by `provision-demo`, unchanged)

### Risk
Low. Wipe is scoped strictly to `resort_id = <DEMO>`. Catalog preserved means staff seeded against the demo resort keep working seamlessly across reseeds. First run after deploy will execute at the next 04:00 UTC.

### Files touched
- `supabase/functions/demo-reset/index.ts` (rewrite)
- `supabase/config.toml` (schedule line only)
- `mem://features/demo/auto-reseed-policy` (new)
- `mem://index.md` (append memory entry)
