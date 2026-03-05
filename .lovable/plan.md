

## Department Setup Wizard

### Overview
A multi-step dialog wizard accessible from `DepartmentsManagerSection` (the existing "Add Department" button) that guides admins through three steps: (1) create the department, (2) add initial members with roles, and (3) configure module access — all in one flow.

### UX Flow

```text
Step 1: Details          Step 2: Members           Step 3: Module Access
┌──────────────────┐    ┌──────────────────────┐   ┌──────────────────────┐
│ Department Key   │    │ Search resort staff   │   │ ☑ Operations         │
│ Department Name  │    │ ┌────────────────────┐│   │   ☑ Ops Planner      │
│                  │    │ │ Jane Doe    [+Mgr] ││   │   ☑ Master Ops Sheet │
│                  │    │ │ John Smith  [+Staff]││   │   ☐ Pickup Runs      │
│                  │    │ └────────────────────┘│   │ ☑ Resources          │
│                  │    │ Added: Jane (Manager) │   │   ☑ Assets           │
│                  │    │         John (Staff)  │   │   ☐ Shifts           │
│   [Next →]       │    │   [← Back] [Next →]  │   │   [← Back] [Finish] │
└──────────────────┘    └──────────────────────┘   └──────────────────────┘
```

### Technical Approach

**New file**: `src/components/department/DepartmentSetupWizard.tsx`

A single `Dialog`-based component with internal step state (1–3):

1. **Step 1 — Details**: Key + Name inputs (reuses existing validation from `DepartmentsManagerSection`). On "Next", calls `useDepartmentMutations.create` to insert the department row and captures the returned `id`.

2. **Step 2 — Members**: Fetches resort staff via `resort_memberships` + `profiles` (same pattern as `DeptAddMemberDialog`). Users pick staff and assign `manager` or `staff` role. Selections are held in local state as an array `{ userId, name, role }[]`. Members are inserted into `department_memberships` on "Next" (the DB trigger `trg_department_membership_defaults` auto-provisions default module access).

3. **Step 3 — Module Access**: Shows the `MODULE_GROUPS` config (same as `DeptMemberAccessDrawer`) with group-level toggles. This step lets the admin bulk-configure which modules are enabled for the department. On "Finish", upserts `department_module_access` rows for each added member, then closes the wizard and invalidates the departments query.

**Modified file**: `src/components/settings/requests/DepartmentsManagerSection.tsx`
- Replace the simple "Add Department" dialog trigger with opening the new `DepartmentSetupWizard`.
- Keep the existing edit dialog for updating department name.

### Key Design Decisions
- Step 2 is optional — admin can skip adding members and do it later from the department portal.
- Step 3 module config applies uniformly to all members added in step 2 (managers get all modules by default via the DB trigger; the wizard lets the admin customize this).
- The wizard reuses existing hooks (`useDepartmentMutations`, `useDepartments`) and DB patterns — no new tables or migrations needed.
- Each step persists on "Next" (not deferred to the end) so partial progress is saved.

### Files Changed
| File | Change |
|------|--------|
| `src/components/department/DepartmentSetupWizard.tsx` | **New** — 3-step wizard component |
| `src/components/settings/requests/DepartmentsManagerSection.tsx` | Wire "Add Department" button to open wizard instead of simple dialog |

