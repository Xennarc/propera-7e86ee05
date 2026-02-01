
# Fix Plan: Guest Portal Feature Visibility & Business Logic

## Summary

This plan addresses three interconnected issues affecting the Guest Portal:

1. **Production build not deploying** - Recent code changes haven't reached production
2. **FeatureVisible component bug** - Returns `null` during loading state without checking cached data
3. **Business logic update** - When both Buggy and Requests are enabled, only show Buggy in the quick actions grid

---

## Technical Analysis

### Issue 1: Production Build Failure

The user confirmed the publish started failing after the recent feature flag edits. The screenshot shows the OLD behavior (3 buttons only), which confirms the code changes made earlier in this session haven't deployed.

**Root cause**: Need to verify the build compiles successfully. The changes we made are syntactically correct, but we should ensure there are no hidden issues.

### Issue 2: FeatureVisible Loading State Bug

The `FeatureVisible` component (used for inline UI element gating) has the same bug that was fixed in `useFeatureEnabled` - it returns `null` during loading without checking for cached data:

```typescript
// Current (buggy) - line 334
if (flagContext.loading) return null;  // No cache check!
```

This causes inline elements to flash/disappear during refetches.

### Issue 3: Business Logic - Buggy vs Requests Priority

**User's clarification**: When both transport (Buggy) and requests features are enabled, the Buggy shortcut should take priority in the quick actions grid. Requests should NOT appear in the quick actions if Buggy is already there.

Current logic (additive):
- Activities, Dining, Buggy (if enabled), Bookings, Requests (if enabled)

Required logic (priority):
- Activities, Dining, **Buggy OR Requests** (Buggy takes priority), Bookings

---

## Technical Solution

### Fix 1: FeatureVisible Cached Data Check

Update `FeatureVisible` to check for cached flags before returning null during loading:

```typescript
export function FeatureVisible({ flag, children }: { 
  flag: string; 
  children: React.ReactNode;
}) {
  const flagContext = useFeatureFlagAccessSafe();
  
  if (!flagContext) return <>{children}</>;
  
  // During loading, check for cached data (stale-while-revalidate)
  if (flagContext.loading) {
    if (Object.keys(flagContext.flagsMap).length > 0) {
      // Use cached data
      if (!flagContext.isEnabledEffective(flag)) return null;
      return <>{children}</>;
    }
    return null; // No cached data - fail closed
  }
  
  if (!flagContext.isEnabledEffective(flag)) return null;
  
  return <>{children}</>;
}
```

### Fix 2: GuestQuickActions Priority Logic

Update the quick actions logic so Buggy takes priority over Requests in the grid:

```typescript
// Check feature flags
const transportEnabled = useFeatureEnabled('enable_transport_guest_booking');
const requestsEnabled = useFeatureEnabled('enable_requests_guest_submit');

// Build quick actions - Buggy takes priority over Requests in grid
const quickActions: QuickAction[] = [
  // Always show Activities & Dining
  { icon: IconActivities, label: 'Activities', ... },
  { icon: IconRestaurants, label: 'Dining', ... },
];

// Add transport if enabled (takes priority slot)
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

// Add Requests ONLY if transport is NOT enabled
// (When transport is on, requests is still accessible via bottom nav)
if (requestsEnabled && !transportEnabled) {
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

This maintains a clean 4-button grid: **Activities, Dining, Buggy, Bookings** when transport is enabled.

---

## Files to Modify

| File | Lines | Change |
|------|-------|--------|
| `src/components/FeatureGate.tsx` | 324-338 | Add cached data check to `FeatureVisible` |
| `src/components/guest/GuestQuickActions.tsx` | 80-101 | Update logic: show Requests only if transport is disabled |

---

## Expected Result After Implementation

**Home Page Quick Actions** (when both transport and requests are enabled):
- Activities (teal)
- Dining (amber)
- Buggy (emerald)
- Bookings (purple)

**Bottom Navigation** (unchanged):
- Home, Activities, Requests, Bookings

Guests can still access Requests via the bottom navigation - it's just not duplicated in the quick actions grid when Buggy is already providing a transport shortcut.

---

## Why This Is the Right Approach

1. **Clean 4-button grid** - Maintains visual balance and prevents cramped 5-button layout
2. **No feature loss** - Requests is still fully accessible via bottom nav
3. **Priority makes sense** - Buggy is a "quick action" (request a ride now), while Requests is a browsing experience better suited to the dedicated nav item
4. **Fixes loading issues** - Both `FeatureVisible` and `useFeatureEnabled` will use cached data during refetches

---

## Testing Checklist

After implementation:
- Navigate to Guest Home at The Residence Falhumaafushi
- Verify 4 quick actions: Activities, Dining, Buggy, Bookings
- Verify Requests is NOT in quick actions (since Buggy is enabled)
- Click Requests in bottom nav - verify page loads correctly (no "Feature Not Available")
- Click Buggy quick action - verify transport page loads correctly
- Refresh page - verify all features remain visible
- Navigate between pages rapidly - verify no flashing/flickering
