

# Fix: Release Buggy and Driver on Trip Completion/Cancellation

## Problem

When a trip is assigned, the `rpc_transport_assign_trip` RPC correctly sets:
- Buggy status: `available` -> `in_use`
- Driver status: `online` -> `on_trip`

However, **neither** of the two trip-ending RPCs release these resources:
- `rpc_transport_driver_update_trip_state` (driver completes trip) -- does NOT reset buggy or driver status
- `rpc_transport_staff_update_trip_status` (staff completes/cancels trip) -- does NOT reset buggy or driver status

This means once a buggy is assigned to a trip, it stays `in_use` forever, even after the trip is completed or cancelled.

## Solution

Update **both** RPCs to release the buggy and driver when a trip reaches a terminal state (`completed` or `cancelled`).

### Change 1: `rpc_transport_driver_update_trip_state`

Add the following after the completion block (after updating `buggy_requests` to `completed`):

```text
-- Release buggy back to available
UPDATE buggies
SET status = 'available', updated_at = now()
WHERE id = v_trip.buggy_id;

-- Release driver back to online
UPDATE buggy_drivers
SET status = 'online', assigned_buggy_id = NULL, updated_at = now()
WHERE user_id = p_driver_user_id
  AND resort_id = p_resort_id;
```

This runs only when `p_next_state = 'completed'`.

### Change 2: `rpc_transport_staff_update_trip_status`

Add resource release in **both** the complete and cancel branches.

For the **complete** branch (after updating `buggy_requests`):

```text
-- Release buggy
UPDATE buggies
SET status = 'available', updated_at = now()
WHERE id = (SELECT buggy_id FROM buggy_trips WHERE id = p_trip_id);

-- Release driver
UPDATE buggy_drivers
SET status = 'online', assigned_buggy_id = NULL, updated_at = now()
WHERE user_id = (SELECT driver_user_id FROM buggy_trips WHERE id = p_trip_id)
  AND resort_id = p_resort_id;
```

For the **cancel** branch (after returning requests to queue):

```text
-- Release buggy (if one was assigned)
UPDATE buggies
SET status = 'available', updated_at = now()
WHERE id = (SELECT buggy_id FROM buggy_trips WHERE id = p_trip_id)
  AND (SELECT buggy_id FROM buggy_trips WHERE id = p_trip_id) IS NOT NULL;

-- Release driver (if one was assigned)
UPDATE buggy_drivers
SET status = 'online', assigned_buggy_id = NULL, updated_at = now()
WHERE user_id = (SELECT driver_user_id FROM buggy_trips WHERE id = p_trip_id)
  AND (SELECT driver_user_id FROM buggy_trips WHERE id = p_trip_id) IS NOT NULL
  AND resort_id = p_resort_id;
```

### Change 3: Fix currently stuck buggies

Run a one-time data correction to release any buggies and drivers that are stuck from already-completed/cancelled trips:

```text
-- Release buggies stuck as in_use with no active trip
UPDATE buggies SET status = 'available', updated_at = now()
WHERE status = 'in_use'
  AND id NOT IN (
    SELECT buggy_id FROM buggy_trips
    WHERE buggy_id IS NOT NULL
      AND status NOT IN ('completed', 'cancelled')
  );

-- Release drivers stuck as on_trip with no active trip
UPDATE buggy_drivers SET status = 'online', assigned_buggy_id = NULL, updated_at = now()
WHERE status = 'on_trip'
  AND user_id NOT IN (
    SELECT driver_user_id FROM buggy_trips
    WHERE driver_user_id IS NOT NULL
      AND status NOT IN ('completed', 'cancelled')
  );
```

## Files Modified

| File | Change |
|------|--------|
| Database migration | Update both RPCs and fix stuck data |

## What Does NOT Change

- No frontend code changes
- Assignment logic unchanged
- Trip state machine transitions unchanged
- No new dependencies

## Summary

This is a backend-only fix. A single migration will:
1. Recreate `rpc_transport_driver_update_trip_state` with buggy/driver release on completion
2. Recreate `rpc_transport_staff_update_trip_status` with buggy/driver release on both complete and cancel
3. Fix any currently stuck buggies and drivers

