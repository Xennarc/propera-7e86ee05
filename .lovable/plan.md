
# Transport Setup Wizard

## Overview
Create a guided onboarding wizard that helps staff configure the Transport module with essential resources before going live. The wizard ensures stops, buggies, and drivers are set up properly, preventing confusion when staff first access the dispatch console.

## User Flow
1. Staff opens Transport page for the first time (or when resources are missing)
2. A setup banner appears prompting them to complete setup
3. Clicking "Start Setup" opens a 4-step wizard dialog
4. After completing all steps, the wizard marks setup as complete and transitions to the dispatch console

## Wizard Steps

### Step 1: Stops
- Title: "Define Pickup & Dropoff Locations"
- Description: "Add the key locations where guests can request buggy pickups"
- Features:
  - Add stops with name and optional zone grouping
  - Drag-to-reorder stops
  - Quick-add common locations (Reception, Main Pool, Restaurant, etc.)
  - Minimum requirement: At least 2 stops to proceed

### Step 2: Buggies
- Title: "Add Your Fleet"
- Description: "Register the buggies/carts available for transport"
- Features:
  - Add buggy with name, capacity, and accessibility flag
  - Show capacity visualization (seats icon)
  - Minimum requirement: At least 1 buggy to proceed

### Step 3: Drivers
- Title: "Assign Drivers"
- Description: "Link staff members who will operate the buggies"
- Features:
  - Reuse the existing `AddDriverDialog` pattern (staff member picker)
  - Show registered drivers with role badges
  - Minimum requirement: At least 1 driver to proceed

### Step 4: Review & Go Live
- Title: "Ready to Launch"
- Summary of configured resources:
  - X stops across Y zones
  - X buggies (total capacity: Y seats)
  - X registered drivers
- "Complete Setup" button marks wizard as done
- Success state with confetti animation and "Start Dispatching" CTA

## Technical Implementation

### 1. New Hook: `useTransportSetupMutations`
**File:** `src/hooks/transport/useTransportSetupMutations.ts`

Provides mutations for:
- `addStop`: Insert into `buggy_stops`
- `updateStop`: Update stop name/zone
- `deleteStop`: Soft-delete (set `is_active = false`)
- `reorderStops`: Batch update `sort_order`
- `addBuggy`: Insert into `buggies`
- `updateBuggy`: Update buggy details
- `deleteBuggy`: Soft-delete (set status to 'out_of_service')

### 2. New Hook: `useTransportSetupStatus`
**File:** `src/hooks/transport/useTransportSetupStatus.ts`

Calculates setup completion:
```typescript
interface TransportSetupStatus {
  stopsCount: number;
  buggiesCount: number;
  driversCount: number;
  isComplete: boolean; // All >= 1
  isDismissed: boolean; // localStorage flag
}
```

### 3. Wizard Components

**Directory:** `src/components/transport/setup/`

| Component | Purpose |
|-----------|---------|
| `TransportSetupWizard.tsx` | Main wizard with step state and navigation |
| `StopsSetupStep.tsx` | Step 1: Manage stops with inline add/edit/delete |
| `BuggiesSetupStep.tsx` | Step 2: Manage buggies with inline add/edit |
| `DriversSetupStep.tsx` | Step 3: Assign drivers (reuse eligible drivers hook) |
| `ReviewSetupStep.tsx` | Step 4: Summary and completion |
| `SetupProgressIndicator.tsx` | Shared step indicator component |
| `QuickAddStops.tsx` | Pre-populated common stop templates |
| `index.ts` | Exports |

### 4. Setup Banner Integration
**File:** `src/components/transport/setup/TransportSetupBanner.tsx`

- Displayed above the dispatch console when setup is incomplete
- Uses existing `SetupBanner` pattern
- Dismissible but re-appears if resources are deleted back to zero
- "Start Setup" button opens the wizard dialog

### 5. Update TransportPage
**File:** `src/pages/staff/TransportPage.tsx`

- Import `TransportSetupBanner` and `TransportSetupWizard`
- Query setup status using `useTransportSetupStatus`
- Show banner when `!isComplete && !isDismissed`
- Include wizard dialog with open/close state

## Files to Create

| File | Description |
|------|-------------|
| `src/hooks/transport/useTransportSetupMutations.ts` | CRUD mutations for stops and buggies |
| `src/hooks/transport/useTransportSetupStatus.ts` | Setup completion check |
| `src/components/transport/setup/TransportSetupWizard.tsx` | Main wizard component |
| `src/components/transport/setup/StopsSetupStep.tsx` | Step 1 |
| `src/components/transport/setup/BuggiesSetupStep.tsx` | Step 2 |
| `src/components/transport/setup/DriversSetupStep.tsx` | Step 3 |
| `src/components/transport/setup/ReviewSetupStep.tsx` | Step 4 |
| `src/components/transport/setup/TransportSetupBanner.tsx` | Trigger banner |
| `src/components/transport/setup/index.ts` | Exports |

## Files to Edit

| File | Changes |
|------|---------|
| `src/pages/staff/TransportPage.tsx` | Add banner + wizard integration |
| `src/hooks/transport/index.ts` | Export new hooks |

## UI/UX Considerations

- **Mobile-first**: Wizard is a full-height dialog with scrollable steps
- **Progressive disclosure**: Each step only shows what's needed
- **Inline editing**: Add/edit items without leaving the step
- **Validation feedback**: Clear indicators when minimum requirements are met
- **Empty states**: Friendly guidance, not error messages
- **Animation**: Smooth step transitions using Framer Motion (matching existing patterns)

## Database Considerations
No schema changes required. The wizard uses existing tables:
- `buggy_stops`: Pickup/dropoff locations
- `buggies`: Fleet inventory
- `buggy_drivers`: Driver assignments

Existing RLS policies (`staff_insert_buggy_stops`, `staff_insert_buggies`, `staff_insert_buggy_drivers`) already support these operations for authorized staff roles.

## Persistence
Setup completion is tracked via resource counts, not a dedicated flag. If all resources are deleted, the setup banner returns. This ensures data integrity without adding database columns.
