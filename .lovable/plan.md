

# Fix: Driver "Arrived" Button Fails Due to Legacy State Mismatch

## Problem

The `rpc_transport_driver_update_trip_state` RPC validates state transitions using a CASE statement that only recognizes the new canonical lifecycle states (`enroute_to_pickup`, `arrived_pickup`, `enroute_to_dropoff`). But the database contains legacy values like `en_route` and `active` (from the `buggy_trip_status` enum or older RPCs).

The frontend already handles this via `normalizeLifecycleState()`, but the backend RPC does not normalize before validating -- so the transition is rejected.

**Current trip data in DB:**
- `lifecycle_state: 'en_route'` (legacy)
- `status: 'en_route'`
- Both stops already marked `arrived`

When the driver taps "Arrived at Pickup", the RPC receives `p_next_state = 'arrived_pickup'` but sees `v_current_state = 'en_route'` which has no matching CASE branch, so it fails.

## Fix (2 parts)

### Part 1: Update the RPC to normalize legacy states

Add legacy value handling in the CASE statement of `rpc_transport_driver_update_trip_state`. Before the CASE, normalize `v_current_state`:

```text
-- Normalize legacy lifecycle states
v_current_state := CASE v_current_state
  WHEN 'en_route' THEN 'enroute_to_pickup'
  WHEN 'active'   THEN 'enroute_to_dropoff'
  WHEN 'planning' THEN 'assigned'
  ELSE v_current_state
END;
```

This mirrors the exact same mapping used by the frontend's `normalizeLifecycleState()` function, ensuring backend and frontend agree on state semantics.

### Part 2: Fix the stuck trip data

Run a one-time data fix to update the current stuck trip's `lifecycle_state` from `'en_route'` to `'enroute_to_pickup'` so the driver can immediately proceed. (The RPC fix will prevent this from happening again.)

## Files Modified

| File | Change |
|------|--------|
| Database migration | Add legacy state normalization to `rpc_transport_driver_update_trip_state` RPC |

No frontend code changes needed -- the frontend already normalizes correctly.

## What Does NOT Change

- Frontend components (already handle legacy values)
- Other RPCs
- Trip stops, requests, or any other data
- Routes, navigation, or UI

## Testing

After the fix:
1. The driver should be able to tap "Arrived at Pickup" on the trip runner and have it succeed
2. Any future trips that somehow get legacy state values will also work correctly
3. The state machine will properly advance through all stages

