
# Reseed Demo Resort Data & Activities

## Problem
The `demo-reset` edge function fails with `column resorts.feature_flags does not exist`, preventing any reseeding from running. This blocks all 7 passes of the reset (cleanup, dedup, guest freshness, activity sessions, seeded bookings, service requests, and transport).

## Current State
- **DEMO resort**: `7819d1dc-485a-4309-a403-67c16c468f4b` (instance 5, last reset ~30 min ago via RPC)
- **Activities**: 8 active, but **0 sessions** for the next 7 days
- **Guests**: 5 present
- **Restaurants**: 6 active

## Root Cause
Line 105 of `supabase/functions/demo-reset/index.ts` selects `feature_flags` from `resorts`, but that column was never created. The query fails, and the function returns a 404 before doing any work.

## Fix (Single File, Two Lines)

**File:** `supabase/functions/demo-reset/index.ts`

1. **Line 105** -- Remove `feature_flags` from the `.select()` call:
   ```
   .select("id, code, is_demo, name")
   ```

2. **Line 724** -- Change the transport check to default `false` since there's no feature flag column:
   ```typescript
   const transportEnabled = false; // feature_flags column not yet created
   ```

This is the smallest safe change: it unblocks all 7 passes of the reset while keeping transport seeding disabled (it was already gated behind `false` by default via `?? false`).

## After Deploy
- The function will be redeployed automatically.
- I will invoke it to trigger a full reseed.
- Expected outcome: activity sessions created for the next 14 days, guest dates refreshed, seed bookings and restaurant reservations populated.

## No Other Changes
- No schema changes
- No RPC changes
- No UI changes
