# Guest Portal — Suspected Dead / Duplicate UI Code

> Phase 1 inventory. Items listed here should **not** be deleted yet.
> Each entry needs manual verification before removal in a later phase.

---

## 1 — Unused CSS Classes (defined in `src/index.css`, zero `.tsx` usage)

| Class | Location (line ~) | Reason suspected dead |
|---|---|---|
| `.gpu-scroll` | index.css ~2262 | 0 usages in any TSX file |
| `.touch-scroll` | index.css ~2282 | 0 usages in any TSX file |
| `.scroll-smooth-touch` | index.css ~2064 | 0 usages in any TSX file |
| `.pb-safe-nav` | index.css ~2070 | 0 usages in any TSX file |
| `.pull-refresh-space` | index.css ~2050 | 0 usages in any TSX file |

---

## 2 — Legacy CSS Classes (superseded by `GuestPageShell` + CSS variables)

| Class | Location | Superseded by |
|---|---|---|
| `.guest-safe-bottom` | index.css ~1638 | `GuestPageShell` → `.guest-safe-shell` + `--guest-safe-bottom` var |
| `.guest-safe-bottom-extended` | index.css ~1643 | `GuestPageShell overlay="action"` |

**Status**: These are still referenced in comments (`GuestPageShell.tsx` line 25) as "available for backwards compat" but no TSX file uses them as actual class names.

---

## 3 — Unused / Low-Use Exports

| Export | File | Notes |
|---|---|---|
| `StickyActionBarSpacer` | `src/components/guest/StickyActionBar.tsx` | Exported but **never imported** anywhere. Comment says "prefer GuestPageShell". |

---

## 4 — Potential Component Overlaps

| Area | Components | Notes |
|---|---|---|
| Card primitives | `MobileCard` (`src/components/guest/MobileCard.tsx`) vs `.guest-card` CSS class on `<Card>` | Both provide card styling for guest pages. Some pages use `MobileCard`, others use `Card` + `.guest-card`. Consider consolidating. |
| Data tables (staff) | `data-table.tsx` vs `premium-data-table.tsx` | Both have `mobileCardView` flag. `premium-data-table` appears to be a superset. Staff-side only — low priority. |
| Debug panels | `GuestDebugConsole` (layout-level) vs `GuestDebugPanel` (bookings-page-level) | Both activated by `?debug=1`. Console is global; Panel is page-specific with booking data. May be intentional, but could confuse devs. |

---

## 5 — Multiple Date Picker Patterns

| Pattern | Usage locations | Notes |
|---|---|---|
| shadcn `<Calendar>` (react-day-picker) in `<Popover>` | `RequestBundleSheet`, `RequestCreateSheet`, staff pages | Standard popover calendar |
| Inline date display with `date-fns` format | Activity sessions, booking cards | Read-only, not a picker |
| `<input type="time">` | Request scheduling | Native browser picker |

**Verdict**: Only one actual date *picker* component (`Calendar` from shadcn). The others are display-only. No duplication issue here.

---

## Next Steps

1. Verify each "0 usages" claim with a full-text search (including dynamic class generation).
2. For confirmed dead code: create a single cleanup PR per category.
3. For component overlaps: propose a migration path in Phase 2 before consolidating.
