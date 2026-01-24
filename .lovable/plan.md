
# Fix GuestDetailPage Error Boundary Crash

## Problem Identified

The `GuestDetailPage` crashes when the `ErrorBoundary` catches an error from unsafe date parsing. Several components use `date-fns`'s `parseISO()` directly without the safe wrapper function (`safeParseDateISO` / `safeFormatDate`). When malformed date strings are encountered, `parseISO` returns an "Invalid Date" object, and subsequent calls to `format()` or `formatDistanceToNow()` throw exceptions.

## Components Requiring Fixes

| File | Line(s) | Unsafe Code | Fix |
|------|---------|-------------|-----|
| `PrearrivalProfileCard.tsx` | 559 | `format(parseISO(review.reviewed_at), ...)` | Use `safeFormatDate` |
| `PrearrivalProfileCard.tsx` | 706-708 | `formatDistanceToNow(parseISO(invite.sent_at/created_at), ...)` | Create safe wrapper |
| `PrearrivalHistoryTimeline.tsx` | 109, 157, 159 | `parseISO(event.created_at)` used in format calls | Use safe wrappers |
| `PrearrivalLinkManager.tsx` | 270 | `format(parseISO(existingLink.last_opened_at), ...)` | Use `safeFormatDate` |
| `StayAccessLinkManager.tsx` | 76, 125, 129 | `parseISO` in date comparisons and formatting | Use safe wrappers |

## Solution

### 1. Add Safe Date Formatting Helpers

Extend `src/lib/safe-date-format.ts` with a new function for safely computing relative time:

```typescript
/**
 * Safely format a relative time string, returning a fallback if the date is invalid.
 */
export function safeFormatDistanceToNow(
  dateStr: string | null | undefined,
  options?: { addSuffix?: boolean },
  fallback: string = 'Unknown time'
): string {
  const date = safeParseDateISO(dateStr);
  if (!date) return fallback;
  
  try {
    return formatDistanceToNow(date, options);
  } catch {
    return fallback;
  }
}

/**
 * Safely check if a date is in the past.
 */
export function safeIsBeforeNow(dateStr: string | null | undefined): boolean {
  const date = safeParseDateISO(dateStr);
  if (!date) return true; // Treat invalid dates as expired
  return isBefore(date, new Date());
}
```

### 2. Update Components

**PrearrivalProfileCard.tsx:**
- Line 559: Replace `format(parseISO(review.reviewed_at), 'MMM d, h:mm a')` with `safeFormatDate(review.reviewed_at, 'MMM d, h:mm a')`
- Lines 706-708 (InviteActivityLine): Replace `formatDistanceToNow(parseISO(...))` with `safeFormatDistanceToNow(...)`

**PrearrivalHistoryTimeline.tsx:**
- Line 109: Use `safeParseDateISO` with null check
- Lines 157, 159: Use `safeFormatDistanceToNow` and `safeFormatDate`

**PrearrivalLinkManager.tsx:**
- Line 270: Replace with `safeFormatDate(existingLink.last_opened_at, 'MMM d')`

**StayAccessLinkManager.tsx:**
- Line 76: Use `safeIsBeforeNow(latestLink.expiresAt)` or similar safe check
- Lines 125, 129: Use `safeFormatDistanceToNow`

## Technical Details

### File: `src/lib/safe-date-format.ts`
Add two new exported functions:
1. `safeFormatDistanceToNow` - safely formats relative time
2. `safeIsBeforeNow` - safely checks if a date is before now

### File: `src/components/prearrival/PrearrivalProfileCard.tsx`
1. Import new safe functions
2. Update line 559: staff review timestamp
3. Update InviteActivityLine component (lines 700-720)

### File: `src/components/prearrival/PrearrivalHistoryTimeline.tsx`
1. Import safe date functions
2. Update HistoryEventItem to handle null dates gracefully

### File: `src/components/prearrival/PrearrivalLinkManager.tsx`
1. Import `safeFormatDate`
2. Update line 270 for last opened date

### File: `src/components/staff/StayAccessLinkManager.tsx`
1. Import safe date functions
2. Update lines 76, 125, 129 for expiry checks and time formatting

## Impact
- Prevents ErrorBoundary crashes from malformed timestamps
- Gracefully displays "Invalid date" or "Unknown time" for bad data
- No visual changes for valid data
- Maintains existing functionality

## Testing
After implementation:
- Navigate to GuestDetailPage for any guest
- Verify no crash occurs
- Check that dates display correctly for guests with valid data
- If a guest has malformed data, verify fallback text displays instead of crash
