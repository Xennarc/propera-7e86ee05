
# Hide Super Admin and Powerful Settings from Lower-Level Users

## Current State Analysis

After reviewing the codebase, the access control system is **already well-implemented**:

| Component | Status | Implementation |
|-----------|--------|----------------|
| SuperAdminLayout | Protected | Redirects with `AccessDenied` if not Super Admin |
| StaffSidebar Admin links | Protected | Uses `isSuperAdmin()` to conditionally render |
| StaffCommandBar | Protected | Super Admin items only shown to Super Admins |
| SettingsPage | Protected | Items filtered by role via `visible` property |
| Debug Panel | Protected | Only Super Admin + Resort Admin can access |

## Identified Improvement

The main issue: **Lower-level staff can still see the "Settings" navigation item** in the mobile bottom nav and sidebar, but when they click it, they see "No settings available for your current role." This is confusing UX.

## Proposed Changes

### 1. Hide Settings Navigation for Users with No Accessible Settings

**File: `src/components/layout/MobileBottomNav.tsx`**

Update the Settings item in `moreNavItems` to only be visible for users who have at least one accessible setting:

```tsx
// Before (line 39)
{ label: 'Settings', href: '/staff/settings', icon: IconSettings, resortRoles: null },

// After - restrict to users who can manage settings
{ label: 'Settings', href: '/staff/settings', icon: IconSettings, resortRoles: ['RESORT_ADMIN'] },
```

### 2. Update StaffSidebar Admin Group Visibility

**File: `src/components/staff/StaffSidebar.tsx`**

The Admin group (line 165-176) already has role restrictions on individual items, but the `isAdmin` check at line 79 allows RESORT_ADMIN to see the group. This is correct. No changes needed here.

### 3. Verify Settings Page Shows Correct Fallback

The SettingsPage already shows a proper fallback message when no settings are available (lines 196-203). This is good UX for edge cases.

## Technical Implementation

### MobileBottomNav.tsx Changes

```tsx
const moreNavItems: NavItem[] = [
  { label: 'Notifications', href: '/staff/notifications', icon: Bell, resortRoles: null },
  { label: 'Pre-Arrival', href: '/staff/prearrival', icon: TrendingUp, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS'], tierFeature: 'pre_arrival_links' },
  { label: 'Reports', href: '/staff/reports', icon: IconReports, resortRoles: ['RESORT_ADMIN', 'MANAGER'] },
  { label: 'Loyalty', href: '/staff/loyalty', icon: Crown, resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE'], tierFeature: 'loyalty_member_management' },
  { label: 'Team', href: '/staff/team', icon: IconGuests, resortRoles: null },
  // Updated: Only show Settings to roles that have accessible settings
  { label: 'Settings', href: '/staff/settings', icon: IconSettings, resortRoles: ['RESORT_ADMIN'] },
];
```

## What Lower-Level Users Will See After This Change

| Role | Dashboard | Activities | Dining | Guests | Reports | Settings |
|------|-----------|------------|--------|--------|---------|----------|
| SUPER_ADMIN | All | All | All | All | All | All |
| RESORT_ADMIN | All | All | All | All | All | All |
| MANAGER | Limited | All | All | All | Limited | Hidden |
| FRONT_OFFICE | Limited | Sessions | Slots | View | None | Hidden |
| RESERVATIONS | Limited | None | None | None | None | Hidden |
| ACTIVITIES | Limited | All | None | None | None | Hidden |
| FNB | Limited | None | All | None | None | Hidden |

Note: MANAGER role will no longer see Settings in mobile nav since they dont have any settings they can manage (all settings require RESORT_ADMIN).

## Security Verification

The following protections remain in place:

1. **Route-level guards**: SuperAdminLayout blocks non-Super Admins entirely
2. **RLS policies**: Database enforces access at the data layer
3. **Backend authorization**: Edge functions validate caller permissions
4. **Item-level visibility**: Each settings item checks `visible` property

## Files to Modify

| File | Change |
|------|--------|
| `src/components/layout/MobileBottomNav.tsx` | Restrict Settings to RESORT_ADMIN |

## Testing Checklist

1. Log in as FRONT_OFFICE user - verify Settings is not visible in More menu
2. Log in as ACTIVITIES user - verify Settings is not visible
3. Log in as RESORT_ADMIN - verify Settings is visible and shows all resort settings
4. Log in as SUPER_ADMIN - verify full access to Command Center and all settings
5. Verify direct URL access to `/staff/settings` as lower role still shows proper fallback (defense in depth)
