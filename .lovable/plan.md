

## Problem

`fixed inset-0` and viewport units (`dvh`, `vh`) all define the container to fill the full viewport — which on mobile browsers **includes** the area behind the browser's bottom toolbar. `env(safe-area-inset-bottom)` only covers hardware features (notch, home indicator), not the browser UI. There is no CSS-only way to detect browser toolbar height. This is why every previous fix has failed.

## Universal Fix: JavaScript-measured viewport height

The only bulletproof cross-device solution is to measure `window.innerHeight` via JavaScript — which **always** reflects the actual visible area excluding browser toolbars — and set it as a CSS custom property.

### 1. Create `src/hooks/useViewportHeight.ts`

A small hook that:
- Reads `window.innerHeight` on mount
- Listens to `resize` and `visualViewport.resize` events
- Sets `--app-height` CSS variable on `document.documentElement`
- Debounces updates to avoid layout thrashing during scroll-triggered toolbar show/hide

```ts
// Sets document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
// Updates on resize + visualViewport resize
```

### 2. Update `src/components/guest/GuestLayout.tsx`

- Import and call `useViewportHeight()` at the top of `GuestLayoutInner`
- Replace `fixed inset-0` with `fixed top-0 left-0 right-0` + `height: var(--app-height, 100vh)` on the root container
- This makes the container exactly as tall as the visible area, so the bottom nav naturally sits above the browser toolbar

### 3. Simplify `src/components/guest/GuestBottomNav.tsx`

- Remove the `12px` padding hack since the container now correctly ends above the browser toolbar
- Revert `paddingBottom` to just `env(safe-area-inset-bottom, 0px)` (for notch-only devices like iPhone)
- Revert `--guest-nav-h` back to `72px` in `src/index.css` since the extra buffer is no longer needed
- Keep `minHeight` as a defensive floor

### 4. Update `src/index.css`

- Change `--guest-nav-h: 84px` → `--guest-nav-h: 72px`

### Why this is universal

- `window.innerHeight` excludes browser chrome on **all** browsers (iOS Safari, iOS Chrome, Android Chrome, Samsung Internet, Firefox)
- No reliance on `env()`, `dvh`, or static padding hacks
- Automatically adapts when the toolbar shows/hides during scroll
- This is the standard pattern used by production PWAs (Instagram, Twitter) to solve this exact problem

