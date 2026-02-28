

## Problem

On iOS Chrome, `h-[100dvh]` on the fixed container causes the bottom nav to sit behind Chrome's bottom toolbar. iOS Chrome does not reliably report `dvh` — when the toolbar is visible, the container extends behind it. Additionally, `env(safe-area-inset-bottom)` on iOS Chrome returns `0` for the toolbar area (it only covers the notch/home indicator, not the browser chrome).

## Fix

### 1. Replace `h-[100dvh]` with `bottom-0` on the root container

**File:** `src/components/guest/GuestLayout.tsx` (line 271)

Change:
```
className="... fixed left-0 right-0 top-0 h-[100dvh] flex flex-col ..."
```
To:
```
className="... fixed inset-0 flex flex-col ..."
```

Using `fixed inset-0` (which sets `top/right/bottom/left` to `0`) lets the browser determine the container edges rather than relying on a viewport unit. This anchors the bottom edge to the actual visible area, avoiding the toolbar overlap entirely.

### 2. Keep the existing padding buffer as-is

The `12px` buffer in `GuestBottomNav.tsx` and `--guest-nav-h: 84px` remain unchanged — they still provide safe spacing for the home indicator on notched devices.

### Technical detail

`fixed inset-0` is equivalent to `fixed top-0 left-0 right-0 bottom-0 w-full h-full`. Unlike `h-[100dvh]` which calculates a pixel height that may mismatch the actual visible area on iOS Chrome, `bottom: 0` directly pins to the viewport edge as reported by the browser — which on iOS Chrome correctly excludes the toolbar.

