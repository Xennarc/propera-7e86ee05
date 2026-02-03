
# Driver Portal Access & Discoverability Fix

## Problem Statement
The Driver Portal exists at `/driver` but there is no way for registered drivers to discover or navigate to it. Staff members registered as buggy drivers have no visible UI element to enter "driver mode". They would need to manually type `/driver` in the URL, which is not discoverable.

## Current Architecture

### What Works:
- **Driver Registration**: Admins register staff via `AddDriverDialog` or `DriversSetupStep`
- **Authorization**: `DriverLayout` correctly checks `buggy_drivers` table for user access
- **Driver Operations**: Full trip execution (start, stop updates, complete, GPS, presence)
- **Routes**: `/driver` and `/driver/trip/:tripId` properly configured

### What's Missing:
1. No navigation link to `/driver` anywhere in the staff portal
2. Registered drivers receive no indication they have driver access
3. No contextual "Switch to Driver Mode" affordance

## Solution Design

### 1. Add "Driver Mode" Entry Point in Staff Dashboard

Create a prominent card in the TodayHub that appears ONLY for users registered as buggy drivers. This card:
- Shows the driver's current status (Offline/Online)
- Provides a clear "Enter Driver Mode" CTA
- Is visually distinct to make it easy to find

### 2. Add "Driver Mode" to Mobile Bottom Nav

For registered drivers on mobile, add a contextual quick-action in the "More" menu sheet that links directly to `/driver`.

### 3. Add "Driver Mode" to Staff Sidebar

For registered drivers on desktop, add a navigation item in the sidebar under a "Your Role" or inline in the existing Transport section.

### 4. Optional: Driver Registration Notification

When an admin registers a staff member as a driver, show a toast or send a notification informing them they now have driver access. (Lower priority - can be Phase 2)

---

## Technical Implementation

### Phase 1: Core Access Points

#### 1.1 Create `useIsDriver` Hook
A lightweight hook to check if the current user is a registered buggy driver.

```
File: src/hooks/transport/useIsDriver.ts

Purpose:
- Query buggy_drivers table for current user
- Return { isDriver, driverStatus, isLoading }
- Cache result appropriately
```

#### 1.2 Add DriverModeCard to TodayHub
A prominent card in the staff dashboard for registered drivers.

```
File: src/components/staff/DriverModeCard.tsx

Content:
- Icon: Car or steering wheel
- Title: "Driver Mode Available"
- Description: Current status (Offline, Online, etc.)
- CTA Button: "Enter Driver Mode" → navigates to /driver
- Only renders if isDriver === true
```

Update `src/components/staff/TodayHub.tsx`:
- Import and render `<DriverModeCard />` at top of the page
- Position below the header, above Quick Stats

#### 1.3 Add Driver Mode to Mobile "More" Menu
Update `src/components/layout/MobileBottomNav.tsx`:
- Add a conditional item to `moreNavItems` that appears when user isDriver
- Uses Car icon, links to `/driver`

#### 1.4 Add Driver Mode to Staff Sidebar
Update `src/components/staff/StaffSidebar.tsx`:
- Add a "Driver Portal" item in the Transport section
- Conditionally show based on `isDriver` hook (not just role-based)

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/hooks/transport/useIsDriver.ts` | **Create** - Hook to check driver status |
| `src/components/staff/DriverModeCard.tsx` | **Create** - Dashboard card for driver access |
| `src/components/staff/TodayHub.tsx` | **Update** - Add DriverModeCard |
| `src/components/layout/MobileBottomNav.tsx` | **Update** - Add conditional driver nav item |
| `src/components/staff/StaffSidebar.tsx` | **Update** - Add Driver Portal link for drivers |
| `src/hooks/transport/index.ts` | **Update** - Export useIsDriver |

---

## UI Design

### DriverModeCard (Dashboard)

```
┌─────────────────────────────────────────────────────────┐
│  🚗  Driver Mode                          Status: ○ Offline │
│                                                          │
│  You're registered as a buggy driver. Open the driver   │
│  portal to go online and receive trip assignments.       │
│                                                          │
│                            [ Enter Driver Mode → ]       │
└─────────────────────────────────────────────────────────┘
```

- Uses existing Card component with `border-primary/30` for visual emphasis
- Status indicator matches DriverHomePage colors (Offline = gray, Online = green)
- Button is full-width on mobile, right-aligned on desktop

### Mobile More Menu Item

```
┌──────────────────┐
│  🚗              │
│  Driver Portal   │
└──────────────────┘
```

- Same grid styling as other items
- Only visible to registered drivers

### Sidebar Navigation Item

Under Transport section (or as separate group for drivers):
```
Transport
├── Dispatch
└── Driver Portal ← New (only for registered drivers)
```

---

## Technical Details

### useIsDriver Hook

```typescript
export function useIsDriver(resortId: string | undefined) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['is-driver', resortId, user?.id],
    queryFn: async () => {
      if (!resortId || !user?.id) return null;
      
      const { data, error } = await supabase
        .from('buggy_drivers')
        .select('id, status')
        .eq('resort_id', resortId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!resortId && !!user?.id,
    staleTime: 60_000, // Cache for 1 minute
  });
}
```

### Conditional Navigation Logic

```typescript
// In MobileBottomNav
const { data: driverRecord } = useIsDriver(currentResort?.id);

const driverNavItem: NavItem | null = driverRecord ? {
  label: 'Driver Portal',
  href: '/driver',
  icon: Car,
  resortRoles: null, // Accessible to anyone registered as driver
} : null;

// Add to moreNavItems conditionally
const allMoreItems = [
  ...visibleMoreItems,
  ...(driverNavItem ? [driverNavItem] : []),
];
```

---

## Success Criteria

1. Registered drivers see "Driver Mode" card on Dashboard
2. Mobile "More" menu includes Driver Portal link for drivers
3. Desktop sidebar shows Driver Portal in Transport section for drivers
4. Non-drivers do not see any driver-related navigation
5. Clicking any entry point navigates to `/driver` correctly

---

## Future Enhancements (Phase 2)

- **Driver Registration Notification**: Toast notification when admin registers someone as driver
- **Email Notification**: Optional email to newly registered drivers with instructions
- **PWA Install Prompt**: Suggest drivers install the app as PWA for better mobile experience
- **Driver Onboarding Tour**: First-time driver walkthrough in the Driver Portal
