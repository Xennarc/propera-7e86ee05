

## Adapt Propera to the new "Warm Editorial" design system

The screenshot defines a fundamentally different aesthetic from today's dark Modern Professional theme: warm neutral light surfaces, obsidian as the "ink," serif display type for hospitality grace notes, and saturated accents (Sprig green, Ember orange) used sparingly. This is a **brand repositioning**, not a tweak — so we need to scope it carefully.

---

### What's actually changing

| Token | Today | New system |
|---|---|---|
| Surface | `#0B0E14` dark | **Sand** warm beige (~`#EDE9E0`) + **Paper** white cards |
| Ink | `#F0F6FC` light | **Obsidian** near-black (~`#0E0F0E`) |
| Accent (primary) | Astro Lime `#C3FF2E` | **Sprig** soft green (~`#B8E29E`) |
| Accent (alert/CTA) | Blurple `#5865F2` | **Ember** orange-red (~`#E94F2A`) |
| Display font | Playfair Display (serif) | **Instrument Serif** |
| Body font | DM Sans | **Geist** |
| Radii | 12px base, 24px+ cards | **12 / 16 / 20 / 28** scale |
| Mode | Dark-first | **Light-first**, warm |

### The hard question: scope

The current public/marketing pages are **locked to dark mode** by `MarketingLayout` (per the public-pages-dark-mode-enforcement memory). The internal portals (Staff, Guest, SuperAdmin, Driver) support light + dark. There are three honest options:

**Option A — Public pages only (recommended start)**
Repaint Landing, Pricing, About, Auth, GuestLogin in the new warm-light system. Internal portals keep the Modern Professional theme. Lowest risk, highest brand impact, ~1 day of focused work.

**Option B — Public + Guest portal**
Public pages + the guest experience get the new system (most "hospitality" surface area). Staff/admin keep Modern Professional (operational, dark-mode-friendly). This is the most coherent product story — the *guest* sees warm hospitality, *staff* see ops tooling. Medium scope.

**Option C — Whole product**
Full repaint. Largest scope, touches ~380 components, real risk of regressions across staff ops, planner, dining, transport. I'd want to do this in phases regardless.

### Recommended approach: Option A first, as a reference implementation

Pick one option, ship it well, then expand. Same logic as the Pricing page pass.

---

### Plan for Option A (Public pages)

#### 1. Token layer — `src/index.css`
Add a new theme block (don't replace existing tokens — additive per project philosophy):

```css
.theme-warm-editorial {
  --background: 42 22% 91%;      /* Sand */
  --foreground: 60 4% 6%;         /* Obsidian */
  --card: 0 0% 100%;              /* Paper */
  --card-foreground: 60 4% 6%;
  --primary: 60 4% 6%;            /* Obsidian as primary CTA */
  --primary-foreground: 0 0% 100%;
  --accent: 96 50% 75%;           /* Sprig */
  --accent-foreground: 60 4% 6%;
  --destructive: 12 83% 54%;      /* Ember */
  --muted: 42 18% 86%;
  --border: 42 12% 80%;
  --radius: 1rem;                 /* 16px base */
}
```

Plus radius scale (`--radius-sm: 12px`, `--radius-md: 16px`, `--radius-lg: 20px`, `--radius-xl: 28px`).

#### 2. Typography — `index.html` + `tailwind.config.ts`
- Add Instrument Serif and Geist font links (Google Fonts — no new npm deps).
- Add `font-display` (Instrument Serif) and update `font-sans` to Geist as the public-page default.
- Keep existing fonts available so internal portals are unchanged.

#### 3. Layout switch — `MarketingLayout.tsx`
- Change `forcedTheme="dark"` → `forcedTheme="light"` AND add `className="theme-warm-editorial"` to the wrapper.
- Update navbar/footer to use Paper cards, Obsidian text, Ember CTA.

#### 4. Component pass on public pages
Files touched (visual only, no logic):
- `LandingPage.tsx` + hero (`hero-blob` will need a warm palette variant — Sand base with Sprig glow)
- `PricingPage.tsx` (just-redesigned — lime → Sprig, blurple → Ember, body → Geist, headlines → Instrument Serif)
- `AboutPage.tsx`
- `Auth.tsx`, `GuestLogin.tsx`
- `MarketingSection.tsx`, `Navbar`, `Footer`

#### 5. Motif components (new, small)
Create 2–3 reusable primitives the screenshot calls out:
- `<Pill>` — Obsidian solid + Paper outline variants (the "Pre-arrival / Premium / VIP" chips)
- `<StatusDot>` — Sprig/Ember/Sand semantic dots
- `<ObsidianIconTile>` — the small black rounded-square icon container
- `<GraceNote>` — small Instrument Serif italic accent text component

These become the vocabulary for everything else later.

---

### Out of scope (explicitly)
- Internal staff portal, planner, ops sheets — keep Modern Professional dark
- Guest portal interior (post-login) — separate decision later
- Database, routing, feature flags, RBAC — pure presentation
- Removing or renaming any existing tokens (additive only, per project rule)

### Risk
Medium. The `forcedTheme="dark"` change is intentional brand-level; we'll verify all public pages on mobile (468px viewport) and desktop. The hero blob effect will need a palette swap — already noted.

### What I need from you
1. **Confirm scope: Option A (public only), B (public + guest), or C (everything)?**
2. **Are the hex values I sampled from your screenshot acceptable?** (Sand `#EDE9E0`, Obsidian `#0E0F0E`, Sprig `#B8E29E`, Ember `#E94F2A` — I can fine-tune in implementation, but want to confirm direction.)
3. **Keep "Propera" wordmark/logo as-is, or does that need a treatment too?**

Once you confirm, I'll execute Option A end-to-end.

