

# Fix Driver Portal Display Issues + Add Driver Debug Console

## Problem Summary

The `/driver` and `/driver/trip/*` pages are showing empty/useless information despite having a valid trip with an attached request. Database investigation confirms:

- **Trip** `5263ddc3` exists with `status: en_route`, `lifecycle_state: en_route`, and 1 attached request
- **0 trip stops** exist for this trip (stops were created by the recently updated RPC, but this trip was created BEFORE the migration)
- **The request** has valid data: Guest "Vifau Waheed", Room 654, 3 passengers, Pickup: "Main Pool", Dropoff: "Water Sports"
- **All `buggy_stops`** have `lat: null, lng: null` -- no coordinates exist in the database at all

### Root Causes Identified

1. **Pre-migration trip has no stops**: The RPC fix to create stops only applies to NEW trips. Existing active trips still have 0 stops, and there is no backfill or runtime fallback.

2. **Trip Runner page is empty when stops are 0**: The `DriverTripRunnerPage` only shows useful content (Current Stop card, All Stops list, action buttons) when `stops.length > 0`. With 0 stops, the driver sees just the header, an empty progress bar, and the "Start Trip"/"state advance" button -- but no pickup/dropoff info, no guest info, no passenger count.

3. **Home page fallback exists in `TripPreviewCard` but Trip Runner has NO equivalent fallback**: The `TripPreviewCard` component already has `deriveTripInfoFromRequests()` fallback logic, but the Trip Runner page directly iterates over `stops` and renders nothing when the array is empty.

4. **`lifecycle_state = 'en_route'` is not in the frontend type**: The `TripLifecycleState` type only includes `assigned | enroute_to_pickup | arrived_pickup | enroute_to_dropoff | completed`. The database value `en_route` (from the `buggy_trip_status` enum set via legacy status column) doesn't match any of these, causing `getNextState()` to return `null` and `NEXT_ACTION_LABELS` to return `undefined`. The "advance" button becomes inert.

5. **No Driver Debug Console**: Staff and Guest portals have debug consoles accessible via `?debug=1`, but the Driver Portal has none, making it impossible to diagnose issues in the field.

---

## Implementation Plan

### Phase 1: Fix lifecycle_state Mismatch

**File: `src/hooks/transport/useDriverLifecycleActions.ts`**

The `TripLifecycleState` type and all maps (`LIFECYCLE_STATE_LABELS`, `NEXT_ACTION_LABELS`, `getNextState`) need to handle the legacy `en_route` and `active` values that exist in the database.

- Add `en_route` and `active` to `TripLifecycleState` union as aliases
- Map `en_route` to behave like `enroute_to_pickup` (or allow transition to `arrived_pickup`)  
- Map `active` to behave like `enroute_to_dropoff`
- Add a `normalizeLifecycleState()` helper that maps legacy values to the canonical lifecycle states

**File: `src/pages/driver/DriverTripRunnerPage.tsx`**

- Normalize the `currentLifecycleState` before using it, so `en_route` maps to `enroute_to_pickup` and the state machine works

### Phase 2: Add Request-Based Fallback to Trip Runner

**File: `src/pages/driver/DriverTripRunnerPage.tsx`**

When `stops.length === 0` but `requests.length > 0`, display a fallback section:
- Show pickup and dropoff locations derived from requests using `deriveTripInfoFromRequests()`
- Show guest name and room number
- Show passenger count
- Show the lifecycle action button (which now works after Phase 1 fix)
- Keep the Passengers list section (already works since it reads from `requests`)

This is a new "RequestBasedTripInfo" section inserted where the "Current Stop" card would normally appear.

### Phase 3: Backfill Stops for Active Trips (Database Migration)

Create a one-time migration that generates `buggy_trip_stops` for any active trip that has attached requests but 0 stops. This ensures:
- The current active trip gets stops retroactively
- The Trip Runner stop-based UI works for this trip
- Future trips already get stops from the updated RPC

```sql
-- For each active trip with requests but no stops,
-- create pickup + dropoff stops from the request data
```

### Phase 4: Driver Debug Console

**File: `src/components/driver/DriverDebugConsole.tsx`** (new)

Create a Driver-specific debug console modeled after the existing `StaffDebugConsole`, but tailored to driver context:

