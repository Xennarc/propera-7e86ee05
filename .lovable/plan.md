

## Performance-First Framer Motion Scroll Reveals

### Current State

The public pages use **two different animation systems** that need unifying:

1. **CSS-based system** (`useScrollReveal` hook + `.section-reveal` / `.stagger-N` classes) -- used by 11 components: `WhyProperaCards`, `PlatformModules`, `HowItWorks`, `GlobalReady`, `HomeFinalCTA`, `MarketingSection`, `GuestJourneyFlow`, and all 5 pricing sections.

2. **Framer Motion** (`whileInView`) -- used by 3 components: `HomeHero`, `PricingTeaser`, `TrustStrip`.

The CSS system has no `will-change` hints on the animating containers, uses `transform: translateY(30px)` which can cause layout shift during the transition, and the stagger system relies on CSS `transition-delay` which can't be optimized by Framer Motion's layout engine.

### Plan

Create a single, reusable Framer Motion component that replaces the CSS-based reveal system across all public pages. This gives us GPU-composited animations with `will-change`, viewport-triggered `whileInView`, and staggered children via Framer's `staggerChildren` -- all in one consistent system.

### Technical Details

#### 1. New component: `src/components/motion/ScrollReveal.tsx`

A thin wrapper around `motion.div` that provides the fade-in-up effect:

```tsx
import { motion, type Variants } from 'framer-motion';
import { useAnimationPreference } from '@/hooks/useReducedMotion';

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1], // cubic-bezier for smooth decel
      staggerChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
};
```

- `ScrollReveal` -- container with `whileInView="visible"`, `viewport={{ once: true, margin: "-50px" }}`, and `style={{ willChange: 'opacity, transform' }}`
- `RevealItem` -- child wrapper using `itemVariants` for stagger
- Both respect `useAnimationPreference()` -- if reduced motion or low-power, render as plain `div` with no animation

#### 2. Update `MarketingSection.tsx`

Replace `useScrollReveal` + CSS class toggling with `ScrollReveal` wrapper. Remove the `section-reveal` / `section-revealed` class logic. The component becomes:

```tsx
<ScrollReveal>
  <div className={cn('mx-auto px-6 relative', sizeClasses[size])}>
    {children}
  </div>
</ScrollReveal>
```

#### 3. Update landing page sections (6 files)

Each section replaces its `useScrollReveal` pattern:

| Component | Change |
|-----------|--------|
| `WhyProperaCards.tsx` | Remove `useScrollReveal`, wrap content in `ScrollReveal`, wrap each `ValueCard` in `RevealItem` instead of `stagger-N` classes |
| `PlatformModules.tsx` | Same pattern -- `ScrollReveal` container, `RevealItem` for header + each `ModuleCard` |
| `HowItWorks.tsx` | `ScrollReveal` container, `RevealItem` for each `StepCard` |
| `GlobalReady.tsx` | `ScrollReveal` container, `RevealItem` for header, chips, showcases |
| `HomeFinalCTA.tsx` | `ScrollReveal` container, `RevealItem` for h2, p, buttons, reassurance |
| `HomeHero.tsx` | Already uses Framer Motion -- add `style={{ willChange: 'opacity, transform' }}` to each `motion.div` |

#### 4. Update pricing page sections (5 files)

| Component | Change |
|-----------|--------|
| `PricingTrustSection.tsx` | Replace `useScrollReveal` with `ScrollReveal` + `RevealItem` |
| `PricingCTASection.tsx` | Same |
| `PricingComparisonMatrix.tsx` | Same |
| `PricingPlanGrid.tsx` | Same |
| `PricingFAQSection.tsx` | Same |
| `PricingAddonsSection.tsx` | Same |
| `PricingTeaser.tsx` | Already uses Framer Motion -- add `will-change` style |
| `TrustStrip.tsx` | Already uses Framer Motion -- add `will-change` style |

#### 5. Update `GuestJourneyFlow.tsx`

Replace `useScrollReveal` with `ScrollReveal`.

#### 6. CSS cleanup in `src/index.css`

Remove the now-unused CSS rules (lines ~2150-2170):
- `.section-reveal` / `.section-revealed` opacity/transform rules
- `.section-revealed .stagger-1` through `.stagger-7` delay rules

Keep all other CSS animations (hover effects, chart-bar-grow, chip-stagger, etc.) as they serve different purposes.

#### 7. No changes to `useScrollReveal.ts`

The hook file stays as-is -- it may still be used by non-marketing components. If no remaining consumers exist after all updates, it can be removed in a follow-up.

### Performance Guarantees

- **`will-change: opacity, transform`** on every animating `motion.div` -- tells the browser to composite these elements on their own GPU layer
- **`viewport={{ once: true }}`** -- animations fire once and Framer disconnects the IntersectionObserver, zero ongoing cost
- **`staggerChildren: 0.08`** -- Framer batches child animations off the main thread
- **Reduced motion / low-power** -- bypasses all animation, renders static `div` elements
- **No layout shift** -- `y: 24` translate doesn't affect document flow (transform-only, no height/margin changes)
- **Lazy-loaded sections** remain lazy -- `ScrollReveal` is lightweight (~200 bytes) and doesn't import framer-motion's heavy features

### Files Changed

| File | Type |
|------|------|
| `src/components/motion/ScrollReveal.tsx` | **New** |
| `src/components/layout/MarketingSection.tsx` | Edit |
| `src/components/landing/WhyProperaCards.tsx` | Edit |
| `src/components/landing/PlatformModules.tsx` | Edit |
| `src/components/landing/HowItWorks.tsx` | Edit |
| `src/components/landing/GlobalReady.tsx` | Edit |
| `src/components/landing/HomeFinalCTA.tsx` | Edit |
| `src/components/landing/HomeHero.tsx` | Edit (add will-change) |
| `src/components/landing/PricingTeaser.tsx` | Edit (add will-change) |
| `src/components/landing/TrustStrip.tsx` | Edit (add will-change) |
| `src/components/pricing/PricingTrustSection.tsx` | Edit |
| `src/components/pricing/PricingCTASection.tsx` | Edit |
| `src/components/pricing/PricingComparisonMatrix.tsx` | Edit |
| `src/components/pricing/PricingPlanGrid.tsx` | Edit |
| `src/components/pricing/PricingFAQSection.tsx` | Edit |
| `src/components/pricing/PricingAddonsSection.tsx` | Edit |
| `src/components/illustrations/GuestJourneyFlow.tsx` | Edit |
| `src/index.css` | Edit (remove unused rules) |

18 files total. No new dependencies needed (framer-motion already installed).

