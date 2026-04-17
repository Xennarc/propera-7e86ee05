
## Pricing Page Redesign — "Designed with Intention"

The current page has good bones but reads as templated. Three equal-weight cards, gradient pills on top, decorative orb icons, violet for Elite (off-brand), and a generic "At a glance" comparison table. We can keep all the data and copy logic — this is a craft pass on the surface.

### Diagnostics (what's making it feel AI-generated)

| Issue | Where | Why it reads templated |
|---|---|---|
| Three equal cards, all same shape | `PricingPlanGrid` | Standard SaaS "compare three plans" trope. No editorial weight. |
| Gradient ribbons + Crown/Sparkles emoji-icons | Plan cards | Adds noise; signals "templated pricing component." |
| Violet/purple Elite | Cards + matrix | Off-brand. We have lime + blurple — purple comes from nowhere. |
| Decorative orb icons (Smartphone/Monitor/BarChart) | Plan cards | Icons don't communicate anything; pure decoration. |
| `text-3xl` price next to "per resort/month" | Plan cards | Price doesn't dominate. Typographic flatness. |
| "← Swipe to see all plans →" instructional copy | Comparison matrix | Apologetic micro-copy. |
| Identical section rhythm: eyebrow + h2 + lede, repeated | Every section | No tonal variation between sections. |
| Generic round-checkmark feature lists | Cards + matrix | The default pricing-page move. |

### Design principles for this page

1. **One tier wins, visibly.** Professional gets real weight (size, position, surrounding white space) — not just a ribbon.
2. **Typography over chrome.** Big confident prices using `tabular-nums` and tight tracking. Eyebrow labels in small-caps. Drop the orb icons entirely.
3. **Brand-true color.** Lime for Professional. A warm neutral (sand/foreground at high opacity) for Elite — not violet. Essential stays quiet.
4. **Editorial rhythm.** Sections vary: hero (centered), plans (asymmetric trio), comparison (full-bleed dense table), stack-replacement (left-aligned editorial), FAQ (two-column), CTA (oversized).
5. **Detail craft.** 1px hairlines instead of soft borders. Numbers in `tabular-nums`. Hover shifts the price up 2px, not the whole card. Real focus rings.

---

### Section-by-section changes

#### 1. `PricingHeroSection`
Mostly intact — it's the strongest piece. Tightening only:
- Drop the four "value chips" row (generic). Replace with a single line of attribution-style copy under the CTAs: "Trusted by resorts in 6 markets" — only if true; otherwise remove entirely.
- Lower the secondary "One source of truth from guest tap → team schedule" to a smaller eyebrow above the H1 instead of a third paragraph below.

#### 2. `PricingPlanGrid` — the main work

**Layout (desktop ≥ md):**
```text
┌─────────────┐  ┌───────────────┐  ┌─────────────┐
│             │  │               │  │             │
│  Essential  │  │  PROFESSIONAL │  │    Elite    │
│   (quiet)   │  │   (hero card) │  │  (refined)  │
│             │  │               │  │             │
└─────────────┘  └───────────────┘  └─────────────┘
   col-span-3       col-span-4         col-span-3
   (smaller)        (taller, wider,    (smaller)
                     pulled up -8)
```
A 10-column grid (3/4/3) instead of 1/1/1. Professional is physically larger. Essential and Elite are the supporting cast.

**Card chrome:**
- Remove gradient top ribbons entirely. Replace with a single small-caps label above the plan name: `RECOMMENDED` (Professional only) in lime, no background.
- Remove `AnimatedFeatureIcon` orbs. Plan name becomes the visual anchor.
- 1px borders, no `ring-2`. Professional gets a 1px lime border + a soft lime glow behind the card (kept). Elite gets a 1px foreground/20 border, no purple anywhere.
- Background: all three on `bg-card`, no per-tier gradients.

