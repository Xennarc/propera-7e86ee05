

# Fix: Invalid Enum Value 'active' in Transport Triggers

## Problem

When cancelling a buggy request, the error occurs:
```
invalid input value for enum buggy_trip_request_state: "active"
```

**Root Cause**: Two database triggers reference `'active'` as a state value, but the `buggy_trip_request_state` enum only contains:
- `queued`
- `picked_up`
- `dropped_off`
- `cancelled`
- `no_show`

## Affected Triggers

### 1. `sync_trip_request_on_request_update`
```sql
UPDATE buggy_trip_requests 
SET state = NEW.status::buggy_trip_request_state, updated_at = now()
WHERE request_id = NEW.id AND state = 'active';  -- ❌ BROKEN
```

### 2. `validate_request_status_transition`
```sql
IF NOT EXISTS (
  SELECT 1 FROM buggy_trip_requests 
  WHERE request_id = NEW.id AND state = 'active'  -- ❌ BROKEN
) THEN
```

## Solution

Replace `'active'` with `'queued'` - which represents an active/pending request in the trip:

| Old Value | New Value | Rationale |
|-----------|-----------|-----------|
| `'active'` | `'queued'` | `queued` means the request is attached to a trip but not yet picked up |

---

## Database Migration

A single migration to update both trigger functions:

```sql
-- Fix trigger 1: sync_trip_request_on_request_update
CREATE OR REPLACE FUNCTION public.sync_trip_request_on_request_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- When request is cancelled or completed, update corresponding trip_request
  IF NEW.status IN ('cancelled', 'completed', 'failed', 'no_show') THEN
    UPDATE buggy_trip_requests 
    SET state = NEW.status::buggy_trip_request_state, updated_at = now()
    WHERE request_id = NEW.id AND state = 'queued';  -- ✅ FIXED
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix trigger 2: validate_request_status_transition
CREATE OR REPLACE FUNCTION public.validate_request_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Prevent direct transition to 'assigned_to_trip' without going through RPC
  IF NEW.status = 'assigned_to_trip' AND OLD.status IN ('requested', 'queued') THEN
    IF NOT EXISTS (
      SELECT 1 FROM buggy_trip_requests 
      WHERE request_id = NEW.id AND state = 'queued'  -- ✅ FIXED
    ) THEN
      RAISE EXCEPTION 'Request cannot be marked as assigned_to_trip without an active trip link';
    END IF;
  END IF;
  
  -- Prevent going backwards from later states to earlier states (except via cancel)
  IF OLD.status IN ('driver_en_route', 'arrived', 'picked_up') 
     AND NEW.status IN ('requested', 'queued', 'assigned_to_trip')
     AND NEW.status != 'cancelled' THEN
    RAISE EXCEPTION 'Cannot revert request status from % to %', OLD.status, NEW.status;
  END IF;
  
  RETURN NEW;
END;
$function$;
```

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| New migration | CREATE | Fix both trigger functions to use `'queued'` instead of `'active'` |

---

## Verification

After the migration:
1. Go to Guest Portal → My Rides
2. Find an active request (status: Submitted/Queued)
3. Click "Cancel" → Confirm
4. Request should cancel successfully without errors
5. Staff Dashboard should reflect the cancelled state

