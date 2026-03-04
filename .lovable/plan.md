

## Root Cause Analysis

The code in `StaffSidebar.tsx` has the correct Super Admin bypass in `checkFeatureFlags` (line 108) and the Ops nav items are properly defined (lines 160-163). However, the items still don't appear on the published site.

The most likely root cause is a **timing/render order issue**: `isSuperAdmin()` depends on `globalRole` which is fetched asynchronously from the database. If the `FeatureFlagsProvider` resolves its flags (setting `loading=false`) before the auth context finishes fetching `globalRole`, then during that render:

1. `requiredFlags = ['enable_activities_ops']` → not empty
2. `isSuperAdmin()` → **false** (globalRole still 'STANDARD' — default)  
3. `flagContext.loading` → **false** (flags already loaded)
4. `flagContext.isEnabledEffective('enable_activities_ops')` → **false** (flag disabled globally)
5. Result: items hidden

Once auth finishes loading and `isSuperAdmin()` becomes true, React re-renders the sidebar — **but** the `Collapsible` component's `CollapsibleContent` may not animate newly-appeared items correctly, or the `openGroups` state was already initialized without considering these items.

Additionally, the PWA service worker (`registerType: 'prompt'`) may be serving cached JS bundles on the published site.

## Fix — Two-Layer Approach

### 1. Remove `requiredFlags` from sidebar Ops nav items (`StaffSidebar.tsx`)

The sidebar is **navigation only** — it should show links. The actual pages already have their own `FeatureGate` wrappers (`ActivitiesOpsInbox`, `MasterOpsSheet`, `OpsSheetPrint`, `SessionOpsRunSheet`). So removing the flag from the sidebar doesn't create a security gap.

```
- { title: 'Ops Inbox', ..., requiredFlags: ['enable_activities_ops'] }
+ { title: 'Ops Inbox', ... }
```

Same for Dive Ops, Watersports Ops, Excursions Ops — remove `requiredFlags` from all four items.

### 2. Keep role-based access intact

The `roles` array on each item (`['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES']`) remains, so non-privileged users still can't see the items. Super Admins bypass role checks via `canViewNavItem`.

### Files to edit
- `src/components/staff/StaffSidebar.tsx` — remove `requiredFlags` from lines 160-163 (four items)