Sections:
- **Driver Session**: user_id, status, assigned_buggy, resort
- **Current Trip**: trip_id, status, lifecycle_state, stops count, requests count
- **Trip Data**: raw stop/request details for the active trip
- **GPS/Location**: current driver coordinates, last update time
- **Error Log**: captured errors (reuse `debug-error-capture`)
- **React Query**: pending/recent queries (reuse `debug-query-tracker`)

**File: `src/components/driver/DriverLayout.tsx`** (modify)

- Import and initialize `initErrorCapture()` and `initQueryTracker()`
- Add `?debug=1` URL parameter detection (using `useStaffDebugMode` pattern but with driver-appropriate auth check -- driver must exist in `buggy_drivers`)
- Render `DriverDebugConsole` when debug mode is active

---

## Technical Details

### Lifecycle State Normalization

```typescript
// Map database values to canonical lifecycle states
function normalizeLifecycleState(
  lifecycleState: string | null | undefined,
  tripStatus: string
): TripLifecycleState {
  const state = lifecycleState || tripStatus;
  switch (state) {
    case 'assigned': return 'assigned';
    case 'enroute_to_pickup': return 'enroute_to_pickup';
    case 'en_route': return 'enroute_to_pickup'; // legacy mapping
    case 'arrived_pickup': return 'arrived_pickup';
    case 'active': return 'enroute_to_dropoff'; // legacy mapping
    case 'enroute_to_dropoff': return 'enroute_to_dropoff';
    case 'completed': return 'completed';
    default: return 'assigned';
  }
}
```

### Request-Based Fallback in Trip Runner

```text
When stops = 0, requests > 0:
 ┌──────────────────────────────────────────┐
 │ Trip Information                         │
 ├──────────────────────────────────────────┤
 │ PICKUP: Main Pool (Leisure)             │
 │ DROPOFF: Water Sports (Activities)      │
 ├──────────────────────────────────────────┤
 │ Guest: Vifau Waheed - Room 654          │
 │ Passengers: 3                           │
 ├──────────────────────────────────────────┤
 │ [ Arrived at Pickup ]                   │
 │ "Tap when you reach the pickup"         │
 └──────────────────────────────────────────┘
```

### Backfill SQL Pattern

```sql
INSERT INTO buggy_trip_stops (trip_id, resort_id, stop_id, stop_kind, title, sequence, status, related_request_id)
SELECT 
  btr.trip_id,
  bt.resort_id,
  br.pickup_stop_id,
  'pickup',
  COALESCE(ps.name, br.pickup_text, 'Pickup'),
  (ROW_NUMBER() OVER (PARTITION BY btr.trip_id ORDER BY btr.created_at)) * 2 - 1,
  'pending',
  br.id
FROM buggy_trip_requests btr
JOIN buggy_trips bt ON bt.id = btr.trip_id
JOIN buggy_requests br ON br.id = btr.request_id
LEFT JOIN buggy_stops ps ON ps.id = br.pickup_stop_id
WHERE bt.status NOT IN ('completed', 'cancelled')
  AND NOT EXISTS (SELECT 1 FROM buggy_trip_stops WHERE trip_id = btr.trip_id);
-- Plus similar INSERT for dropoff stops
```

---

## Files to Create
1. `src/components/driver/DriverDebugConsole.tsx` -- Driver-specific debug overlay

## Files to Modify
1. `src/hooks/transport/useDriverLifecycleActions.ts` -- Add `normalizeLifecycleState()`, update types/maps
2. `src/pages/driver/DriverTripRunnerPage.tsx` -- Normalize state, add request-based fallback UI
3. `src/components/driver/DriverLayout.tsx` -- Init error/query tracking, render debug console
4. Database migration -- Backfill stops for existing active trips

## Acceptance Criteria
- Driver sees pickup/dropoff names, guest info, and passenger count on Trip Runner even when stops are missing
- The "advance state" button works correctly for trips with `lifecycle_state = 'en_route'` or `'active'`
- Existing active trips get stops backfilled so the full stop-based UI works
- Driver Debug Console accessible via `?debug=1` showing session, trip, GPS, error, and query data
- No breaking changes to the Staff or Guest portals
