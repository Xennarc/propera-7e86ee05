
## Fix: "One platform, not a stack" section overflow on mobile

Two distinct bugs in `PricingStackComparison.tsx` causing the screenshot issues:

### Issue 1 — Headline cut off on the right
The `<em>` ("Gaps create service failures.") inside an h2 with `tracking-[-1.2px]` and `text-[34px]` on a narrow viewport overflows because the parent grid column on mobile uses the full container width but the headline has no explicit wrapping safety. Likely cause: the parent `grid md:grid-cols-12` collapses to a single column on mobile, but the headline column (`md:col-span-5`) has no min-width-0, so when the table column next to it forces `min-w-[460px]`, both columns end up in a row context taller than expected — actually re-reading: on mobile the grid stacks (only `md:grid-cols-12`), so it's not a sibling-overflow issue. The real culprit is the `min-w-[460px]` table sitting inside `-mx-4 px-4` *horizontal scroll* container — that scroll container is a sibling, but the overall section still gets `overflow-hidden`, clipping the scroll affordance, and on iOS Safari the inner min-width can also push the *parent flex/grid* track wider than the viewport, dragging the headline with it.

**Fix:** Add `min-w-0` to both reveal-item columns so the grid tracks can shrink below content size, and ensure the headline allows wrapping at narrow widths (it already has `max-w-sm` on the lede but the h2 itself is unconstrained). Drop the headline size one step at the smallest breakpoint.

### Issue 2 — Table cuts off "Manual" column
Currently `min-w-[460px]` forces horizontal scroll on viewports under 460px, but the section has `overflow-hidden` (line 42) which clips the scroll, so users see a truncated table with no way to scroll to see "Manual".

**Fix:** Remove `overflow-hidden` from the section (it's there for the decorative background but isn't needed since there's no absolutely-positioned overflow content here), OR — cleaner — reduce `min-w-[460px]` to fit 428px viewport. The columns are `1.6fr 0.8fr 0.8fr 0.8fr` = 4fr total. At 428px - 32px padding = ~396px usable. Reducing to `min-w-[380px]` with tighter `gap-1.5` and slightly smaller label text on mobile makes it fit without scroll on the target device while staying readable.

### Concrete changes to `src/components/pricing/PricingStackComparison.tsx`

1. **Section wrapper (line ~42):** Remove `overflow-hidden` (or replace with `overflow-x-clip` which doesn't trap horizontal scroll children).
2. **Headline column (line ~46):** Add `min-w-0` and reduce headline mobile size from `text-[34px]` to `text-[28px]` (keeps `md:text-[44px]`).
3. **Table outer wrapper (line ~60):** Add `min-w-0` to allow the scroll container to actually fit its parent track.
4. **Table inner min-width (line ~61):** Change `min-w-[460px]` → `min-w-[360px]` so it fits the 428px viewport without horizontal scroll, but still scrolls gracefully on smaller phones.
5. **Grid gaps + row label text (lines 63, 80, 84):** Tighten mobile gap from `gap-2` to `gap-1.5`, keep `sm:gap-3`. Reduce row label from `text-[13px]` to `text-[12.5px]` on mobile, `sm:text-[13px]`.

### Files touched
- `src/components/pricing/PricingStackComparison.tsx` only — 5 small targeted edits, no logic changes.

### Risk
Minimal. No data, no routing, purely CSS sizing on one component. Will verify on the user's 428px viewport after.
