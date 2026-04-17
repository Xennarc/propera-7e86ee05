
## App-wide Warm Editorial — Light-only (A1)

Single light theme app-wide: Sand background, Obsidian ink, Paper cards, Sprig accent, Ember CTA. Instrument Serif display, Geist body. No dark mode.

### Changes

**1. `src/index.css` — Token rewrite**
- Replace `:root` with Warm Editorial values (Sand `42 22% 91%`, Obsidian `60 4% 6%`, Paper `0 0% 100%`, Sprig `96 50% 75%`, Ember `12 83% 54%`).
- Replace `.dark` block to alias the same light values (so any `.dark` className in the tree renders identical to light — prevents regressions without removing the class).
- Repaint sidebar tokens to Paper sidebar + Obsidian text + Sprig active state.
- Repaint status (`--success` Sprig, `--warning` warm amber, `--destructive` Ember) and chart palette (Sprig/Ember/Sand/Obsidian + 2 supporting warm tones).
- Repaint `.hero-blob` from lime/blurple to Sprig + warm sand glows.
- Keep `.theme-warm-editorial` block as alias to `:root` (backward compat).

**2. `src/components/ThemeProvider.tsx` — Force light**
- Set `defaultTheme="light"`, add `forcedTheme="light"`, `enableSystem={false}`. User's stored preference ignored.

**3. `tailwind.config.ts` — Typography + glow shadows**
- `font-sans` default → Geist (DM Sans/Plus Jakarta kept as fallbacks).
- `shadow-glow-lime` retuned to Sprig RGB; add `shadow-glow-sprig` and `shadow-glow-ember` aliases.

**4. `src/components/layout/MarketingLayout.tsx`**
- Remove `forcedTheme="light"` and `.theme-warm-editorial` wrapper (now app-wide default).
- Keep marketing-specific glow decoration.

**5. `src/components/ui/button.tsx`**
- `default` and `premium` variants: swap `hover:shadow-glow-lime` → `hover:shadow-glow-sprig`. No other changes.

**6. Memory updates**
- `mem://style/warm-editorial-theme` — expand to "app-wide light-only".
- `mem://style/modern-professional-theme-definition` — mark superseded.
- `mem://style/public-pages-dark-mode-enforcement` — mark fully obsolete.
- `mem://index.md` Core rule — replace dual-theme rule with: "App-wide Warm Editorial light theme (Sand/Obsidian/Sprig/Ember). Instrument Serif display, Geist body. Dark mode disabled."

### Out of scope
- Component layout/structure, logic, routing, data
- Removing existing color scales (lime/blurple/midnight kept as additive)
- Per-component repaints (token cascade does the work)

### Risk
Medium-high visual change, near-zero functional risk. Will spot-check `/about`, `/staff`, `/staff/dept/.../planner`, `/superadmin`, `/guest/entry` after.

### Files touched
`src/index.css`, `src/components/ThemeProvider.tsx`, `tailwind.config.ts`, `src/components/layout/MarketingLayout.tsx`, `src/components/ui/button.tsx` + 4 memory files.
