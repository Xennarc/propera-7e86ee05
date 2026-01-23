

# Fix Guest Portal "My Bookings" Display + Add Debug Infrastructure

## Current State Summary

After thorough investigation:

### Data Verification (PASS)
| Item | Status | Details |
|------|--------|---------|
| Demo Guest | EXISTS | James Wilson, Room 101, ID: `d2addea7-...` |
| Activity Bookings | 11 RECORDS | 10 CONFIRMED, 1 PENDING |
| Restaurant Reservations | 6 RECORDS | 6 CONFIRMED |
| Login Token | CORRECT | Points to correct guest_id |
| RPC Function | JUST FIXED | Migration deployed with corrected column names |

### Root Cause Analysis
The `guest_get_room_bookings` RPC function had multiple column name mismatches that were progressively fixed:
1. `slot_id` -> `restaurant_slot_id` (fixed)
2. `cuisine_type`, `image_url` removed (fixed)
3. `ab.special_requests` -> `ab.notes` (just fixed)

The RPC should now work correctly after the latest migration.

### Remaining Gap
No debugging infrastructure exists to quickly diagnose similar issues in the future.

---

## Implementation Plan

### Phase A: Debug Panel Component

Create a collapsible debug panel that appears on the My Bookings page when:
- Resort code is `DEMO`, OR
- URL has `?debug=1` query param

```
src/components/guest/GuestDebugPanel.tsx
```

**Features:**
- Shows current `guest_id` and `resort_id`
- Displays RPC response status and error messages
- Shows counts: activities (raw), reservations (raw), filtered counts
- Collapsible to minimize visual intrusion
- Only renders in debug mode

### Phase B: Verification Endpoint

Create a secure debug endpoint callable only by demo sessions:

```
supabase/functions/debug-bookings/index.ts
```

**Returns:**
- Total booking counts by table
- Counts for current guest with status breakdown
- Sample 3 booking IDs with timestamps (no PII)
- RPC execution result (pass/fail with error if any)

**Security:**
- Only works for DEMO resort guests
- No sensitive data exposed

### Phase C: Console Logging Guard

Add guarded console logging to `GuestMyBookings.tsx`:

```typescript
const DEBUG = new URLSearchParams(window.location.search).get('debug') === '1' 
  || guest?.resortId === DEMO_RESORT_ID;

if (DEBUG) {
  console.log('[MyBookings Debug]', {
    guestId: guest?.guestId,
    resortId: guest?.resortId,
    rawActivityCount: result?.activity_bookings?.length,
    rawReservationCount: result?.restaurant_reservations?.length,
    error: error?.message,
  });
}
```

### Phase D: Seeding Integrity Check

Enhance `src/lib/demo-seed.ts` to:
1. Log seeded counts after completion
2. Return a summary object for verification
3. Add a platform_activity_events log entry on seed completion

### Phase E: Demo Reset Enhancements

Update `supabase/functions/demo-reset/index.ts` to:
1. Verify booking counts after reset
2. Return verification payload
3. Log warnings if counts are unexpectedly low

---

## Technical Changes

### 1. New File: `src/components/guest/GuestDebugPanel.tsx`

```typescript
interface DebugPanelProps {
  guestId: string | undefined;
  resortId: string | undefined;
  bookingsData: {
    activity_bookings: any[];
    restaurant_reservations: any[];
  } | null;
  isLoading: boolean;
  error: Error | null;
  filters: { upcoming: number; completed: number; cancelled: number };
}

export function GuestDebugPanel({ ... }: DebugPanelProps) {
  // Collapsible panel showing debug info
}
```

### 2. New File: `src/hooks/useGuestDebugMode.ts`

```typescript
export function useGuestDebugMode(resortCode?: string) {
  const params = new URLSearchParams(window.location.search);
  const isDebug = params.get('debug') === '1';
  const isDemoResort = resortCode === 'DEMO';
  
  return {
    isDebugMode: isDebug || isDemoResort,
    showDebugPanel: isDebug, // Only show panel explicitly with ?debug=1
    logDebug: isDebug || isDemoResort,
  };
}
```

