

# Fix: Invalid Enum Value 'on_demand' in Trip Creation

## Problem

When creating a trip, the error occurs:
```
invalid input value for enum buggy_trip_type: "on_demand"
Code: 22P02
```

**Root Cause**: The `rpc_transport_create_trip_from_requests` function hardcodes `'on_demand'` as the trip type, but the `buggy_trip_type` enum only contains:
- `pooled_custom`
- `scheduled_pool`
- `fixed_route_run`

## Solution

Change the hardcoded value from `'on_demand'` to `'pooled_custom'` in the RPC function. This is the appropriate type for staff-created trips from queued requests.

---

## Database Migration

```sql
-- Fix: Use valid enum value 'pooled_custom' instead of 'on_demand'
CREATE OR REPLACE FUNCTION public.rpc_transport_create_trip_from_requests(
  p_resort_id uuid,
  p_request_ids uuid[],
  p_created_by_staff_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_trip_id uuid;
  v_request_id uuid;
  v_attached_count integer := 0;
  v_total_party_size integer := 0;
BEGIN
  -- ... existing validation code ...

  -- Create the trip with CORRECT enum value
  INSERT INTO buggy_trips (
    resort_id, status, trip_type, created_by_staff_id, lifecycle_state, created_at, updated_at
  ) VALUES (
    p_resort_id,
    'planning',
    'pooled_custom',  -- ✅ FIXED: was 'on_demand'
    p_created_by_staff_id,
    'planning',
    now(),
    now()
  )
  RETURNING id INTO v_trip_id;

  -- ... rest of function unchanged ...
END;
$function$;
```

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| New migration | CREATE | Fix trip_type from `'on_demand'` to `'pooled_custom'` |

---

## Verification

After migration:
1. Staff Dashboard → Transport → Dispatch Queue
2. Select 1+ pending requests
3. Click "Create Trip"
4. Trip should be created successfully
5. Trip should appear in Planning Trips panel

