# Motion Guidelines — Propera Design System

## Principles

1. **Purposeful** — Motion guides attention, provides feedback, and communicates state changes. No decoration-only animation.
2. **Subtle** — Micro-interactions (150–300ms) feel instantaneous. Reserve longer animations (300–500ms) for page transitions and sheet entrances.
3. **Performance** — Use `transform` and `opacity` only (GPU compositing). Never animate `height`, `width`, `margin`, or `box-shadow` on scroll.
4. **Accessible** — Respect `prefers-reduced-motion`. All durations drop to ≤10ms when the user opts out.

## Duration Scale

| Token              | Duration | Use Case                     |
|--------------------|----------|------------------------------|
| `duration-100`     | 100ms    | Button press feedback        |
| `duration-150`     | 150ms    | Hover states, tooltip appear |
| `duration-200`     | 200ms    | Accordion, toggle, scale-in  |
| `duration-300`     | 300ms    | Fade-in, slide-in, sheet     |
| `duration-500`     | 500ms    | Page-level transitions       |

## Easing

| Token             | Curve                             | Use Case                |
|-------------------|-----------------------------------|-------------------------|
| `ease-out`        | `cubic-bezier(0, 0, 0.2, 1)`     | Enter animations        |
| `ease-in`         | `cubic-bezier(0.4, 0, 1, 1)`     | Exit animations         |
| `ease-smooth`     | `cubic-bezier(0.16, 1, 0.3, 1)`  | Premium/hero enters     |
| `ease-bounce-in`  | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | Playful emphasis |

## Standard Micro-Interactions

### Hover Lift
```css
.app-card-interactive {
  transition: transform 200ms ease-out, box-shadow 200ms ease-out;
}
.app-card-interactive:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-card-hover);
}
```

### Press Scale
```css
.press-scale {
  transition: transform 100ms ease-out;
}
.press-scale:active {
  transform: scale(0.98);
}
```

### Fade-In on Mount
Use `animate-fade-in` (300ms ease-out, translateY 8px → 0).

### Sheet/Drawer Enter
Use `animate-slide-in-right` (300ms ease-out) for side drawers.

## Reduced Motion Compliance

All `@keyframes` and `transition` durations are overridden to ≤10ms via the global `prefers-reduced-motion` media query in `index.css`. The `.reduce-motion-fade` escape hatch allows 150ms fades for users who opt out but still need minimal feedback.

## Performance Rules

1. **No blur stacks on scroll** — Sticky headers on operations pages must use solid `bg-background`, not `backdrop-blur`.
2. **No layout thrash** — Animate only `transform` and `opacity`. Use `will-change: transform` sparingly.
3. **Batch animations** — Use `staggerChildren` in Framer Motion scroll-reveal containers (see `ScrollReveal` component).
4. **iOS Safari** — Avoid animating `backdrop-filter` on fixed/sticky elements; it causes scroll jitter.

## Framer Motion Usage

For marketing/public pages, use the `ScrollReveal` / `RevealItem` system:
```tsx
<ScrollReveal>
  <RevealItem><Card /></RevealItem>
  <RevealItem><Card /></RevealItem>
</ScrollReveal>
```

For app pages, prefer CSS animations via Tailwind (`animate-fade-in`, `animate-scale-in`) over Framer Motion to minimize bundle size.
