
# Improve Booking Details - Dynamic Cancellation Window Display

## Summary
Fix the booking details policy section to show accurate, dynamically-generated cancellation information based on actual configured values from the database. Address the screenshot issue showing "60 hours" by fixing the data mapping and improving microcopy.

---

## Current Issues Identified

### 1. Data Mapping Bug (Critical)
In `src/pages/guest/GuestMyBookings.tsx` (line 135), activities are incorrectly mapped:
```tsx
// WRONG: Using minutes field
guest_cancel_cutoff_minutes: b.session?.activity?.guest_cancel_cutoff_minutes ?? 60,
```

But the database schema for activities uses **hours** (`guest_cancel_cutoff_hours`). This causes the display to show "60 hours" when it should show "X hours" based on actual config.

### 2. Hardcoded Policy Text
In `BookingDetailsPolicies.tsx`, the default message is generic:
```tsx
`Bookings can be cancelled up to ${booking.cancelCutoffHours} hours before the start time.`
```

This doesn't account for:
- Different time units (hours vs minutes)
- Smart formatting (e.g., "24 hours" vs "2 hours" vs "30 minutes")
- Restaurant-specific phrasing

### 3. Missing Dynamic Time Format
The cutoff time display could be more user-friendly by showing relative time when applicable (e.g., "in 2 hours" vs "Jan 29, 5:30 AM").

---

## Solution

### Phase 1: Fix Data Mapping in GuestMyBookings

Update the RPC result mapping to use correct field names:

**File: `src/pages/guest/GuestMyBookings.tsx`**

```tsx
// For activities - use hours (database uses guest_cancel_cutoff_hours)
const activity_bookings = (result?.activity_bookings || []).map((b: any) => ({
  // ... existing fields ...
  guest_cancel_cutoff_hours: b.session?.activity?.guest_cancel_cutoff_hours ?? 4,
  // ... rest unchanged ...
}));

// For restaurants - continue using minutes (database uses guest_cancel_cutoff_minutes)
const restaurant_reservations = (result?.restaurant_reservations || []).map((r: any) => ({
  // ... existing fields ...
  guest_cancel_cutoff_minutes: r.slot?.restaurant?.guest_cancel_cutoff_minutes ?? 60,
  // ... rest unchanged ...
}));
```

### Phase 2: Improve mapActivityToDisplayModel 

**File: `src/types/booking-display.ts`**

Update to correctly read the hours field:
```tsx
export function mapActivityToDisplayModel(
  booking: any,
  guestId: string,
  timezone?: string
): BookingDisplayModel {
  // ...
  
  // Activities use HOURS for cancellation cutoff
  const cutoffHours = booking.guest_cancel_cutoff_hours ?? 4;
  const cutoffTime = sessionDateTime 
    ? new Date(sessionDateTime.getTime() - cutoffHours * 60 * 60 * 1000)
    : undefined;
  
  return {
    // ...
    cancelCutoffHours: cutoffHours,
    // ...
  };
}
```

### Phase 3: Enhance BookingDetailsPolicies Component

**File: `src/components/guest/booking-details/BookingDetailsPolicies.tsx`**

#### 3a. Add Smart Time Formatting Helper

```tsx
/**
 * Format cutoff duration in human-readable form
 * e.g., 4 hours, 30 minutes, 2 hours
 */
function formatCutoffDuration(hours: number | undefined, isRestaurant: boolean): string {
  if (hours === undefined || hours === null) return '';
  
  // Restaurants typically use shorter windows, check if we should show minutes
  if (isRestaurant && hours < 2) {
    const minutes = Math.round(hours * 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  // For whole hours, show simply
  if (hours === Math.floor(hours)) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  // For fractional hours, convert to hours and minutes
  const wholeHours = Math.floor(hours);
  const remainingMinutes = Math.round((hours - wholeHours) * 60);
  
  if (wholeHours === 0) {
    return `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  }
  
  if (remainingMinutes === 0) {
    return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''}`;
  }
  
  return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''} ${remainingMinutes} min`;
}
```

#### 3b. Add Relative Time Display

```tsx
import { formatDistanceToNow, differenceInHours, differenceInMinutes } from 'date-fns';

