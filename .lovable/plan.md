
# Fix Plan: Guest Requests Lifecycle End-to-End

## Problem Summary

After testing the guest requests flow, I identified why the lifecycle appears broken despite requests being created successfully:

1. **Schema Mismatch**: The `service_request_events` table has different column names than what the frontend expects
2. **Timeline Query Fails**: The staff drawer shows "No events recorded yet" because the query uses wrong column names
3. **Staff Event Inserts Fail**: Staff actions (acknowledge/assign/start/complete) try to insert events with non-existent columns
4. **Event Data Incomplete**: Events exist but lack proper actor type tracking for UI display

## Root Cause Analysis

| Database Column | Frontend Expects | Status |
|-----------------|------------------|--------|
| `event_at` | `created_at` | Mismatch |
| `meta` | `metadata` | Mismatch |
| (none) | `actor_type` | Missing |
| (none) | `notes` | Missing |
| `actor_guest_id` | (not used) | OK |

The trigger-created events work (14 CREATED events exist), but the frontend can't read or display them.

---

## Phase 1: Database Schema Alignment

### 1A. Add Missing Columns to Events Table
Add the columns the frontend expects:

```sql
ALTER TABLE public.service_request_events 
  ADD COLUMN IF NOT EXISTS actor_type TEXT DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add a view or alias for compatibility
CREATE OR REPLACE VIEW service_request_events_compat AS
SELECT 
  id,
  request_id,
  resort_id,
  actor_user_id,
  actor_guest_id,
  event_type,
  event_at AS created_at,  -- Alias for frontend
  meta AS metadata,        -- Alias for frontend
  actor_type,
  notes
FROM service_request_events;
```

### 1B. Update Triggers to Populate New Columns
Update the `service_request_created_event` trigger to set `actor_type = 'GUEST'` for guest-initiated events.

Update the `service_request_status_change_event` trigger to set `actor_type = 'SYSTEM'` for auto-generated events.

---

## Phase 2: Frontend Query Fixes

### 2A. Fix `useRequestEvents` Hook
Update the query in `src/hooks/useStaffServiceRequests.ts` to use correct column names:

```typescript
// Before
.select('id, event_type, actor_type, actor_user_id, notes, metadata, created_at, ...')
.order('created_at', { ascending: true });

// After  
.select('id, event_type, actor_type, actor_user_id, actor_guest_id, notes, meta, event_at, ...')
.order('event_at', { ascending: true });
```

Map `event_at` → `created_at` and `meta` → `metadata` in the return value for interface compatibility.

### 2B. Fix Event Insert Calls
Update all staff mutation event inserts in:
- `src/hooks/useStaffServiceRequests.ts` (6 mutations)
- `src/hooks/useRequestsDashboard.ts` (4 mutations)

Change from:
```typescript
await supabase.from('service_request_events').insert({
  request_id: requestId,
  resort_id: resortId,
  event_type: 'ACKNOWLEDGED',
  actor_type: 'STAFF',    // This column now exists
  actor_user_id: userId,
  metadata: { ... },       // Change to 'meta'
  notes: '...',           // This column now exists
});
```

To:
```typescript
await supabase.from('service_request_events').insert({
  request_id: requestId,
  resort_id: resortId,
  event_type: 'ACKNOWLEDGED',
  actor_type: 'STAFF',
  actor_user_id: userId,
  meta: { ... },          // Correct column name
  notes: '...',
});
```

---

## Phase 3: Guest RPC Enhancement

### 3A. Add CREATED Event in RPC (Not Just Trigger)
Update `guest_create_service_request` to insert the CREATED event with proper `actor_type = 'GUEST'`:

```sql
-- After inserting the request, also insert the event explicitly
INSERT INTO service_request_events (
  request_id, resort_id, actor_guest_id, event_type, actor_type, meta
) VALUES (
  v_request_id, p_resort_id, p_guest_id, 'CREATED', 'GUEST',
  jsonb_build_object('title', v_title, 'is_asap', p_is_asap)
);
```

This ensures the event has the correct actor_type for display.

### 3B. Update Bundle RPC Similarly
Update `create_service_request_bundle` to insert CREATED events with `actor_type = 'GUEST'`.

---

## Phase 4: Staff Assign Picker Fix

### 4A. Enable Staff Assignment in Detail Drawer
The `RequestDetailDrawer` already has the Assign button, but it needs department members to be fetched. Verify the picker works by:
- Ensuring `useStaffDepartmentMembers` returns data
- Showing the select dropdown with staff options

### 4B. Add Visual Feedback for Empty States
If no department members are found, show a message like "No staff configured for this department".

---

## Phase 5: Cross-Portal Realtime Sync Verification

### 5A. Verify Guest Query Invalidation
The unified realtime hook already subscribes to `service_requests` with `guest_id` filter. Confirm:
- `['guest-service-requests', resortId, guestId]` key is invalidated on changes
- My Requests page refreshes automatically

### 5B. Verify Staff Dashboard Invalidation  
The dashboard already has realtime subscription. Confirm:
- `['requests-dashboard', resortId]` key is invalidated on new requests
- New requests appear in the "New" lane without manual refresh

---

## Files to Modify

| Type | File | Changes |
|------|------|---------|
| DB Migration | New migration | Add `actor_type`, `notes` columns; update triggers |
| Hook | `src/hooks/useStaffServiceRequests.ts` | Fix `useRequestEvents` query and all event inserts |
| Hook | `src/hooks/useRequestsDashboard.ts` | Fix event inserts (4 mutations) |
| DB Migration | New migration | Update guest RPCs to set `actor_type = 'GUEST'` |

---

## Expected Outcomes

After implementation:

1. **Guest submits request** → Success toast appears, request visible in My Requests immediately
2. **Staff sees request** → Appears in New lane of dashboard (via realtime)
3. **Staff acknowledges/assigns/starts/completes** → Actions succeed, timeline records each step
4. **Guest sees updates** → Status changes reflected in My Requests (via realtime)
5. **Timeline works** → Shows "Request submitted", "Acknowledged", "Assigned to Maria", "Completed"

---

## Technical Notes

- All changes are additive (no table/column renames)
- Existing events remain valid (columns default to 'SYSTEM' for actor_type)
- RLS policies remain unchanged (already grant proper access)
- No breaking changes to existing functionality
