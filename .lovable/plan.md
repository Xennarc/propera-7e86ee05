

## Problem

The sidebar's Activities section shows Catalogue, Sessions, and Cheat Sheet — but no way to navigate to the **Ops management pages** (Ops Inbox, Day Sheet) or to department-specific views (Dive, Watersports, Excursions). The code already defines Ops Inbox and Day Sheet nav items (lines 157-158) with the Super Admin bypass (line 105), yet they don't appear on the published site.

**Root cause**: The Ops items require `enable_activities_ops` feature flag. While Super Admins bypass flag checks in the code, this bypass was added recently and may not have been included in the latest published build. Additionally, the user wants **department-specific** navigation (Dive, Watersports, Excursions) which doesn't exist yet.

## Plan

### 1. Add department-specific nav items under Activities (`src/components/staff/StaffSidebar.tsx`)

Add three new nav items that deep-link to the Day Sheet with the department pre-selected:

- **Dive Ops** → `/staff/activities/ops/day?dept=DIVE`
- **Watersports Ops** → `/staff/activities/ops/day?dept=WATERSPORT`  
- **Excursions Ops** → `/staff/activities/ops/day?dept=EXCURSION`

These will use distinct icons (e.g., `Waves` for Dive, `Ship` for Watersports, `Compass` for Excursions) and be gated by `enable_activities_ops`.

Updated Activities group items:
```
Catalogue
Sessions
Ops Inbox          (existing, flag-gated)
Dive Ops           (NEW - links to Day Sheet ?dept=DIVE)
Watersports Ops    (NEW - links to Day Sheet ?dept=WATERSPORT)
Excursions Ops     (NEW - links to Day Sheet ?dept=EXCURSION)
Cheat Sheet
```

### 2. Remove standalone "Day Sheet" nav item

Since Dive/Watersports/Excursions each link to the Day Sheet with a department filter, the generic "Day Sheet" entry becomes redundant. Remove it to keep the nav clean.

### 3. Import new icons (`src/components/staff/StaffSidebar.tsx`)

Add `Waves`, `Ship`, `Compass` (or similar distinctive icons from lucide-react) to the import block.

### Files to edit
- `src/components/staff/StaffSidebar.tsx` — replace Day Sheet with three department-specific nav items, add icon imports

