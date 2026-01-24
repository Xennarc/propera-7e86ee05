
# Fix: GuestDetailPage ErrorBoundary Crash on Production

## Problem Summary

The Guest Detail page (`/staff/guests/{id}`) is crashing with an ErrorBoundary error on the **published (production) site** for **all guests**. This started recently and does not occur in the preview environment.

## Root Cause Analysis

The crash is caused by **unhandled date parsing** in the `GuestAtAGlanceChips` component and inline date comparisons in `GuestDetailPage`:

| Location | Line | Issue |
|----------|------|-------|
| `GuestAtAGlanceChips.tsx` | 18-19 | Uses `parseISO(checkInDate)` directly without error handling |
| `GuestDetailPage.tsx` | 351 | Uses `new Date(guest.check_in_date) > new Date()` without validation |

When `parseISO()` from `date-fns` receives an unexpected or malformed value, or when JavaScript's `Date` constructor fails to parse a value, it can cause rendering crashes that propagate to the ErrorBoundary.

**Why production only?** 
- Production may have edge cases in date formats or data
- Production database may have data that preview doesn't
- Build optimization differences between environments

## Solution

Add defensive date handling to:
1. `GuestAtAGlanceChips` component - wrap date parsing in try-catch and use `safeParseDateISO`
2. `GuestDetailPage` - add defensive checks for date comparisons
3. Ensure all date parsing uses the existing `safeParseDateISO` utility

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/prearrival/GuestAtAGlanceChips.tsx` | Add safe date parsing with fallback |
| `src/pages/guests/GuestDetailPage.tsx` | Add defensive date comparison |

---

## Technical Changes

### 1. GuestAtAGlanceChips.tsx

Replace raw `parseISO` calls with safe parsing that handles errors:

```typescript
// Current unsafe code (lines 17-19):
const today = startOfDay(new Date());
const checkIn = parseISO(checkInDate);
const checkOut = parseISO(checkOutDate);

// Replace with:
import { safeParseDateISO } from '@/lib/safe-date-format';

const today = startOfDay(new Date());
const checkIn = safeParseDateISO(checkInDate);
const checkOut = safeParseDateISO(checkOutDate);

// And update getStayStatus() to handle null dates:
const getStayStatus = () => {
  // If dates are invalid, return a safe fallback
  if (!checkIn || !checkOut) {
    return {
      label: 'Invalid dates',
      icon: Home,
      className: 'bg-muted text-muted-foreground border-muted-foreground/20',
    };
  }
  
  if (isBefore(today, checkIn)) {
    // ... existing logic
  }
  // ... rest of existing logic
};
```

### 2. GuestDetailPage.tsx

Add defensive date check for the pre-arrival card rendering (line 351):

```typescript
// Current unsafe code (line 351):
{new Date(guest.check_in_date) > new Date(new Date().toDateString()) && (
  <PrearrivalProfileCard ... />
)}

// Replace with:
{(() => {
  const checkInDate = safeParseDateISO(guest.check_in_date);
  return checkInDate && checkInDate > new Date(new Date().toDateString());
})() && (
  <PrearrivalProfileCard ... />
)}

// Or more cleanly:
const isPreArrival = (() => {
  const checkIn = safeParseDateISO(guest.check_in_date);
  return checkIn && checkIn > startOfDay(new Date());
})();

// Then in JSX:
{isPreArrival && (
  <PrearrivalProfileCard ... />
)}
```

Also add import at the top of the file if not already present:
```typescript
import { safeParseDateISO } from '@/lib/safe-date-format';
```

---

## Summary of Changes

| File | Lines | Change Description |
|------|-------|-------------------|
| `GuestAtAGlanceChips.tsx` | 2, 17-44 | Import and use `safeParseDateISO`, add null handling |
| `GuestDetailPage.tsx` | 14, 351 | Add import, wrap date comparison in safe check |

---

## Impact

- **Fixes crash**: Guest Detail page will no longer crash on invalid/unexpected date formats
- **Graceful degradation**: Shows "Invalid dates" badge if dates can't be parsed
- **Consistent**: Uses the existing `safeParseDateISO` utility that's already used elsewhere in the codebase
- **No data loss**: No changes to database or data handling
- **No breaking changes**: Behavior is identical when dates are valid

---

## Testing

After implementation:
1. Navigate to `/staff/guests/{any-guest-id}?debug=1` on **production**
2. Verify the page loads without the ErrorBoundary crash
3. Verify the "At a glance" chips display correctly (Arriving/In-house/Checked out)
4. Verify the Pre-Arrival Profile Card appears correctly for future check-ins
5. Check Error Log in debug panel - should be empty
