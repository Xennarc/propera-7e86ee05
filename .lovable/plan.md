
## Problem: Fixed-inside-Fixed on iOS Safari

The bottom navigation (`GuestBottomNav`) uses `position: fixed; bottom: 0` but it's rendered **inside** the outer container which is also `position: fixed; inset: 0; overflow: hidden`. On iOS Safari, a fixed-positioned child inside another fixed-positioned parent with `overflow: hidden` can be clipped or repositioned unpredictably when the browser chrome animates (address bar sliding down). This causes the bottom nav to "slide away" and the scroll to lock.

The header uses `sticky top-0` which is meaningless here -- it's not inside a scrollable container, it's a direct flex child of the fixed container. It works by accident (flex puts it at top), but `sticky` adds unnecessary layout complexity.

## Solution: Convert both bars from fixed/sticky to flex children

Since the outer container is already `fixed inset-0 flex flex-col`, the correct approach is to make header and bottom nav simple **flex children** rather than independently positioned elements:

- **Header**: Remove `sticky top-0` (already works as flex child, just clean it up to `flex-shrink-0`)
- **Bottom Nav**: Change from `fixed bottom-0 left-0 right-0` to a regular flex child with `flex-shrink-0`
- **Main**: Already correctly set as `flex-1 min-h-0 overflow-y-auto`

This gives us a clean flex column: `[header] [scrollable main] [bottom nav]` -- no nested fixed positioning, no iOS Safari bugs.

## Changes

### 1. `src/components/guest/GuestLayout.tsx` (line 274-275)

Remove `sticky top-0` from the header, add `flex-shrink-0` to ensure it never collapses:

```
Before: "sticky top-0 z-20 surface-glass-strong border-b transition-all ..."
After:  "flex-shrink-0 z-20 surface-glass-strong border-b transition-all ..."
```

The z-index is kept for dropdown menus that may overlap from header actions.

### 2. `src/components/guest/GuestBottomNav.tsx` (lines 185, 200)

Both the loading skeleton and the main nav use `fixed bottom-0 left-0 right-0`. Change to a flex-friendly approach:

```
Before: "fixed bottom-0 left-0 right-0 z-20 guest-nav-elevated ..."
After:  "flex-shrink-0 z-20 guest-nav-elevated ..."
```

Remove `contain-layout` from the nav as well -- CSS `contain: layout` creates a new containing block that can interfere with child positioning.

### 3. `src/components/guest/GuestPageShell` and CSS variables -- No changes needed

The `--guest-safe-bottom` padding in GuestPageShell accounts for the nav height so content doesn't hide behind it. Since the bottom nav is now a flex sibling (not overlaying), we need to **remove the nav-height component** from the safe-bottom calculation... 

Actually, wait -- this is a critical consideration. Currently `--guest-safe-base` includes `--guest-fixed-base` (nav height + safe area + 32px breathing). If the nav becomes a flex child instead of a fixed overlay, it no longer covers content, so the extra padding becomes unnecessary and would create a large blank gap at the bottom of every page.

### 3. `src/index.css` -- Adjust `--guest-safe-base`

Since the bottom nav will no longer overlay content (it's a flex sibling below `<main>`), the page padding no longer needs to account for the nav height:

```
Before: --guest-safe-base: calc(var(--guest-fixed-base) + 32px);
After:  --guest-safe-base: calc(var(--guest-safe-area-b) + 32px);
```

This removes the 72px nav height from page bottom padding while keeping safe-area inset and breathing room. Sticky overlays (StickyActionBar, RequestsStickyBar) still need to position themselves above the nav, but since they use `position: fixed` with `bottom: var(--guest-overlay-bottom)`, they will need adjustment too.

### 4. `src/components/guest/StickyActionBar.tsx` and `RequestsStickyBar.tsx` -- Adjust overlay positioning

These bars currently use `position: fixed; bottom: var(--guest-overlay-bottom)` to sit above the fixed nav. Since the nav is no longer fixed but a flex child, these overlays need to sit at the bottom of the viewport minus the nav height. The `--guest-overlay-bottom` CSS variable (`72px`) still works correctly for this -- fixed elements at `bottom: 72px` will sit right above the flex-child nav bar.

**No change needed** for these -- `--guest-overlay-bottom: var(--guest-nav-h)` (72px) still correctly positions them above the nav.

## Summary of changes

| File | Change |
|------|--------|
| `GuestLayout.tsx` (line 275) | `sticky top-0` to `flex-shrink-0` on header |
| `GuestBottomNav.tsx` (lines 185, 200) | `fixed bottom-0 left-0 right-0` to `flex-shrink-0` on nav; remove `contain-layout` |
| `index.css` (line 1619) | `--guest-safe-base` drops `--guest-fixed-base`, uses `--guest-safe-area-b` directly |

3 files, minimal diffs, eliminates the fixed-inside-fixed iOS Safari bug entirely.
