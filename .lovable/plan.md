
## Pull v3 fonts (verified) — colors untouched

### v3's exact font setup (verified)
- `tailwind.config.ts` fontFamily: `sans: ['DM Sans', 'Plus Jakarta Sans', 'Sora', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']`, `serif: ['Playfair Display', 'Georgia', 'serif']` — no `display`, no `geist`
- `index.html` preload: `Playfair Display + DM Sans + Plus Jakarta Sans + Sora` — no Instrument Serif, no Geist
- Body critical CSS lead: `'Plus Jakarta Sans', 'Sora', …`
- Global body in `index.css` line 296: `'Plus Jakarta Sans', 'Sora', system-ui, …`

### Changes (fonts only — no color/theme touches)

**1. `tailwind.config.ts` — fontFamily block**
- Replace current `sans` (`['Geist', 'DM Sans', 'Plus Jakarta Sans', 'Sora', …]`) with v3's exact: `['DM Sans', 'Plus Jakarta Sans', 'Sora', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']`
- Replace `serif` with v3's: `['Playfair Display', 'Georgia', 'serif']`
- Remove `display` and `geist` aliases (v3 has neither)

**2. `index.html`**
- Replace the two font links (`<link rel="preload">` and `<noscript>`) with v3's URL — drops `Instrument+Serif` and `Geist` families:
  ```
  https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Sora:wght@300;400;500;600;700;800&display=swap
  ```
- Critical-CSS `body { font-family }` already matches v3 (`Plus Jakarta Sans, Sora, …`) — no change.

**3. Memory update**
- Update `mem://style/warm-editorial-theme` typography line: "Body: DM Sans (primary) → Plus Jakarta Sans → Sora. Display/serif: Playfair Display. Instrument Serif and Geist removed (matches Remix propera v3)."

### Out of scope
- All color tokens (`:root`, `.dark`, sand/sprig/ember palette) — untouched
- ThemeProvider light-only forcing — untouched
- Any component visual styling beyond inherited font

### Risk
Low. Pure font stack swap. Pricing hero and any other surfaces using `font-display`/Instrument Serif will fall back to `font-serif` (Playfair) automatically since `font-display` alias is removed — visually a different display face but coherent. If you want me to keep `font-display` as an alias for Playfair to avoid touching consumer components, I can — say the word.

### Files touched
`tailwind.config.ts`, `index.html`, `mem://style/warm-editorial-theme`
