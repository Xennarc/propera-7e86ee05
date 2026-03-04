

## Plan: Improve Ops Page Access & Feature Flag Alignment

### Problem
1. The **ActivitiesHome dashboard** (landing page for Activities staff) has no links to the Master Ops Sheet or Ops Inbox — staff must find them in the sidebar
2. The `enable_activities_ops` flag isn't listed in `MODULE_KEYS` in `useFeatureFlags.ts`, so it can't act as a parent module for future sub-features
3. The sidebar "Ops Inbox" uses a generic `Activity` icon — same as "Catalogue" — making it hard to distinguish

### Changes

#### 1. Add Ops shortcuts to ActivitiesHome (`src/pages/dashboards/ActivitiesHome.tsx`)
- Add a prominent "Ops Quick Access" card/section above or alongside the existing Quick Actions
- Include two buttons: **"Master Ops Sheet"** (→ `/staff/activities/ops/day`) and **"Ops Inbox"** (→ `/staff/activities/ops`)
- Gate visibility behind `enable_activities_ops` feature flag using `useFeatureEnabled`

#### 2. Register `enable_activities_ops` as a module key (`src/hooks/useFeatureFlags.ts`)
- Add `'enable_activities_ops'` to the `MODULE_KEYS` set so future sub-features (e.g., `enable_activities_ops_timeline`) will correctly inherit parent state

#### 3. Improve sidebar icon differentiation (`src/components/staff/StaffSidebar.tsx`)
- Change "Ops Inbox" icon from `Activity` to a more distinctive icon (e.g., `Inbox` or `AlertCircle`)
- Keep "Day Sheet" as `ClipboardList` (already distinct)

#### 4. Add `TRANSPORT` role to ops nav items (`src/components/staff/StaffSidebar.tsx`)
- Transport staff often need to see the Day Sheet for pickup coordination — add `'TRANSPORT'` to the roles array for "Day Sheet"

### Files to Edit
- `src/pages/dashboards/ActivitiesHome.tsx` — add ops shortcut cards
- `src/hooks/useFeatureFlags.ts` — add `enable_activities_ops` to MODULE_KEYS
- `src/components/staff/StaffSidebar.tsx` — fix icon, add TRANSPORT role

