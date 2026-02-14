
# Align Remaining Cards to KpiGrid + KpiCard System

## Overview

Complete the KPI card migration by replacing all remaining `ReportStatCard` usages across 8 report pages, plus the inline metric cards in `ErrorExplorer`. This eliminates the last consumers of the deprecated `ReportStatCard` component and ensures every metric card in Propera uses the standardized `KpiGrid` + `KpiCard` primitives.

## Scope

### Group A -- Report Pages (8 files)

Each report page follows the same mechanical swap: replace `ReportStatCard` import with `KpiGrid` + `KpiCard`, wrap the grid `<div>` with `<KpiGrid>`, and map props.

**Prop Mapping (ReportStatCard -> KpiCard):**

| ReportStatCard | KpiCard |
|---|---|
| `title` | `label` |
| `value` | `value` |
| `subtitle` | `helperText` |
| `icon={<Users className="h-5 w-5 text-primary" />}` | `icon={Users}` (pass component, not JSX) |
| `variant="danger"` | `variant="destructive"` |
| `trend` | `delta` |

**Files and card counts:**

1. **`src/pages/reports/GuestsReport.tsx`** -- 3 cards in `grid md:grid-cols-3`
2. **`src/pages/reports/ActivitiesReport.tsx`** -- 4 cards + 2 extra cards (booking source breakdown)
3. **`src/pages/reports/RestaurantsReport.tsx`** -- 4 cards in `grid md:grid-cols-4`
4. **`src/pages/reports/StayFeedbackReport.tsx`** -- 4 cards in `grid md:grid-cols-4`
5. **`src/pages/reports/CancellationsReport.tsx`** -- 4 cards in `grid md:grid-cols-4`
6. **`src/pages/reports/SalesPerformanceReport.tsx`** -- 6 cards in `grid lg:grid-cols-3`
7. **`src/pages/reports/GuestBehaviourReport.tsx`** -- 4 cards in `grid md:grid-cols-4`
8. **`src/pages/reports/MarketReport.tsx`** -- 3-4 cards (conditional) in `grid md:grid-cols-4`

Each grid `<div>` becomes `<KpiGrid columns="..." maxWidth="full">` with appropriate column classes matching the existing layout.

### Group B -- ErrorExplorer Inline Cards

**`src/components/superadmin/ErrorExplorer.tsx`** -- 2 standard metric cards + 1 wide "Top Failing Routes" card

The first two cards (Total Errors, Trend) will be converted to `KpiCard`. The third card (Top Failing Routes) is a list-style card, not a metric card -- it stays as-is but gets wrapped alongside the KpiCards in a `KpiGrid`.

**Note:** The Trend card has custom inline JSX (trend icon next to value). This will be handled by passing the formatted value directly as `value` prop and using `variant` for color.

### Group C -- Skeleton Alignment

**`src/components/ui/dashboard-skeletons.tsx`** -- `StatCardGridSkeleton` remains available for backward compatibility but will no longer be actively imported. No deletion (additive-only).

## Technical Details

### KpiCard icon prop adaptation

`ReportStatCard` accepts `icon` as JSX (`<Users className="h-5 w-5 text-primary" />`), while `KpiCard` accepts a `LucideIcon` component reference (`icon={Users}`). Each migration strips the JSX wrapper and passes just the component.

For `variant`-based icon coloring (e.g., icons with `text-destructive` or `text-chart-2`), the `KpiCard` variant system handles this automatically via `variantStyles`, so the manual color classes are removed.

### Variant mapping

- `"danger"` -> `"destructive"` (KpiCard uses Tailwind semantic naming)
- `"success"`, `"warning"`, `"default"` stay the same
- Cards without explicit variant keep `"default"`

### Column configurations

| Report | Current grid | KpiGrid columns |
|---|---|---|
| GuestsReport | `md:grid-cols-3` | `grid-cols-1 xs:grid-cols-2 md:grid-cols-3` |
| ActivitiesReport (main) | `grid-cols-2 lg:grid-cols-4` | `grid-cols-2 lg:grid-cols-4` |
| ActivitiesReport (source) | `grid-cols-2 lg:grid-cols-4` | `grid-cols-2 lg:grid-cols-4` |
| RestaurantsReport | `md:grid-cols-4` | `grid-cols-1 xs:grid-cols-2 md:grid-cols-4` |
| StayFeedbackReport | `grid-cols-2 md:grid-cols-4` | `grid-cols-2 md:grid-cols-4` |
| CancellationsReport | `md:grid-cols-4` | `grid-cols-1 xs:grid-cols-2 md:grid-cols-4` |
| SalesPerformanceReport | `grid-cols-2 lg:grid-cols-3` | `grid-cols-2 lg:grid-cols-3` |
| GuestBehaviourReport | `grid-cols-2 md:grid-cols-4` | `grid-cols-2 md:grid-cols-4` |
| MarketReport | `md:grid-cols-4` | `grid-cols-1 xs:grid-cols-2 md:grid-cols-4` |
| ErrorExplorer | `sm:grid-cols-2 lg:grid-cols-4` | Custom (keep wide card as-is in same grid) |

## What Does NOT Change

- No database, RPC, or hook changes
- No route changes
- `ReportStatCard` and `StatCard` components are NOT deleted (additive-only)
- `ErrorExplorer` "Top Failing Routes" wide card keeps its custom list layout
- Chart components, date pickers, export buttons, AI insights panels untouched
- No new dependencies

## File Edit Summary

| File | Action |
|---|---|
| `src/pages/reports/GuestsReport.tsx` | Replace ReportStatCard with KpiGrid+KpiCard |
| `src/pages/reports/ActivitiesReport.tsx` | Replace ReportStatCard with KpiGrid+KpiCard |
| `src/pages/reports/RestaurantsReport.tsx` | Replace ReportStatCard with KpiGrid+KpiCard |
| `src/pages/reports/StayFeedbackReport.tsx` | Replace ReportStatCard with KpiGrid+KpiCard |
| `src/pages/reports/CancellationsReport.tsx` | Replace ReportStatCard with KpiGrid+KpiCard |
| `src/pages/reports/SalesPerformanceReport.tsx` | Replace ReportStatCard with KpiGrid+KpiCard |
| `src/pages/reports/GuestBehaviourReport.tsx` | Replace ReportStatCard with KpiGrid+KpiCard |
| `src/pages/reports/MarketReport.tsx` | Replace ReportStatCard with KpiGrid+KpiCard |
| `src/components/superadmin/ErrorExplorer.tsx` | Replace inline metric cards with KpiCard |
