

# Deprecate StatCard and ReportStatCard

## Overview

Add `@deprecated` JSDoc annotations and development-mode `console.warn` calls to both legacy card components, guiding future developers toward `KpiCard` without breaking any existing usage.

## Changes

### 1. `src/components/ui/stat-card.tsx`

- Add a `@deprecated` JSDoc block above the `StatCard` export:
  ```
  /** @deprecated Use KpiCard from '@/components/ui/kpi-card' instead. */
  ```
- Inside the function body, add a dev-only warning (fires once per mount):
  ```ts
  if (process.env.NODE_ENV === 'development') {
    console.warn('[StatCard] is deprecated. Migrate to <KpiCard /> from @/components/ui/kpi-card.');
  }
  ```

### 2. `src/components/reports/ReportStatCard.tsx`

- Add a `@deprecated` JSDoc block above the `ReportStatCard` export.
- Add the same dev-only `console.warn` inside the function body, referencing `[ReportStatCard]`.

## What Does NOT Change

- No logic, props, or styling changes to either component
- No removal of components (additive-only)
- No changes to any consuming pages
- No new dependencies

