

## Problem Analysis

The bottom nav renders inside a `fixed h-[100dvh] flex flex-col overflow-hidden` container. The nav itself is `flex-shrink-0` with its height set via CSS variable `--guest-nav-h: 72px` (defined inside `@layer components`). Two likely root causes on mobile Chrome:

1. **`@layer components` scoping of `:root` variables** — The `--guest-nav-h` variable is defined inside `@layer components { :root { ... } }`. Layered `:root` declarations can have lower specificity than unlayered ones, and if the variable isn't resolved when the inline `style={{ height: 'var(--guest-nav-h)' }}` is evaluated, the height collapses to `auto` → 0 visible height if children are also sized via the same variable.

2. **`backdrop-blur-xl` on `overflow-hidden` parent** — Mobile Chrome has known rendering issues with `backdrop-filter` inside clipped containers, which can cause the nav to appear transparent/invisible.

## Plan

### 1. Move `--guest-nav-h` out of `@layer components`
Move the guest portal CSS variables from `@layer components { :root { ... } }` to a top-level `:root` block (outside any `@layer`), ensuring they're always resolved regardless of layer ordering. This is the most likely fix.

**File:** `src/index.css`
- Extract the `:root` block (lines ~1599-1623) containing `--guest-nav-h` and all guest layout variables out of `@layer components`.
- Place it just before the `@layer components` block that contains the utility classes.

### 2. Add fallback height to `GuestBottomNav`
Add a hardcoded CSS fallback so the nav never collapses even if the variable fails.

**File:** `src/components/guest/GuestBottomNav.tsx`
- Change `height: 'var(--guest-nav-h)'` → `height: 'var(--guest-nav-h, 72px)'` on both the loading skeleton and the main nav inner div.
- Add `minHeight: '72px'` as a defensive floor on the `<nav>` element itself.

### 3. Add opaque background fallback to nav
Ensure the nav has an opaque fallback background color that doesn't rely solely on `backdrop-filter`.

**File:** `src/index.css`
- In `.guest-nav-elevated`, add a solid `background-color` fallback before the semi-transparent one, using `@supports not (backdrop-filter: blur(1px))` or simply increasing opacity from `0.92` to `0.97` so it's visible even if blur fails to render.

