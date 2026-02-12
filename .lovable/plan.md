

# Tablet Homepage Hero Upgrade

## Problem

At tablet widths (768px-1023px), the hero uses a single-column centered layout identical to mobile, wasting significant horizontal real estate. There's excessive dead space above the fold, and the phone mockup sits below everything, pushing key content down.

## Changes

### 1. Two-Column Layout at `md` Breakpoint

Shift from `lg:grid` to `md:grid` so the tablet gets a side-by-side layout:

- Left column: headline, subtext, CTAs, value chips
- Right column: phone mockup (moved from below CTAs to beside them)

This means `MobileGuestShowcase` appears in the right column on tablet, and the `InteractiveProductShowcase` remains desktop-only (`lg:block`).

| Class | Current | Updated |
|-------|---------|---------|
| Grid trigger | `lg:grid lg:grid-cols-2` | `md:grid md:grid-cols-2` |
| Text alignment | `text-center lg:text-left` | `text-center md:text-left` |
| CTA justify | `sm:justify-center lg:justify-start` | `sm:justify-center md:justify-start` |
| Chips justify | `sm:justify-center lg:justify-start` | `sm:justify-center md:justify-start` |
| Max-width constraint | `max-w-xl mx-auto lg:mx-0` | `max-w-xl mx-auto md:mx-0` |

### 2. Phone Mockup Repositioning

On tablet (md) and above, move the phone mockup from below the CTAs into the right grid column:

- Below `md`: mockup stays inline below CTAs (current mobile behavior)
- At `md`+: mockup renders in a dedicated right column with vertical centering and the float animation
- At `lg`+: the `InteractiveProductShowcase` replaces it (existing behavior)

This creates a layout structure like:

```text
md-1023px:
+-------------------+------------------+
|  Headline         |   [Phone Mockup] |
|  Subtext          |   (floating)     |
|  [CTAs]           |                  |
|  Chips            |                  |
+-------------------+------------------+

1024px+:
+-------------------+------------------+
|  Headline         | [Interactive     |
|  Subtext          |  Product         |
|  [CTAs]           |  Showcase]       |
|  Chips            |                  |
+-------------------+------------------+
```

### 3. Tablet Spacing Refinements

| Element | Current (md) | Updated (md) |
|---------|-------------|-------------|
| Section padding-top | `md:pt-24` | `md:pt-20` (reduce dead space) |
| Gap between columns | inherited `gap-8` | `md:gap-12` |
| Mockup margin-top | `mt-6` (inline) | `mt-0` (in grid column, vertically centered) |

### 4. Ocean Glow Blobs - Tablet Tuning

The blobs already scale at `md:` but can be refined for the two-column layout:

- Blob 1 (teal): shift slightly more to the right to glow behind the mockup column
- Blob 2 (blurple): keep left positioning to illuminate the text column
- No size changes needed; existing `md:w-[800px]` / `md:w-[600px]` / `md:w-[300px]` work well

### 5. Value Chips on Tablet

Currently chips wrap at `sm:` with center justification. Update to left-align at `md:` to match the new left-aligned text column.

## Files Modified

| File | Change |
|------|--------|
| `src/components/landing/HomeHero.tsx` | Restructure grid to trigger at `md`, move phone mockup into a right column visible at `md` but hidden at `lg` (where InteractiveProductShowcase takes over), update alignment classes |

## What Does NOT Change

- No new files, no new dependencies
- `src/index.css` -- no changes (all existing animations work as-is)
- `MobileGuestShowcase.tsx` -- untouched
- `InteractiveProductShowcase` -- still lazy-loaded, still `lg:block` only
- Mobile layout (below 768px) -- completely unchanged
- Desktop layout (1024px+) -- completely unchanged
- All routes, CTAs, links, tracking -- unchanged
- Ocean glow animations, entrance animations, reduced-motion support -- unchanged

## Technical Detail

The key structural change in `HomeHero.tsx` is splitting the phone mockup into two render locations:

1. **Inline (mobile only)**: `<div className="md:hidden">` wrapping the current mockup position below CTAs
2. **Grid column (tablet only)**: `<div className="hidden md:flex lg:hidden">` with the mockup centered vertically, sitting beside the text column
3. **Grid column (desktop)**: existing `<div className="hidden lg:block">` with `InteractiveProductShowcase` -- unchanged

The `MobileGuestShowcase` component renders twice in the DOM but only one instance is visible at any breakpoint, keeping it lightweight.

