

## TODO / Stub / Placeholder Inventory

Here's the full scan of incomplete items, stubs, and known imperfections across the codebase:

---

### 1 — Stubs and Unimplemented Features

| Location | Line | Issue |
|---|---|---|
| `src/lib/ops/adapters/dining-ops-adapter.ts` | 12 | **DiningOpsAdapter** returns empty array — dining ops module not yet built |
| `supabase/functions/demo-reset/index.ts` | 724 | `transportEnabled = false` hardcoded — `feature_flags` column doesn't exist yet; entire Pass 7 transport seeding is dead code |

### 2 — TODO Comments

| Location | Line | Comment |
|---|---|---|
| `src/components/superadmin/ResortSettingsDrawer.tsx` | 605 | `TODO: Add more integrations when schema supports them` — PMS and Payment integrations rendered as disabled placeholders |

### 3 — Placeholders and Workarounds

| Location | Line | Issue |
|---|---|---|
| `src/pages/activities/MasterOpsSheet.tsx` | 93 | `// placeholder for pickup-needed logic` — blocker detection is incomplete; duplicates the `missing > 0` check on line 89 |
| `src/components/department/DepartmentSetupWizard.tsx` | 466 | `// Non-fatal: modules can be fixed later` — module override upsert errors silently swallowed |

### 4 — Pre-existing Build Errors

| Location | Lines | Issue |
|---|---|---|
| `src/__tests__/security/test-utils.ts` | 11–13 | `process` is not defined — needs `@types/node` in tsconfig for test files |
| `src/__tests__/security/tenant-isolation.test.ts` | 45 | Same `process` error |

### 5 — Unresolved Dead-Code Overlaps (from prior inventory)

| Area | Issue |
|---|---|
| `MobileCard` vs `.guest-card` CSS | Two card styling patterns for guest pages; consolidation pending |
| `data-table.tsx` vs `premium-data-table.tsx` | Staff-side data table overlap; premium version is a superset |
| `GuestDebugConsole` vs `GuestDebugPanel` | Both activated by `?debug=1`; potential dev confusion |

---

### Proposed Implementation

Write this inventory to `docs/todo-inventory.md` with a "Next Steps" section prioritizing:

1. **Quick win**: Fix `@types/node` tsconfig issue for security tests
2. **Schema blocker**: Create `feature_flags` column to unblock transport seeding
3. **Logic gap**: Replace pickup-needed placeholder in MasterOpsSheet with real logic
4. **Feature stubs**: Implement DiningOpsAdapter when dining module is scoped
5. **UI consolidation**: Merge MobileCard/guest-card and data-table variants

