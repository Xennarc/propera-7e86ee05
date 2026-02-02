
# Quick-Add Driver Flow for Resources Panel

## Overview
Add a streamlined "Add Driver" button to the Resources Panel that allows staff to register existing staff members as buggy drivers directly from the Transport Dispatch view.

## User Flow
1. Staff clicks "+ Add Driver" button in the Drivers section header
2. A compact dialog opens with a searchable dropdown of eligible staff members
3. Staff selects a user from the list
4. On confirm, a new `buggy_drivers` record is created (status: 'offline')
5. The new driver appears in the Resources Panel immediately

## Implementation Details

### 1. Create AddDriverDialog Component
**File:** `src/components/transport/dispatch/AddDriverDialog.tsx`

- Dialog with single Select field showing eligible staff members
- Query `resort_memberships` + `profiles` to get staff users
- Filter out users already registered as drivers
- Insert into `buggy_drivers` table with initial 'offline' status
- Show success toast with driver name

### 2. Create Hook for Eligible Staff
**File:** `src/hooks/transport/useEligibleDrivers.ts`

- Fetch `resort_memberships` joined with `profiles` for the current resort
- Exclude users who already have a `buggy_drivers` record
- Return user_id, full_name, resort_role for display

### 3. Add Mutation to useTransportMutations
**File:** `src/hooks/transport/useTransportMutations.ts`

- Add `registerDriver` mutation that inserts into `buggy_drivers`
- Include query invalidation for `buggy-drivers` key

### 4. Update ResourcesPanel
**File:** `src/components/transport/dispatch/ResourcesPanel.tsx`

- Add `resortId` prop to enable mutations
- Add "+ Add Driver" icon button next to Drivers section header
- Integrate AddDriverDialog with open/close state

### 5. Update TransportPage
**File:** `src/pages/staff/TransportPage.tsx`

- Pass `resortId` to ResourcesPanel

### 6. Export new components
**File:** `src/components/transport/dispatch/index.ts`

- Export AddDriverDialog

---

## Technical Notes

### RLS Compatibility
The existing policy `staff_insert_buggy_drivers` allows authenticated users with `staff_can_write_transport(auth.uid(), resort_id)` to insert. No database changes required.

### Staff Eligibility Query
```typescript
// Get resort staff not already registered as drivers
const { data: staff } = await supabase
  .from('resort_memberships')
  .select('user_id, profiles!inner(id, full_name)')
  .eq('resort_id', resortId);

const { data: existingDrivers } = await supabase
  .from('buggy_drivers')
  .select('user_id')
  .eq('resort_id', resortId);

// Filter eligible = staff - existingDrivers
```

### Insert Pattern
```typescript
const { error } = await supabase
  .from('buggy_drivers')
  .insert({
    resort_id: resortId,
    user_id: selectedUserId,
    status: 'offline', // default, driver goes online when they open driver app
  });
```

---

## Files Changed Summary
| File | Action |
|------|--------|
| `src/components/transport/dispatch/AddDriverDialog.tsx` | Create |
| `src/hooks/transport/useEligibleDrivers.ts` | Create |
| `src/hooks/transport/useTransportMutations.ts` | Edit (add mutation) |
| `src/hooks/transport/index.ts` | Edit (export new hook) |
| `src/components/transport/dispatch/ResourcesPanel.tsx` | Edit (add button + dialog) |
| `src/components/transport/dispatch/index.ts` | Edit (export) |
| `src/pages/staff/TransportPage.tsx` | Edit (pass resortId prop) |

## UX Considerations
- Empty state in dialog if no eligible staff (all already registered)
- Show role badge next to staff name for context
- Disable submit until staff member is selected
- Loading state during mutation
