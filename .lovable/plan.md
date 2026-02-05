
# Driver Portal Trip Display Comprehensive Fix

## Problem Summary

The screenshot shows a driver with an assigned trip displaying:
- Status: "en_route" 
- NEXT STOP: "—" (empty)
- PAX: 0
- DIST: "—"
- ETA: "—"
- Only a generic "Continue Trip >" button with no actionable context

**Root Causes Identified:**

### Flaw 1: Trip Stops Not Being Created
The `rpc_transport_create_trip_from_requests` RPC creates trips but does NOT generate `buggy_trip_stops` entries. Database query confirmed the active trip has 0 stops despite having 1 attached request.

The `rpc_transport_attach_requests_to_trip` RPC correctly creates stops, but they use different code paths.

### Flaw 2: Stop Coordinates Missing
All `buggy_stops` in the database have `lat: null, lng: null`. Without coordinates, ETA/distance calculations return "—".

### Flaw 3: DriverHomePage Missing Fallback Display
When `tripStops` is empty, the preview shows dashes. No fallback to derive info from `tripRequests` (which has pickup/dropoff names).

### Flaw 4: Action Button Not Contextual
The "Continue Trip >" button is static and doesn't indicate what action the driver should take based on current `lifecycle_state`.

### Flaw 5: No Direct Route to Trip Runner
From Home, the "Continue Trip" should navigate to the Trip Runner where the driver can take specific actions, but the information shown before clicking is useless.

---

## Comprehensive Fix Plan

### Phase 1: Fix Database - Trip Creation RPC
Update `rpc_transport_create_trip_from_requests` to generate trip stops when attaching requests (matching the behavior of `rpc_transport_attach_requests_to_trip`).

**Database Migration:**
```sql
CREATE OR REPLACE FUNCTION public.rpc_transport_create_trip_from_requests(...)
-- Add stop creation logic for each request:
-- 1. Insert pickup stop with sequence, stop_id, title from request
-- 2. Insert dropoff stop with sequence, stop_id, title from request
```

### Phase 2: Frontend Fallback - Derive Trip Info from Requests
When `tripStops` is empty, fallback to extracting pickup/dropoff info from `tripRequests`.

**File: `src/components/driver/TripPreviewCard.tsx`**
- Add fallback logic: if no stops, derive "next stop" from first request's `pickup_name`
- Show passenger count from requests even when stops missing
- Display pickup → dropoff flow

**File: `src/pages/driver/DriverHomePage.tsx`**
- Enhance the Current Trip card to show request-derived info when stops unavailable
- Add pickup/dropoff location text from request data

### Phase 3: Contextual Action Button
Replace generic "Continue Trip >" with state-specific CTAs.

**Changes in `DriverHomePage.tsx`:**
```text
┌─────────────────────────────────────────┐
│ lifecycle_state   │   Button Label      │
├─────────────────────────────────────────┤
│ assigned          │ Start Trip          │
│ enroute_to_pickup │ View Trip (Heading) │
│ arrived_pickup    │ View Trip (Waiting) │
│ enroute_to_dropoff│ View Trip (Active)  │
└─────────────────────────────────────────┘
```

The button always navigates to Trip Runner, but the label provides context.

### Phase 4: Enhance Trip Preview Information Density
Add derived fields to show meaningful info even with incomplete data.

**File: `src/components/driver/TripPreviewCard.tsx`**
- Add `pickupLocation` display from request
- Add `dropoffLocation` display from request  
- Show "X passengers waiting" summary
- Add status indicator badge

**File: `src/lib/driverTrip.ts`**
- Add `deriveTripInfoFromRequests()` helper function
- Returns: pickupNames[], dropoffNames[], totalPassengers, hasScheduled

### Phase 5: Improve Trip Card on Home Page

**Update Current Trip Card structure:**
```text
┌─────────────────────────────────────────────────────┐
│ Current Trip                     [enroute_to_pickup]│
├─────────────────────────────────────────────────────┤
│ 📍 PICKUP: Main Pool                                │
│ 🏁 DROPOFF: Water Sports                            │
├─────────────────────────────────────────────────────┤
│    👥 3      📏 —       ⏱️ —                        │
│    PAX      DIST      ETA                          │
├─────────────────────────────────────────────────────┤
│ Guest: Vifau Waheed • Room 654                      │
├─────────────────────────────────────────────────────┤
│ [ 🚗 Head to Pickup → ]                             │
│ "Tap when you start driving"                        │
└─────────────────────────────────────────────────────┘
```

---

## Technical Implementation Details

