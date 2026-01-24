
# Fix: Null Safety Issues Across Staff Portal Pages

## Problem Summary

The debug console is showing persistent ErrorBoundary errors even after the initial fix to `GuestDetailPage.tsx`. The error pattern `ErrorBoundary caught an error: {} { "componentStack": "..."` indicates that other pages in the staff portal are crashing when accessing nested Supabase data without proper null safety checks.

## Root Cause

Multiple pages access nested joined data from Supabase queries without optional chaining:

| File | Line(s) | Unsafe Access |
|------|---------|---------------|
| `ActivitySessionDetailPage.tsx` | 209, 299, 303, 307 | `session.activity.name`, `.duration_minutes`, `.default_price_per_person` |
| `RestaurantSlotDetailPage.tsx` | 160 | `slot.restaurant.name` |
| `CancellationsReport.tsx` | 263, 264, 280 | `activity.name`, `.category`, `restaurant.name` |

When a Supabase join returns `null` for the nested object (e.g., deleted activity/restaurant, RLS restriction, orphaned record), accessing properties like `.name` throws an error that crashes the component.

## Solution

Add optional chaining (`?.`) and fallback values to all nested property accesses across these pages.

## Files to Modify

| File | Description |
|------|-------------|
| `src/pages/activities/ActivitySessionDetailPage.tsx` | Add null checks for `session.activity` |
| `src/pages/restaurants/RestaurantSlotDetailPage.tsx` | Add null checks for `slot.restaurant` |
| `src/pages/reports/CancellationsReport.tsx` | Add null checks in CSV export function |

## Technical Changes

### 1. ActivitySessionDetailPage.tsx

**Early return guard (after existing `!session` check):**
```typescript
// After line 192-200 (!session check)
if (!session.activity) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-muted-foreground">Activity data not available</p>
      </CardContent>
    </Card>
  );
}
```

**OR add optional chaining with fallbacks:**

```typescript
// Line 209
<h1 className="text-2xl font-bold">{session.activity?.name || 'Unknown Activity'}</h1>

// Line 299
<dd className="font-medium">{session.activity?.name || 'Unknown'}</dd>

// Line 303
<dd className="font-medium">{session.activity?.duration_minutes || 0} min</dd>

// Line 307
<dd className="font-medium">${session.activity?.default_price_per_person || '0.00'}</dd>
```

### 2. RestaurantSlotDetailPage.tsx

**Early return guard (after existing `!slot` check):**
```typescript
// After line 143-151 (!slot check)
if (!slot.restaurant) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-muted-foreground">Restaurant data not available</p>
      </CardContent>
    </Card>
  );
}
```

**OR add optional chaining:**
```typescript
// Line 160
<h1 className="text-2xl font-bold">{slot.restaurant?.name || 'Unknown Restaurant'}</h1>
```

### 3. CancellationsReport.tsx (CSV Export)

**Add guards in the forEach loops:**
```typescript
// Lines 258-273 - Activity cancellations
activityCancellations.forEach((c: any) => {
  const activity = c.activity_sessions?.activities;
  if (!activity) return; // Skip if no activity data
  
  const leadTime = differenceInHours(parseISO(c.updated_at), parseISO(c.created_at));
  rows.push([
    'Activity',
    activity.name || 'Unknown',
    activity.category || 'N/A',
    // ... rest unchanged
  ]);
});

// Lines 275-290 - Restaurant cancellations
restaurantCancellations.forEach((c: any) => {
  const restaurant = c.restaurant_time_slots?.restaurants;
  if (!restaurant) return; // Skip if no restaurant data
  
  const leadTime = differenceInHours(parseISO(c.updated_at), parseISO(c.created_at));
  rows.push([
    'Restaurant',
    restaurant.name || 'Unknown',
    // ... rest unchanged
  ]);
});
```

## Recommended Approach

I recommend using **early return guards** for `ActivitySessionDetailPage` and `RestaurantSlotDetailPage` because:

1. These are detail pages where the nested data (activity/restaurant) is essential for the page to make sense
2. An early return with a clear error message is better UX than showing "Unknown Activity" throughout
3. It matches the existing pattern of checking `!session` and `!slot`

For `CancellationsReport.tsx`, use **filter/skip guards** in the loops since:
1. It's a report that should continue processing other records even if one is corrupt
2. Skipping orphaned records is acceptable behavior for a report

## Impact

- Fixes: ErrorBoundary crashes when navigating to detail pages with orphaned/null relations
- Defensive: Gracefully handles deleted or RLS-restricted related records
- No breaking changes: Pages continue to work normally when data is present
- No database changes required

## Testing

After implementation:
1. Navigate to `/staff/activities/sessions?debug=1`
2. Click on any session - verify page loads without errors
3. Navigate to `/staff/restaurants/slots?debug=1`
4. Click on any slot - verify page loads without errors
5. Navigate to `/staff/reports/cancellations?debug=1`
6. Click "Export CSV" - verify it doesn't crash
7. Check the Error Log section in the debug panel - should be empty
