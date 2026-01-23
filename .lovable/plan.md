
# Pre-arrival to In-stay Transition: Activity Availability & Request Restrictions

## Executive Summary

The pre-arrival system has two entry points (token-based email link and Guest Portal login) that both correctly filter activities to the guest's stay dates. However, **Guest Requests are unrestricted** - pre-arrival guests can submit service requests before they've checked in, which is operationally problematic. This plan addresses the gap by adding a gating layer for requests while preserving the activity booking flow.

---

## Current State Analysis

### What Works Correctly
| Component | Status | Details |
|-----------|--------|---------|
| Activity date filtering | Working | `guest_get_available_sessions` filters by `check_in_date` to `check_out_date` |
| Past session blocking | Working | `session_start_timestamptz` prevents viewing/booking started sessions |
| Pre-arrival wizard | Working | Token-based check-in flow at `/prearrival/:token/checkin` |
| Guest Portal home swap | Working | `GuestHome` renders `GuestPrearrivalHome` when `isPrearrival: true` |

### What Needs Fixing
| Issue | Impact | Priority |
|-------|--------|----------|
| Guest Requests accessible in pre-arrival | Guests can request room service before arriving | High |
| Navigation unchanged for pre-arrival | "Requests" tab visible but shouldn't be functional pre-arrival | Medium |
| Token-based booking uses hardcoded guest count | `numAdults: 2` ignores actual party size | Low |

---

## Solution Architecture

### Phase 1: Restrict Guest Requests to In-Stay Only

**Goal:** Prevent guests from submitting service requests until their check-in date.

#### 1.1 Client-Side Gate in GuestRequestsPage

Modify `src/pages/guest/GuestRequestsPage.tsx` to check arrival status:

```text
GuestRequestsPage
  |-- useIsPrearrivalGuest() → { isPrearrival, daysUntilArrival }
  |-- If isPrearrival:
      |-- Render PrearrivalRequestsBlockedState (friendly message)
      |-- Show countdown to check-in
      |-- CTA: "View your stay details" → /guest
  |-- If in-stay:
      |-- Render current request flow (unchanged)
```

#### 1.2 Server-Side Enforcement (RPC Guard)

Add check in request creation RPCs to reject pre-arrival submissions:

```sql
-- In guest_create_service_request or equivalent RPC
IF v_guest.check_in_date > CURRENT_DATE THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'GUEST_NOT_CHECKED_IN'
  );
END IF;
```

### Phase 2: Adaptive Navigation for Pre-arrival

**Goal:** Visually distinguish pre-arrival state in navigation.

#### 2.1 Conditional Tab Behavior

In `src/components/guest/GuestLayout.tsx`:

```text
navItems computation:
  |-- If isPrearrival:
      |-- Requests tab: disabled OR shows "Available on check-in"
  |-- If in-stay:
      |-- All tabs fully enabled
```

#### 2.2 Pre-arrival Tab Indicator

Add visual badge or lock icon on Requests tab for pre-arrival guests:

```text
Requests Tab (pre-arrival)
  |-- Icon: Bell with small lock overlay
  |-- Label: "Requests" with subtle "Check-in" subtext
  |-- onClick: Show toast "Available after check-in" OR navigate to blocked state
```

### Phase 3: Token-Based Flow Improvements

**Goal:** Ensure `/prearrival/:token/experiences` page captures correct guest count.

#### 3.1 Party Size Selection in PreArrivalPage

Modify `src/pages/guest/PreArrivalPage.tsx`:

```text
bookFromItinerary(item):
  |-- Show quick dialog: "How many guests?"
  |-- numAdults selector (1-10)
  |-- numChildren selector (0-10)
  |-- Then call booking mutation with actual values
```

---

## Implementation Details

### File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/pages/guest/GuestRequestsPage.tsx` | Modify | Add pre-arrival gate with friendly blocked state |
| `src/components/guest/GuestLayout.tsx` | Modify | Conditional Requests tab behavior |
| `src/pages/guest/PreArrivalPage.tsx` | Modify | Add guest count selector before booking |
| `src/components/guest/PrearrivalRequestsBlockedState.tsx` | Create | Friendly "not yet available" UI |
| Database migration | Create | Add guard to request creation RPC (if exists) |

---

## Detailed Component Designs

### PrearrivalRequestsBlockedState Component

