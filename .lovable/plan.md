

## Make Skeuomorphism the Default Landing Theme

Currently the landing page defaults to `glass` and only shows `skeuo` when explicitly toggled via `?theme=skeuo` or localStorage. This plan flips the default so visitors see the skeuomorphic design by default.

### Changes

**1. `src/lib/landingTheme.ts`** -- Flip the default from `'glass'` to `'skeuo'`
- In `getLandingTheme()`: change the final `return 'glass'` fallback to `return 'skeuo'`
- Allow `?theme=glass` URL param to opt into the glass theme (reverse of current logic)
- In `getSnapshot()`: change the fallback from `'glass'` to `'skeuo'` so the reactive hook also defaults correctly
- In `getServerSnapshot()`: return `'skeuo'`

**2. `src/components/layout/MarketingLayout.tsx`** -- No structural changes needed
- The layout already reads from `getLandingTheme()` and syncs to `body[data-landing-theme]`, so flipping the default in the utility is sufficient.

### What stays the same
- All skeuo CSS (Phases 2-7) is already in place
- The debug toggle (`?debugTheme=1`) still works to switch between themes
- Glass theme remains fully functional when explicitly selected
- No layout, copy, or CTA changes

### Technical Detail
The core change is ~4 lines in `landingTheme.ts` swapping default returns and adjusting the URL param check to support `?theme=glass` as the override instead.

