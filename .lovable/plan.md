

## Update Landing Page to Match New Design

The HTML mockup is a mobile-first redesign of the same landing page sections. The content, data, and behavior are identical — only visual styling, layout structure, and typography change. Here's the section-by-section plan.

### Summary of Changes

The mockup uses a darker, more editorial aesthetic with serif headings (Playfair Display), thinner body weight (DM Sans 300), and tighter spacing. The existing React components and their data/props stay the same — we're restyling them.

---

### 1. Add Google Fonts (Playfair Display + DM Sans)

**File: `index.html`** — Add `<link>` tags for Playfair Display (700, 900) and DM Sans (300, 400, 500, 600).

**File: `tailwind.config.ts`** — Add `fontFamily.serif: ['Playfair Display', ...]` and update `fontFamily.sans` to include `'DM Sans'` as the first entry.

### 2. HomeHero — Editorial Serif Headline + Phone Mockup Below

**File: `src/components/landing/HomeHero.tsx`**

- Change headline to use `font-serif` (Playfair Display), increase size, tighter letter-spacing
- Add a small label pill above headline: "Resort Operations Platform" with a green dot
- Subtitle: lighter weight (`font-light`), muted color
- Keep CTA buttons, value chips — just adjust sizing/spacing to match
- Phone mockup: already rendered via `MobileGuestShowcase` on mobile — keep as-is, it matches the mockup's phone design closely
- Add `"Mobile-first"` to the `valueChips` array (5th chip from the mockup)
- Remove the desktop `InteractiveProductShowcase` lazy load — the mockup doesn't show it. Keep the phone mockup visible at all breakpoints instead (the HTML only shows the phone)

### 3. WhyProperaCards — Analytics Card + Feature Cards Horizontal Scroll

**File: `src/components/landing/WhyProperaCards.tsx`**

- Add section label: `"Why Propera"` (uppercase, small, muted)
- Headline uses serif font
- Keep `AnalyticsMiniCard` but move it inline (full width, below heading)
- Change the 3-column grid of value cards to a **horizontal scroll** of feature cards on mobile (matching `.feature-scroll` in the mockup). On desktop, keep grid layout
- Adjust card styling to match: surface background, rounded-20, accent icon boxes

### 4. PlatformModules — Module List Style

**File: `src/components/landing/PlatformModules.tsx`**

- Add section label: `"Platform"` (uppercase)
- Headline uses serif font
- First module (Guest Portal) gets a spotlight card with icon and description
- Remaining modules render as a vertical list with icon, title, category tag, and description (matching `.module-item` in the mockup)
- Remove `NotificationStreamShowcase` sidebar (not in the mockup)
- Remove `FloatingFragments`

### 5. HowItWorks — Numbered Steps with Connecting Line

**File: `src/components/landing/HowItWorks.tsx`**

- Add section label: `"Setup"` (uppercase)
- Change layout to vertical numbered steps with a connecting line (step number in a circle, vertical line between steps)
- Remove the horizontal desktop layout with device mockups
- Remove `DeviceMockup` and `StaffTasksShowcase` imports — the mockup doesn't use them
- Simpler step descriptions matching the mockup text

### 6. GlobalReady — Multi-Property Card + Guest Journey

**File: `src/components/landing/GlobalReady.tsx`**

- Add section label: `"Scale"` (uppercase)
- Headline uses serif font
- Keep `MultiResortShowcase` and region chips
- Keep `GuestJourneyFlow` — add section label `"End-to-end"` above it
- Remove the decorative globe SVG wireframe

### 7. Remove PricingTeaser and TrustStrip

**File: `src/pages/LandingPage.tsx`**

The mockup doesn't include a pricing teaser or trust strip section between GlobalReady and the final CTA. Remove those `Suspense` blocks. The components themselves stay in the codebase (used elsewhere or future use) — we just stop rendering them on the landing page.

### 8. HomeFinalCTA — Serif Headline

**File: `src/components/landing/HomeFinalCTA.tsx`**

- Headline uses serif font, with "resort's branding" in accent color
- Keep CTA buttons and reassurance points as-is — they already match

### 9. MarketingLayout Footer — Add "Book a Demo" Link

**File: `src/components/layout/MarketingLayout.tsx`**

- Add "Book a Demo" link to the "Get Started" footer column (matching the mockup footer)

### 10. Global Styles

**File: `src/index.css`**

- Add a subtle noise/grain overlay that matches `body::before` in the mockup (the `grain-overlay` class already exists in MarketingLayout but may need opacity adjustment)
- Ensure the serif font utility class works with Tailwind

---

### Files Modified (10)
1. `index.html` — font links
2. `tailwind.config.ts` — font families
3. `src/index.css` — minor grain/noise adjustments
4. `src/components/landing/HomeHero.tsx` — serif headline, label pill, chip addition
5. `src/components/landing/WhyProperaCards.tsx` — section label, horizontal scroll cards
6. `src/components/landing/PlatformModules.tsx` — module list layout
7. `src/components/landing/HowItWorks.tsx` — vertical steps with line
8. `src/components/landing/GlobalReady.tsx` — remove globe, add labels
9. `src/components/landing/HomeFinalCTA.tsx` — serif headline
10. `src/pages/LandingPage.tsx` — remove PricingTeaser and TrustStrip

### Files Not Changed
- `MarketingLayout.tsx` — footer already has the right structure; "Book a Demo" link addition is minor
- No new components created — everything is restyled in place
- No behavior changes — all links, scroll targets, and interactions remain identical

