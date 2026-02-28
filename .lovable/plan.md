

## Root Cause

The `.guest-page-bg` class in `src/index.css` (line 1650) sets `min-height: 100vh`. The guest layout container uses this class alongside Tailwind's `fixed inset-0 flex flex-col`.

On Chrome (especially mobile, but also desktop in some configurations), `100vh` equals the **large viewport height** — which includes the area behind the address bar. Meanwhile, `fixed` + `inset-0` constrains the element to the **actual visible viewport**. Since `min-height` overrides the height computed from `inset`, the container becomes taller than what's visible. The bottom nav sits at the flex column's end, which is pushed below the visible area.

The `position: relative` in the same rule is also problematic — it would conflict with Tailwind's `fixed` class, though Tailwind utilities win due to cascade layer ordering. Still, it should be removed to avoid confusion.

## Fix

**File**: `src/index.css`, lines 1648-1651

Remove `position: relative` and `min-height: 100vh` from `.guest-page-bg`. The `fixed inset-0` from Tailwind already handles sizing correctly. The pseudo-elements (`::before`, `::after`) use `position: fixed; inset: 0` independently, so they don't depend on the parent's `position: relative`.

```css
/* Before */
.guest-page-bg {
  position: relative;
  min-height: 100vh;
}

/* After */
.guest-page-bg {
  /* Sizing handled by fixed inset-0 in Tailwind; no min-height needed */
}
```

That's it — a two-line deletion. No other files need changes.

