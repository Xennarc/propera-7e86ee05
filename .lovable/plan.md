

## Settings Page Redesign

### What changes

**1. `SettingsSection` — Always collapsible with card wrapper and count badge**
- Remove the `isMobile` conditional — all sections are now collapsible on all screen sizes
- Add an `itemCount` prop displayed as a muted badge next to the title
- Wrap collapsible content in a card-like container with `rounded-xl border bg-card/50 p-3`
- Grid layout inside: `grid gap-3 sm:grid-cols-2 lg:grid-cols-3`

**2. `SettingsCard` — Subtle hover polish**
- Add left-border accent on hover: `hover:border-l-primary hover:border-l-2`
- Use `press-scale` class for active state feedback

**3. `SettingsPage` — Re-categorize + search**

New groups:

| Group | Badge | Default Open | Items |
|---|---|---|---|
| Guest Experience | — | true | Pre-Arrival, Branding, Portal Links |
| Operations & Modules | — | true | Modules, Guest Requests, Resort Directory, Transport |
| Finance & Resources | — | false | Pricing & Taxes, Resources, Booking Health |
| Staff & Data | admin | true | Access Control, Guest Import, Dept Rollout |
| System | super-admin | false | Resorts, Platform Users, Subscription Tiers, Permissions Debug |

Add a `SearchInput` at the top that filters cards by title/description across all groups. When searching, all sections auto-expand and only matching cards show. Empty groups are hidden.

Use `PageHeader` for the page title to match Access Management page pattern.

### Files modified
- `src/components/admin/SettingsSection.tsx` — collapsible everywhere, count badge, card wrapper
- `src/components/admin/SettingsCard.tsx` — hover accent + press-scale
- `src/pages/settings/SettingsPage.tsx` — re-categorized groups, search state, PageHeader

