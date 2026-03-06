

## Replace Gradient Mesh with Animated Blob Gradient

The current `.hero-gradient-mesh` uses `background-position` animation on radial gradients — this produces a subtle color shift but no visible blob movement. To get visibly moving blobs, we need actual positioned elements that translate/morph independently.

### Approach

Replace the single `hero-gradient-mesh` div with 3-4 individual blob `<div>` elements inside `HomeHero.tsx`, each with its own keyframe animation for position, scale, and shape changes. This creates the "lava lamp" / moving blob effect.

### Changes

**`src/components/landing/HomeHero.tsx`**
- Replace the single `<div className="hero-gradient-mesh" />` with 3-4 individual blob divs, each with a unique animation class (e.g. `hero-blob-1`, `hero-blob-2`, etc.)
- Remove the existing ocean-blob divs (they'll be merged into the new blob system to avoid redundancy)

**`src/index.css`**
- Remove or repurpose `.hero-gradient-mesh` styles
- Remove ocean-blob keyframes (consolidated)
- Add new `@keyframes hero-blob-drift-1/2/3/4` that animate `transform: translate() scale()` and `border-radius` for organic morphing movement
- Each blob: `position: absolute`, large size (300-600px), heavy blur (`blur-[100px]` to `blur-[160px]`), brand colors (lime, teal, blurple), ~15-25s animation cycles at different speeds
- Respect `prefers-reduced-motion` — disable all blob animations

Example blob keyframe:
```css
@keyframes hero-blob-1 {
  0%, 100% { transform: translate(0, 0) scale(1); border-radius: 40% 60% 70% 30% / 40% 30% 70% 60%; }
  25%      { transform: translate(80px, -60px) scale(1.1); border-radius: 60% 40% 30% 70% / 60% 70% 30% 40%; }
  50%      { transform: translate(-40px, 40px) scale(0.95); border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
  75%      { transform: translate(60px, 20px) scale(1.05); border-radius: 50% 40% 60% 50% / 30% 50% 70% 60%; }
}
```

4 blobs total, each using `will-change: transform` for GPU acceleration. Three files touched, focused diff.