### Database Migration
```sql
-- Fix rpc_transport_create_trip_from_requests to create stops
CREATE OR REPLACE FUNCTION public.rpc_transport_create_trip_from_requests(
  p_resort_id uuid,
  p_request_ids uuid[],
  p_created_by_staff_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trip_id uuid;
  v_request record;
  v_attached_count integer := 0;
  v_stop_sequence integer := 0;
BEGIN
  -- Create trip (existing logic)
  INSERT INTO buggy_trips (...) VALUES (...) RETURNING id INTO v_trip_id;
  
  -- For each request, create junction + stops
  FOR v_request IN 
    SELECT * FROM buggy_requests WHERE id = ANY(p_request_ids)
  LOOP
    -- Create junction entry (existing)
    INSERT INTO buggy_trip_requests (...);
    
    -- Update request status (existing)
    UPDATE buggy_requests SET attached_trip_id = v_trip_id, ...;
    
    -- NEW: Create pickup stop
    v_stop_sequence := v_stop_sequence + 1;
    INSERT INTO buggy_trip_stops (
      trip_id, resort_id, stop_id, stop_kind, title, sequence, status
    ) VALUES (
      v_trip_id, p_resort_id, v_request.pickup_stop_id, 'pickup',
      COALESCE((SELECT name FROM buggy_stops WHERE id = v_request.pickup_stop_id), 
               v_request.pickup_text, 'Pickup'),
      v_stop_sequence, 'pending'
    );
    
    -- NEW: Create dropoff stop
    v_stop_sequence := v_stop_sequence + 1;
    INSERT INTO buggy_trip_stops (
      trip_id, resort_id, stop_id, stop_kind, title, sequence, status
    ) VALUES (
      v_trip_id, p_resort_id, v_request.dropoff_stop_id, 'dropoff',
      COALESCE((SELECT name FROM buggy_stops WHERE id = v_request.dropoff_stop_id),
               v_request.dropoff_text, 'Dropoff'),
      v_stop_sequence, 'pending'
    );
    
    v_attached_count := v_attached_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object('success', true, 'trip_id', v_trip_id, ...);
END;
$$;
```

### Frontend Helper Function
```typescript
// src/lib/driverTrip.ts
export function deriveTripInfoFromRequests(
  tripRequests: TripRequestWithDetails[] | undefined | null
): {
  pickupNames: string[];
  dropoffNames: string[];
  totalPassengers: number;
  firstGuest: { name: string | null; room: string | null } | null;
} {
  if (!tripRequests?.length) {
    return { pickupNames: [], dropoffNames: [], totalPassengers: 0, firstGuest: null };
  }
  
  const pickupNames = tripRequests
    .map(r => r.pickup_name || r.pickup_text)
    .filter(Boolean) as string[];
  const dropoffNames = tripRequests
    .map(r => r.dropoff_name || r.dropoff_text)
    .filter(Boolean) as string[];
  const totalPassengers = tripRequests.reduce((sum, r) => sum + (r.party_size || 0), 0);
  const firstReq = tripRequests[0];
  
  return {
    pickupNames: [...new Set(pickupNames)],
    dropoffNames: [...new Set(dropoffNames)],
    totalPassengers,
    firstGuest: firstReq ? { name: firstReq.guest_name, room: firstReq.room_number } : null,
  };
}
```

### Updated TripPreviewCard
```typescript
// TripPreviewCard.tsx - with fallback logic
const derivedInfo = useMemo(() => {
  if (tripStops?.length) return null; // Use stops if available
  return deriveTripInfoFromRequests(tripRequests);
}, [tripStops, tripRequests]);

// In render:
{derivedInfo ? (
  // Show request-derived pickup/dropoff
  <div>
    <p>📍 Pickup: {derivedInfo.pickupNames.join(', ') || '—'}</p>
    <p>🏁 Dropoff: {derivedInfo.dropoffNames.join(', ') || '—'}</p>
  </div>
) : (
  // Show stop-based info (existing)
)}
```

---

## Files to Modify

### Database
1. **New migration**: Fix `rpc_transport_create_trip_from_requests` to create stops

### Frontend
1. **`src/lib/driverTrip.ts`** - Add `deriveTripInfoFromRequests` helper
2. **`src/components/driver/TripPreviewCard.tsx`** - Add fallback logic for missing stops
3. **`src/pages/driver/DriverHomePage.tsx`** - Enhance Current Trip card with:
   - Contextual action button labels
   - Request-derived info display
   - Guest info row
   - Microcopy guidance

---

## Acceptance Criteria
- [ ] Trip creation RPC generates stops for all attached requests
- [ ] Driver Home shows pickup/dropoff names even when stops missing
- [ ] Passenger count displays correctly (3 in this case)
- [ ] Action button shows contextual label based on lifecycle_state
- [ ] Guest info (name, room) visible on Current Trip card
- [ ] Microcopy guides driver on next action
- [ ] Existing Trip Runner page continues working (no breaking changes)
