

## Improve Homepage Visual Hierarchy + Hero Gradient Animation

### Current Issues
- The hero background uses static ocean-glow blobs with subtle drift — no visible gradient animation on mobile (blobs are small and low-opacity)
- Below-fold sections (WhyProperaCards, PlatformModules, etc.) all have similar padding and no visual differentiation
- No animated gradient visible across all viewports — the `gradient-drift` keyframe exists but is only used on the `.marketing-canvas::after` (a fixed background layer), not the hero itself

### Changes

**1. Hero — Add a full-viewport animated gradient mesh**

Replace the current static `bg-gradient-to-b` base + small ocean blobs with a single animated gradient overlay that's visible on all viewports:

- Add a new CSS class `hero-gradient-mesh` in `src/index.css` that uses a multi-stop radial/conic gradient with `background-size: 300% 300%` and the existing `gradient-drift` keyframe (slowed to ~20s for premium feel)
- Colors: primary lime at low opacity, teal, and blurple — matching existing palette
- Visible on mobile because it's a full `absolute inset-0` layer, not positioned blobs that get clipped
- Keep the ocean blobs as a secondary layer on top for depth on larger screens
- Respect `prefers-reduced-motion` by disabling animation

**In `HomeHero.tsx`**: Replace the static gradient div with the new `hero-gradient-mesh` class. Keep ocean blobs but reduce their opacity slightly so the gradient shows through.

**2. Homepage section rhythm — alternate surfaces and tighten spacing**

In `LandingPage.tsx`, wrap alternating lazy-loaded sections with subtle background differentiation:

- `WhyProperaCards`: Add `bg-card/30` surface background  
- `PlatformModules`: Keep transparent (contrast with above)
- `HowItWorks`: Add `bg-card/20` surface
- Remaining sections: Keep current styling

**3. WhyProperaCards — reduce heading size for hierarchy**

The `WhyProperaCards` heading is `text-3xl md:text-4xl` — same scale as the hero. Reduce to `text-2xl md:text-3xl` to establish the hero as the dominant element.

### Files to modify

| File | Change |
|------|--------|
| `src/index.css` | Add `hero-gradient-mesh` keyframe + class (~20 lines) |
| `src/components/landing/HomeHero.tsx` | Replace static gradient base with `hero-gradient-mesh`, reduce ocean blob opacity |
| `src/components/landing/WhyProperaCards.tsx` | Reduce heading scale, add `bg-card/30` wrapper |
| `src/pages/LandingPage.tsx` | Add alternating `bg-card/20` wrappers on select sections |