**Typography:**
- Plan name: `font-serif text-2xl tracking-tight` (was `text-xl font-bold`) — use the existing serif family for editorial feel matching the hero.
- Price: `text-5xl font-semibold tracking-tight tabular-nums` (was `text-3xl font-bold`). Professional's price gets `text-6xl`.
- "per resort / month" on its own line below price in `text-xs uppercase tracking-wider text-muted-foreground` — small-caps style.
- Tagline + "Recommended for" merge into one short italic-serif line under the plan name. No "Recommended for:" label.

**Feature list:**
- Replace round-bg checkmarks with a thin 1px lime tick (just an icon, no background pill).
- "Everything in X, plus:" rendered as small-caps eyebrow above the new items, not as a bullet.
- Drop the "Why teams choose this" highlight box on Professional — redundant with the larger card itself doing the work.

**CTA:**
- Professional: solid lime (kept).
- Essential + Elite: ghost button with 1px border, foreground text — not card-colored mush. Both equally quiet so Professional's CTA stands out.

**Footer of card (usage/overage):**
- Remove the muted background pill. Use a 1px hairline above two small text rows: "Includes 3,000 stays / mo" and "Then $0.08 / stay" in `tabular-nums`. Cleaner, more confident.

#### 3. `PricingComparisonMatrix`
- Remove the "← Swipe to see all plans →" copy. Use `overflow-x-auto` with a fade mask on the right edge instead.
- Drop the round-bg checkmarks. Use a single lime tick for included, a hairline em-dash `—` for excluded.
- Highlight the Professional column with a subtle lime tint applied to the *whole column from header to last row* (one continuous shape, not per-cell stripes).
- Rename eyebrow from "Comparison" to something less generic — e.g. "What's in each plan."

#### 4. `PricingStackComparison`
Left-aligned editorial layout (currently centered). Big serif headline, two-column comparison: "Before Propera" (list of 6–8 vendors with logos or names) vs "With Propera" (one logo, one line). This is the page's emotional moment — give it space.

#### 5. `PricingSwitchSection` + `PricingFAQSection`
- FAQ: switch from accordion-in-cards to a clean two-column list at md+, single column on mobile. Question in serif, answer in body sans. 1px hairline between rows. No background card.
- Switch section: tighten copy, drop redundant CTA if it duplicates the hero/footer.

#### 6. `PricingCTASection`
Oversized closing line. Single sentence in serif `text-5xl`, one CTA. No card, no gradient — page background carries it.

---

### Technical details

- **No new dependencies.** All shadcn/Tailwind/lucide.
- **Color tokens:** stays on existing palette — lime (`primary`), foreground, muted-foreground, border. Removes `violet-500` / `purple-500` references entirely.
- **Typography:** uses existing `font-serif` (already in hero) + `tabular-nums` utility (Tailwind built-in).
- **Files touched:**
  - `src/components/pricing/PricingHeroSection.tsx` — minor copy + chip removal
  - `src/components/pricing/PricingPlanGrid.tsx` — major (asymmetric grid, type, color, chrome)
  - `src/components/pricing/PricingComparisonMatrix.tsx` — moderate (column highlight, tick style)
  - `src/components/pricing/PricingStackComparison.tsx` — moderate (left-align, type)
  - `src/components/pricing/PricingFAQSection.tsx` — moderate (de-card)
  - `src/components/pricing/PricingCTASection.tsx` — minor (oversize headline)
  - `src/components/pricing/PricingSwitchSection.tsx` — light tightening
- **Untouched:** `usePricingConfig`, `useResortSize`, `ResortSizeSelector` logic, all data shapes, all routes.
- **Out of scope:** changing prices, plan names, feature lists, or any data — pure presentation layer.

### Risk
Low. Purely additive/visual — no logic, no data, no route changes. Mobile (428px) is the user's current viewport, so I'll verify each card stacks cleanly and the comparison table remains readable with the fade-mask scroll.

### What I need from you
Just approval to proceed. If you'd rather see a rendered preview of the new card layout first before I touch the other sections, say "do PricingPlanGrid first" and I'll ship that one file alone for review.
