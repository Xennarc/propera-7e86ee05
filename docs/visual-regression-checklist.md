# Visual Regression Checklist — Propera

Use this checklist when verifying UI changes across portals.

## Typography Hierarchy

- [ ] Only ONE `<h1>` per page
- [ ] Heading sizes follow scale: h1 (xl/2xl), h2 (lg), h3 (base), h4 (sm)
- [ ] Body text uses `text-sm` (14px) — never smaller than `text-xs` for readable content
- [ ] Muted text uses `text-muted-foreground`, not hardcoded grays
- [ ] Font family renders as Plus Jakarta Sans (check fallback on slow connections)

## Spacing Rhythm

- [ ] Page-level vertical spacing: `space-y-4` (ops pages) or `space-y-6` (settings/admin)
- [ ] Section spacing: consistent `space-y-4` within sections
- [ ] Card internal padding: `p-4` minimum on mobile, `p-5` on sm+
- [ ] No zero-padding containers on mobile (min `px-4` from safe area)

## Color Tokens

- [ ] All foreground text uses `text-foreground`, `text-muted-foreground`, or semantic status colors
- [ ] No hardcoded `text-white`, `text-black`, `text-gray-*` in components
- [ ] Background uses `bg-background`, `bg-card`, `bg-muted` — never raw hex/rgb
- [ ] Status colors use tokens: `text-success`, `text-warning`, `text-destructive`, `text-info`
- [ ] Dark mode: verify contrast on all text/bg combinations

## Safe Area & iOS Safari

- [ ] Bottom nav never overlaps action buttons or content
- [ ] Bottom action bars use `pb-safe-bottom` or `env(safe-area-inset-bottom)`
- [ ] Fixed bottom elements account for `--guest-nav-h: 72px`
- [ ] No `position: fixed` elements without safe-area bottom padding
- [ ] Inputs use `text-base` (16px) to prevent iOS auto-zoom
- [ ] Test with Safari toolbar visible AND collapsed

## Android Chrome

- [ ] Sheets and drawers render without background bleed
- [ ] Tabs/segmented controls reach 44px touch target height
- [ ] Cards have consistent `rounded-2xl` borders
- [ ] Status bar area doesn't overlap content

## Component Consistency

- [ ] All cards in a list use the same variant (AppCard default/elevated/interactive)
- [ ] Empty states use `AppEmptyState` or `EmptyState` — not ad-hoc divs
- [ ] Page headers use `AppToolbar` or `PageHeader` — not raw `<h1>`
- [ ] Filter chips maintain 44px minimum touch target
- [ ] Banners use `AppBanner` — not custom alert divs
- [ ] Refresh buttons are in the toolbar, not floating

## Motion & Transitions

- [ ] Page content fades in on mount (`animate-fade-in`)
- [ ] Interactive cards have hover lift (1px translateY)
- [ ] Press feedback: `active:scale-[0.995]` on clickable cards
- [ ] Sheets slide in from right with `animate-slide-in-right`
- [ ] No animation runs on `prefers-reduced-motion: reduce`
- [ ] No `backdrop-blur` on sticky/scroll elements (causes iOS jitter)

## Responsive Breakpoints

- [ ] iPhone SE (375px): all content visible without horizontal scroll
- [ ] iPhone 14 (390px): cards and inputs don't overflow
- [ ] iPad (768px): grid layouts switch from 1-col to 2-col
- [ ] Desktop (1024px+): sidebar visible, content centered with max-width

## Accessibility

- [ ] Focus ring visible on all interactive elements (ring-2 ring-ring)
- [ ] Color contrast meets WCAG AA (4.5:1 text, 3:1 large text)
- [ ] Screen reader: headings form a logical outline
- [ ] Touch targets: minimum 44x44px on all buttons and links
