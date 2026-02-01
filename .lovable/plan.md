
# Fix Plan: Guest Portal Feature Visibility Issues

## Summary

Two distinct issues are preventing features from appearing in the Guest Portal for The Residence Falhumaafushi:

1. **Missing Database Override** for `enable_requests_guest_submit` flag
2. **Loading State Bug** in `useFeatureEnabled` hook causing transport to not render

---

## Issue 1: Guest Requests Not Showing

### Problem
The `enable_requests_guest_submit` flag was seeded globally (OFF) but no resort-level override exists.

### Solution
Create a database migration to add the resort override.

### Database Change
```sql
INSERT INTO public.feature_flags (
  key, label, description, category, tier, 
  is_enabled, is_dangerous, scope, resort_id
)
SELECT 
  'enable_requests_guest_submit',
  'Guest Request Submission',
  'Allow guests to submit service requests via the guest portal.',
  'guest',
  'starter',
  true,
  false,
  'resort',
  '91dea0e5-963a-43eb-aab0-aafe921cc8f5'
WHERE NOT EXISTS (
  SELECT 1 FROM public.feature_flags 
  WHERE key = 'enable_requests_guest_submit' 
  AND resort_id = '91dea0e5-963a-43eb-aab0-aafe921cc8f5'
);
```

---

## Issue 2: Transport/Buggy Not Showing

### Problem
The `useFeatureEnabled` hook returns `false` while the feature flags query is loading. Since `GuestQuickActions` renders immediately with the page, it doesn't show the transport button.

### Root Cause (Code Path)
```
GuestLayout renders
  → FeatureFlagsProvider initializes (query starts loading)
  → GuestHome renders
    → GuestQuickActions renders
      → useFeatureEnabled('enable_transport_guest_booking')
        → flagContext.loading === true
        → returns FALSE ← Transport button hidden!
  → Feature flags query completes
    → BUT GuestQuickActions already rendered with false
```

### Solution
Modify `useFeatureEnabled` to properly handle loading state by checking cached data or returning a "pending" state that triggers a re-render.

### Code Change (src/components/FeatureGate.tsx)

Replace the current `useFeatureEnabled` implementation:

**Before:**
```typescript
export function useFeatureEnabled(flag: string): boolean {
  const flagContext = useFeatureFlagAccessSafe();
  
  if (!flagContext) return true; // Fail open
  if (flagContext.loading) return false;
  
  return flagContext.isEnabledEffective(flag);
}
```

**After:**
```typescript
export function useFeatureEnabled(flag: string): boolean {
  const flagContext = useFeatureFlagAccessSafe();
  
  if (!flagContext) return true; // Fail open - no provider
  
  // During loading, check if we have cached data
  // This prevents flicker when flags are already cached from previous render
  if (flagContext.loading) {
    // If we have any flags in the map, use them (cached data)
    if (Object.keys(flagContext.flagsMap).length > 0) {
      return flagContext.isEnabledEffective(flag);
    }
    // No cached data yet - fail closed for security
    return false;
  }
  
  return flagContext.isEnabledEffective(flag);
}
```

**Rationale:** TanStack Query keeps cached data during refetches (`isPending` vs `isLoading`). The `flagsMap` will contain previous data, so we can use it while new data loads. This prevents the transport button from flickering or being hidden during refetches.

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| Database migration | CREATE | Add resort override for `enable_requests_guest_submit` |
| `src/components/FeatureGate.tsx` | EDIT | Fix loading state handling in `useFeatureEnabled` hook |

---

## Technical Details

### Why the Transport Issue Persists Despite Correct Database State

The `useFeatureFlags` hook uses TanStack Query without an explicit `staleTime`, so it inherits the global default of 30 seconds. When the Guest Layout mounts:

1. `FeatureFlagsProvider` starts the query
2. Child components render immediately (React doesn't wait)
3. `useFeatureEnabled` sees `loading: true` and returns `false`
4. Transport button is excluded from the quick actions array
5. Query completes, but the array was already built

The fix ensures cached data (if available) is used during loading, preventing this race condition.

### Safety Considerations

- The fix maintains "fail closed" behavior when there's no cached data (first load)
- Only uses cached data when the query is refetching (data already exists)
- No changes to feature flag resolution logic or parent/child dependency checking
- Additive change that doesn't break existing behavior

---

## Acceptance Criteria

After implementation:
- [ ] Guest can see "Requests" feature in the guest portal
- [ ] Guest can see "Buggy" quick action on the home page
- [ ] Both features work correctly when clicked
- [ ] No console errors related to feature flags
- [ ] Features still work after a page refresh
- [ ] Features work on first visit (cold cache)

---

## Testing Plan

1. Log in as a guest at The Residence Falhumaafushi
2. Navigate to the Home page (`/guest`)
3. Verify "Buggy" quick action appears in the grid
4. Click "Buggy" and verify the transport booking page loads
5. Navigate to Requests tab in bottom navigation
6. Verify the request catalog loads (not "Feature Not Available" screen)
7. Submit a test request to verify end-to-end flow
8. Refresh the page and verify both features still appear
