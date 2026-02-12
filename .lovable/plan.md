

# Mobile Homepage Hero Upgrade — "Ocean Glow"

## Summary

Upgrade the mobile hero on the landing page to feel premium and alive with a lightweight animated background, polished entrance animations, and refined mobile spacing — all without breaking existing routes, CTAs, or desktop layout.

## What Changes

### 1. Animated "Ocean Glow" Background Layer (CSS-only)

Add 2-3 slow-moving gradient blobs visible on mobile (currently all glow blobs are `hidden sm:block`). These use pure CSS keyframes on `transform` and `opacity` only (GPU-composited, no repaints).

- **Blob 1**: Teal/primary glow, top-right area, 10s loop drifting diagonally
- **Blob 2**: Blurple glow, bottom-left area, 14s loop drifting opposite
- **Blob 3** (optional): Small lime accent, center, 12s loop, very subtle

All blobs use existing CSS variables (`--teal-400`, `--blurple-500`, `--lime-400`) for theme consistency. A faint noise texture overlay (tiny inline SVG filter, ~200 bytes) prevents gradient banding.

All animation is wrapped in `@media (prefers-reduced-motion: no-preference)` — blobs become static when reduced motion is on.

### 2. Entrance Animation Sequence (Framer Motion)

Since Framer Motion is already installed and used across the site (AboutHero, etc.), use it for the hero entrance:

- **Headline**: fade-in + rise 10px, 500ms, ease-out
- **Subtext**: fade-in + rise 8px, 500ms, 100ms delay
- **CTA buttons**: fade-in + rise 6px, 400ms, 200ms delay
- **Primary CTA**: single soft glow "breathe" after 800ms (one-shot, not repeating)
- **Value chips**: fade-in, 300ms, 300ms delay
- **Phone mockup**: scale 0.98 to 1.0 + fade-in, 600ms, 400ms delay, with gentle `animate-float` after entrance

All animations disabled when `useReducedMotion()` returns true — content renders instantly with no motion.

### 3. Mobile Spacing and Typography Refinements

In `HomeHero.tsx`, adjust the mobile-specific classes:

| Element | Current | Updated |
|---------|---------|---------|
| Section padding-top | `pt-20` | `pt-16` (less dead space above fold) |
| Section min-height | `min-h-[85vh]` | `min-h-[90vh]` (more content visible) |
| Headline size | `text-3xl` | `text-[1.75rem] xs:text-3xl` (better on 360px screens) |
| Headline margin-bottom | `mb-4` | `mb-3` (tighter) |
| Subtext | `text-base text-muted-foreground` | `text-base text-foreground/70` (better contrast) |
| Subtext margin-bottom | `mb-6` | `mb-5` |
| CTA height | `h-12` | `h-12` (unchanged, already 48px > 44px minimum) |
| CTA primary | existing glow | add `active:scale-[0.97]` press state |
| CTA secondary | existing | add `active:scale-[0.97]` press state |
| Value chips container | `flex-wrap` | horizontal scroll with snap on mobile, wrap on sm+ |
| Phone mockup spacing | `mt-8` | `mt-6` |

### 4. Value Chips: Horizontal Scroll on Mobile

On screens below `sm`, change the chips from `flex-wrap` to a horizontally scrollable row with snap alignment:
- `overflow-x-auto snap-x snap-mandatory` with `scrollbar-hide`
- Each chip gets `snap-start shrink-0`
- On `sm:` and above, keep existing `flex-wrap` behavior
- Add a subtle gradient fade on the right edge as a scroll hint

### 5. Phone Mockup Float Effect

After entrance animation completes, the `MobileGuestShowcase` gets a gentle CSS `animate-float` class (already defined in tailwind config: 6s ease-in-out infinite, 8px vertical). Disabled via reduced-motion media query.

## Files Modified

| File | Change |
|------|--------|
| `src/components/landing/HomeHero.tsx` | Add Framer Motion entrance sequence, ocean glow blobs (mobile-visible), refined spacing, scroll chips, float on mockup, reduced-motion guard |
| `src/index.css` | Add `@keyframes ocean-drift-1/2/3` for blob movement, noise texture overlay class, scroll-hint gradient utility |

## Files NOT Changed

- `tailwind.config.ts` — no new config needed, existing keyframes/animations suffice
- `MobileGuestShowcase.tsx` — untouched, float class applied from parent
- `LandingPage.tsx` — untouched
- All routes, navigation, CTAs, links — unchanged

## Performance

- All blob animations use only `transform` and `opacity` (compositor-only, no layout/paint)
- No new dependencies
- No images or video
- Noise overlay is an inline SVG filter (~200 bytes), not an image asset
- `will-change: transform` on blobs for GPU promotion
- Entrance animations are one-shot (no infinite loops except the subtle float and background drift)

## Reduced Motion Behavior

- `useReducedMotion()` hook (already exists) controls Framer Motion entrance
- CSS `@media (prefers-reduced-motion: reduce)` kills blob drift and float animations
- Content renders instantly with zero motion when preference is set

## Technical Details

The ocean glow CSS keyframes will look approximately like:

```text
@keyframes ocean-drift-1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%      { transform: translate(30px, -20px) scale(1.05); }
  66%      { transform: translate(-15px, 15px) scale(0.97); }
}

@keyframes ocean-drift-2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(-25px, 20px) scale(1.03); }
}
```

The entrance sequence uses Framer Motion's `motion.div` with staggered delays, matching the pattern already used in `AboutHero.tsx`.

