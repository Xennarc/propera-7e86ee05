
# Investigation Summary: Guest Portal Issues

I've thoroughly analyzed the codebase and identified the root causes of all three issues you reported. Here's my detailed findings and fix plan:

---

## Issue 1: Guest Requests Feature Not Showing

### Root Cause
The `GuestRequestsPage` is gated by `enable_requests_guest_submit` flag:
```tsx
// src/pages/guest/GuestRequestsPage.tsx, line 260-262
<FeatureGate 
  requiredFlags={['enable_requests_guest_submit']} 
  mode="guest"
>
```

**However, this flag does NOT exist in the database.** My query confirmed only these request-related flags exist:
- `enable_requests` (global: false, resort override: true)
- `enable_requests_guest_portal` (global: false, resort override: true)

The flag `enable_requests_guest_submit` is referenced in `feature-flag-modules.ts` as a child flag but was never seeded into the `feature_flags` table.

### Fix
1. Add the missing `enable_requests_guest_submit` flag to the feature flag registry (`feature-flag-registry.ts`)
2. Create a database migration to seed this flag into the `feature_flags` table (globally OFF by default, matching the existing pattern)
3. Enable it at the resort level for the specific resort

---

## Issue 2: Buggy Request Feature Not Showing on Home Page

### Root Cause
The `GuestQuickActions` component (lines 33-35) uses `resort_settings.transport_enabled` to decide whether to show the buggy action:

```tsx
// src/components/guest/GuestQuickActions.tsx
const { data: settings } = useResortSettings(guest?.resortId);
const transportEnabled = settings?.transport_enabled ?? false;
```

This is a **dual-gating issue**:
- The `resort_settings.transport_enabled` column is checked for the Home quick actions
- The `enable_transport` feature flag is checked elsewhere (e.g., Staff dashboard)
- But the Quick Actions uses the legacy `resort_settings` approach, NOT the feature flag system

Meanwhile, `GuestBuggyRequestPage.tsx` also checks `settings?.transport_enabled` (line 31), so if the guest manually navigates to `/guest/buggy`, they'd see "Transport not available" even though the feature flag is ON.

**Current state in database:**
- `enable_transport` feature flag: **enabled** for resort
- `enable_transport_guest_booking` feature flag: **enabled** for resort
- But `resort_settings.transport_enabled` may be **false**

### Fix
Update `GuestQuickActions.tsx` to use the feature flag system (`useFeatureEnabled`) instead of (or in addition to) the legacy `resort_settings` approach. This aligns transport visibility with the modern feature flag architecture.

The recommended approach:
```tsx
const transportEnabled = useFeatureEnabled('enable_transport_guest_booking');
```

This ensures the quick action visibility is controlled by the same system as the rest of the app.

---

## Issue 3: Guest Home Page Scrolling Restricted

### Root Cause
The `GuestHome.tsx` component's outer wrapper uses `space-y-5` but does NOT apply the `guest-safe-bottom` class:

```tsx
// src/pages/guest/GuestHome.tsx, line 258
<div className="space-y-5 md:space-y-6">
```

Compare to `GuestRequestsPage.tsx` which correctly applies it:
```tsx
// src/pages/guest/GuestRequestsPage.tsx, line 166
<div className={cn(
  'space-y-5',
  selectedItems.length > 0 && 'guest-safe-bottom-extended'
)}>
```

The `guest-safe-bottom` class adds necessary bottom padding:
```css
.guest-safe-bottom {
  padding-bottom: calc(var(--guest-nav-h) + env(safe-area-inset-bottom, 0px) + 32px);
}
```

Without this class, the bottom content gets hidden under the fixed bottom navigation bar.

### Fix
Add the `guest-safe-bottom` class to the main content wrapper in `GuestHome.tsx`:
```tsx
<div className="space-y-5 md:space-y-6 guest-safe-bottom">
```

---

## Implementation Plan

### Step 1: Fix Missing Feature Flag (Requests)
1. Add `enable_requests_guest_submit` definition to `src/lib/feature-flag-registry.ts`
2. Create database migration to seed the flag globally (default OFF)
3. Create resort-specific override to enable it where needed

### Step 2: Fix Transport Quick Action Visibility
1. Update `src/components/guest/GuestQuickActions.tsx` to use `useFeatureEnabled('enable_transport_guest_booking')` OR `useFeatureEnabled('enable_transport')`
2. Optionally update `GuestBuggyRequestPage.tsx` to use the same feature flag pattern for consistency

### Step 3: Fix Home Page Scrolling
1. Add `guest-safe-bottom` class to the main wrapper in `src/pages/guest/GuestHome.tsx`

---

## Technical Details

### Files to Modify
| File | Change |
|------|--------|
| `src/lib/feature-flag-registry.ts` | Add `enable_requests_guest_submit` definition |
| `src/components/guest/GuestQuickActions.tsx` | Use `useFeatureEnabled` for transport check |
| `src/pages/guest/GuestHome.tsx` | Add `guest-safe-bottom` class |

### Database Migration
Create new flag in `feature_flags` table:
- key: `enable_requests_guest_submit`
- category: `guest`
- tier: `starter`
- is_enabled: `false` (global default)
- scope: `global`

---

## Risk Assessment

All fixes are **additive and low-risk**:
1. Adding a new feature flag definition doesn't affect existing flags
2. Changing the transport check to use feature flags is a simple conditional swap
3. Adding a CSS class is non-breaking

No business logic, API calls, or database mutations are affected.
