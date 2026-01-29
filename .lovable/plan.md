
# Add More Bottom Padding for Content Visibility

## Problem
Content at the bottom of guest portal pages is being cut off/hidden by the fixed bottom navigation bar. The current safe-bottom padding isn't providing enough clearance.

## Current Implementation
The `.guest-safe-bottom` class in `src/index.css` currently calculates bottom padding as:
```css
padding-bottom: calc(var(--guest-nav-h) + env(safe-area-inset-bottom, 0px) + 16px);
```

Where:
- `--guest-nav-h` = 72px (bottom nav height)
- `env(safe-area-inset-bottom)` = device safe area (for notches/home indicators)
- `16px` = extra buffer

The 16px buffer is too small to ensure comfortable visibility of the last content items.

## Solution
Increase the extra buffer from **16px to 24px** to provide more breathing room between the last content item and the navigation bar.

## File to Change
**`src/index.css`** (line 1511)

```css
/* Before */
.guest-safe-bottom {
  padding-bottom: calc(var(--guest-nav-h) + env(safe-area-inset-bottom, 0px) + 16px);
}

/* After */
.guest-safe-bottom {
  padding-bottom: calc(var(--guest-nav-h) + env(safe-area-inset-bottom, 0px) + 24px);
}
```

## Why 24px?
- Provides a comfortable 1.5rem (24px) visual gap between the last card/content and the navigation bar
- Follows spacing conventions used elsewhere in the portal (multiples of 4px/8px)
- Not so large that it wastes vertical real estate on small screens

## Testing Checklist
1. Navigate to `/guest/activities` and scroll to the bottom - confirm last card is fully visible
2. Check `/guest/bookings`, `/guest/requests`, `/guest` home page bottom content
3. Test on Android Chrome (primary issue device)
4. Verify bottom nav doesn't overlap any content
