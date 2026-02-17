
## Root Cause

The outer container in `GuestLayout.tsx` (line 270) uses:

```
h-[100dvh] overflow-hidden
```

`100dvh` (dynamic viewport height) changes in real-time as the mobile browser chrome (address bar / bottom toolbar) collapses or expands. When this value shifts, the flex layout recalculates, but the inner `<main>` scroll position can become stale -- the scroll container resizes while the scroll offset stays the same, causing the content (including the top header) to become unreachable.

## Fix

Replace `h-[100dvh]` with `fixed inset-0` on the outer container. A `position: fixed; inset: 0` container is immune to dynamic viewport unit changes -- it always fills the actual visible area without triggering layout recalculations that desync the scroll position.

### Change in `src/components/guest/GuestLayout.tsx` (line 270)

**Before:**
```
className="guest-branded guest-page-bg flex h-[100dvh] flex-col bg-background overflow-hidden"
```

**After:**
```
className="guest-branded guest-page-bg fixed inset-0 flex flex-col bg-background overflow-hidden"
```

This is a single-line change. No other files need modification. The header stays sticky within the flex column, `<main>` remains the sole scroll container via `flex-1 min-h-0 overflow-y-auto`, and all GuestPageShell bottom padding continues to work as before.
