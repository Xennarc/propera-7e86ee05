

## QA Plan: Department Route Consolidation

### What to Verify

The consolidation moved all `/dept/:deptKey/*` routes under `/staff/dept/:deptKey/*` inside `StaffShell`, replaced the standalone `DepartmentShell` with a lightweight `DepartmentLayout`, and added legacy redirects.

---

### Test Cases

**1. Route Navigation (Happy Path)**
- Log in as a staff user with department membership
- Navigate to `/staff/dept/{deptKey}/planner` — should load the Planner page
- Confirm the **sidebar swaps** to the Department Sidebar (not the Staff Sidebar)
- Confirm the **top bar** shows department name (not the standard Staff topbar)
- Confirm the **mobile bottom nav** shows department nav items (test at mobile viewport)
- Navigate to each department sub-route: `/master`, `/inbox`, `/resources/assets`, `/resources/shifts`, `/resources/unavailability`, `/manage/access`
- Navigate back to a staff route (e.g., `/staff/dashboard`) — sidebar should swap back to Staff Sidebar

**2. Legacy Redirect**
- Navigate to `/dept/{deptKey}/planner` (old URL format)
- Should redirect to `/staff/dept/{deptKey}/planner`
- Verify query params are preserved (e.g., `/dept/dive/planner?date=2026-03-05`)

**3. Department-Only User Access**
- Log in as a user who has `department_memberships` but **no** resort-level role
- Should NOT see the "No Access" card — should be allowed into `StaffShell`
- Should be redirected to `/staff/dept/{deptKey}/planner` automatically
- Should NOT be able to access staff-only routes like `/staff/dashboard`

**4. Session Run Sheet Deep Link**
- Navigate to `/staff/dept/{deptKey}/session/{sessionId}`
- "Back to Planner" button should link to `/staff/dept/{deptKey}/planner` (not `/dept/...`)

**5. Department Guard**
- Access a module the user does NOT have permission for
- Guard card's "Back to Planner" link should use `/staff/dept/...` prefix
- Manager-only guard should also use the correct prefix

**6. Sidebar Department Switcher**
- If user has access to multiple departments, the dropdown in `DepartmentSidebar` should link to `/staff/dept/{otherDeptKey}/planner`

**7. No Stale References**
- Search codebase for any remaining `/dept/` paths that don't start with `/staff/dept/` (excluding the legacy redirect route itself)
- The search results confirm all 7 files now use `/staff/dept/` — this is already clean

---

### Approach

Use browser automation to verify cases 1, 2, and 4 after logging in via the preview. Cases 3 and 5 require specific user roles — if test accounts aren't available, verify by code inspection. Case 7 is already confirmed by the codebase search above.

