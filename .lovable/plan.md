
# Staff Trip Complete/Cancel Actions

## Overview
Add the ability for dispatch staff to manually complete or cancel trips from the dispatch console. This enables operational flexibility when drivers can't update trip status themselves.

## Current State Analysis
- **Cancel Empty Trip**: `rpc_transport_cancel_empty_trip` exists but only works for empty planning trips
- **Driver Complete**: `rpc_transport_driver_update_trip_state` exists but requires driver auth
- **Gap**: No staff-initiated complete/cancel for active trips

## Implementation

### Phase 1: Database RPC (New)
Create `rpc_transport_staff_update_trip_status` to allow staff to complete or cancel trips:

```text
┌─────────────────────────────────────────────────────────────┐
│  rpc_transport_staff_update_trip_status                     │
├─────────────────────────────────────────────────────────────┤
│  Inputs:                                                    │
│    - p_resort_id: uuid                                      │
│    - p_trip_id: uuid                                        │
│    - p_action: 'complete' | 'cancel'                        │
│    - p_staff_user_id: uuid                                  │
│    - p_reason: text (optional)                              │
├─────────────────────────────────────────────────────────────┤
│  Logic:                                                     │
│    1. Lock trip row FOR UPDATE                              │
│    2. Validate trip belongs to resort                       │
│    3. Validate current status allows action:                │
│       - complete: status in (assigned, en_route, active)    │
│       - cancel: status in (planning, assigned, en_route)    │
│    4. For COMPLETE:                                         │
│       - Set status = 'completed', lifecycle_state = done    │
│       - Set end_at = now()                                  │
│       - Update all trip_requests state → 'dropped_off'      │
│       - Update all requests status → 'completed'            │
│    5. For CANCEL:                                           │
│       - Set status = 'cancelled', cancelled_at = now()      │
│       - Update trip_requests state → 'cancelled'            │
│       - Return requests to queue (status → 'queued')        │
│    6. Log transport_event                                   │
├─────────────────────────────────────────────────────────────┤
│  Returns: { success, trip_id, action, affected_requests }   │
└─────────────────────────────────────────────────────────────┘
```

### Phase 2: Frontend Hook Updates

**File: `src/hooks/transport/useTransportDispatchActions.ts`**

Add two new mutations:

1. `staffCompleteTrip` - Calls RPC with action='complete'
2. `staffCancelTrip` - Calls RPC with action='cancel'

Both include:
- Proper error handling with user-friendly messages
- Cache invalidation for all transport queries
- Success/error toasts via existing utilities

### Phase 3: UI Components

**File: `src/components/transport/dispatch/TripActions.tsx`** (Update)

Expand the dropdown menu to include:
- "Mark Complete" - visible for assigned/en_route/active trips
- "Cancel Trip" - visible for planning/assigned/en_route trips (with confirmation dialog)

**File: `src/components/transport/TripCard.tsx`** (Update)

Add action callbacks:
- `onComplete?: (tripId: string) => void`
- Update `onCancelTrip` to work for non-empty trips too

Display "Mark Complete" button in action area for active trips

**File: `src/components/transport/TripDetailSheet.tsx`** (Update)

Add footer actions section with:
- "Mark Complete" button (green/success variant)
- "Cancel Trip" button (destructive variant)
- Confirmation dialogs for both actions

### Phase 4: Integrate into Dispatch Pages

**Files to update:**
- `src/components/transport/TripsPanel.tsx` - Pass new handlers to TripCard
- Parent dispatch page components - Wire up the mutations

## Technical Details

### Mutation Structure
```typescript
const staffCompleteTrip = useMutation({
  mutationFn: async ({ tripId, reason }) => {
    const { data, error } = await supabase.rpc(
      'rpc_transport_staff_update_trip_status',
      {
        p_resort_id: resortId,
        p_trip_id: tripId,
        p_action: 'complete',
        p_staff_user_id: user?.id,
        p_reason: reason,
      }
    );
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    showTransportSuccessToast('Trip completed', 'Marked as done by staff');
    invalidateAll();
  },
});
```

### Updated TripActions Props
```typescript
interface TripActionsProps {
  tripId: string;
  tripStatus: string;
  requestCount: number;
  onSplit?: (tripId: string) => void;
  onMerge?: (tripId: string) => void;
  onDuplicate?: (tripId: string) => void;
  onCancel?: (tripId: string) => void;
  onComplete?: (tripId: string) => void;  // NEW
  disabled?: boolean;
  isCompleting?: boolean;  // NEW
  isCancelling?: boolean;  // NEW
}
```

### Status Visibility Rules
| Action | Visible When Status Is |
|--------|------------------------|
| Complete | assigned, en_route, active |
| Cancel | planning, assigned, en_route |

## Files to Create
1. Database migration for `rpc_transport_staff_update_trip_status`

## Files to Modify
1. `src/hooks/transport/useTransportDispatchActions.ts` - Add mutations
2. `src/components/transport/dispatch/TripActions.tsx` - Add menu items
3. `src/components/transport/TripCard.tsx` - Add action buttons/handlers
4. `src/components/transport/TripDetailSheet.tsx` - Add footer actions
5. `src/components/transport/TripsPanel.tsx` - Wire up handlers

## Acceptance Criteria
- Staff can mark trips as complete from dispatch console
- Staff can cancel trips (returns requests to queue)
- Confirmation dialogs prevent accidental actions
- Real-time sync updates other clients
- Proper toast feedback for success/error states
- Actions respect trip status (disabled when not applicable)
