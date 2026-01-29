

# Fix Guest Portal Scroll & Content Visibility Issues

## Summary
Address two critical mobile UI issues where content is hidden or inaccessible:
1. **Pre-Arrival Prompt Screen** - Content cut off at the top, cannot scroll to see full dialog
2. **My Bookings Page** - Dining bookings hidden behind the bottom navigation bar

---

## Problem Analysis

### Issue 1: Pre-Arrival Prompt Screen
**Location**: `src/components/guest/prearrival/PreArrivalPromptScreen.tsx`

The current implementation uses `fixed inset-0` positioning with a centered card. On devices with status bar/notch, the top content gets cut off because:
- No safe area inset padding at the top
- The container is not scrollable
- The card content can exceed visible viewport on smaller devices

**Screenshot shows**: The top of the Pre-Arrival dialog is hidden behind the browser's URL bar and status area.

### Issue 2: My Bookings Page & Other Guest Pages
**Location**: `src/components/guest/GuestLayout.tsx` and `src/index.css`

While `guest-safe-bottom` class is applied to the `<main>` element, the 24px buffer may not be sufficient in all cases. Additionally, the padding needs to be increased to provide more "breathing room" at the bottom.

---

## Solution

### Phase 1: Increase Base Safe Bottom Padding

Increase the buffer in `.guest-safe-bottom` from 24px to **32px** for more generous spacing:

```css
/* Before */
.guest-safe-bottom {
  padding-bottom: calc(var(--guest-nav-h) + env(safe-area-inset-bottom, 0px) + 24px);
}

/* After */
.guest-safe-bottom {
  padding-bottom: calc(var(--guest-nav-h) + env(safe-area-inset-bottom, 0px) + 32px);
}
```

This gives ~104px minimum bottom padding (72px nav + 32px buffer).

### Phase 2: Fix Pre-Arrival Prompt Screen

Transform the prompt screen to be scrollable and respect safe areas:

```tsx
// Current
<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
  <Card className="w-full max-w-md shadow-2xl border-primary/10">

// Fixed
<div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-sm p-4"
     style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
  <div className="min-h-full flex items-center justify-center py-8">
    <Card className="w-full max-w-md shadow-2xl border-primary/10">
```

Key changes:
1. Make outer container `overflow-y-auto` for scrollability
2. Add safe area inset padding at the top
3. Wrap card in a flex container with `min-h-full` to maintain centering
4. Add vertical padding (`py-8`) to ensure content isn't flush against edges

### Phase 3: Fix Pre-Arrival Wizard Dialog

The `PrearrivalWizard` uses `DialogContent` with `max-h-[90vh]`. This should also account for safe areas:

```tsx
// Current
<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">

// Fixed - use safe viewport calculation
<DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto" 
               style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}>
```

Alternatively, update the base `DialogContent` component to be safe-area aware.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Increase `guest-safe-bottom` buffer from 24px to 32px |
| `src/components/guest/prearrival/PreArrivalPromptScreen.tsx` | Make scrollable, add safe area insets |
| `src/components/guest/prearrival/PrearrivalWizard.tsx` | Reduce max-height to 85dvh, add safe area margin |

---

## Technical Details

### Safe Area Insets
On modern mobile devices (especially iPhones with notch/Dynamic Island):
- `env(safe-area-inset-top)` - Status bar / notch height
- `env(safe-area-inset-bottom)` - Home indicator area

Using `dvh` (dynamic viewport height) instead of `vh` accounts for browser chrome changes.

### Padding Calculation
**Before**: 72px + safe-area + 24px = ~96px minimum
**After**: 72px + safe-area + 32px = ~104px minimum

The 8px increase ensures:
- Better visual separation from bottom nav
- Accounts for shadows and visual elements
- More comfortable scroll-to-bottom experience

---

## Testing Checklist

After implementation, verify on mobile:
1. **Pre-Arrival Prompt Screen**
   - Can see full content including logo at top
   - Can scroll if content exceeds viewport
   - Safe area respected on notched devices
   
2. **Pre-Arrival Wizard Dialog**
   - Can scroll through all wizard steps
   - Content not cut off at top or bottom
   - Step indicators fully visible
   
3. **My Bookings Page**
   - All dining reservations visible
   - Can scroll to bottom comfortably
   - Last booking card fully visible above nav
   
4. **Other Guest Pages** (Home, Activities, Restaurants)
   - Consistent bottom spacing
   - No content hidden behind navigation