### 3. Update: `src/pages/guest/GuestMyBookings.tsx`

```typescript
// Add at top
import { GuestDebugPanel } from '@/components/guest/GuestDebugPanel';
import { useGuestDebugMode } from '@/hooks/useGuestDebugMode';

// Inside component
const { isDebugMode, showDebugPanel, logDebug } = useGuestDebugMode(guest?.resortCode);

// After RPC call
if (logDebug) {
  console.log('[MyBookings Debug] RPC Response:', {
    guestId: guest?.guestId,
    resortId: guest?.resortId,
    activityCount: result?.activity_bookings?.length ?? 0,
    reservationCount: result?.restaurant_reservations?.length ?? 0,
    hasError: !!error,
    errorMessage: error?.message,
  });
}

// At end of JSX (before closing fragment)
{showDebugPanel && (
  <GuestDebugPanel
    guestId={guest?.guestId}
    resortId={guest?.resortId}
    bookingsData={bookings}
    isLoading={isLoading}
    error={queryError}
    filters={{
      upcoming: upcomingActivities.length + upcomingReservations.length,
      completed: completedActivities.length + completedReservations.length,
      cancelled: cancelledActivities.length + cancelledReservations.length,
    }}
  />
)}
```

### 4. New File: `supabase/functions/debug-bookings/index.ts`

Edge function that:
- Accepts `guest_id` and `resort_id`
- Validates caller is from DEMO resort
- Returns verification payload without PII

### 5. Update: `src/lib/demo-seed.ts`

```typescript
interface SeedResult {
  activityBookings: number;
  restaurantReservations: number;
  guests: number;
  sessions: number;
  slots: number;
}

export async function seedDemoResortData(resortId: string): Promise<SeedResult> {
  // ... existing seeding logic ...
  
  console.log('[Demo Seed] Completed:', {
    activityBookings: bookings.length,
    restaurantReservations: reservations.length,
    guests: guests?.length ?? 0,
    sessions: createdSessions?.length ?? 0,
    slots: createdSlots?.length ?? 0,
  });
  
  return {
    activityBookings: bookings.length,
    restaurantReservations: reservations.length,
    guests: guests?.length ?? 0,
    sessions: createdSessions?.length ?? 0,
    slots: createdSlots?.length ?? 0,
  };
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/guest/GuestDebugPanel.tsx` | CREATE | Debug panel UI |
| `src/hooks/useGuestDebugMode.ts` | CREATE | Debug mode detection |
| `src/pages/guest/GuestMyBookings.tsx` | MODIFY | Add debug panel + logging |
| `supabase/functions/debug-bookings/index.ts` | CREATE | Server-side verification |
| `src/lib/demo-seed.ts` | MODIFY | Add return value + logging |

---

## Security Considerations

1. **Debug panel only visible with explicit `?debug=1` param**
2. **Console logs only in demo resort context**
3. **Server verification only for DEMO resort guests**
4. **No PII in debug outputs** - only IDs and counts
5. **No cross-resort data exposure**

---

## Acceptance Criteria

1. Fresh demo via `/book-demo` -> auto-login -> My Bookings shows seeded bookings
2. Adding `?debug=1` shows collapsible debug panel with counts
3. Console shows debug logs only in debug mode
4. Non-demo resorts see NO debug UI or logs
5. Past/cancelled bookings appear in correct sections
6. No RLS policy allows cross-resort visibility

---

## Immediate Verification

Before implementing debug infrastructure, verify the RPC fix is working:

1. Create fresh demo session via `/book-demo`
2. Click guest portal link
3. Navigate to My Bookings
4. Verify bookings appear correctly

If bookings still don't appear after RPC fix, debug infrastructure will help identify the remaining issue.

