

## HomeHero CTA Redesign

### Changes to `src/components/landing/HomeHero.tsx`

1. **Remove the label pill** — Delete the entire `motion.div` block (lines 51–61) containing "Resort Operations Platform"

2. **Redesign CTA buttons** to match the reference image:
   - **"Book a demo"** — Full-width on mobile, larger height (~56px), stronger lime glow, bolder presence. Remove the shadcn `Button` wrapper and use a styled `Link` directly for cleaner control, or keep `Button` but override classes more precisely.
   - **"Explore the platform"** — Subtle rounded outline with softer border, matching the reference's thinner, more refined ghost style. Slightly larger height to match primary.
   - Increase gap between the two buttons slightly (gap-3 → gap-3.5)
   - Both buttons get `text-[16px]` and `h-[56px]` for more visual weight

### Files Modified (1)
- `src/components/landing/HomeHero.tsx`

### No behavior changes
All links, scroll targets, and animations remain identical.

