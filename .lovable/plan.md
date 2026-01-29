
# Switch Guest to In-House View 12 Hours Before Check-In

## Summary
Modify the pre-arrival detection logic to transition guests from the pre-arrival view to the in-house view **12 hours before their check-in day begins**, rather than at midnight on check-in day.

---

## Current Behavior

The `useIsPrearrivalGuest()` hook calculates whether a guest is pre-arrival using day-based comparison:

```typescript
// Current logic
const daysUntilArrival = differenceInDays(checkInDate, todayStart);
return { isPrearrival: daysUntilArrival > 0 };
```

**Result**: Guest switches to in-house view at **midnight** on check-in day (00:00 resort time).

---

## New Behavior

Switch to hour-based comparison to trigger the transition **12 hours earlier**:

```typescript
// New logic  
const hoursUntilArrival = differenceInHours(checkInDate, nowLocal);
return { isPrearrival: hoursUntilArrival > 12 };
```

**Result**: Guest switches to in-house view at **12:00 PM (noon)** on the day before check-in.

---

## Technical Implementation

### File: `src/hooks/usePrearrivalData.ts`

**Changes to `useIsPrearrivalGuest()` function:**

```typescript
import { differenceInHours, differenceInDays, startOfDay, parseISO } from 'date-fns';

export function useIsPrearrivalGuest(): { isPrearrival: boolean; daysUntilArrival: number; hoursUntilArrival: number } {
  const { guest } = useGuestAuth();
  
  if (!guest) {
    return { isPrearrival: false, daysUntilArrival: 0, hoursUntilArrival: 0 };
  }

  // Get current time in the resort's timezone
  const resortTimezone = guest.resortTimezone || 'UTC';
  const nowLocal = nowInTimezone(resortTimezone);
  
  // Parse check-in date as start of day in resort timezone
  // check_in_date is stored as YYYY-MM-DD, treat as 00:00 resort time
  const checkInDate = startOfDay(parseISO(guest.checkInDate));

  // Calculate hours until check-in day starts
  const hoursUntilArrival = differenceInHours(checkInDate, nowLocal);
  
  // Calculate days for UI display purposes
  const todayStart = startOfDay(nowLocal);
  const daysUntilArrival = differenceInDays(checkInDate, todayStart);

  // CHANGE: Switch to in-house view 12 hours before check-in day
  // e.g., if check-in is Jan 15, guest sees in-house view from Jan 14 at 12:00 PM
  const isPrearrival = hoursUntilArrival > 12;

  return {
    isPrearrival,
    daysUntilArrival: Math.max(0, daysUntilArrival),
    hoursUntilArrival: Math.max(0, hoursUntilArrival),
  };
}
```

---

## Key Changes

| Aspect | Before | After |
|--------|--------|-------|
| Comparison | `differenceInDays() > 0` | `differenceInHours() > 12` |
| Transition time | 00:00 on check-in day | 12:00 PM day before check-in |
| Return type | `{ isPrearrival, daysUntilArrival }` | `{ isPrearrival, daysUntilArrival, hoursUntilArrival }` |

---

## Example Timeline

**Guest check-in date**: January 15, 2026

| Resort Local Time | `hoursUntilArrival` | `isPrearrival` | View Shown |
|-------------------|---------------------|----------------|------------|
| Jan 14, 10:00 AM | 14 hours | `true` | Pre-Arrival |
| Jan 14, 11:59 AM | 12.02 hours | `true` | Pre-Arrival |
| **Jan 14, 12:00 PM** | **12 hours** | **`false`** | **In-House** |
| Jan 14, 6:00 PM | 6 hours | `false` | In-House |
| Jan 15, 12:00 AM | 0 hours | `false` | In-House |

---

## Affected Components

The following components consume `useIsPrearrivalGuest()` and will automatically benefit from the updated logic:

| Component | Usage |
|-----------|-------|
| `GuestLayout.tsx` | Lock icon on restricted nav items |
| `GuestHome.tsx` | Decides whether to render `GuestPrearrivalHome` |
| `GuestPortalGate.tsx` | Shows pre-arrival wizard prompt |
| `GuestRequestsPage.tsx` | Shows blocked state for requests |

No changes needed in these components — they already use the `isPrearrival` boolean.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/usePrearrivalData.ts` | Update `useIsPrearrivalGuest()` to use hour-based comparison with 12-hour threshold; add `hoursUntilArrival` to return type |

---

## Testing Checklist

1. **Pre-arrival guest (>12 hours out)**: Sees pre-arrival home page with countdown
2. **Guest within 12 hours of check-in**: Sees full in-house home page
3. **Guest on check-in day**: Sees in-house view (already covered by <12 hours)
4. **Timezone accuracy**: Test with resort in different timezone than browser
5. **Nav lock icon**: Disappears for "Requests" tab when transitioning to in-house
6. **Pre-arrival wizard**: No longer shown after transition to in-house
