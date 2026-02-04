

# Plan: Update Request Feature Blocking to ±1 Day Window

## Current Behavior
- Requests are blocked until 12 hours before check-in day
- No post-departure blocking exists

## New Behavior
- Block requests until 1 day before arrival (24 hours before check-in day starts)
- Block requests 1 day after departure (24 hours after check-out day ends)

---

## Changes Required

### 1. Update `useIsPrearrivalGuest` Hook
**File**: `src/hooks/usePrearrivalData.ts`

Rename and expand the hook to `useGuestStayWindow` (or keep existing name but extend return values):

```typescript
export function useGuestStayWindow(): {
  isBeforeStay: boolean;      // More than 1 day before arrival
  isAfterStay: boolean;       // More than 1 day after departure
  isRequestsBlocked: boolean; // Either before or after
  daysUntilArrival: number;
  daysSinceDeparture: number;
}
```

**Logic changes:**
- Change threshold from 12 hours to 24 hours (1 day) before check-in
- Add new calculation for days since check-out
- Add `isAfterStay` when current date > check-out date + 1 day

### 2. Create Post-Departure Blocked State Component
**File**: `src/components/guest/PostDepartureRequestsBlockedState.tsx` (new)

Similar to `PrearrivalRequestsBlockedState` but with different messaging:
- Title: "Your Stay Has Ended"
- Message: "Service requests are no longer available after checkout."
- Show checkout date instead of check-in countdown
- Provide link to book future stays or contact the resort

### 3. Update `GuestRequestsPage` Logic
**File**: `src/pages/guest/GuestRequestsPage.tsx`

Add post-departure check:

```typescript
const { isBeforeStay, isAfterStay, daysUntilArrival, daysSinceDeparture } = useGuestStayWindow();

// Show blocked state for pre-arrival guests (>1 day before)
if (isBeforeStay) {
  return <PrearrivalRequestsBlockedState ... />;
}

// Show blocked state for post-departure guests (>1 day after)
if (isAfterStay) {
  return <PostDepartureRequestsBlockedState ... />;
}
```

### 4. Update `PrearrivalRequestsBlockedState` Component
**File**: `src/components/guest/PrearrivalRequestsBlockedState.tsx`

Minor text updates to reflect the new 1-day-before timing if needed in the countdown display.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/usePrearrivalData.ts` | Extend hook to calculate post-departure status, change threshold to 24 hours |
| `src/components/guest/PostDepartureRequestsBlockedState.tsx` | New component for post-checkout blocked state |
| `src/components/guest/PrearrivalRequestsBlockedState.tsx` | Update messaging if needed |
| `src/pages/guest/GuestRequestsPage.tsx` | Add post-departure blocking check |

---

## Technical Details

### Timing Logic (Resort Timezone Aware)

```typescript
// Pre-arrival: block if more than 24 hours until check-in day
const hoursUntilArrival = differenceInHours(checkInDate, nowLocal);
const isBeforeStay = hoursUntilArrival > 24;

// Post-departure: block if more than 24 hours since check-out day ended
const checkOutEnd = endOfDay(parseISO(guest.checkOutDate));
const hoursSinceDeparture = differenceInHours(nowLocal, checkOutEnd);
const isAfterStay = hoursSinceDeparture > 24;

// Combined flag for blocking
const isRequestsBlocked = isBeforeStay || isAfterStay;
```

### Example Timeline

| Scenario | Check-in | Check-out | Today | Requests Available? |
|----------|----------|-----------|-------|---------------------|
| 2 days before | Jan 15 | Jan 20 | Jan 13 | No (blocked) |
| 1 day before | Jan 15 | Jan 20 | Jan 14 | Yes (within window) |
| During stay | Jan 15 | Jan 20 | Jan 17 | Yes |
| Checkout day | Jan 15 | Jan 20 | Jan 20 | Yes |
| 1 day after | Jan 15 | Jan 20 | Jan 21 | Yes (grace period) |
| 2 days after | Jan 15 | Jan 20 | Jan 22 | No (blocked) |

---

## Backward Compatibility

- Existing `isPrearrival` return value preserved for other features that may use it
- New return values added alongside existing ones
- No breaking changes to component props

