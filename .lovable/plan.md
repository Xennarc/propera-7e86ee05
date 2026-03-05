

## Improve Visual Hierarchy on Pricing Page

The page currently has uniform section styling — similar padding, similar heading sizes, and identical background treatments. This makes sections blur together. The fix is to create clearer visual rhythm through contrast, spacing, and typographic scale.

### Changes

**1. Section headings — establish a clear typographic scale**

Each section heading currently uses roughly the same `text-2xl md:text-3xl` size. Create differentiation:

- **Hero**: Already large (good) — no change
- **Plan Cards section**: Add a short section label + heading above the cards ("Choose your plan") so readers know they've arrived at the decision point
- **Switch section**: Reduce heading to `text-xl md:text-2xl` — it's supporting content, not primary
- **Comparison Matrix**: Same — `text-xl md:text-2xl`
- **Stack Comparison**: Same — `text-xl md:text-2xl`
- **FAQ**: Keep current size — it's a destination section

**2. Add a section intro above Plan Cards**

Currently the resort size selector sits alone between the hero and the cards with no heading. Add a centered heading: "Choose your plan" with a short subtitle, giving the cards section a clear entry point.

**3. Alternate section backgrounds for visual rhythm**

Right now most sections have similar transparent/gradient backgrounds. Create alternation:

- Plan Cards: Keep current (dark gradient) — primary decision area
- Switch section: Add a subtle `bg-card/50` lifted surface to separate it from the cards
- Comparison Matrix: Keep current light gradient
- Stack Comparison: Add `bg-card/30` surface
- FAQ: Keep current card background

**4. Improve spacing rhythm between sections**

- Increase spacing before the FAQ and CTA sections (`py-20 md:py-28`) to create a visual "breath" before the closing
- Tighten spacing between Plan Cards and Switch (`py-12 md:py-16`) since they're closely related

**5. Add subtle section dividers**

Add thin `border-t border-border/10` dividers between the comparison tables and FAQ to break the visual monotony without heavy elements.

**6. Strengthen the Plan Cards section label**

Add a small pill/badge above the plan grid saying "Plans" (similar to the FAQ "Questions" badge) to create visual anchoring.

### Files to modify

- `src/components/pricing/PricingPlanGrid.tsx` — add section heading + pill badge above the grid
- `src/components/pricing/PricingSwitchSection.tsx` — reduce heading size, adjust background
- `src/components/pricing/PricingComparisonMatrix.tsx` — reduce heading size, add top divider
- `src/components/pricing/PricingStackComparison.tsx` — reduce heading size, add surface bg, add divider
- `src/components/pricing/PricingFAQSection.tsx` — increase top padding for breathing room

No structural or business logic changes. Copy stays the same. Only typographic scale, spacing, and surface contrast adjustments.

