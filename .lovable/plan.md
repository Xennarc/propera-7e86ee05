

## Problem

The guest bottom nav is hidden behind Chrome's bottom toolbar on Android. The root cause: `h-[100dvh]` on the outer container correctly sizes to the dynamic viewport, but Chrome's bottom toolbar **overlaps** the content area rather than reducing it. `env(safe-area-inset-bottom)` returns `0` on most Android devices, providing no protection.

## Fix

Two changes to push the nav above Chrome's bottom bar:

### 1. `src/components/guest/GuestLayout.tsx` — Replace `h-[100dvh]` with `h-[100dvh]` + bottom safe padding

Change the root container from `h-[100dvh]` to `min-h-[100dvh]` and add `pb-[env(safe-area-inset-bottom)]`. More importantly, add an explicit **extra bottom padding** on the `<nav>` wrapper area to account for Android Chrome's toolbar (~16px extra).

Actually, the better approach: keep `h-[100dvh]` but increase the nav's own bottom padding so it clears the Chrome bar.

### 2. `src/components/guest/GuestBottomNav.tsx` — Add Android-safe bottom padding

- Increase `paddingBottom` from `env(safe-area-inset-bottom, 0px)` to `calc(env(safe-area-inset-bottom, 0px) + 12px)` — this adds a 12px buffer that clears Chrome's bottom toolbar on Android while remaining harmless on iOS (where safe-area-inset-bottom already provides the offset).
- Increase `--guest-nav-h` from `72px` to `84px` in the `:root` block in `index.css` to match the new total height, so that page content padding calculations remain correct.
- Update `minHeight` on the `<nav>` element from `72px` to `84px`.

### 3. `src/index.css` — Update `--guest-nav-h` variable

- Change `:root { --guest-nav-h: 72px; }` → `:root { --guest-nav-h: 84px; }` so all dependent calculations (toast positioning, safe-bottom padding, sticky bar offsets) automatically adjust.

### Summary of changes
- **`src/index.css`**: `--guest-nav-h: 72px` → `84px`
- **`src/components/guest/GuestBottomNav.tsx`**: `paddingBottom` gets `+ 12px` buffer; `minHeight` → `84px`; height fallbacks → `84px`

