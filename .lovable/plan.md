
# Hide Platform-Level Settings from Resort Admins

## Problem Analysis

The "System" settings group is labeled with a **"Super Admin"** badge and contains platform-wide configuration items. However, the "Booking Health" item is currently visible to RESORT_ADMIN users because of its `visible` check:

```tsx
visible: isSuperAdmin() || currentResortRole === 'RESORT_ADMIN'
```

This causes RESORT_ADMIN users to see a confusing "System" section with a red "SUPER ADMIN" badge — just for one diagnostic tool that isn't actually a platform-level setting.

## Solution

Move "Booking Health" from the **System** group (Super Admin only) to the **Operations** group (Resort Admin accessible), since it's a resort-level diagnostic tool, not a platform configuration.

## Changes

### File: `src/pages/settings/SettingsPage.tsx`

**1. Move "Booking Health" from System group to Operations group:**

```tsx
// BEFORE: Booking Health in System group (lines 158-165)
{
  id: 'system',
  title: 'System',
  badge: 'super-admin',
  items: [
    // ... super admin items ...
    {
      title: 'Booking Health',
      description: 'Check for capacity issues and data inconsistencies',
      icon: HeartPulse,
      href: '/staff/settings/booking-health',
      visible: isSuperAdmin() || currentResortRole === 'RESORT_ADMIN',
      feature: 'settings_booking_health',
    },
    // ...
  ],
}

// AFTER: Move to Operations group
{
  id: 'operations',
  title: 'Operations',
  items: [
    // ... existing items ...
    {
      title: 'Booking Health',
      description: 'Check for capacity issues and data inconsistencies',
      icon: HeartPulse,
      href: '/staff/settings/booking-health',
      visible: isSuperAdmin() || currentResortRole === 'RESORT_ADMIN',
      feature: 'settings_booking_health',
    },
  ],
}
```

**2. Remove "Booking Health" from System group:**

The System group will now only contain truly platform-level items visible exclusively to Super Admins:
- Resorts (manage all resorts)
- Platform Users (global role management)  
- Subscription Tiers (plan management)
- Permissions Debug (access diagnostics)

## Result After Changes

| Settings Group | Visible To | Items |
|----------------|-----------|-------|
| Guest Experience | RESORT_ADMIN, SUPER_ADMIN | Pre-Arrival, Branding, Portal Links |
| Operations | RESORT_ADMIN, SUPER_ADMIN | Requests, Directory, Pricing, Resources, **Booking Health** |
| Staff & Access | RESORT_ADMIN, SUPER_ADMIN | Resort Staff, Guest Import |
| System | **SUPER_ADMIN only** | Resorts, Platform Users, Subscription Tiers, Permissions Debug |

## What This Fixes

1. **RESORT_ADMIN** users will no longer see the "System" section with its intimidating "SUPER ADMIN" badge
2. **Booking Health** moves to a logical location under "Operations" where it belongs
3. The "System" group becomes strictly platform-level, matching its "Super Admin" badge
4. Clean separation between resort-scoped tools and platform-wide configuration

## Files Modified

| File | Change |
|------|--------|
| `src/pages/settings/SettingsPage.tsx` | Move Booking Health from System to Operations group |

## Testing Checklist

1. Log in as **RESORT_ADMIN** — verify:
   - "System" section is NOT visible
   - "Booking Health" appears under "Operations"
2. Log in as **SUPER_ADMIN** — verify:
   - "System" section IS visible with all platform items
   - "Booking Health" also visible under "Operations"
3. Verify "Booking Health" page still works when accessed from new location
