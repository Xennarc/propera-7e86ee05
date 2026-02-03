
# Fix Plan: Dispatch Trip Creation & Request Attachment

## ✅ COMPLETED

All phases have been implemented:

---

## Phase A: Fix Existing RPCs (Database) ✅

### A1. Fixed `add_request_to_trip` RPC ✅
- Changed `'active'` → `'queued'` for `buggy_trip_request_state`
- Changed `'pending'` → `'requested', 'queued'` for `buggy_request_status` checks

### A2. Created `rpc_transport_attach_requests_to_trip` ✅
Atomic RPC for batch-attaching requests to an existing planning trip.

### A3. Created `rpc_transport_cancel_empty_trip` ✅
Allows staff to cancel empty planning trips with proper validation.

---

## Phase B: Frontend Wiring (Minimal UI Changes) ✅

### B1. Updated `useTransportDispatchActions` hook ✅
- Added `attachRequestsToTrip` mutation
- Added `cancelEmptyTrip` mutation
- Added type definitions for new result types

### B2. Updated `handleAddRequestsToTrip` handler ✅
- Now uses atomic `rpc_transport_attach_requests_to_trip` instead of sequential calls
- Proper error handling with dialog staying open on failure

### B3. Added "Cancel Trip" action for empty planning trips ✅
- TripCard now shows "Cancel Trip" button when trip is in planning state with 0 requests
- TripsPanel passes through the handler
- TransportPage wires up the cancelEmptyTrip mutation

---

## Phase C: Driver Portal Query Fix ✅

### C1. Updated `useDriverTrips` query ✅
Changed from:
```typescript
.in('status', ['assigned', 'en_route', 'active'])
```

To:
```typescript
.or('status.in.(assigned,en_route,active),lifecycle_state.in.(assigned,enroute_to_pickup,arrived_pickup,enroute_to_dropoff)')
```

---

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/transport/useTransportDispatchActions.ts` | Added `attachRequestsToTrip`, `cancelEmptyTrip` mutations |
| `src/hooks/transport/useTransportMutations.ts` | Fixed RPC parameter names (`p_trip_id` instead of `_trip_id`) |
| `src/hooks/transport/useDriverSession.ts` | Updated query to include `lifecycle_state` filter |
| `src/pages/staff/TransportPage.tsx` | Updated handler to use atomic RPC, added cancel handler |
| `src/components/transport/TripsPanel.tsx` | Added cancel trip props passthrough |
| `src/components/transport/TripCard.tsx` | Added "Cancel Trip" button for empty planning trips |

---

## Expected Outcomes

1. ✅ **"Create Trip"** → Creates trip atomically, requests move from queue to trip
2. ✅ **"Add Request"** → Attaches requests to existing trip atomically
3. ✅ **"Assign Buggy & Driver"** → Works when trip has ≥1 request
4. ✅ **Driver Portal** → Shows assigned trips via both `status` and `lifecycle_state`
5. ✅ **Errors** → Visible toasts with descriptive messages (no silent reverts)
6. ✅ **Empty trips** → Can be cancelled via "Cancel Trip" button
