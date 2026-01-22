

# Comprehensive Navigation Access Control Plan

## Overview
Implement a unified access control system that hides navigation items based on:
1. **User Permissions** (role-based) - Already partially implemented
2. **Resort Subscription Tier** (tier-gated features) - Missing from navigation
3. **Demo Exemption** - Demo resorts should see all features regardless of tier

---

## Current State Analysis

### What Works
- Role-based filtering in `StaffSidebar.canView()` and `MobileBottomNav.canViewItem()`
- Tier feature definitions in `src/lib/tier-features.ts` with `FEATURE_TIER_MAP`
- `TierGate` component for gating individual page content
- `useDemoReadOnly()` hook to detect demo resorts via `is_demo` flag

### What's Missing
- Navigation items don't have tier feature mappings
- No combined role + tier filtering for nav items
- Demo resorts not exempted from tier restrictions

---

## Implementation Plan

### Step 1: Extend Navigation Item Type

**File:** `src/components/staff/StaffSidebar.tsx`

Add `tierFeature` to the `NavItem` interface:

```typescript
interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ResortRole[];
  tierFeature?: TierFeature;  // NEW: Feature required to see this item
  badge?: string;
}
```

### Step 2: Map Features to Navigation Items

Add tier requirements to relevant nav items:

| Navigation Item | Tier Feature |
|----------------|--------------|
| Pre-Arrival | `guest_portal_pre_arrival` (PROFESSIONAL) |
| Requests | `guest_management_guest_requests` (PROFESSIONAL) |
| Cheat Sheet | `activities_cheatsheet` (PROFESSIONAL) |
| Loyalty > Members | `loyalty_member_management` (ELITE) |
| Loyalty > Program | `loyalty_program` (ELITE) |
| Loyalty > Tiers | `loyalty_tiers` (ELITE) |
| Reports > Activities | `reports_activities` (PROFESSIONAL) |
| Reports > Restaurants | `reports_restaurants` (PROFESSIONAL) |
| Reports > Guests | `reports_guests` (PROFESSIONAL) |
| Reports > Sales | `reports_sales_performance` (ELITE) |
| Reports > Cancellations | `reports_cancellations` (PROFESSIONAL) |
| Reports > Stay Feedback | `reports_feedback` (PROFESSIONAL) |
| Branding | `guest_portal_branding` (PROFESSIONAL) |
| Resort Staff | `settings_staff_management` (PROFESSIONAL) |

### Step 3: Create Combined Access Check Hook

**New File:** `src/hooks/useNavAccess.ts`

```typescript
import { useTierAccess } from '@/hooks/useTierAccess';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { TierFeature } from '@/lib/tier-features';
import { ResortRole } from '@/types/database';

export function useNavAccess() {
  const { isSuperAdmin, getResortRole } = useAuth();
  const { currentResort } = useResort();
  const { hasFeature } = useTierAccess();
  
  const isDemo = currentResort?.is_demo === true;
  const currentRole = currentResort ? getResortRole(currentResort.id) : null;

  /**
   * Check if user can see a navigation item
   * Combines role-based and tier-based access
   * Demo resorts bypass tier restrictions
   */
  const canViewNavItem = (
    roles?: ResortRole[],
    tierFeature?: TierFeature
  ): boolean => {
    // Super admins see everything
    if (isSuperAdmin()) return true;
    
    // Check role access first
    if (roles && roles.length > 0) {
      if (!currentRole || !roles.includes(currentRole)) {
        return false;
      }
    }
    
    // Check tier access (skip for demo resorts)
    if (tierFeature && !isDemo) {
      if (!hasFeature(tierFeature)) {
        return false;
      }
    }
    
    return true;
  };

  return {
    canViewNavItem,
    isDemo,
    currentRole,
  };
}
```

### Step 4: Update StaffSidebar

**File:** `src/components/staff/StaffSidebar.tsx`

1. Import the new hook and TierFeature type
2. Replace `canView` with `useNavAccess().canViewNavItem`
3. Add `tierFeature` to relevant nav items

Example nav group update:

```typescript
{
  id: 'guests',
  title: 'Guests',
  icon: Users,
  items: [
    { title: 'All Guests', url: '/staff/guests', icon: Users, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE'] },
    { title: 'Pre-Arrival', url: '/staff/prearrival', icon: Plane, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS'], tierFeature: 'guest_portal_pre_arrival' },
    { title: 'Requests', url: '/staff/guest-requests', icon: MessageSquare, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'FNB'], tierFeature: 'guest_management_guest_requests' },
  ],
},
{
  id: 'loyalty',
  title: 'Loyalty',
  icon: Crown,
  items: [
    { title: 'Members', url: '/staff/loyalty', icon: Crown, roles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE'], tierFeature: 'loyalty_member_management' },
    { title: 'Program', url: '/staff/loyalty/program', icon: Settings, roles: ['RESORT_ADMIN'], tierFeature: 'loyalty_program' },
    { title: 'Tiers', url: '/staff/loyalty/tiers', icon: Sparkles, roles: ['RESORT_ADMIN'], tierFeature: 'loyalty_tiers' },
  ],
},
```

Update `groupHasVisibleItems` to use the new check:

```typescript
const groupHasVisibleItems = (group: NavGroup) => {
  return group.items.some(item => canViewNavItem(item.roles, item.tierFeature));
};
```

### Step 5: Update MobileBottomNav

**File:** `src/components/layout/MobileBottomNav.tsx`

1. Extend `NavItem` interface with `tierFeature`
2. Import and use `useNavAccess`
3. Add tier features to nav items

```typescript
interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  resortRoles: ResortRole[] | null;
  tierFeature?: TierFeature;  // NEW
}

const moreNavItems: NavItem[] = [
  { label: 'Pre-Arrival', href: '/staff/prearrival', icon: TrendingUp, resortRoles: [...], tierFeature: 'guest_portal_pre_arrival' },
  { label: 'Reports', href: '/staff/reports', icon: IconReports, resortRoles: [...], tierFeature: 'reports_basic' },
  { label: 'Loyalty', href: '/staff/loyalty', icon: Crown, resortRoles: [...], tierFeature: 'loyalty_member_management' },
  // ...
];
```

Update filtering:

```typescript
const { canViewNavItem } = useNavAccess();

const visiblePrimaryItems = primaryNavItems.filter(item => 
  canViewNavItem(item.resortRoles ?? undefined, item.tierFeature)
);
const visibleMoreItems = moreNavItems.filter(item => 
  canViewNavItem(item.resortRoles ?? undefined, item.tierFeature)
);
```

### Step 6: Hide Entire Navigation Groups When Empty

Ensure groups with zero visible items are completely hidden:

```typescript
{navGroups
  .filter(group => groupHasVisibleItems(group))
  .map((group) => (
    // ... render group
  ))}
```

This is already implemented in `StaffSidebar` but verify it works with tier filtering.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useNavAccess.ts` | **NEW** - Combined role + tier access hook |
| `src/components/staff/StaffSidebar.tsx` | Add tierFeature to items, use new hook |
| `src/components/layout/MobileBottomNav.tsx` | Add tierFeature to items, use new hook |

---

## Feature-to-Navigation Mapping Reference

| Tier | Hidden Navigation Items |
|------|------------------------|
| **ESSENTIAL** | Pre-Arrival, Requests, Cheat Sheet, Loyalty (entire section), Reports (except Overview), Branding, Staff Management |
| **PROFESSIONAL** | Loyalty (entire section), Reports > Sales, AI Insights, Trend Analysis |
| **ELITE** | None - full access |

---

## Demo Resort Exemption Logic

```text
IF resort.is_demo === true THEN
   Skip tier check → Show all navigation items (still respect role checks)
ELSE
   Apply both role AND tier checks
```

This ensures:
- Prospects exploring the DEMO resort see the full product
- Live customers see only features they've paid for
- All users still respect role-based access (FNB staff can't see Guests section)

---

## Testing Checklist

1. **ESSENTIAL tier resort (non-demo)**
   - [ ] Loyalty section hidden completely
   - [ ] Pre-Arrival hidden
   - [ ] Advanced reports hidden
   - [ ] Basic navigation visible

2. **PROFESSIONAL tier resort (non-demo)**
   - [ ] Loyalty section hidden
   - [ ] Pre-Arrival visible
   - [ ] Standard reports visible
   - [ ] Sales/AI reports hidden

3. **ELITE tier resort (non-demo)**
   - [ ] All navigation visible (role permitting)

4. **DEMO resort (any tier)**
   - [ ] All navigation visible (role permitting)
   - [ ] Full product showcase

5. **Role filtering still works**
   - [ ] FNB staff cannot see Guests section
   - [ ] Activities staff cannot see Restaurants
   - [ ] Front Office sees appropriate items

---

## Risk Assessment

- **Risk Level:** Low
- **Scope:** Navigation visibility only (pages may still need route guards)
- **Rollback:** Revert 3 file changes
- **No breaking changes:** Existing behavior preserved for demo resorts

