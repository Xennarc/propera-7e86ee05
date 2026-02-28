

## Root Cause

The outer container in `GuestLayout` uses `fixed inset-0`, which with `viewport-fit=cover` in the viewport meta tag, extends the layout behind the browser's bottom toolbar on iOS Chrome/Safari. `env(safe-area-inset-bottom)` only compensates for the home indicator notch, **not** the browser toolbar itself. So the bottom nav (a flex child at the end of the column) gets hidden behind Chrome's toolbar (back/forward/tabs bar visible in the screenshot).

This only manifests in **browser mode** — in standalone PWA mode there's no browser toolbar, so it works fine. The automated test used a headless browser with no toolbar, which is why it passed.

## Fix

**File**: `src/components/guest/GuestLayout.tsx`, line 270

Change the outer container from `fixed inset-0` to `fixed left-0 right-0 top-0 h-[100dvh]`.

- `100dvh` (dynamic viewport height) automatically excludes the browser's toolbar area, constraining the flex container to only the visible viewport.
- In standalone PWA mode, `100dvh` equals the full screen minus the home indicator, which is correct.
- The `env(safe-area-inset-bottom)` padding on the nav still handles the home indicator in standalone mode.

```diff
- "guest-branded guest-page-bg fixed inset-0 flex flex-col bg-background overflow-hidden"
+ "guest-branded guest-page-bg fixed left-0 right-0 top-0 h-[100dvh] flex flex-col bg-background overflow-hidden"
```

Single line change. No other files affected.

