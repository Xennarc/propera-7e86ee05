

# Add Null Safety Guards Across Staff Portal Pages

## Overview

This plan adds defensive null safety checks to multiple staff portal pages that access nested Supabase joined data. These patterns were identified from the same root cause as the `GuestDetailPage` crash - accessing properties like `.name` on potentially null joined objects.

---

## Files to Modify

| File | Issue | Priority |
|------|-------|----------|
| `src/pages/staff/GuestRequestsPage.tsx` | Multiple unsafe accesses to nested activity/restaurant/guest data | High |
| `src/pages/activities/ActivitySessionsPage.tsx` | Access to `session.activity?.name` in table column | Medium |
| `src/pages/restaurants/RestaurantSlotsPage.tsx` | Access to `slot.restaurant?.name` in table column + wrong navigation path | Medium |
| `src/pages/dashboards/ResortAdminHome.tsx` | Access to `session.activities?.name`, `slot.restaurants?.name`, `fb.guests?.full_name` | Medium |
| `src/pages/staff/TodaysOpportunitiesPage.tsx` | Already has fallbacks - needs review for consistency | Low |

---

## Technical Changes

### 1. GuestRequestsPage.tsx (High Priority - 12 unsafe accesses)

This page has the most unsafe accesses across both rendering and mutation handlers.

**Rendering issues (lines 689, 694, 742, 787, 792, 840):**

```typescript
// Line 689 - Activity pending requests
{request.activity_sessions.activities.name}
// Change to:
{request.activity_sessions?.activities?.name || 'Unknown Activity'}

// Line 694, 792 - Guest name
{request.guests.full_name}
// Change to:
{request.guests?.full_name || 'Guest'}

// Line 742 - Reject dialog title
title: request.activity_sessions.activities.name,
// Change to:
title: request.activity_sessions?.activities?.name || 'Activity',

// Line 787 - Restaurant pending requests
{request.restaurant_time_slots.restaurants.name}
// Change to:
{request.restaurant_time_slots?.restaurants?.name || 'Unknown Restaurant'}

// Line 840 - Restaurant reject dialog title
title: request.restaurant_time_slots.restaurants.name,
// Change to:
title: request.restaurant_time_slots?.restaurants?.name || 'Restaurant',
```

**Mutation handlers (lines 274, 311, 370, 407):**

Add guards before accessing nested data in notification messages:

```typescript
// Lines 266-276 - approveActivityMutation onSuccess
const session = booking.activity_sessions;
if (session?.activities?.name) {
  const dateStr = format(parseISO(session.date), 'EEE, MMM d');
  createGuestNotification({
    // ... 
    message: `Your booking for ${session.activities.name} on ${dateStr}...`,
  }).catch(console.error);
}

// Similar guards for lines 304-313, 363-372, 400-409
```

**Additional rendering guards:**
- Line 698: `request.activity_sessions.date` → `request.activity_sessions?.date`
- Line 702: `request.activity_sessions.start_time/end_time` → add optional chaining
- Line 783: `request.restaurant_time_slots.meal_period` → add optional chaining
- Line 796, 800: `request.restaurant_time_slots.date/start_time/end_time` → add optional chaining

### 2. ActivitySessionsPage.tsx (Medium Priority)

**Table column (line 437):**
```typescript
// Line 437
accessor: (session) => session.activity?.name,
// Already has optional chaining! But add fallback:
accessor: (session) => session.activity?.name || 'Unknown Activity',
```

### 3. RestaurantSlotsPage.tsx (Medium Priority)

**Table column (line 283):**
```typescript
// Line 283
accessor: (slot) => (
  <span className="font-medium">{slot.restaurant?.name}</span>
),
// Add fallback:
accessor: (slot) => (
  <span className="font-medium">{slot.restaurant?.name || 'Unknown Restaurant'}</span>
),
```

**Navigation path fix (line 278):**
```typescript
// Line 278 - Wrong path
onRowClick={(slot) => navigate(`/restaurants/slots/${slot.id}`)}
// Should be:
onRowClick={(slot) => navigate(`/staff/restaurants/slots/${slot.id}`)}
```

### 4. ResortAdminHome.tsx (Medium Priority)

**Activity session name (line 403):**
```typescript
// Line 403
{session.activities?.name}
// Already has optional chaining - add fallback:
{session.activities?.name || 'Unknown Activity'}
```

**Restaurant slot name (line 458):**
```typescript
// Line 458
{slot.restaurants?.name}
// Already has optional chaining - add fallback:
{slot.restaurants?.name || 'Unknown Restaurant'}
```

**Feedback guest name (line 513):**
```typescript
// Line 513
{fb.guests?.full_name}
// Already has optional chaining - add fallback:
{fb.guests?.full_name || 'Anonymous Guest'}
```

---

## Summary of Changes

| File | Lines Changed | Type of Change |
|------|---------------|----------------|
| `GuestRequestsPage.tsx` | ~20 lines | Add `?.` and fallbacks + guard in mutations |
| `ActivitySessionsPage.tsx` | 1 line | Add fallback string |
| `RestaurantSlotsPage.tsx` | 2 lines | Add fallback string + fix navigation path |
| `ResortAdminHome.tsx` | 3 lines | Add fallback strings |

---

## Filter Safety (Optional Enhancement)

For list pages that iterate over data, consider adding defensive filters to exclude records with missing nested data:

```typescript
// Filter out sessions without activity data before rendering
const validSessions = sessions.filter(s => s.activity);

// Filter out slots without restaurant data before rendering
const validSlots = slots.filter(s => s.restaurant);
```

This prevents "Unknown" entries from cluttering the UI while still being defensive.

---

## Impact

- **Fixes**: Potential crashes when navigating to pages with orphaned or deleted related records
- **Defensive**: Gracefully handles RLS-restricted or missing joined data
- **UX**: Shows clear fallback text instead of crashing
- **Bug fix**: Corrects wrong navigation path in RestaurantSlotsPage
- **No database changes required**

---

## Testing

After implementation:

1. Navigate to `/staff/requests?debug=1`
2. Check pending activities and restaurants tabs - verify no crashes
3. Navigate to `/staff/activities/sessions?debug=1`
4. Click on sessions - verify table renders without issues
5. Navigate to `/staff/restaurants/slots?debug=1`
6. Click on a slot - verify it navigates to the correct path
7. Navigate to `/staff/dashboard?debug=1`
8. Verify Today's Activities/Restaurants/Feedback sections render
9. Check Error Log in debug panel - should be empty

