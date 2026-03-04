

## Thorough Inspection Results

I've reviewed every layer of the system. Here's what I found:

### Code Status: Correct

The sidebar (`StaffSidebar.tsx` lines 160-163) correctly defines all four Ops items with NO `requiredFlags`:
```
Ops Inbox     → /staff/activities/ops          (ClipboardList)
Dive Ops      → /staff/activities/ops/day?dept=DIVE (Waves)
Watersports   → /staff/activities/ops/day?dept=WATERSPORT (Ship)
Excursions    → /staff/activities/ops/day?dept=EXCURSION (Compass)
```

- `checkFeatureFlags(undefined)` → returns `true`
- `canViewNavItem` → Super Admin bypass returns `true` immediately
- `isItemVisible` → returns `true` for all four items
- No group-level `requiredFlags` on the Activities group
- `groupHasVisibleItems` → returns `true`

### Feature Flag Registry: Correct

`enable_activities_ops` is registered in `feature-flag-registry.ts` (line 161) and in `MODULE_KEYS` in `useFeatureFlags.ts` (line 58). But this flag is NOT referenced by the sidebar items — it was removed in the previous edit.

### Root Cause: PWA Cache

The PWA is configured with `registerType: 'prompt'` (vite.config.ts line 17). On iOS, the PWA service worker aggressively caches JavaScript bundles. When you publish, the new bundle is available but:
1. The service worker may not detect the update until the user fully closes and reopens the app
2. iOS PWAs have their own caching layer separate from the service worker
3. The "prompt" update strategy requires user interaction to apply updates

### Plan: Force-Bust the Cache + Add Debug Safety

**1. Add a console debug log to the sidebar** (`StaffSidebar.tsx`)
Add a `useEffect` that logs which items passed visibility checks in the Activities group. This will confirm whether the issue is rendering vs caching:
```typescript
useEffect(() => {
  const activitiesGroup = navGroups.find(g => g.id === 'activities');
  if (activitiesGroup) {
    const visible = activitiesGroup.items.filter(isItemVisible).map(i => i.title);
    console.log('[Sidebar] Activities visible items:', visible);
  }
}, [navGroups]);
```

**2. Force the PWA service worker to skip waiting** (`src/main.tsx` or SW registration)
Change the PWA update behavior so new versions activate immediately without user prompt. This prevents stale cache issues on mobile.

### Files to edit
- `src/components/staff/StaffSidebar.tsx` — add debug logging
- `vite.config.ts` — change `registerType: 'prompt'` to `registerType: 'autoUpdate'` to force immediate cache busting on publish

### For Immediate Testing
On your phone: Close the PWA completely (swipe away from app switcher), then reopen it. Or go to **Settings → Safari → Advanced → Website Data → Clear for propera.lovable.app**.

