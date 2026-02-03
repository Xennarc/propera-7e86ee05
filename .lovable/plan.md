
# Fix Plan: Dispatch Trip Creation & Request Attachment

## Problem Summary
The dispatch workflow silently fails due to **enum value mismatches** in the legacy RPCs. Database logs show:
- `invalid input value for enum buggy_trip_request_state: "active"` (valid: `queued`)
- `invalid input value for enum buggy_request_status: "pending"` (valid: `requested`)

Additionally, some RPCs are missing and the Driver Portal isn't querying the new `lifecycle_state` column.

---

## Phase A: Fix Existing RPCs (Database)

### A1. Fix `add_request_to_trip` RPC
Update the legacy RPC to use correct enum values:
- Change `'active'` → `'queued'` for `buggy_trip_request_state`
- Change `'pending'` → `'requested'` or `'queued'` for `buggy_request_status` checks
- Also update the status filter from `status = 'pending'` to `status IN ('requested', 'queued')`

### A2. Create `rpc_transport_attach_requests_to_trip`
New atomic RPC for adding requests to an existing planning trip:

```text
Parameters:
  - p_resort_id uuid
  - p_trip_id uuid
  - p_request_ids uuid[]

Validation:
  - Trip exists, belongs to resort, is in 'planning' state
  - Requests belong to resort, not cancelled, not already attached

Actions:
  - Attach requests (set attached_trip_id)
  - Create buggy_trip_requests junction entries with state='queued'
  - Create pickup/dropoff stops in buggy_trip_stops
  - Insert REQUEST_ATTACHED events

Returns: { success, trip_id, attached_count, request_ids }
```

### A3. Create `rpc_transport_cancel_empty_trip`
Allows staff to remove empty planning trips:

```text
Parameters:
  - p_resort_id uuid
  - p_trip_id uuid

Validation:
  - Trip exists and belongs to resort
  - Trip is in 'planning' state
  - Trip has 0 active requests attached

Actions:
  - Set lifecycle_state = 'cancelled', status = 'cancelled'
  - Insert TRIP_CANCELLED event with reason='Empty trip removed by staff'

Returns: { success, trip_id }
```

---

## Phase B: Frontend Wiring (Minimal UI Changes)

### B1. Update `useTransportDispatchActions` hook
Add new mutation wrappers:
- `attachRequestsToTrip` → calls `rpc_transport_attach_requests_to_trip`
- `cancelEmptyTrip` → calls `rpc_transport_cancel_empty_trip`

Ensure all RPCs show proper error toasts on failure (never silent revert).

### B2. Update `AddRequestToTripDialog` handler
In `TransportPage.tsx`, change `handleAddRequestsToTrip`:
- Current: calls legacy `add_request_to_trip` sequentially
- New: calls `dispatchActions.attachRequestsToTrip.mutate()` with array of request IDs
- On success: close dialog, invalidate caches
- On error: show toast, keep dialog open

### B3. Add "Cancel Trip" action for empty planning trips
In `TripCard.tsx`:
- Add a condition: if `trip.status === 'planning' && activeRequests.length === 0`
- Show a "Cancel Empty Trip" button or menu item
- Calls `dispatchActions.cancelEmptyTrip.mutate({ tripId })`

---

## Phase C: Driver Portal Query Fix

### C1. Update `useDriverTrips` query
Currently filters by:
```typescript
.in('status', ['assigned', 'en_route', 'active'])
```

Should also include `lifecycle_state` for the new state machine:
```typescript
.or(`status.in.(assigned,en_route,active),lifecycle_state.in.(assigned,enroute_to_pickup,arrived_pickup,enroute_to_dropoff)`)
```

This ensures drivers see trips assigned through the new atomic RPCs.

---

## Technical Details

### Files to Create/Modify

| Type | File | Change |
|------|------|--------|
| Database | New migration | Fix `add_request_to_trip`, create `rpc_transport_attach_requests_to_trip`, create `rpc_transport_cancel_empty_trip` |
| Hook | `src/hooks/transport/useTransportDispatchActions.ts` | Add `attachRequestsToTrip` and `cancelEmptyTrip` mutations |
| UI | `src/pages/staff/TransportPage.tsx` | Update `handleAddRequestsToTrip` to use new atomic RPC |
| UI | `src/components/transport/TripCard.tsx` | Add "Cancel Trip" button for empty planning trips |
| Query | `src/hooks/transport/useDriverSession.ts` | Update `useDriverTrips` filter to include `lifecycle_state` |

### Enum Value Reference

| Enum | Valid Values |
|------|-------------|
| `buggy_request_status` | `requested`, `queued`, `assigned_to_trip`, `driver_en_route`, `arrived`, `picked_up`, `completed`, `cancelled`, `failed`, `no_show` |
| `buggy_trip_request_state` | `queued`, `picked_up`, `dropped_off`, `cancelled`, `no_show` |
| `buggy_trip_status` | `planning`, `assigned`, `en_route`, `active`, `completed`, `cancelled` |

---

## Expected Outcomes

After implementation:

1. **"Create Trip"** → Creates trip atomically, requests move from queue to trip
2. **"Add Request"** → Attaches requests to existing trip, updates counts
3. **"Assign Buggy & Driver"** → Works when trip has ≥1 request
4. **Driver Portal** → Shows assigned trips immediately
5. **Errors** → Visible toasts with descriptive messages (no silent reverts)
6. **Empty trips** → Can be cancelled via new action button
