
# Fix Plan: Transport Dispatch → Assignment → Driver Completion (End-to-End)

## Problem Summary

Live testing revealed multiple database constraint and enum violations preventing the transport lifecycle from working:

1. **Actor Type Constraint Violation** (buggy_trip_events): RPCs insert `'STAFF'` (uppercase), but the check constraint only allows lowercase: `['guest', 'staff', 'driver', 'system']`
2. **Buggy Status Enum Mismatch**: `rpc_transport_assign_trip` sets `buggies.status = 'in_use'`, but the enum only has: `['available', 'en_route', 'out_of_service', 'charging']`
3. **Missing Event Types**: No formal constraint, but inconsistent event types between tables (transport_events vs buggy_trip_events)

---

## Phase 1: Database Fixes (Migration)

### 1A. Add Missing Buggy Status Enum Value
The `rpc_transport_assign_trip` function tries to set `status = 'in_use'`, but this value doesn't exist.

```sql
ALTER TYPE public.buggy_status ADD VALUE IF NOT EXISTS 'in_use';
```

### 1B. Fix Actor Type Case in RPCs
The following RPCs insert into `buggy_trip_events` with uppercase actor_type, violating the check constraint:

| RPC | Current Value | Required |
|-----|---------------|----------|
| `add_request_to_trip` | `'STAFF'` | `'staff'` |
| `rpc_transport_attach_requests_to_trip` | `'STAFF'` | `'staff'` |
| `rpc_transport_cancel_empty_trip` | `'STAFF'` | `'staff'` |

All three functions need to be recreated with lowercase actor_type values:
- Line 106-108 in `add_request_to_trip`: Change `'STAFF'` to `'staff'`
- Line 232-237 in `rpc_transport_attach_requests_to_trip`: Change `'STAFF'` to `'staff'`
- Line 331-336 in `rpc_transport_cancel_empty_trip`: Change `'STAFF'` to `'staff'`

### 1C. Add Missing Lifecycle State Enum Values (if needed)
Verify `lifecycle_state` column can handle all required states. Current RPC uses these states:
- `planning`, `assigned`, `enroute_to_pickup`, `arrived_pickup`, `enroute_to_dropoff`, `completed`, `cancelled`

---

## Phase 2: Update RPCs with Fixed Values

### Functions to Update

| Function | Table | Issue | Fix |
|----------|-------|-------|-----|
| `add_request_to_trip` | `buggy_trip_events` | `actor_type = 'STAFF'` | Change to `'staff'` |
| `rpc_transport_attach_requests_to_trip` | `buggy_trip_events` | `actor_type = 'STAFF'` | Change to `'staff'` |
| `rpc_transport_cancel_empty_trip` | `buggy_trip_events` | `actor_type = 'STAFF'` | Change to `'staff'` |
| `rpc_transport_assign_trip` | `buggies` | `status = 'in_use'` | Keep (after adding enum value) |
| `rpc_transport_driver_update_trip_state` | N/A | Already uses lowercase `'driver'` | No change needed |

### Implementation

Create a new migration that:
1. Adds `'in_use'` to `buggy_status` enum
2. Recreates the three affected RPC functions with lowercase actor_type values

---

## Phase 3: Frontend - No Changes Required

The frontend hooks are already correctly implemented:
- `useTransportDispatchActions.ts` - Already calls the correct RPCs
- `useDriverLifecycleActions.ts` - Already uses `rpc_transport_driver_update_trip_state`
- `useDriverSession.ts` - Already queries with lifecycle_state

---

## Phase 4: Verification Steps

After the migration, these operations should succeed without errors:

| Operation | RPC | Expected Result |
|-----------|-----|-----------------|
| Create trip from requests | `rpc_transport_create_trip_from_requests` | Trip created, events logged to transport_events |
| Attach requests to trip | `rpc_transport_attach_requests_to_trip` | Requests attached, events logged to buggy_trip_events |
| Cancel empty planning trip | `rpc_transport_cancel_empty_trip` | Trip cancelled, event logged to buggy_trip_events |
| Assign buggy & driver | `rpc_transport_assign_trip` | Trip assigned, buggy status set to 'in_use' |
| Driver advances trip state | `rpc_transport_driver_update_trip_state` | State transitions work |

---

## Technical Details

### Files to Create/Modify

| Type | File | Changes |
|------|------|---------|
| Database Migration | New migration | Add enum value + fix RPC actor_type case |

### Current Enum Values Reference

| Enum | Values |
|------|--------|
| `buggy_status` | available, en_route, out_of_service, charging (need to add: in_use) |
| `buggy_trip_request_state` | queued, picked_up, dropped_off, cancelled, no_show |
| `buggy_trip_status` | planning, assigned, en_route, active, completed, cancelled |
| `driver_status` | offline, online, on_trip, break |

### Actor Type Check Constraint
```sql
CHECK ((actor_type = ANY (ARRAY['guest'::text, 'staff'::text, 'driver'::text, 'system'::text])))
```

---

## Expected Outcomes

After implementation:

1. **"Create Trip"** - Creates trip atomically (uses transport_events, already works)
2. **"Add Request to Trip"** - Attaches requests without constraint violation
3. **"Cancel Empty Trip"** - Cancels planning trips without constraint violation  
4. **"Assign Buggy & Driver"** - Sets buggy status to 'in_use' without enum error
5. **Driver Portal** - Shows assigned trips and can complete them
6. **Guest Portal** - Shows status progression (Finding driver → Driver assigned → etc.)

---

## Migration SQL Preview

```sql
-- Add missing buggy status enum value
ALTER TYPE public.buggy_status ADD VALUE IF NOT EXISTS 'in_use';

-- Recreate add_request_to_trip with lowercase actor_type
CREATE OR REPLACE FUNCTION public.add_request_to_trip(...)
  -- Change line 106: 'STAFF' → 'staff'

-- Recreate rpc_transport_attach_requests_to_trip with lowercase actor_type
CREATE OR REPLACE FUNCTION public.rpc_transport_attach_requests_to_trip(...)
  -- Change line 235: 'STAFF' → 'staff'

-- Recreate rpc_transport_cancel_empty_trip with lowercase actor_type
CREATE OR REPLACE FUNCTION public.rpc_transport_cancel_empty_trip(...)
  -- Change line 334: 'STAFF' → 'staff'
```
