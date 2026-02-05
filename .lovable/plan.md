
# Fix: Invalid Enum Value 'in_progress' in Driver Trip State Update

## Problem

When a driver tries to progress a trip (e.g., start trip), the error occurs:
```
Invalid input value for enum buggy_trip_status: "in_progress"
```

**Root Cause**: The `rpc_transport_driver_update_trip_state` function (updated in the last migration) uses:
```sql
WHEN p_next_state = 'enroute_to_pickup' THEN 'in_progress'::buggy_trip_status
```

The `buggy_trip_status` enum does not contain `'in_progress'`. The valid values are:
- `planning`
- `assigned`
- `active` ← This is what should be used instead
- `completed`
- `cancelled`

---

## Solution

Update the status assignment to use `'active'` instead of `'in_progress'`:

```sql
WHEN p_next_state = 'enroute_to_pickup' THEN 'active'::buggy_trip_status
```

---

## Database Migration

```sql
-- Fix: Replace 'in_progress' with valid enum value 'active'
CREATE OR REPLACE FUNCTION public.rpc_transport_driver_update_trip_state(...)
  -- In the status update CASE:
  status = CASE 
    WHEN p_next_state = 'enroute_to_pickup' THEN 'active'::buggy_trip_status  -- FIXED
    WHEN p_next_state = 'completed' THEN 'completed'::buggy_trip_status
    ELSE status
  END,
```

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| New migration | CREATE | Fix trip status from `'in_progress'` to `'active'` |

---

## Verification

After migration:
1. Go to Driver Portal → /driver/trip/{tripId}
2. Tap "Start Trip"
3. Trip should transition without errors
4. Status should update to "active"
