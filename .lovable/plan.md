
# Align Remaining Non-Standard Cards to KpiCard System

## Overview

Three locations still use hand-crafted or internal stat card patterns instead of the standardized `KpiGrid` + `KpiCard` system. This plan migrates them while preserving all interactive behavior (click-to-filter).

## Changes

### 1. `src/pages/staff/PrearrivalDashboardPage.tsx` (6 inline cards)

**Current state:** 6 hand-crafted `<Card>` blocks with inline layout (icon + value + label). Four are clickable (filter by status), one is static ("Pre-Booked"), one is clickable ("Occasions").

**Migration:**
- Replace the `<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">` wrapper with `<KpiGrid columns="grid-cols-2 md:grid-cols-3 lg:grid-cols-6" maxWidth="full" spacing="dense">`
- Replace each inline card with `<KpiCard>` using:
  - `label` for the bottom text (e.g., "Arriving", "Completed")
  - `value` for the number
  - `icon` for the Lucide component (Plane, CheckCircle2, Clock, AlertCircle, Calendar, PartyPopper)
  - `variant` mapping: primary (Arriving), success (Completed), warning (In Progress), default (Not Started, Pre-Booked), destructive is not needed here
- Wrap clickable cards in a `<button>` or add `onClick` via a wrapping `<div>` with `cursor-pointer` since `KpiCard` does not natively support `onClick`
- Approach: wrap each `KpiCard` in a `<div onClick={...} className="cursor-pointer">` to preserve the click-to-filter behavior

**Variant mapping for Pre-Arrival cards:**

| Card | Icon | KpiCard variant |
|---|---|---|
| Arriving | Plane | primary |
| Completed | CheckCircle2 | success |
| In Progress | Clock | warning |
| Not Started | AlertCircle | default |
| Pre-Booked | Calendar | default |
| Occasions | PartyPopper | default |

Note: The current cards use custom color classes like `bg-lagoon/10` and `bg-pink-500/10`. Since KpiCard's variant system does not cover these, the "Pre-Booked" and "Occasions" cards will use `variant="default"` which provides a neutral muted style. This is acceptable and consistent with the design system.

### 2. `src/components/staff/TodayHub.tsx` (4 internal QuickStatCard)

**Current state:** Internal `QuickStatCard` component (lines 531-576) used for 4 cards (In-House, Arrivals, Sessions, Covers) in a `grid-cols-2 lg:grid-cols-4` layout.

**Migration:**
- Replace `<div className="grid gap-4 grid-cols-2 lg:grid-cols-4">` with `<KpiGrid columns="grid-cols-2 lg:grid-cols-4" maxWidth="full" spacing="dense">`
- Replace each `QuickStatCard` with `<KpiCard>`:
  - `title` -> `label`
  - `value` stays
  - `icon` stays (already component refs)
  - `loading` stays
  - `variant` mapping: default->default, primary->primary, success->success, warning->warning
  - `subtitle` -> `helperText`
- The internal `QuickStatCard` component (lines 531-576) stays in the file (additive-only) but will no longer be used
- Add `KpiGrid`, `KpiCard` imports; remove unused `QuickStatCard` references from the JSX

### 3. `src/pages/guests/GuestsPage.tsx` and loading skeletons

**Current state:** Uses `StatCardGridSkeleton` in two places (line 241 for full loading, line 287 for strip loading). The actual content uses `GuestsSummaryStrip` which is a filter chip bar, NOT a KPI card -- so it stays unchanged.

**Migration:**
- Replace `StatCardGridSkeleton count={5}` with `<KpiGrid columns="grid-cols-1 xs:grid-cols-2 lg:grid-cols-5" maxWidth="full"><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /></KpiGrid>`
- This ensures the loading skeleton visually matches KpiCard dimensions (no layout shift when the strip loads)
- Update import from `StatCardGridSkeleton` to `KpiGrid, KpiSkeleton`

### 4. Remaining `StatCardGridSkeleton` usages in dashboard pages

These files still import `StatCardGridSkeleton` for their loading states, even though their loaded content now uses `KpiGrid + KpiCard`:

- `src/pages/dashboards/FrontOfficeHome.tsx`
- `src/pages/dashboards/ReservationsHome.tsx`
- `src/pages/dashboards/FnbHome.tsx`
- `src/pages/dashboards/ActivitiesHome.tsx`
- `src/pages/activities/ActivitySessionsPage.tsx`

**Migration:** In each file, replace `<StatCardGridSkeleton count={N} />` with `<KpiGrid columns="..." maxWidth="full"><KpiSkeleton />` x N `</KpiGrid>`, using the same column config as the loaded KpiGrid on that page. Update imports accordingly.

## What Does NOT Change

- No database, RPC, hook, or business logic changes
- No route changes
- `GuestsSummaryStrip` stays as-is (it is a filter chip bar, not a KPI card)
- `QuickStatCard` internal component in TodayHub is NOT deleted (additive-only)
- `StatCardGridSkeleton` in `dashboard-skeletons.tsx` is NOT deleted (additive-only)
- `BentoKPICard` in superadmin stays untouched
- No new dependencies

## File Edit Summary

| File | Action |
|---|---|
| `src/pages/staff/PrearrivalDashboardPage.tsx` | Replace 6 inline cards with KpiGrid + KpiCard |
| `src/components/staff/TodayHub.tsx` | Replace QuickStatCard with KpiCard |
| `src/pages/guests/GuestsPage.tsx` | Replace StatCardGridSkeleton with KpiGrid + KpiSkeleton |
| `src/pages/dashboards/FrontOfficeHome.tsx` | Replace StatCardGridSkeleton with KpiGrid + KpiSkeleton |
| `src/pages/dashboards/ReservationsHome.tsx` | Replace StatCardGridSkeleton with KpiGrid + KpiSkeleton |
| `src/pages/dashboards/FnbHome.tsx` | Replace StatCardGridSkeleton with KpiGrid + KpiSkeleton |
| `src/pages/dashboards/ActivitiesHome.tsx` | Replace StatCardGridSkeleton with KpiGrid + KpiSkeleton |
| `src/pages/activities/ActivitySessionsPage.tsx` | Replace StatCardGridSkeleton with KpiGrid + KpiSkeleton |
