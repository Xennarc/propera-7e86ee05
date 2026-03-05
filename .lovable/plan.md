

## Current Pricing Page Audit

Here's everything on the page, in render order, with redundancy flagged:

### Section-by-section inventory

| # | Section | Component | Purpose |
|---|---------|-----------|---------|
| 1 | **Hero** | `PricingHeroSection` | Headline, value props, demo CTA, interactive preview |
| 2 | **Resort Size Selector** | `ResortSizeSelector` | Band picker (≤50, 51–150, 151–300) |
| 3 | **Plan Cards** | `PricingPlanGrid` | Essential / Professional / Elite with features, prices, CTAs |
| 4 | **Promise** | `PricingPromiseSection` | "Designed to replace a stack" — 3 bullet points |
| 5 | **Switch** | `PricingSwitchSection` | "Make the switch painless" — Stack-Swap Guarantee, Seasonal Flex, Go-Live Support + Add-ons list |
| 6 | **Stack Comparison** | `PricingStackComparison` | Propera vs Traditional Stack vs Manual Ops (9-row table) |
| 7 | **Plan Comparison Matrix** | `PricingComparisonMatrix` | Essential vs Professional vs Elite feature grid (9-row table) |
| 8 | **Trust** | `PricingTrustSection` | "Designed for real resort days" — 3 trust cards |
| 9 | **FAQs** | `PricingFAQSection` | 7 accordion items + "Not sure which plan?" CTA |
| 10 | **Bottom CTA** | `PricingCTASection` | "Ready to see Propera with your resort?" + demo/sales buttons |

### Redundancies identified

1. **Promise section (#4) duplicates Stack Comparison (#6) and Switch (#5).** The three Promise bullets ("one platform," "one schedule," "one experience") are essentially a summary of the Stack Comparison table rows *and* the Switch section's headline. All three sections hammer "replace your stack" — the Promise section adds nothing unique.

2. **Trust section (#8) is generic filler.** "Operational clarity," "Guest-first experience," and "Reliable consistency" are vague brand statements already communicated by the Hero and plan cards. It sits between two high-value sections (Comparison Matrix and FAQs) and dilutes momentum.

3. **Two comparison tables back-to-back (#6 + #7) create fatigue.** Stack Comparison (Propera vs competitors) and Plan Comparison Matrix (Essential vs Pro vs Elite) are both 9-row tables placed consecutively. They serve different purposes but feel repetitive visually.

4. **Orphan components never rendered:** `PricingAddonsSection`, `PricingComparisonTable`, `PricingEliteSpotlight`, `PricingScenarioGuide` — dead code from earlier iterations.

5. **"Seasonal Flex" mentioned in 3 places:** Switch section card, FAQ #7, and implicitly in plan features. FAQ is fine (different context), but worth noting.

6. **FAQ CTA says "Book a demo" but links to `mailto:`** — inconsistent with the Hero and Bottom CTA which link to `/book-demo`.

### Plan: Remove redundancy, tighten flow

**Remove these sections:**
- `PricingPromiseSection` — its messaging is covered by the Hero tagline + Stack Comparison table
- `PricingTrustSection` — generic; doesn't add conversion value between Comparison Matrix and FAQs

**Delete orphan files:**
- `PricingAddonsSection.tsx`
- `PricingComparisonTable.tsx`
- `PricingEliteSpotlight.tsx`
- `PricingScenarioGuide.tsx`

**Fix FAQ CTA link:**
- Change the "Book a demo" button in `PricingFAQSection` from `mailto:` to a `<Link to="/book-demo">` for consistency

**Reorder remaining sections for better flow:**
1. Hero
2. Resort Size Selector
3. Plan Cards
4. Switch ("Make the switch painless")
5. Plan Comparison Matrix ("At a glance")
6. Stack Comparison ("One platform vs a stack")
7. FAQs
8. Bottom CTA

This moves the plan-vs-plan matrix closer to the cards (where readers compare tiers), and puts the competitive stack comparison further down (where skeptics scroll).

### Files changed
- `src/pages/PricingPage.tsx` — remove Promise/Trust imports+renders, reorder sections, remove orphan import if any
- `src/components/pricing/PricingFAQSection.tsx` — fix CTA link to `/book-demo`
- **Delete:** `PricingPromiseSection.tsx`, `PricingTrustSection.tsx`, `PricingAddonsSection.tsx`, `PricingComparisonTable.tsx`, `PricingEliteSpotlight.tsx`, `PricingScenarioGuide.tsx`

