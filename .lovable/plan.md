
# Debug: Guest Navigation Error Investigation

## Summary

The original `column restaurants.cuisine_type does not exist` error has been fixed in the codebase:
- `usePrefetch.ts` was updated to remove `cuisine_type`
- The database no longer shows `cuisine_type` errors in recent logs
- The `guest_get_room_bookings` RPC function in the database has been verified to NOT include `cuisine_type`

## Current Status

| Check | Status |
|-------|--------|
| `usePrefetch.ts` fixed | Done |
| Database RPC function | Correct |
| Recent DB error logs | None |
| Supabase types file | Does not contain `cuisine_type` |

## Immediate Actions Required

### Step 1: Hard Refresh Your Browser

The fix has been deployed, but your browser may be caching the old JavaScript bundle. Please:
1. Press **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac) to hard refresh
2. Or clear your browser cache and reload
3. Try navigating to a guest again

### Step 2: If Error Persists, Provide More Details

If you still see an error after refreshing:
1. Open browser DevTools (F12)
2. Go to the **Console** tab
3. Click on a guest in the list
4. Share the **exact error message** you see

This will help identify if there's a different issue occurring.

## Preventive Improvements (Optional)

If the error persists, I can implement these additional safeguards:

### 1. Explicit Field Selection in Restaurant Queries
Several pages use `select('*')` on the `restaurants` table. While this works now (since `cuisine_type` was never in the schema), converting these to explicit field lists would prevent future issues:

| File | Line | Current | Proposed |
|------|------|---------|----------|
| `RestaurantsPage.tsx` | 47 | `select('*')` | `select('id, name, description, ...')` |
| `RestaurantSlotsPage.tsx` | 76 | `select('*')` | `select('id, name, ...')` |
| `RestaurantSlotDetailPage.tsx` | 117 | `select('*')` | `select('id, name, ...')` |
| `CreateRestaurantSlotWizard.tsx` | 129 | `select('*')` | `select('id, name, ...')` |

### 2. React Query Cache Invalidation
Add cache invalidation after navigation to ensure stale data doesn't persist.

## Technical Verification

The database currently has these columns on the `restaurants` table (verified via direct query):
- `id`, `resort_id`, `name`, `description`, `total_capacity`
- `guest_can_book`, `requires_approval`, `guest_cutoff_minutes`
- `max_pax_per_booking`, `guest_can_cancel`, `guest_cancel_cutoff_minutes`
- `is_active`, `created_at`, `updated_at`, `opening_time`, `closing_time`

**`cuisine_type` is NOT present** - this confirms the column was never in the schema, and the error was coming from outdated code references that have now been fixed.
