
# Driver Portal Trip Completion Enhancement

## Overview
Enhance the driver's trip completion experience with proper confirmation, navigation, and celebration UI. Ensure the staff portal properly reflects completed trips with live sync visibility.

## Changes

### 1. Trip Completion Success Screen
**File:** `src/components/driver/TripCompletedScreen.tsx` (new)

A celebratory overlay/screen shown after completing a trip:
- Success animation (checkmark with confetti-style pulse)
- Trip summary stats (stops completed, passengers transported, duration)
- "View Summary" button → navigates to history detail
- "Back to Home" primary CTA → auto-triggers after 5s delay
- Auto-redirect to `/driver` after 5 seconds

### 2. Update Trip Runner Page
**File:** `src/pages/driver/DriverTripRunnerPage.tsx`

Modifications:
- Detect when `currentLifecycleState === 'completed'`
- Display `TripCompletedScreen` instead of normal trip runner content
- Pass trip stats (duration, passenger count, stops count) to completion screen
- Add `useEffect` to navigate home after completion with optional delay

### 3. Enhance Lifecycle Actions Hook
**File:** `src/hooks/transport/useDriverLifecycleActions.ts`

Add callback support for completion:
- Return a `lastCompletedTrip` state to track the just-completed trip
- Clear this state when navigating away
- Provide trip summary data for the completion screen

### 4. Staff Portal Completion Visibility
**File:** `src/components/transport/TripsPanel.tsx`

Improvements:
- Add "Completed" tab alongside "Planning" and "Active"
- Show recently completed trips (last 24h) with timestamp
- Completed trips show with distinct styling (muted, checkmark badge)
- Toast notification when a trip is marked completed (via realtime)

### 5. Realtime Toast for Staff
**File:** `src/hooks/sync/useTransportSync.ts`

Add completion detection:
- When `buggy_trips` UPDATE event shows `status = 'completed'`
- Trigger toast: "Trip completed by {driver_name}"
- Include trip summary (X passengers, X stops)

---

## Technical Details

### TripCompletedScreen Component
```text
┌──────────────────────────────────────┐
│                                      │
│            ✓ (animated)              │
│                                      │
│       Trip Completed!                │
│                                      │
│   ┌─────────┬─────────┬─────────┐   │
│   │ 4 stops │ 6 guests│ 23 min  │   │
│   └─────────┴─────────┴─────────┘   │
│                                      │
│      [  Back to Home  ]              │
│                                      │
│     Redirecting in 5s...             │
└──────────────────────────────────────┘
```

### State Detection in Trip Runner
```typescript
// Detect completed state
if (currentLifecycleState === 'completed') {
  return (
    <TripCompletedScreen
      trip={trip}
      stopsCount={stops.length}
      passengersCount={requests.reduce((s, r) => s + r.party_size, 0)}
      duration={/* calculate from start_at/end_at */}
      onGoHome={() => navigate('/driver')}
    />
  );
}
```

### Staff Portal Tabs Update
```typescript
const completedTrips = trips.filter(t => 
  t.status === 'completed' && 
  differenceInHours(new Date(), new Date(t.completed_at)) < 24
);
```

---

## Files to Create
1. `src/components/driver/TripCompletedScreen.tsx`

## Files to Modify
1. `src/pages/driver/DriverTripRunnerPage.tsx`
2. `src/hooks/transport/useDriverLifecycleActions.ts`
3. `src/components/transport/TripsPanel.tsx`
4. `src/hooks/sync/useTransportSync.ts`
5. `src/hooks/transport/useTransportTrips.ts` (add completed trips query)

## Acceptance Criteria
- Driver sees celebratory completion screen after trip ends
- Driver auto-navigates to home after 5 seconds
- Staff sees completed trips in new "Completed" tab
- Staff receives toast notification when driver completes a trip
- All changes sync in real-time between portals
- Mobile-first, dark-mode compatible UI
