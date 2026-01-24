
# Fix: Null Safety Issues in GuestDetailPage

## Problem Summary

The `GuestDetailPage` component is crashing when navigating to a guest detail view. The debug console shows:
```
ErrorBoundary caught an error: {} { "componentStack": "\n at Rt (https://propera.cc/assets/GuestDetailPage-...
```

The root cause is **missing null safety checks** when accessing nested joined data from the database.

## Root Cause

The component fetches activity bookings and restaurant reservations with Supabase joins:
```typescript
// Activity bookings with nested activity
session:activity_sessions(id, date, start_time, activity:activities(name))

// Restaurant reservations with nested restaurant  
slot:restaurant_time_slots(id, date, start_time, meal_period, restaurant:restaurants(name))
```

However, when rendering the data, the code directly accesses:
- `booking.session.activity.name` (lines 581, 611)
- `reservation.slot.restaurant.name` (lines 663, 695)

**Without optional chaining**. If any `activity` or `restaurant` join returns null (e.g., deleted record, RLS restriction), the component crashes.

The filter logic only checks `if (!b.session)` but NOT `if (!b.session.activity)`, allowing broken data through to the render.

## Solution

1. **Add optional chaining** to all nested property accesses
2. **Enhance filter logic** to exclude bookings/reservations with missing nested data
3. **Add fallback text** for missing activity/restaurant names

## Files to Modify

| File | Lines | Change |
|------|-------|--------|
| `src/pages/guests/GuestDetailPage.tsx` | 185-204 | Add null checks for nested `activity` and `restaurant` in filters |
| `src/pages/guests/GuestDetailPage.tsx` | 581, 611 | Add optional chaining: `booking.session.activity?.name || 'Unknown'` |
| `src/pages/guests/GuestDetailPage.tsx` | 663, 695 | Add optional chaining: `reservation.slot.restaurant?.name || 'Unknown'` |

## Technical Details

### Change 1: Enhanced Filter Logic (Lines 185-204)

```typescript
// Before
const upcomingActivityBookings = activityBookings.filter(b => {
  if (!b.session) return false;
  // ...
});

// After - also check for nested activity
const upcomingActivityBookings = activityBookings.filter(b => {
  if (!b.session || !b.session.activity) return false;
  // ...
});
```

Apply the same pattern to:
- `pastActivityBookings` - add `!b.session.activity` check
- `upcomingReservations` - add `!r.slot.restaurant` check
- `pastReservations` - add `!r.slot.restaurant` check

### Change 2: Render with Optional Chaining (Lines 581, 611)

```typescript
// Before
<TableCell className="font-medium">{booking.session.activity.name}</TableCell>

// After
<TableCell className="font-medium">{booking.session.activity?.name || 'Unknown Activity'}</TableCell>
```

### Change 3: Render with Optional Chaining (Lines 663, 695)

```typescript
// Before
<TableCell className="font-medium">{reservation.slot.restaurant.name}</TableCell>

// After
<TableCell className="font-medium">{reservation.slot.restaurant?.name || 'Unknown Restaurant'}</TableCell>
```

## Impact

- **Fixes**: The ErrorBoundary crash on GuestDetailPage
- **Defensive**: Gracefully handles missing or deleted related records
- **No breaking changes**: Just adds safety, does not change functionality
- **No schema changes required**

## Testing

After the fix:
1. Navigate to `/staff/guests?debug=1`
2. Click on any guest in the list
3. Verify the Guest Detail page loads without errors
4. Check the Error Log section in the debug console - should be empty
5. Verify activity bookings and restaurant reservations display correctly
