

# Modern Skeuomorphic Redesign -- Marketing Landing Page

## Overview

Transform the marketing landing page from flat glassmorphism to an Apple-style "flat with depth" aesthetic: opaque tactile surfaces, layered shadows, subtle noise textures, and physical button states -- while keeping the dark midnight palette and Astro Lime accent.

## Approach: CSS-First with Attribute Scoping

All skeuomorphic styles will be scoped under a `[data-landing-theme="skeuo"]` attribute on `<body>`, set by the `MarketingLayout` component on mount and cleaned up on unmount. This ensures **zero impact** on Guest Portal and Staff Portal UIs.

The original glass theme remains accessible via `?theme=glass` query param or `localStorage`.

---

## Changes

### 1. New file: `src/styles/skeuo-theme.css`

A dedicated CSS file (~250 lines) containing all skeuomorphic overrides, imported in `index.css`. Every rule is scoped under `[data-landing-theme="skeuo"]`. Key token groups:

**Surface tokens:**
- `skeuo-surface`: Opaque card bg (`hsl(215 24% 13%)`), no `backdrop-blur`, thick layered `box-shadow` (highlight ridge on top, deep shadow below)
- `skeuo-surface-raised`: Slightly lighter (`hsl(215 22% 16%)`), stronger shadows for elevated cards
- `skeuo-inset`: Inner shadow recess effect for containers/wells

**Texture overlays:**
- Noise grain `::after` pseudo on `.marketing-canvas` -- higher opacity (0.04) than current glass grain (0.015)
- Subtle horizontal brushed-metal lines via repeating-linear-gradient on card surfaces

**Button states:**
- **Default**: Convex gradient (lighter top, darker bottom), top highlight ridge (`inset 0 1px 0 rgba(255,255,255,0.1)`), bottom shadow
- **Hover**: Slight lift + glow intensifies
- **Active/pressed**: Invert gradient (darker top, lighter bottom), `inset 0 2px 4px rgba(0,0,0,0.3)` -- tactile "push" feel
- Applied to `.glow-lime`, `.btn-cta-premium`, outline buttons

**Card overrides (scoped):**
- `.value-card-premium`: Replace translucent bg with opaque `skeuo-surface-raised`, remove `backdrop-blur`, add multi-layer shadow (2px highlight inset top, 8px depth shadow, 20px ambient)
- `.module-card-premium`: Same treatment, slightly less elevation
- `.glass-pill`: Opaque pill with inset top highlight, embossed feel
- `.icon-orb-gradient`: Deeper recess shadow behind orb, brighter gradient fill

**Header override:**
- `.surface-glass-strong` under skeuo: Opaque midnight bg, bottom edge shadow (no blur transparency), subtle top highlight line

**Background:**
- `.marketing-canvas`: Richer radial gradient with vignette edges (darker corners), remove the shimmer `::after` animation (replace with static subtle texture)
- Glow blobs: Reduce blur, increase opacity slightly for more "spot light on surface" feel

**Typography enhancements:**
- Headings: `text-shadow: 0 1px 2px rgba(0,0,0,0.3)` for subtle embossed depth
- Muted text: Slightly higher contrast for readability on opaque surfaces

**Hover interactions:**
- `.hover-lift-card`: Replace lime glow shadow with realistic drop shadow (`0 12px 32px -8px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.2)`)
- Cards gain a subtle inner glow on hover instead of border color change

---

### 2. Modify: `src/components/layout/MarketingLayout.tsx`

Add a `useEffect` to set `document.body.dataset.landingTheme = 'skeuo'` on mount (or `'glass'` if `?theme=glass` is in the URL or localStorage). Clean up on unmount.

~15 lines added (useEffect + theme detection logic).

---

### 3. Modify: `src/index.css`

Add one import line at the end:
```css
@import './styles/skeuo-theme.css';
```

No existing rules are modified.

---

### 4. Modify: `src/components/landing/HomeHero.tsx`

Add `skeuo-surface` class to the CTA buttons' parent container for proper tactile states. Add `active:scale-[0.97]` if not already present (it is on some buttons). Minor class additions only (~3 lines changed).

---

### 5. Modify: `src/components/landing/HomeFinalCTA.tsx`

Same button treatment as hero -- ensure active press state classes are present.

---

## What does NOT change

- Guest Portal UI (no `data-landing-theme` attribute present)
- Staff Portal UI
- Any component logic, data flow, or routing
- The `ThemeToggle` component or dark/light mode system
- Framer Motion animations or scroll reveal hooks
- No new npm dependencies

## Summary

| File | Type | Change |
|------|------|--------|
| `src/styles/skeuo-theme.css` | New | ~250 lines of scoped skeuomorphic CSS |
| `src/components/layout/MarketingLayout.tsx` | Edit | +15 lines: useEffect for theme attribute |
| `src/index.css` | Edit | +1 line: import statement |
| `src/components/landing/HomeHero.tsx` | Edit | +3 lines: tactile button classes |
| `src/components/landing/HomeFinalCTA.tsx` | Edit | +2 lines: tactile button classes |

5 files touched, all changes scoped to marketing pages only.

