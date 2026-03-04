

## Problem

The sidebar's `checkFeatureFlags` function does **not** bypass for Super Admins. Many feature flags (reports, transport, loyalty, requests, prearrival, room service) are `false` at the global level — they're only enabled per-resort via resort-level overrides. When a Super Admin has no resort selected (or when the `FeatureFlagsProvider` only loads global flags), the sidebar hides entire nav groups because the flags evaluate to `false`.

The `canViewNavItem` helper already returns `true` for Super Admins (bypassing role/tier checks), but the separate `checkFeatureFlags` call has no such bypass — causing the mismatch.

## Fix

**File: `src/components/staff/StaffSidebar.tsx`**

Update `checkFeatureFlags` to skip flag checks for Super Admins, matching the existing pattern in `canViewNavItem`:

```typescript
const checkFeatureFlags = (requiredFlags?: string[]): boolean => {
  if (!requiredFlags || requiredFlags.length === 0) return true;
  if (isSuperAdmin()) return true; // ← ADD THIS LINE
  if (!flagContext || flagContext.loading) return true;
  return requiredFlags.every(flag => flagContext.isEnabledEffective(flag));
};
```

Also update `groupHasVisibleItems` to bypass the transport legacy setting check for Super Admins:

```typescript
const groupHasVisibleItems = (group: NavGroup) => {
  if (!checkFeatureFlags(group.requiredFlags)) return false;
  if (group.id === 'transport' && !transportEnabled && !isSuperAdmin()) return false;
  return group.items.some(item => isItemVisible(item));
};
```

**Single file, two one-line changes.** No other files affected.

