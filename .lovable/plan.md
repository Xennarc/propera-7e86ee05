

## Simplify Staff Sidebar Navigation

### Redundancies to Remove

1. **Merge Dive/Watersports/Excursions Ops into single "Day Sheet"** — All three navigate to `/staff/activities/ops/day` with different query params. The page already has department tabs/filters. Replace with one "Day Sheet" item at `/staff/activities/ops/day`.

2. **Remove "Today's View"** — For non-super-admins, `/staff/dashboard` already renders `TodayHub` (same component). Keep only "Dashboard".

3. **Merge "Modules" into "Settings"** — Both are admin config pages. Remove standalone Modules item; the Settings page can link to modules internally.

### Icon Deduplication

| Item | Current Icon | New Icon |
|---|---|---|
| **Guests** group | `Users` | `Users` (keep — it's the group) |
| All Guests | `Users` (dup) | `Contact` (person card) |
| Team Directory | `Users` (dup) | `UserRoundSearch` |
| Resort Staff | `Users` (dup) | `UserCog` |
| Reports > Guests | `Users` (dup) | `UserCheck` |
| Catalogue | `Activity` (same as group) | `BookOpen` |
| Sessions | `Clock` | `CalendarClock` |
| Time Slots | `Clock` (dup) | `Timer` |
| Room Service Orders | `UtensilsCrossed` (dup) | `ConciergeBell` |
| Cheat Sheet | `FileText` | `ScrollText` |
| Cancellations | `FileText` (dup) | `Ban` |
| Today's View | removed | — |
| Sales | `TrendingUp` (dup of old Today's) | `DollarSign` |
| Day Sheet (new, replaces 3 items) | — | `LayoutList` |
| Modules | removed | — |
| Admin > Settings | `Settings` (dup) | `SlidersHorizontal` |
| Admin group | `Settings` | `Cog` (keep as-is, it's the group icon) |
| Pre-Arrival Settings | `Plane` (same as Pre-Arrival) | `PlaneTakeoff` |
| Branding | `Palette` | `Paintbrush` |
| Program (Loyalty) | `Settings` (dup) | `Gift` |

### Result: Item Count
- **Before**: ~28 items across 8 groups
- **After**: ~23 items across 8 groups (removed 5: 3 dept ops, Today's View, Modules)

### Files to Edit
- `src/components/staff/StaffSidebar.tsx` — restructure nav items, update icons, remove redundancies, remove debug `useEffect`

### Technical Notes
- The `isGroupActive` check for Activities needs updating since `/staff/activities/ops/day` (without query param) should match the new Day Sheet item
- Role arrays on the merged "Day Sheet" item should be the union of all three removed items: `['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'TRANSPORT']`
- No route changes needed — all URLs remain valid, we're just removing redundant sidebar links

