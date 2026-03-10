# TODO / Stub / Placeholder Inventory

> Generated 2026-03-10. Items listed here are confirmed via codebase search.
> Each entry includes a priority and recommended action.

---

## 1 — Stubs and Unimplemented Features

| Location | Line | Issue | Priority |
|---|---|---|---|
| `src/lib/ops/adapters/dining-ops-adapter.ts` | 12 | **DiningOpsAdapter** returns empty array — dining ops module not yet built | Low — gated behind `ops_events_adapter_enabled` flag |
| `supabase/functions/demo-reset/index.ts` | ~724 | `transportEnabled = false` hardcoded — entire Pass 7 transport seeding is dead code | Medium — blocked on schema work |

---

## 2 — TODO Comments

| Location | Line | Comment | Priority |
|---|---|---|---|
| `src/components/superadmin/ResortSettingsDrawer.tsx` | ~605 | `TODO: Add more integrations when schema supports them` — PMS and Payment integrations rendered as disabled placeholders | Low — waiting on schema design |

---

## 3 — Placeholders and Workarounds

| Location | Line | Issue | Priority |
|---|---|---|---|
| `src/pages/activities/MasterOpsSheet.tsx` | ~93 | `// placeholder for pickup-needed logic` — blocker detection incomplete; duplicates the `missing > 0` check | Medium |
| `src/components/department/DepartmentSetupWizard.tsx` | ~466 | `// Non-fatal: modules can be fixed later` — module override upsert errors silently swallowed | Low — intentional degradation |

---

## 4 — Pre-existing Build Errors (FIXED)

| Location | Lines | Issue | Status |
|---|---|---|---|
| `src/__tests__/security/test-utils.ts` | 11–13 | `process` is not defined — needs `@types/node` types | ✅ Fixed — added `types: ["node"]` to tsconfig.app.json |
| `src/__tests__/security/tenant-isolation.test.ts` | 45 | Same `process` error | ✅ Fixed |

---

## 5 — Unresolved Dead-Code Overlaps

| Area | Issue | Priority |
|---|---|---|
| `MobileCard` vs `.guest-card` CSS | Two card styling patterns for guest pages; consolidation pending | Medium |
| `data-table.tsx` vs `premium-data-table.tsx` | Staff-side data table overlap; premium version is a superset | Low |
| `GuestDebugConsole` vs `GuestDebugPanel` | Both activated by `?debug=1`; potential dev confusion | Low |

---

## Next Steps (Prioritized)

1. ~~**Quick win**: Fix `@types/node` tsconfig issue for security tests~~ ✅ Done
2. **Schema blocker**: Design schema changes to unblock transport seeding in `demo-reset`
3. **Logic gap**: Replace pickup-needed placeholder in `MasterOpsSheet` with real blocker detection
4. **Feature stubs**: Implement `DiningOpsAdapter` when dining ops module is scoped
5. **UI consolidation**: Merge `MobileCard` / `.guest-card` and `data-table` / `premium-data-table` variants
