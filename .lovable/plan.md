
# Fix: Driver Portal Trip State Transition Enum Errors

## Root Cause Analysis

Two critical enum mismatches are breaking the Driver Portal:

### Issue 1: Invalid `buggy_trip_request_state` Value
The deployed `rpc_transport_driver_update_trip_state` function uses:
```sql
SET state = 'in_progress'::buggy_trip_request_state
```

But the **valid** `buggy_trip_request_state` enum values are:
- `queued`
- `picked_up` (should be used instead of `in_progress`)
- `dropped_off`
- `cancelled`
- `no_show`

### Issue 2: Lifecycle State Mismatch
The frontend defines these lifecycle states in `useDriverLifecycleActions.ts`:
```typescript
type TripLifecycleState = 
  | 'assigned'
  | 'enroute_to_pickup'
  | 'arrived_pickup'      // Frontend sends this
  | 'enroute_to_dropoff'
  | 'completed';
```

But the deployed RPC validates against different values:
```sql
WHEN 'enroute_to_pickup' THEN
  v_valid_transition := p_next_state IN ('at_pickup', 'completed');  -- Expects 'at_pickup'
WHEN 'at_pickup' THEN
  v_valid_transition := p_next_state IN ('enroute_to_dropoff', 'completed');
```

This mismatch means:
- Frontend sends `arrived_pickup`
- RPC expects `at_pickup`
- Result: "Invalid state transition" error

---

## Solution

Create a corrected migration that:

1. **Fix `buggy_trip_request_state`**: Use `picked_up` instead of `in_progress`
2. **Align lifecycle states with frontend**: Accept `arrived_pickup` instead of `at_pickup`
3. **Use correct `buggy_trip_status` values**: `en_route` and `active` (verified valid)

### Enum Reference (from database)

```text
buggy_trip_status:       {planning, assigned, en_route, active, completed, cancelled}
buggy_request_status:    {requested, queued, assigned_to_trip, driver_en_route, arrived, picked_up, completed, cancelled, failed, no_show}
buggy_trip_request_state: {queued, picked_up, dropped_off, cancelled, no_show}
```

---

## Database Migration

```sql
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
BEGIN
  -- 1) Lock and validate trip
  SELECT * INTO v_trip
  FROM buggy_trips
  WHERE id = p_trip_id AND resort_id = p_resort_id
  FOR UPDATE NOWAIT;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found or does not belong to this resort';
  END IF;
  
  -- 2) Verify driver ownership
  IF v_trip.driver_user_id IS DISTINCT FROM p_driver_user_id THEN
    RAISE EXCEPTION 'Trip is not assigned to this driver';
  END IF;
  
  -- 3) Get current lifecycle state (fallback to status if null)
  v_current_state := COALESCE(v_trip.lifecycle_state, v_trip.status::text);
  
  -- 4) Validate state transition (aligned with frontend TripLifecycleState)
  CASE v_current_state
    WHEN 'assigned' THEN
      v_valid_transition := p_next_state = 'enroute_to_pickup';
    WHEN 'enroute_to_pickup' THEN
      v_valid_transition := p_next_state IN ('arrived_pickup', 'completed');
    WHEN 'arrived_pickup' THEN
      v_valid_transition := p_next_state IN ('enroute_to_dropoff', 'completed');
    WHEN 'enroute_to_dropoff' THEN
      v_valid_transition := p_next_state = 'completed';
    ELSE
      v_valid_transition := false;
  END CASE;
  
  IF NOT v_valid_transition THEN
    RAISE EXCEPTION 'Invalid state transition from % to %', v_current_state, p_next_state;
  END IF;
  
  -- 5) Update trip state with CORRECT enum values
  UPDATE buggy_trips
  SET 
    lifecycle_state = p_next_state,
    status = CASE 
      WHEN p_next_state = 'enroute_to_pickup' THEN 'en_route'::buggy_trip_status
      WHEN p_next_state IN ('arrived_pickup', 'enroute_to_dropoff') THEN 'active'::buggy_trip_status
      WHEN p_next_state = 'completed' THEN 'completed'::buggy_trip_status
      ELSE status
    END,
    start_at = CASE 
      WHEN p_next_state = 'enroute_to_pickup' AND start_at IS NULL THEN now()
      ELSE start_at
    END,
    completed_at = CASE 
      WHEN p_next_state = 'completed' THEN now()
      ELSE completed_at
    END,
    updated_at = now()
  WHERE id = p_trip_id;
  
  -- 6) Update trip requests with CORRECT enum values (picked_up, NOT in_progress)
  IF p_next_state IN ('enroute_to_pickup', 'arrived_pickup', 'enroute_to_dropoff') THEN
    UPDATE buggy_trip_requests
    SET state = 'picked_up'::buggy_trip_request_state, updated_at = now()
    WHERE trip_id = p_trip_id AND state = 'queued';
      
    UPDATE buggy_requests
    SET status = 'picked_up'::buggy_request_status, updated_at = now()
    WHERE id IN (SELECT request_id FROM buggy_trip_requests WHERE trip_id = p_trip_id)
      AND status IN ('assigned_to_trip', 'driver_en_route', 'arrived');
  END IF;
  
  IF p_next_state = 'completed' THEN
    UPDATE buggy_trip_requests
    SET state = 'dropped_off'::buggy_trip_request_state, updated_at = now()
    WHERE trip_id = p_trip_id AND state IN ('queued', 'picked_up');
      
    UPDATE buggy_requests
    SET status = 'completed'::buggy_request_status, completed_at = now(), updated_at = now()
    WHERE id IN (SELECT request_id FROM buggy_trip_requests WHERE trip_id = p_trip_id)
      AND status NOT IN ('completed', 'cancelled', 'failed', 'no_show');
  END IF;
  
  -- 7) Log event
  INSERT INTO buggy_trip_events (trip_id, resort_id, event_type, from_status, to_status, actor_type, actor_user_id, payload)
  VALUES (p_trip_id, p_resort_id, 'state_change', v_current_state, p_next_state, 'driver', p_driver_user_id,
    jsonb_build_object('previous_state', v_current_state, 'new_state', p_next_state));
  
  RETURN jsonb_build_object(
    'success', true,
    'trip_id', p_trip_id,
    'previous_state', v_current_state,
    'current_state', p_next_state
  );
EXCEPTION
  WHEN lock_not_available THEN
    RAISE EXCEPTION 'Could not acquire lock. Another operation is in progress.';
END;
$$;
```

---

## Summary of Fixes

| Component | Before (Wrong) | After (Fixed) |
|-----------|----------------|---------------|
| `buggy_trip_request_state` | `'in_progress'` | `'picked_up'` |
| Lifecycle state validation | `'at_pickup'`, `'at_dropoff'` | `'arrived_pickup'`, `'enroute_to_dropoff'` |
| `buggy_trip_status` | `'active'` only | `'en_route'` for pickup, `'active'` for others |
| Request status update | `'assigned'` only | `'assigned_to_trip'`, `'driver_en_route'`, `'arrived'` |

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| New migration | CREATE | Corrected RPC with proper enum values and aligned lifecycle states |

---

## Verification Steps

After migration:
1. Go to Driver Portal `/driver`
2. Open an assigned trip
3. Tap "Start Trip" → Should transition to "En Route to Pickup"
4. Tap "Arrived at Pickup" → Should transition to "Arrived at Pickup"
5. Tap "Passengers Picked Up" → Should transition to "En Route to Dropoff"
6. Tap "Complete Trip" → Trip completes successfully

No enum errors should occur at any step.
