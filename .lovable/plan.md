

# Fix Plan: Guest Portal Feature Visibility Issues

## Executive Summary

After thorough investigation, I've identified that the Guest Portal is showing "Feature Not Available" for the Requests page despite all feature flags being correctly configured in the database. The investigation revealed **three interconnected issues** that need to be addressed together.

---

## Root Cause Analysis

### Issue 1: FeatureGate Component Loading State Race Condition

The `FeatureGate` component has inconsistent loading state handling compared to the `useFeatureEnabled` hook:

| Component | Behavior During Loading |
|-----------|------------------------|
| `useFeatureEnabled` hook | Uses cached data if available (CORRECT) |
| `FeatureGate` component | Shows loading skeleton regardless of cached data (BUG) |

When the user navigates to `/guest/requests`:
1. `FeatureGate` checks `loading` state
2. If loading, it shows skeleton (even if cached data exists)
3. Once loading completes, it should work BUT...

### Issue 2: GuestQuickActions Conditional Logic Error

The `GuestQuickActions` component has an XOR logic issue where transport and requests are mutually exclusive:

```tsx
if (transportEnabled) {
  // Show Buggy + Bookings (NO requests!)
} else {
  // Show Bookings + Requests (NO buggy!)
}
```

This means **when transport is enabled, the Requests button disappears from the home quick actions grid**. The user can only access Requests via bottom navigation.

### Issue 3: Both Features Should Coexist

Looking at the second screenshot, the home page shows:
- Activities, Dining, Bookings, Requests (4 buttons)
- Bottom nav: Home, Activities, Requests, Bookings

But when transport is enabled AND requests is enabled, the logic should show:
- Activities, Dining, Buggy, Bookings, Requests (5 buttons in grid - needs 5-column or 2-row layout)

---

## Database State Verification

All flags are correctly configured in the database:

| Flag Key | Global | Resort Override |
|----------|--------|-----------------|
| `enable_requests` | false | **true** |
| `enable_requests_guest_submit` | false | **true** |
| `enable_transport` | false | **true** |
| `enable_transport_guest_booking` | false | **true** |

Parent-child resolution works correctly:
- `enable_requests_guest_submit` → parent `enable_requests` → both ON → effective: **true**
- `enable_transport_guest_booking` → parent `enable_transport` → both ON → effective: **true**

---

## Technical Solution

### Fix 1: FeatureGate Loading State Optimization

Apply the same cached-data-during-loading pattern to the `FeatureGate` component:

**File:** `src/components/FeatureGate.tsx`

```typescript
// Current (buggy):
if (loading) {
  return <FeatureGateLoader />;
}

// Fixed:
if (loading) {
  // If we have cached flags, use them instead of showing loader
  if (Object.keys(flagContext.flagsMap).length > 0) {
    // Fall through to flag checking with cached data
  } else {
    return <FeatureGateLoader />;
  }
}
```

This prevents the "Feature Not Available" flash when navigating between pages with cached flag data.

### Fix 2: GuestQuickActions Dual-Feature Support

Redesign the quick actions grid to support **both transport AND requests** when both are enabled:

**File:** `src/components/guest/GuestQuickActions.tsx`

```typescript
// Build actions array supporting both features
const quickActions: QuickAction[] = [
  // Always show Activities & Dining
  { icon: IconActivities, label: 'Activities', ... },
  { icon: IconRestaurants, label: 'Dining', ... },
];

// Add transport if enabled
if (transportEnabled) {
  quickActions.push({
    icon: Car,
    label: 'Buggy',
    href: '/guest/buggy',
    ...
  });
}

// Always add Bookings
quickActions.push({
  icon: IconBookings,
  label: 'Bookings',
  href: '/guest/bookings',
  ...
});

// Add Requests if enabled (independent of transport)
if (requestsEnabled) {
  if (hasCatalog) {
    quickActions.push({
      icon: Bell,
      label: 'Requests',
      href: '/guest/requests',
      ...
    });
  } else {
    quickActions.push({
      icon: MessageSquarePlus,
      label: 'Request',
      onClick: () => setQuickSheetOpen(true),
      ...
    });
  }
}
```

Also update the grid layout to handle 4-5 items:
```tsx
<div className={cn(
  "grid gap-2.5 sm:gap-3",
  quickActions.length <= 4 ? "grid-cols-4" : "grid-cols-5"
)}>
```

### Fix 3: Add Request Feature Flag Check

Add a feature flag check for requests visibility in the quick actions:

```typescript
const requestsEnabled = useFeatureEnabled('enable_requests_guest_submit');
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/FeatureGate.tsx` | Lines 115-120: Add cached data check before showing loader |
| `src/components/guest/GuestQuickActions.tsx` | Lines 36-103: Rewrite action building logic to support both features |

---

## Implementation Details

### FeatureGate.tsx Changes

The change is minimal - just add a fallthrough condition when cached data is available:

```typescript
// Lines 115-120, current:
const { loading, isEnabledEffective } = flagContext;

if (loading) {
  return <FeatureGateLoader />;
}

// Lines 115-125, fixed:
const { loading, isEnabledEffective, flagsMap } = flagContext;

// Only show loader if no cached data available
// This prevents feature flash when navigating with stale-while-revalidate
if (loading && Object.keys(flagsMap).length === 0) {
  return <FeatureGateLoader />;
}
```

### GuestQuickActions.tsx Changes

Rewrite the action building logic to be additive rather than mutually exclusive:

1. Remove the `if (transportEnabled) { ... } else { ... }` branching
2. Build the array incrementally based on each feature flag
3. Handle the grid layout for 4-5 items dynamically
4. Add the `useFeatureEnabled('enable_requests_guest_submit')` check

---

## Expected Outcome After Fix

1. **Home Page Quick Actions:** Shows Activities, Dining, Buggy, Bookings, Requests (5 items when both transport and requests are enabled)
2. **Requests Page:** Loads immediately without "Feature Not Available" flash
3. **Buggy Page:** Accessible and functional
4. **Loading States:** No content flash during refetches

---

## Testing Checklist

After implementation:
- [ ] Navigate to Guest Home → verify Buggy button appears
- [ ] Navigate to Guest Home → verify Requests button appears
- [ ] Click Requests → page loads without "Feature Not Available"
- [ ] Click Buggy → page loads without "Transport not available"
- [ ] Refresh page → features still visible
- [ ] Switch between pages rapidly → no flash/flicker

---

## Risk Assessment

**Low Risk:** 
- All changes are additive/non-breaking
- No database changes required
- Feature flag logic remains intact
- Only affects conditional rendering, not data flow

