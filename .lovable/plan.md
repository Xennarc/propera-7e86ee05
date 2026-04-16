

## Align Pricing Page to Landing Page Design System

The landing page uses a clean editorial aesthetic: serif headings, uppercase tracking labels, light body text, minimal backgrounds, and refined CTAs. The pricing page currently uses a different visual language — sans-serif bold headings, icon pill badges, heavy gradient blobs, and shadcn Button wrappers. This plan brings consistency.

### Design Pattern Reference (from landing page)

```text
Label:    text-[11px] font-semibold tracking-[1.5px] uppercase text-muted-foreground
Heading:  font-serif text-[38px] font-bold leading-[1.05] tracking-[-1px]
Body:     text-sm/text-[15px] font-light leading-[1.65] text-muted-foreground
Section:  py-[60px] border-t border-border/50, minimal bg
CTA:      Direct Link (not shadcn Button), h-[52px]-h-[56px], rounded-full
Glows:    Hidden on mobile (hidden sm:block), subtle
```

### Changes by File

**1. `src/components/pricing/PricingHeroSection.tsx`**
- Replace sans-serif `font-bold` heading with `font-serif text-[52px] font-black leading-[1.0] tracking-[-1.5px]` matching HomeHero
- Add uppercase label above headline: `text-[11px] font-semibold tracking-[1.5px] uppercase` saying "Pricing"
- Remove the icon pill badge (`Layers` icon + "Plans" chip)
- Subtitle → `text-base font-light leading-[1.65]`
- Replace shadcn `Button` CTAs with direct styled `Link`/`button` elements matching HomeHero pattern (`h-[56px]`, `text-[16px]`, glow shadow)
- Remove the interactive product preview (tabs, dashboard stats, booking items) — it's heavy and doesn't exist on the landing page. Replace with a simpler layout (left-aligned text like HomeHero, no right column)
- Simplify background: remove heavy gradient blobs on mobile, keep subtle radial gradients

**2. `src/components/pricing/PricingPlanGrid.tsx`**
- Section heading: replace icon pill + sans-serif with uppercase label + serif heading
- Remove the `Layers` icon badge
- CTA buttons inside cards: replace shadcn `Button asChild` with direct styled `<a>` links, `h-[52px]` rounded-full
- Section padding: `py-[60px]` to match landing sections

**3. `src/components/pricing/PricingComparisonMatrix.tsx`**
- Heading → serif style with uppercase label
- Section → `py-[60px] border-t border-border/50`
- Remove heavy gradient blobs

**4. `src/components/pricing/PricingSwitchSection.tsx`**
- Heading → serif style with uppercase label ("Switching")
- Section → `py-[60px] border-t border-border/50 bg-card/30`
- Remove gradient overlay

**5. `src/components/pricing/PricingStackComparison.tsx`**
- Heading → serif style with uppercase label
- Section → `py-[60px] border-t border-border/50`

**6. `src/components/pricing/PricingFAQSection.tsx`**
- Replace `HelpCircle` icon pill with uppercase label
- Heading → serif style
- Section → `py-[60px] border-t border-border/50`
- Remove heavy gradient/glow backgrounds
- CTA card at bottom: buttons → direct styled links matching landing CTA pattern

**7. `src/components/pricing/PricingCTASection.tsx`**
- Match `HomeFinalCTA` exactly: serif heading, uppercase label, direct styled Link CTAs (`h-[52px]`)
- Remove heavy glow/gradient backgrounds, use subtle `bg-gradient-to-b from-transparent to-primary/[0.04]`

### What stays the same
- All data, content, links, scroll targets, and behavior
- Plan card structure and feature lists
- Comparison matrix data
- FAQ accordion functionality
- ResortSizeSelector component