// Show relative time when deadline is within 24 hours
function formatDeadlineDisplay(cutoffTime: Date): { primary: string; secondary?: string } {
  const now = new Date();
  const hoursUntil = differenceInHours(cutoffTime, now);
  
  if (cutoffTime < now) {
    // Deadline passed
    return { primary: format(cutoffTime, 'MMM d, h:mm a') };
  }
  
  if (hoursUntil < 24) {
    // Within 24 hours - show relative
    const minutesUntil = differenceInMinutes(cutoffTime, now);
    if (minutesUntil < 60) {
      return { 
        primary: `${minutesUntil} minutes remaining`,
        secondary: format(cutoffTime, 'h:mm a')
      };
    }
    return { 
      primary: `${hoursUntil} hours remaining`,
      secondary: format(cutoffTime, 'h:mm a')
    };
  }
  
  // More than 24 hours - show absolute
  return { primary: format(cutoffTime, 'MMM d, h:mm a') };
}
```

#### 3c. Update Display Logic

Generate contextual messages based on booking type and state:

```tsx
// When cancellation is still available
{canStillCancel ? (
  <>
    <p className="font-medium">Free cancellation available</p>
    {cutoffTime && (
      <p className="text-sm opacity-80">
        {formatDeadlineDisplay(cutoffTime).primary}
        {formatDeadlineDisplay(cutoffTime).secondary && (
          <span className="block text-xs">{formatDeadlineDisplay(cutoffTime).secondary}</span>
        )}
      </p>
    )}
  </>
) : (
  // When window is closed
  <>
    <p className="font-medium">Cancellation window closed</p>
    {cutoffTime && (
      <p className="text-sm opacity-80">
        Deadline was {format(cutoffTime, 'MMM d, h:mm a')}
      </p>
    )}
  </>
)}

// Policy explanation text
{!hasPolicyText && hasCancellationInfo && booking.cancelCutoffHours !== undefined && (
  <p className="text-sm text-muted-foreground">
    {booking.type === 'restaurant' 
      ? `Reservations can be cancelled up to ${formatCutoffDuration(booking.cancelCutoffHours, true)} before your booking time.`
      : `Bookings can be cancelled up to ${formatCutoffDuration(booking.cancelCutoffHours, false)} before the activity starts.`
    }
  </p>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/guest/GuestMyBookings.tsx` | Fix RPC mapping to use `guest_cancel_cutoff_hours` for activities |
| `src/types/booking-display.ts` | Update `mapActivityToDisplayModel` to correctly handle hours |
| `src/components/guest/booking-details/BookingDetailsPolicies.tsx` | Add smart formatting helpers, improve microcopy |

---

## Expected Results

### Before (Current)
```
Cancellation window closed
Deadline was Jan 29, 5:30 AM

Bookings can be cancelled up to 60 hours before the start time.
```

### After (Fixed)
```
Cancellation window closed  
Deadline was Jan 29, 5:30 AM

Bookings can be cancelled up to 4 hours before the activity starts.
```

Or when cancellation is still available:
```
Free cancellation available
2 hours remaining
(by 3:30 PM)

Bookings can be cancelled up to 4 hours before the activity starts.
```

---

## Testing Checklist

1. Create an activity with `guest_cancel_cutoff_hours` = 4
2. Book the activity as a guest
3. Open booking details and verify:
   - Correct cutoff time is calculated (4 hours before start)
   - Policy text shows "4 hours" not "60 hours"
   - Relative time shows when deadline is close
4. Test restaurant reservations still work (use minutes)
5. Test edge cases:
   - Cutoff exactly 1 hour (singular "hour")
   - Cutoff 30 minutes (shows "30 minutes")
   - Cutoff 1.5 hours (shows "1 hour 30 min")
6. Verify past bookings don't show policy section
