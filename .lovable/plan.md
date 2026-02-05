
# Fix: Cannot Cast buggy_request_status to buggy_trip_request_state

## Problem

A new error now appears when cancelling:
```
cannot cast type buggy_request_status to buggy_trip_request_state
Code: 42846
```

**Root Cause**: The trigger function uses direct enum-to-enum casting:
```sql
SET state = NEW.status::buggy_trip_request_state
```

PostgreSQL doesn't allow direct casting between different enum types, even when the value exists in both. We must cast through `text` first.

## Enum Comparison

| buggy_request_status | buggy_trip_request_state |
|---------------------|-------------------------|
| requested | - |
| queued | queued |
| assigned_to_trip | - |
| driver_en_route | - |
| arrived | - |
| picked_up | picked_up |
| completed | → dropped_off (mapped) |
| cancelled | cancelled |
| failed | → cancelled (mapped) |
| no_show | no_show |

Note: `completed` and `failed` don't exist in `buggy_trip_request_state`, so we need explicit mapping.

---

## Solution

Update `sync_trip_request_on_request_update` to:
1. Cast through `text` first: `(NEW.status::text)::buggy_trip_request_state`
2. Map incompatible values explicitly (`completed` → `dropped_off`, `failed` → `cancelled`)

```sql
CREATE OR REPLACE FUNCTION public.sync_trip_request_on_request_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_state buggy_trip_request_state;
BEGIN
  -- When request reaches a terminal state, update corresponding trip_request
  IF NEW.status IN ('cancelled', 'completed', 'failed', 'no_show') THEN
    -- Map request status to trip_request state (different enums!)
    v_new_state := CASE NEW.status
      WHEN 'completed' THEN 'dropped_off'::buggy_trip_request_state
      WHEN 'failed' THEN 'cancelled'::buggy_trip_request_state
      ELSE (NEW.status::text)::buggy_trip_request_state
    END;
    
    UPDATE buggy_trip_requests 
    SET state = v_new_state, updated_at = now()
    WHERE request_id = NEW.id AND state = 'queued';
  END IF;
  
  RETURN NEW;
END;
$function$;
```

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| New migration | CREATE | Fix enum casting with explicit mapping |

---

## Verification

After migration:
1. Guest Portal → My Rides → Cancel an active request
2. Should succeed without error
3. Request shows as Cancelled in both guest and staff views