```text
src/components/guest/PrearrivalRequestsBlockedState.tsx

+--------------------------------------------------+
|                                                  |
|        [Clock Icon with Lock Overlay]            |
|                                                  |
|     Requests Available After Check-in            |
|                                                  |
|   Service requests like room service, towels,    |
|   and housekeeping will be available once        |
|   you've checked in to your room.                |
|                                                  |
|   ┌────────────────────────────────────────┐    |
|   │  🗓️  Check-in: Saturday, Jan 25       │    |
|   │      3 days from now                    │    |
|   └────────────────────────────────────────┘    |
|                                                  |
|   In the meantime, you can:                      |
|                                                  |
|   [Pre-book Activities]  [Reserve Dining]        |
|                                                  |
+--------------------------------------------------+
```

### Navigation Tab States

```text
Pre-arrival State:
┌──────────────────────────────────────────────────┐
│  Home    Activities   Requests*   Bookings       │
│   ●                     🔒                        │
└──────────────────────────────────────────────────┘
* Requests tab shows lock icon, navigates to blocked state

In-stay State:
┌──────────────────────────────────────────────────┐
│  Home    Activities   Requests    Bookings       │
│   ●                                               │
└──────────────────────────────────────────────────┘
* All tabs fully functional
```

---

## Database Changes

### Server-Side Guard (if request creation RPC exists)

```sql
-- Migration: Add pre-arrival check to request creation

CREATE OR REPLACE FUNCTION guest_create_service_request(...)
RETURNS jsonb AS $$
DECLARE
  v_guest guests%ROWTYPE;
BEGIN
  -- Fetch guest
  SELECT * INTO v_guest FROM guests WHERE id = p_guest_id;
  
  -- Check if guest has checked in
  IF v_guest.check_in_date > CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'GUEST_NOT_CHECKED_IN',
      'message', 'Service requests are available after check-in'
    );
  END IF;
  
  -- ... rest of existing logic
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Acceptance Criteria

| Test Case | Expected Result |
|-----------|-----------------|
| Pre-arrival guest taps "Requests" | Sees friendly blocked state with countdown |
| Pre-arrival guest tries API bypass | Server rejects with `GUEST_NOT_CHECKED_IN` |
| In-stay guest taps "Requests" | Normal request flow works |
| Check-in day morning | Requests become available (based on date, not time) |
| Pre-arrival Activities tab | Works normally (sessions filtered to stay dates) |
| Pre-arrival Bookings tab | Shows any pre-booked activities/dining |
| Token-based pre-arrival booking | Prompts for guest count before confirming |

---

## Edge Cases

1. **Same-day check-in**: Guest logs in on check-in day before physically arriving
   - **Decision**: Allow requests on check-in date (operational staff can handle)

2. **Timezone considerations**: Guest in different timezone than resort
   - **Decision**: Use resort timezone for check-in date comparison

3. **Early check-in**: Guest checks in day before official date
   - **Decision**: System uses official `check_in_date` from reservation

---

## Implementation Order

1. **Create `PrearrivalRequestsBlockedState` component** - Friendly UI for blocked state
2. **Update `GuestRequestsPage`** - Add pre-arrival gate with blocked state
3. **Update `GuestLayout` navigation** - Add lock indicator on Requests tab
4. **Add server-side guard** - Prevent API bypass of request restrictions
5. **Fix `PreArrivalPage` guest count** - Add party size selector before booking
6. **Test all flows** - Pre-arrival, check-in day, in-stay transitions

---

## Technical Notes

### Pre-arrival Detection
Uses existing hook from `usePrearrivalData.ts`:
```typescript
const { isPrearrival, daysUntilArrival } = useIsPrearrivalGuest();
// isPrearrival: true if checkInDate > today
// daysUntilArrival: number of days until check-in
```

### Existing Data Flow (Unchanged)
```text
Guest Login → GuestAuthContext stores session
  |-- checkInDate, checkOutDate available
  |-- Used by all RPCs for date-range filtering
  
Activity Booking:
  guest_get_available_sessions(p_guest_id)
    → Filters: check_in_date ≤ date ≤ check_out_date
    → Filters: session not started (timezone-aware)
```

### New Data Flow (Requests)
```text
Guest Requests (Current - No Restriction):
  GuestRequestsPage → createBundle() → guest_create_service_request

Guest Requests (After Fix):
  GuestRequestsPage
    |-- Check: isPrearrival?
        |-- Yes: Render PrearrivalRequestsBlockedState
        |-- No: Render normal flow → createBundle()
    
  Server Guard (Defense in Depth):
    guest_create_service_request
      |-- Check: check_in_date > CURRENT_DATE?
          |-- Yes: Return error GUEST_NOT_CHECKED_IN
          |-- No: Proceed with request creation
```
