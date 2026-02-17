

# Fix: Mobile Viewport Zoom Issue

## Problem
On iOS Safari, the guest portal page gets stuck in a zoomed-in state and cannot zoom back out. Content is clipped on the right side. This is caused by iOS auto-zooming when focusing on inputs with font-size smaller than 16px, combined with no `maximum-scale` constraint in the viewport meta tag.

## Root Cause
The viewport meta tag in `index.html` is:
```
width=device-width, initial-scale=1, viewport-fit=cover
```
It lacks `maximum-scale=1` which would prevent iOS from auto-zooming on small-text input focus.

## Fix (1 file, 1 line)

**File:** `index.html` (line 4)

Change the viewport meta tag to:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
```

Adding `maximum-scale=1` prevents iOS Safari from auto-zooming when users tap into form inputs, keeping the page at the correct device width at all times.

## Why Not `user-scalable=no`?
We intentionally avoid `user-scalable=no` as it harms accessibility by completely preventing pinch-to-zoom. `maximum-scale=1` achieves the same zoom-prevention for input focus without blocking intentional user zoom gestures in most modern browsers.

## No Other Changes
- No component changes needed
- No CSS changes needed
- The existing `16px` minimum font-size standard for inputs (per mobile UX standards) is already in place but some edge cases (e.g., select dropdowns, date pickers) may still trigger iOS zoom without this meta tag fix

