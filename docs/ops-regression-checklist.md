# Ops Regression Checklist

Use this checklist after any refactor touching department scoping, ops pages, or booking flows.

---

## Guest Flows

- [ ] **Browse activities** — Guest portal shows activities filtered by resort; category tabs work
- [ ] **Book a session** — Guest can select a session, fill pax, and confirm; booking appears in `activity_bookings`
- [ ] **Cancel booking** — Guest can cancel within the cutoff window; status updates to `cancelled`
- [ ] **View my bookings** — Guest itinerary / "My Bookings" page lists all active + past bookings correctly

## Staff / Department Flows

- [ ] **Dept Planner loads** — `/staff/dept/:deptKey/planner` renders sessions for the correct department scope
- [ ] **Planner date filter** — Changing date fetches the right day's sessions (server-side filtered)
- [ ] **Dept Inbox loads** — `/staff/dept/:deptKey/inbox` shows only sessions matching the department scope
- [ ] **Session Run Sheet** — Run sheet for a session updates in realtime (booking count, status changes)
- [ ] **Ops Day Sheet** — Day sheet groups sessions correctly by department/category

## Access Control

- [ ] **Manager-only routes** — Staff member (non-manager) is blocked from manager-only pages (e.g., dept settings)
- [ ] **Module access** — Staff without a specific module key (e.g., `ops_sheet`) sees the "Access Restricted" card
- [ ] **Super Admin bypass** — Super Admin can access all department routes regardless of membership
- [ ] **Dept-only user** — User with only department memberships (no resort role) can access their dept pages

## Feature Flags

- [ ] **`dept_scope_v2_enabled`** — Default OFF; toggling ON per resort does not break existing scope resolution
- [ ] **`ops_events_adapter_enabled`** — Default OFF; toggling ON per resort does not break ops page queries
- [ ] **`enable_activities_ops`** — Toggling OFF hides ops inbox/run sheet from staff and guest portals

## Smoke Test (Dev Console)

Run in browser console on a staff page:
```js
window.__propera_smoke?.deptScope()   // logs current dept + resolved scope
window.__propera_smoke?.opsEvents()   // fetches today's sessions for current dept
```
