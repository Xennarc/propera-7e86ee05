

## Cleanup: Remove Legacy Redirect Pages, Deprecated Components, and Dead CSS

### Scope

**Files to delete (7):**
1. `src/pages/guest/GuestQrLoginPage.tsx` — legacy redirect, only shows message
2. `src/pages/guest/GuestQrConfirmPage.tsx` — legacy redirect
3. `src/pages/guest/GuestAccessLoginPage.tsx` — legacy redirect
4. `src/pages/guest/DemoGuestAutoLoginPage.tsx` — legacy redirect to `/demo/login`
5. `src/pages/staff/DemoAutoLoginPage.tsx` — legacy redirect to `/demo/login`
6. `src/components/guest/LegacyTokenRedirect.tsx` — shared component used only by the 3 QR/access pages above
7. `src/components/prearrival/LegacyPrearrivalRedirect.tsx` — legacy prearrival redirect

**Files to delete (deprecated components with zero imports):**
8. `src/components/reports/ReportStatCard.tsx` — `@deprecated`, zero imports
9. `src/components/ui/stat-card.tsx` — `@deprecated`, zero imports

**Dead CSS to remove from `src/index.css`:**
- `.gpu-scroll` class block
- `.touch-scroll` class block
- `.scroll-smooth-touch` class block
- `.pb-safe-nav` class block
- `.pull-refresh-space` class block

Note: `.guest-safe-bottom` and `.guest-safe-bottom-extended` CSS classes are kept — they're referenced in comments as backwards compat and the CSS variable `--guest-safe-bottom` is actively used.

**Unused export to remove from `src/components/guest/StickyActionBar.tsx`:**
- Remove the `StickyActionBarSpacer` export (zero imports anywhere)

### Route updates in `src/App.tsx`

Replace deleted page routes with inline redirects:
- `/guest/qr/:token` → `<Navigate to="/guest/find" replace />`
- `/guest/qr` → `<Navigate to="/guest/find" replace />`
- `/guest/access` → `<Navigate to="/guest/find" replace />`
- `/staff/demo-login` → `<Navigate to="/demo/login" replace />`
- `/guest/demo-login` → `<Navigate to="/demo/login" replace />`
- `/prearrival/:token`, `/prearrival/:token/checkin`, `/prearrival/:token/experiences` → `<Navigate to="/guest/find" replace />`

Remove the lazy imports and the `LegacyPrearrivalRedirect` eager import.

### Files modified
- `src/App.tsx` — remove imports, replace routes with `<Navigate>`
- `src/index.css` — remove 5 dead CSS class blocks
- `src/components/guest/StickyActionBar.tsx` — remove `StickyActionBarSpacer` export

### Files deleted (9 total)
As listed above.

