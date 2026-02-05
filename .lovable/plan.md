

# Homepage Cleanup -- Minimal and Beautiful

## Current State
The homepage has **8 sections** stacked vertically, creating a long scroll with repetitive CTAs and overlapping messaging. Several sections add visual bulk without adding unique value:

- **PricingTeaser** and **HomeFinalCTA** both push "Book a demo" and "View pricing" -- redundant
- **TrustStrip** (4 checkmarks) is thin and sandwiched between two CTAs -- adds noise, not trust
- **GlobalReady** has a globe wireframe, region chips, MultiResortShowcase, AND a GuestJourneyFlow -- a lot of visual elements for one concept
- **HowItWorks** adds device mockups (phone + desktop) below the 3-step cards, duplicating the "product preview" concept already established in the Hero

## Proposed Streamlined Structure

Reduce from **8 sections** to **5 sections**, cutting scroll length by roughly 40%:

```text
1. HomeHero           (keep -- hero with CTAs)
2. WhyProperaCards    (keep -- 3 value cards, remove AnalyticsMiniCard illustration)
3. PlatformModules    (keep -- 7 module cards, remove side NotificationStreamShowcase + FloatingFragments)
4. HowItWorks         (keep -- 3 step cards only, remove device mockup area below)
5. HomeFinalCTA       (keep -- single closing CTA)
```

**Removed sections:**
- **GlobalReady** -- the "built for resorts worldwide" message is already conveyed by the hero's value chips ("Multi-resort ready") and the module cards themselves
- **PricingTeaser** -- redundant with HomeFinalCTA which already has "View pricing" button
- **TrustStrip** -- the 4 bullet points ("Designed for real operations", etc.) overlap with WhyProperaCards; the disclaimer "Previews shown are illustrative" can move to the footer if needed

**Simplified within kept sections:**
- **WhyProperaCards**: Remove the `AnalyticsMiniCard` illustration from the header row -- the cards themselves are the visual. Keep the heading + 3 cards cleanly.
- **PlatformModules**: Remove the side `NotificationStreamShowcase` panel and `FloatingFragments` overlay chips ("Today: 8 sessions", "24 guests", "3 new requests"). Let the 7 module cards fill the full width in a clean grid.
- **HowItWorks**: Remove the device mockup area below the 3 steps (the `StaffTasksShowcase` phone and `DeviceMockup` desktop). The 3-step cards with hover previews are sufficient. This cuts significant vertical space.

## Detailed Changes

### 1. `src/pages/LandingPage.tsx`
- Remove lazy imports for `GlobalReady`, `PricingTeaser`, and `TrustStrip`
- Remove their corresponding `<Suspense>` blocks from the render
- Final render order: `HomeHero` -> `WhyProperaCards` -> `PlatformModules` (Suspense) -> `HowItWorks` (Suspense) -> `HomeFinalCTA`

### 2. `src/components/landing/WhyProperaCards.tsx`
- Remove the `AnalyticsMiniCard` import and its `<div>` wrapper from the header area (lines 96-98)
- Simplify the header to just the heading + subtext, centered

### 3. `src/components/landing/PlatformModules.tsx`
- Remove `FloatingFragments` component and its render call
- Remove `NotificationStreamShowcase` import and its sidebar `<div>` (lines 184-187)
- Change the grid layout from `grid-cols-[1fr_auto]` to a simpler full-width grid
- The module cards grid (`sm:grid-cols-2 xl:grid-cols-3`) fills the section cleanly
- Remove unused icon imports (`Calendar`, `Users`, `Bell`)

### 4. `src/components/landing/HowItWorks.tsx`
- Remove the entire device mockup showcase area below the 3-step grid (lines 126-168: the `mt-12` container with `StaffTasksShowcase` and `DeviceMockup`)
- Remove `DeviceMockup` and `StaffTasksShowcase` imports
- Remove unused icon imports (`Waves`, `Sun`, `Sparkles`, `CheckCircle2`, `Clock`, `Circle`)
- Keep: the section header + the 3-step `StepCard` grid

### 5. No changes to:
- `HomeHero` -- the hero is strong and distinctive
- `HomeFinalCTA` -- serves as the single, clean closing CTA
- `MarketingLayout` -- no structural changes needed
- No files deleted (additive-only philosophy)

## Result
- **5 focused sections** instead of 8
- **No redundant CTAs** (one "Book a demo" in hero, one in final CTA)
- **Cleaner visual rhythm** with less illustration clutter
- **Faster page load** (3 fewer lazy-loaded chunks)
- **Zero design system changes** -- same theme, same spacing, same components

## Files Summary

| File | Action | What Changes |
|------|--------|-------------|
| `src/pages/LandingPage.tsx` | Modify | Remove 3 lazy imports + 3 Suspense blocks |
| `src/components/landing/WhyProperaCards.tsx` | Modify | Remove AnalyticsMiniCard from header |
| `src/components/landing/PlatformModules.tsx` | Modify | Remove FloatingFragments + NotificationStreamShowcase sidebar, simplify grid |
| `src/components/landing/HowItWorks.tsx` | Modify | Remove device mockup area below steps, clean up imports |

