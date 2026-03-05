

## Consolidate Department Routes Under Staff Portal

### Current State
- **`/dept/:deptKey/*`** — 8 routes under a standalone `DepartmentShell` with its own sidebar, topbar, bottom nav, and `DepartmentProvider`
- **`/staff/*`** — ~40+ routes under `StaffShell` with a different sidebar, topbar, and bottom nav
- Department-only users (no resort role) are redirected from StaffShell to `/dept/:deptKey/planner` via `useDepartmentRedirect`

### What Changes

**1. Move routes from `/dept/:deptKey/*` to `/staff/dept/:deptKey/*`**

Nest department routes inside `StaffShell` using a lightweight `DepartmentLayout` wrapper (replaces `DepartmentShell`). This wrapper provides `DepartmentProvider` and swaps the sidebar/topbar/bottom-nav to department-specific versions when active.

```text
/staff                    ← StaffShell (outer shell, auth, resort context)
  /staff/dashboard        ← normal staff sidebar
  /staff/activities/...   ← normal staff sidebar
  /staff/dept/:deptKey    ← DepartmentLayout (swaps sidebar + nav)
    /planner
    /master
    /inbox
    /session/:sessionId
    /resources/assets
    /resources/shifts
    /resources/unavailability
    /manage/access
```

**2. Modify StaffShell access guard for department-only users**

Instead of redirecting dept-only users away, allow them through StaffShell but with a constrained experience — they only see department routes. Remove `useDepartmentRedirect` and instead let StaffShell set `currentResort` to the department's resort (read-only context).

**3. Create `DepartmentLayout` — a sub-layout, not a shell**

A new component that:
- Wraps children in `DepartmentProvider`
- Signals to StaffShell (via context or prop) to render the department sidebar/bottom-nav instead of the default staff ones
- Renders `<Outlet />` for nested department routes

**4. Update all `/dept/` links**

Update hardcoded `/dept/:deptKey/...` paths across ~8 files (sidebar, bottom nav, guard, pages, redirect hook) to `/staff/dept/:deptKey/...`.

**5. Add legacy redirects**

Add `<Route path="/dept/:deptKey/*" element={<Navigate to="/staff/dept/:deptKey/*" />} />` for bookmarked URLs.

### Files Affected
| File | Change |
|------|--------|
| `src/App.tsx` | Move dept routes under `/staff`, add legacy redirects |
| `src/components/department/DepartmentShell.tsx` | Replace with lighter `DepartmentLayout` |
| `src/components/staff/StaffShell.tsx` | Accept dept-only users, support sidebar swap |
| `src/hooks/useDepartmentRedirect.ts` | Update redirect path to `/staff/dept/...` |
| `src/components/department/DepartmentSidebar.tsx` | Update all link paths |
| `src/components/department/DepartmentBottomNav.tsx` | Update all link paths |
| `src/components/department/DepartmentGuard.tsx` | Update fallback link paths |
| `src/pages/department/*.tsx` (8 files) | Update any hardcoded `/dept/` paths |

### Risk Assessment
- **Medium complexity** — touches auth guards, routing, and navigation across ~15 files
- The sidebar-swap mechanism needs careful state management to avoid re-renders
- Department-only users gaining StaffShell access requires updating the permission guard logic without opening security holes

