

# Fix: Race Condition in Trip Creation Trigger

## Problem

When creating a trip from requests, the error occurs:
```
Request cannot be marked as assigned_to_trip without an active trip link
Code: P0001
```

**Root Cause**: The `rpc_transport_create_trip_from_requests` function does operations in this order:

```text
┌─────────────────────────────────────────────────────────────┐
│  1. UPDATE buggy_requests SET status = 'assigned_to_trip'   │
│                          ↓                                  │
│     TRIGGER FIRES: validate_request_status_transition       │
│     → Checks: EXISTS(buggy_trip_requests WHERE state='queued')
│     → FAILS: Trip link doesn't exist yet!                   │
│                          ↓                                  │
│  2. INSERT INTO buggy_trip_requests (never reached)         │
└─────────────────────────────────────────────────────────────┘
```

The trigger validates that a trip link exists **before** the RPC inserts it.

---

## Solution

Swap the order of operations in `rpc_transport_create_trip_from_requests`:

1. **First** insert into `buggy_trip_requests` (create the trip link)
2. **Then** update `buggy_requests.status` to `assigned_to_trip`

This ensures the trip link exists when the trigger validates.

---

## Updated RPC Logic

```sql
-- Inside the FOREACH loop, swap order:

-- 1. FIRST: Create junction table entry (trip link)
INSERT INTO buggy_trip_requests (
  resort_id, trip_id, request_id, party_size, state, created_at, updated_at
)
SELECT p_resort_id, v_trip_id, v_request_id, br.party_size, 'queued', now(), now()
FROM buggy_requests br
WHERE br.id = v_request_id
ON CONFLICT DO NOTHING;

-- 2. THEN: Update the request status (trigger can now find the trip link)
UPDATE buggy_requests
SET 
  attached_trip_id = v_trip_id,
  assigned_at = NULL,
  status = 'assigned_to_trip',
  updated_at = now()
WHERE id = v_request_id;
```

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| New migration | CREATE | Fix operation order in `rpc_transport_create_trip_from_requests` |

---

## Verification

After migration:
1. Staff Dashboard → Transport → Dispatch Queue
2. Select 1-2 pending requests
3. Click "Create Trip"
4. Trip should be created successfully without errors
5. Requests should show as "Assigned to Trip" status

