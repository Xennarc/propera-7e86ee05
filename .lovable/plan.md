
# Fix: Driver Portal "COALESCE types cannot be matched" Error

## Problem

When a driver tries to start a trip, the following error appears:
```
COALESCE types text and buggy_trip_status cannot be matched
```

**Root Cause**: In `rpc_transport_driver_update_trip_state`, line 38 uses:
```sql
v_current_state := COALESCE(v_trip.lifecycle_state, v_trip.status);
```

- `lifecycle_state` is type `text`
- `status` is an enum type `buggy_trip_status`

PostgreSQL cannot COALESCE across incompatible types without an explicit cast.

---

## Solution

Cast the enum to text before COALESCE:

```sql
v_current_state := COALESCE(v_trip.lifecycle_state, v_trip.status::text);
```

---

## Database Migration

```sql
-- Fix: Cast status enum to text for COALESCE compatibility
CREATE OR REPLACE FUNCTION public.rpc_transport_driver_update_trip_state(
  p_resort_id uuid,
  p_trip_id uuid,
  p_driver_user_id uuid,
  p_next_state text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip RECORD;
  v_current_state text;
  v_valid_transition boolean := false;
  v_request_count int;
BEGIN
  -- 1) Lock and validate trip
  SELECT * INTO v_trip
  FROM buggy_trips
  WHERE id = p_trip_id
    AND resort_id = p_resort_id
  FOR UPDATE NOWAIT;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found or does not belong to this resort';
  END IF;
  
  -- 2) Verify driver ownership
  IF v_trip.driver_user_id IS DISTINCT FROM p_driver_user_id THEN
    RAISE EXCEPTION 'Trip is not assigned to this driver';
  END IF;
  
  -- 3) Get current lifecycle state (fallback to status if null)
  -- FIX: Cast enum to text for COALESCE compatibility
  v_current_state := COALESCE(v_trip.lifecycle_state, v_trip.status::text);
  
  -- ... rest of function unchanged
END;
$$;
```

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| New migration | CREATE | Fix COALESCE type mismatch by casting enum to text |

---

## Verification

After migration:
1. Go to Driver Portal (/driver)
2. Locate an assigned trip
3. Tap "Start Trip"
4. Trip should transition to "En Route to Pickup" without errors

---

## Note on Feature Request

You also mentioned improving the Driver Portal to show stops in a buggy request. After fixing this bug, we can enhance the stop display in a follow-up iteration if needed.
