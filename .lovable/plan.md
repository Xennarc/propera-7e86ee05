
# Optimize Guest Portal UI for Bottom Navigation Visibility

## Problem
Content at the bottom of guest portal pages can be hidden or cut off by the fixed bottom navigation bar, making it difficult for users to scroll down and view all content.

## Current Implementation

The guest portal uses a layered approach:
- **Fixed navigation**: 72px height plus device safe-area inset
- **Main content padding**: `guest-safe-bottom` class provides ~88px bottom padding
- **Some pages**: Add their own additional padding for sticky bars (e.g., Requests page)

## Root Cause

The current bottom padding calculation has a minimal buffer:
```css
.guest-safe-bottom {
  padding-bottom: calc(var(--guest-nav-h) + env(safe-area-inset-bottom, 0px) + 16px);
}
```

This provides only 16px of extra space beyond the navigation bar, which can feel cramped and may not account for visual "breathing room" that users expect.

## Solution

### 1. Increase Base Padding Buffer
Increase the additional buffer from 16px to 24px for a more comfortable scroll experience:

```css
.guest-safe-bottom {
  padding-bottom: calc(var(--guest-nav-h) + env(safe-area-inset-bottom, 0px) + 24px);
}
```

This provides ~96px minimum padding (72px nav + 24px buffer), giving content more room.

### 2. Add Utility Variants for Specific Use Cases
Create additional utility classes for pages with sticky action bars:

```css
/* Extended safe bottom for pages with sticky action bars */
.guest-safe-bottom-extended {
  padding-bottom: calc(var(--guest-nav-h) + env(safe-area-inset-bottom, 0px) + 96px);
}
```

### 3. Standardize Page Padding
Ensure all guest pages consistently use the layout's safe-bottom padding rather than ad-hoc `pb-*` classes. Pages with sticky bars should use the extended variant or their own calculations that respect the base nav height.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Update `guest-safe-bottom` padding, add extended variant |
| `src/pages/guest/GuestRequestsPage.tsx` | Remove hardcoded `pb-*` classes, rely on layout or extended class |
| `src/pages/guest/GuestMyBookings.tsx` | Verify no additional padding needed |

---

## Technical Details

### CSS Variable Reference
- `--guest-nav-h: 72px` - Fixed bottom navigation height
- `env(safe-area-inset-bottom)` - Device-specific safe area (iPhone home indicator, etc.)

### Calculation Breakdown
**Current**: 72px + safe-area + 16px = ~88px minimum
**Proposed**: 72px + safe-area + 24px = ~96px minimum

This 8px increase may seem small, but it:
- Provides more visual separation between last content item and navigation
- Accounts for border shadows and visual elements on the nav bar
- Feels more comfortable when scrolling to the bottom

### GuestRequestsPage Special Case
This page has a sticky bottom action bar that appears when items are selected. The page currently uses:
```tsx
selectedItems.length > 0 ? 'pb-40' : 'pb-24'
```

This should be adjusted to use consistent CSS variables or the extended variant to maintain harmony with the layout system.

---

## Testing Checklist

After implementation:
1. Navigate to Guest Home - verify all content visible above bottom nav
2. Navigate to My Bookings - scroll to bottom, verify last booking card fully visible
3. Navigate to Activities catalogue - verify all activity cards visible
4. Navigate to Restaurant browser - verify all slots visible
5. Navigate to Requests - select items, verify sticky bar + bottom nav don't overlap content
6. Test on different device sizes (especially iPhone SE and larger phones)
7. Verify dark mode appearance
