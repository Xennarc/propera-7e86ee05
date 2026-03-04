

## Mobile Optimisation for `/staff/activities/ops/day`

The page is already mobile-first but has several UX friction points on small screens that I'll address:

### Issues Identified

1. **Sticky header stack is too tall** — Top bar (56px) + date row (44px) + dept tabs (44px) + attention mode + filter chips ≈ 210px+ of sticky content, leaving very little scroll area on phones
2. **KPI pills AND filter chips are redundant** — Both are horizontally scrollable chip rows doing similar filtering; on mobile this wastes vertical space
3. **Filter chips touch targets are small** — 32px height (h-8) is below the 44px minimum
4. **OpsSheetRowCard is dense** — Assignment chips, readiness line, and blockers all render at once making cards very tall on mobile
5. **No pull-to-refresh** — Staff expect swipe-down to refresh on mobile
6. **Timeline view has no horizontal constraint** — Blocks can overflow on narrow screens
7. **No bottom safe area padding** — `pb-safe-bottom` class may not work without proper CSS

### Plan

#### 1. Collapse sticky controls — merge KPI pills into filter chips (`MasterOpsSheet.tsx`)
- Remove the separate KPI summary strip (Section C, lines 354-379)
- The filter chips already show badge counts — this is sufficient on mobile
- Saves ~40px of sticky height

#### 2. Combine Attention Mode into the top bar (`MasterOpsSheet.tsx`)
- Move the attention mode toggle into the top bar as an icon button (ShieldAlert icon, toggling between active/inactive states)
- Remove the separate attention mode row (lines 334-344)
- Saves ~44px of sticky height

#### 3. Increase filter chip touch targets (`OpsFilterChips.tsx`)
- Change chip height from `h-8` (32px) to `h-9` (36px) with adequate padding
- Keep the scroll behavior but add `snap-x snap-mandatory` for better mobile feel

#### 4. Compact card layout on mobile (`OpsSheetRowCard.tsx`)
- Merge readiness indicators into the header row (colored dot + count) instead of a separate line
- Collapse assignment chips into a single summary line on mobile (e.g., "MV Horizon · 3 crew · 2 equip")
- Only expand blocker badges — these are the actionable items

#### 5. Add proper bottom safe area (`MasterOpsSheet.tsx`)
- Replace `pb-safe-bottom` with `pb-[env(safe-area-inset-bottom)]` plus extra padding for mobile nav

#### 6. Optimise Timeline view for mobile (`OpsTimelineView.tsx`)
- Reduce `PX_PER_MIN` from 3 to 2 on mobile (use `useIsMobile()`) for less scrolling
- Constrain block width to prevent overflow
- Increase minimum block height for better touch targets

### Files to edit
- `src/pages/activities/MasterOpsSheet.tsx` — merge KPI strip into filters, move attention toggle to top bar, fix bottom padding
- `src/components/activities/ops/OpsFilterChips.tsx` — increase touch targets
- `src/components/activities/ops/OpsSheetRowCard.tsx` — compact mobile layout
- `src/components/activities/ops/OpsTimelineView.tsx` — mobile-optimised dimensions

