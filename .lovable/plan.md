
# Incremental KPI Card Migration -- Remaining Pages

## Overview

Migrate all remaining `StatCard` and `ReportStatCard` usages to the standardized `KpiGrid` + `KpiCard` system. The `DriverStatsSection` internal `StatCard` will also be replaced. The `GuestsSummaryStrip` is a filter chip strip (not a KPI card), so it stays unchanged.

## Pages to Migrate

Each page follows the same mechanical pattern: replace the `StatCard` import with `KpiGrid` + `KpiCard`, swap the grid `<div>` with `<KpiGrid>`, and map props (`title` -> `label`, `description` -> `helperText`, `variant` stays the same).

### Group A -- SuperAdmin (5-column and 4-column grids)

**1. `src/pages/superadmin/SuperAdminDashboard.tsx`** (lines 402-436)
- 5 StatCards: Total Resorts, Guests In House, Activities Pax, Restaurant Covers, 7-Day Bookings
- Replace `<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">` with `<KpiGrid columns="grid-cols-1 xs:grid-cols-2 lg:grid-cols-5">`
- Map each `StatCard` to `KpiCard` (title->label, description->helperText)

**2. `src/pages/superadmin/ResortDetailPage.tsx`** (lines 213-238)
- 4 StatCards: Guests In House, Staff Members, Activities, Restaurants
- Replace grid div with `<KpiGrid columns="grid-cols-1 xs:grid-cols-2 lg:grid-cols-4">`

### Group B -- Staff Dashboards (5-column grids)

**3. `src/pages/dashboards/ResortManagerHome.tsx`** (lines 301-332)
- 5 StatCards: Total Guests, Activity Pax, Restaurant Covers, Avg Rating, Would Recommend
- Replace grid div with `<KpiGrid columns="grid-cols-1 xs:grid-cols-2 lg:grid-cols-5">`

**4. `src/pages/dashboards/FrontOfficeHome.tsx`** (lines 230-264)
- 5 StatCards (with StatCardGridSkeleton loading state)
- Replace grid div with `<KpiGrid>`, replace `StatCardGridSkeleton` with `KpiGrid` + `KpiSkeleton` (or keep existing skeleton as-is since it visually matches)

**5. `src/pages/dashboards/ReservationsHome.tsx`** (lines 162-196)
- 5 StatCards (with StatCardGridSkeleton loading state)
- Same pattern as FrontOfficeHome

**6. `src/pages/dashboards/FnbHome.tsx`** (lines 244-279)
- 5 StatCards: Total Covers, Breakfast, Lunch, Dinner, Pending Requests

**7. `src/pages/dashboards/ActivitiesHome.tsx`** (lines 264-293)
- 4 StatCards: Total Sessions, Confirmed Pax, Avg Occupancy, Pending Requests

### Group C -- Detail / Module Pages (3-column grids)

**8. `src/pages/activities/ActivitySessionsPage.tsx`** (lines 249-275)
- 3 StatCards: Total Sessions, Total Guests, Average Occupancy

**9. `src/pages/restaurants/RestaurantSlotsPage.tsx`** (lines 190-208)
- 3 StatCards: Total Covers, Open Slots, Avg Covers/Slot

### Group D -- Transport & Driver

**10. `src/components/transport/history/TransportMetricsCards.tsx`**
- 8 `ReportStatCard` instances already wrapped in a centered grid
- Replace `ReportStatCard` with `KpiCard`
- `ReportStatCard` passes `icon` as a JSX element (e.g., `<Clock className="..." />`), while `KpiCard` expects a `LucideIcon` component -- need to extract the icon component and pass it directly
- Map: `title` -> `label`, `subtitle` -> `helperText`, variant mapping: `success`/`warning` stay, `danger` -> `destructive`

**11. `src/components/driver/DriverStatsSection.tsx`**
- Internal `StatCard` component + `StatCardSkeleton` (4 cards in a 2x2 grid wrapped in a Card)
- Replace internal StatCard with `KpiCard`, internal skeleton with `KpiSkeleton`
- Keep the outer `<Card>` wrapper since this is embedded in the driver dashboard
- Use `<KpiGrid columns="grid-cols-2" maxWidth="full" spacing="dense">` inside the CardContent

### Loading States

For pages using `StatCardGridSkeleton`, replace with a `KpiGrid` containing the appropriate number of `KpiSkeleton` components. This ensures the skeleton matches the final card dimensions exactly (preventing layout shift).

## Prop Mapping Reference

| StatCard prop | KpiCard prop |
|---|---|
| `title` | `label` |
| `value` | `value` |
| `icon` | `icon` |
| `description` | `helperText` |
| `trend` | `delta` (rename `trend.label` -> `delta.label`) |
| `variant` | `variant` (`danger` -> `destructive`) |

## What Does NOT Change

- No database, RPC, or hook changes
- No changes to `GuestsSummaryStrip` (it is a filter chip bar, not a KPI card)
- `StatCard` and `ReportStatCard` components are NOT deleted (additive-only philosophy) -- just unused after migration
- `BentoKPICard` in superadmin is a separate design system component and stays untouched
- `TodayAtAGlance` uses custom inline metric cards with navigation links -- stays untouched
- No new dependencies

## Updated TODO List

After this migration, the TODO comments in `kpi-card.tsx` will be removed since all listed pages will be migrated.

## File Edit Summary

| File | Action |
|---|---|
| `src/pages/superadmin/SuperAdminDashboard.tsx` | Replace StatCard with KpiGrid+KpiCard |
| `src/pages/superadmin/ResortDetailPage.tsx` | Replace StatCard with KpiGrid+KpiCard |
| `src/pages/dashboards/ResortManagerHome.tsx` | Replace StatCard with KpiGrid+KpiCard |
| `src/pages/dashboards/FrontOfficeHome.tsx` | Replace StatCard with KpiGrid+KpiCard |
| `src/pages/dashboards/ReservationsHome.tsx` | Replace StatCard with KpiGrid+KpiCard |
| `src/pages/dashboards/FnbHome.tsx` | Replace StatCard with KpiGrid+KpiCard |
| `src/pages/dashboards/ActivitiesHome.tsx` | Replace StatCard with KpiGrid+KpiCard |
| `src/pages/activities/ActivitySessionsPage.tsx` | Replace StatCard with KpiGrid+KpiCard |
| `src/pages/restaurants/RestaurantSlotsPage.tsx` | Replace StatCard with KpiGrid+KpiCard |
| `src/components/transport/history/TransportMetricsCards.tsx` | Replace ReportStatCard with KpiCard |
| `src/components/driver/DriverStatsSection.tsx` | Replace internal StatCard with KpiCard+KpiSkeleton |
| `src/components/ui/kpi-card.tsx` | Remove TODO comments |
