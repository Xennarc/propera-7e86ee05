

## Root Cause Analysis

The `<main>` scroll container in `GuestLayout.tsx` (line 330) has three problematic CSS classes:

```
className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth-touch gpu-scroll touch-scroll focus:outline-none"
```

These resolve to:

1. **`gpu-scroll`** adds `transform: translateZ(0)`. On iOS Safari, applying a CSS transform to a scrollable container can cause the browser to treat scroll interactions differently -- the transform creates a new compositing layer that interferes with iOS's native scroll momentum engine. When the browser chrome (address bar / bottom toolbar) animates in or out, the scroll position can become desynchronized, causing the scroll to "lock" so the user cannot scroll back up to reveal the header.

2. **`touch-scroll`** adds `overscroll-behavior: contain` and `touch-action: pan-y`. The `overscroll-behavior: contain` prevents scroll chaining, but on iOS Safari it can cause the scroll to get stuck at boundaries -- when the visual viewport resizes (browser chrome appearing), the scroll container's height changes but the overscroll containment prevents the expected bounce-back, trapping the scroll position.

3. **`scroll-smooth-touch`** adds `-webkit-overflow-scrolling: touch` which is harmless (it's the default on modern iOS) but also `scroll-behavior: smooth` which can interfere with programmatic scroll position restoration.

## The Fix

Remove `gpu-scroll`, `touch-scroll`, and `scroll-smooth-touch` from the `<main>` element. Modern iOS Safari handles scroll acceleration natively without needing `-webkit-overflow-scrolling: touch` or `transform: translateZ(0)` hacks. These were originally performance hints but are now counterproductive on current WebKit.

### File: `src/components/guest/GuestLayout.tsx` (line 330)

**Before:**
```tsx
className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth-touch gpu-scroll touch-scroll focus:outline-none"
```

**After:**
```tsx
className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden focus:outline-none"
```

Single line change, no other files affected. The header will remain visible as intended (it's a flex sibling above `<main>`, not inside the scroll container), and the bottom nav stays fixed to the viewport.
