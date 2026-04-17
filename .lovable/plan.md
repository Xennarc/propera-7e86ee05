

## Adapt Guest Portal to Warm Editorial + Reference Inspiration

### Reference reading (from the dashboard you shared)
- **Surface**: Warm Sand background with soft, generously-rounded **Paper "pill" cards** that float — pronounced rounded corners, hairline shadows, no harsh borders.
- **Pill chips everywhere**: KPIs, filters, and section toggles render as elongated white pills with a single dark active chip. Status circles (yellow/lime accent dot) used as anchors.
- **Typography rhythm**: Big serif numerals/labels paired with quiet sand-tinted muted captions ("Diagnosis", "Heart Rate" → "Hypertension", "89 bpm"). This maps perfectly to our **Playfair Display + DM Sans** stack.
- **Soft chrome**: Single accent (Sprig lime + Ember) used sparingly for status anchors and the active filter; everything else is paper-on-sand.

### Core principle
Keep design system tokens (Sand/Paper/Obsidian/Sprig/Ember + Playfair/DM Sans). No new colors. Re-shape the existing guest surfaces toward the reference's **pill + paper + serif numeral** language. Strict additive — no removed components.

### Scope (what changes)

**1. `src/index.css` — guest primitives retune (one block, ~40 lines)**
- `.guest-card`: keep API, swap to Paper-on-Sand look — `bg-card`, `border` softened to `border-transparent` + warmer shadow, larger radius (`rounded-[28px]`), no hover rotate (calmer).
- `.guest-stay-badge`: switch from white-glass to **Obsidian pill** (`bg-foreground text-background`) so it reads against any hero overlay using design system; `accent` variant becomes Sprig.
- `.guest-quick-action`: replace bright color tiles with **Paper pills containing an Obsidian icon tile** (matches `ObsidianIconTile` primitive). Label below in DM Sans, optional Sprig status dot for "new/recommended".
- New `.guest-pill-chip` + `.guest-pill-chip-active` utilities — for filter rows / section toggles (Today / Tomorrow / This Week).
- New `.guest-stat-pill` — large Paper pill with Playfair numeral + DM Sans caption, modeled on the dashboard KPI row.

**2. `src/components/guest/GuestQuickActions.tsx`**
- Remove hard-coded `bg-teal-500 / amber-500 / emerald-500 / purple-500 / sky-500` background classes.
- Each tile becomes: Paper pill (`guest-card` light variant) → `ObsidianIconTile` (40px) → label in DM Sans → optional `StatusDot tone="sprig"` for active/new state.
- Same grid + same routing + same flag logic. Pure visual swap.

**3. `src/pages/guest/GuestHome.tsx` — hero + section retune (no logic changes)**
- Hero card: keep image, swap overlay to a **single warm Obsidian gradient** (no double-stack), badges become Obsidian/Sprig pills via new tokens. Greeting heading switches to `font-serif` (Playfair) for the "Good morning, {name}" line; date line stays DM Sans muted.
- Replace inline `bg-amber-500 hover:bg-amber-600 text-black` button (line 410) with semantic `bg-accent text-accent-foreground` (Sprig).
- Replace `from-warning/* border-warning/*` feedback prompt (line 304) and `from-primary/10 border-primary/20` pre-arrival prompt (line 275) with the new Paper pill style + Sprig/Ember status dot — same content, calmer surface.
- Add a **stat-pill row** above "Today's Schedule" showing 3 quiet KPIs sourced from existing data: `Day X of Y`, `{n} today`, `{n} tomorrow`. Uses `guest-stat-pill`. No new queries.

**4. `src/components/guest/GuestStayProgress.tsx`**
- Progress bar fill: swap `from-primary via-lagoon to-sunset` (legacy palette) → `from-foreground via-foreground/80 to-accent` (Obsidian → Sprig). Sunset/lagoon icon tints → `text-foreground/70`.

**5. `src/components/guest/GuestBottomNav.tsx`**
- Active state: replace glow + dot with reference-style **inline Obsidian pill** wrapping the active icon (calmer, matches "Treatment Dynamics" active chip). Inactive icons unchanged. No structural change.

**6. `src/components/guest/GuestLayout.tsx` (header only)**
- Header chrome: drop `surface-glass-strong` (carryover from dark theme) → use `bg-background/95 backdrop-blur-sm border-border` so the warm Sand reads through. Logo container: replace `bg-primary/10` fallback with `bg-foreground text-background` (ObsidianIconTile language).

**7. `src/components/guest/TravelPartyCard.tsx`** (cosmetic only)
- Remove `from-muted/40 via-muted/20` gradient and `bg-primary/10` icon tile → use `guest-card` + `ObsidianIconTile`. Same content.

### Out of scope (explicitly not touched)
- All routing, data fetching, RPCs, React Query keys, feature flags, real-time subscriptions, auth.
- `src/integrations/supabase/*`, edge functions, migrations.
- Restaurant/Activity/Booking/Room Service detail pages — Home + shared primitives only this round; they'll inherit the new `.guest-card` and pill utilities automatically.
- Pre-arrival home (`GuestPrearrivalHome`) — separate pass if you want.
- Branding override system (`useResortBranding`, `--guest-primary` HSL injection) stays intact.

### Files touched
- `src/index.css` (guest utilities block)
- `src/components/guest/GuestQuickActions.tsx`
- `src/pages/guest/GuestHome.tsx`
- `src/components/guest/GuestStayProgress.tsx`
- `src/components/guest/GuestBottomNav.tsx`
- `src/components/guest/GuestLayout.tsx` (header only)
- `src/components/guest/TravelPartyCard.tsx`
- `mem://style/warm-editorial-theme` (append "Guest portal primitives" section)

### Risk
Low–medium visual change, **zero functional risk**. All edits are className/utility swaps within existing components. Branding overrides still win because `--guest-primary` continues to drive `--primary`. If a resort has set custom guest brand colors, the Sprig accents will be replaced by their brand color automatically — by design.

### Verification after build
- `/guest` (home) — hero, quick actions grid, today schedule
- `/guest/activities`, `/guest/restaurants`, `/guest/bookings` — inherit new card style
- `/guest/profile`, `/guest/notifications` — confirm header + nav
- Bottom nav active state at 468×1198 (current viewport)
