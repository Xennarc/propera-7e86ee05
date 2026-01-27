
# Continue Improving Guest Requests Feature - QA and Improvements

## QA Testing Summary

Based on my investigation, I identified a **critical sync issue** and several improvement opportunities:

### Critical Issue Found

| Component | Table Subscribed | Actual Data Table | Status |
|-----------|-----------------|-------------------|--------|
| `useGuestRequestsSync` (old) | `guest_requests` | N/A (0 records) | Broken - Legacy table |
| `useRequestsDashboard` (new) | `service_requests` | 6 records | Working |
| Guest portal `useGuestServiceRequests` | `service_requests` | 6 records | Working |

The old `useGuestRequestsSync` hook is subscribed to an empty legacy table (`guest_requests`), which means pages using it will never receive real-time updates.

---

## Phase 1: Fix Critical Sync Issues

### 1.1 Update `useGuestRequestsSync` to Use Correct Table

**File:** `src/hooks/useGuestRequestsSync.ts`

The hook currently subscribes to `guest_requests` but should subscribe to `service_requests`:

```typescript
// Current (broken)
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'guest_requests',  // ← Empty legacy table
  filter,
})

// Fixed
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'service_requests',  // ← Active table with data
  filter,
})
```

Also update the query key invalidations to match the new dashboard keys:
- `['guest-requests', resortId]` → `['guest-service-requests', resortId, guestId]`
- `['staff-requests', resortId]` → `['requests-dashboard', resortId]`

### 1.2 Consolidate Real-Time Hooks

Create a unified `useServiceRequestsSync` hook that:
- Listens to `service_requests` table changes
- Invalidates both guest and staff query keys
- Uses debounced invalidation to prevent refetch storms

---

## Phase 2: Improve Dashboard Real-Time Performance

### 2.1 Add Optimistic Cache Updates

Instead of just invalidating queries on realtime events, update the cache immediately:

```typescript
.on('postgres_changes', { /* ... */ }, (payload) => {
  // Optimistic update - append new request to cache immediately
  if (payload.eventType === 'INSERT') {
    queryClient.setQueryData(['requests-dashboard', resortId], (old) => 
      old ? [mapPayloadToRequest(payload.new), ...old] : [mapPayloadToRequest(payload.new)]
    );
  }
  // Then invalidate for full sync
  queryClient.invalidateQueries({ queryKey: ['requests-dashboard', resortId] });
})
```

### 2.2 Add Visual Feedback for New Requests

Add a "pulse" animation and sound notification when new requests arrive:
- Flash the NEW count badge when a new request appears
- Optional desktop notification for URGENT priority requests
- Track `hasNewRequests` state for visual indicators

---

## Phase 3: Guest Portal Improvements

### 3.1 Add Real-Time Sync to Guest Service Requests

**File:** `src/hooks/useServiceRequests.ts`

The guest portal's `useGuestServiceRequests` already has real-time subscription, but needs to:
- Ensure it's using the correct query key for invalidation
- Add immediate cache update on request creation success

### 3.2 Improve RequestQuickSheet UX

**File:** `src/components/guest/RequestQuickSheet.tsx`

Enhancements:
- Add character count indicator for request text
- Show estimated response time based on priority
- Add "Common Requests" suggestions (extra towels, wake-up call, etc.)
- Improve mobile keyboard handling using existing `useKeyboardInset` hook

---

## Phase 4: Testing Checklist

After implementing fixes, verify the following E2E flow:

| Step | Expected Behavior | Pass/Fail |
|------|-------------------|-----------|
| 1. Guest logs into portal | Sees GuestQuickActions with "Request" button | - |
| 2. Guest opens RequestQuickSheet | Drawer opens with text input | - |
| 3. Guest types request and submits | Toast shows success, drawer closes | - |
| 4. Staff opens /staff/requests-dashboard | Sees NEW count update within 5 seconds | - |
| 5. New request appears in list | Card shows with correct guest name/room | - |
| 6. Staff acknowledges request | Card moves to IN_PROGRESS lane | - |
| 7. Guest portal shows status update | Request status updates in "My Requests" | - |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useGuestRequestsSync.ts` | Fix table subscription from `guest_requests` to `service_requests`, update query keys |
| `src/hooks/useRequestsDashboard.ts` | Add optimistic cache updates, improve new request detection |
| `src/components/guest/RequestQuickSheet.tsx` | Add common request suggestions, character count, keyboard handling |
| `src/hooks/useServiceRequests.ts` | Verify query key consistency for real-time sync |

---

## Summary

The main blocker for real-time sync is the **wrong table subscription** in `useGuestRequestsSync`. Once fixed:

1. Guest creates request → `service_requests` INSERT triggers Supabase Realtime
2. Staff dashboard receives event → Invalidates `['requests-dashboard', resortId]`
3. React Query refetches → New request appears in staff UI (within 2-5 seconds)

The new `RequestsDashboardPage` implementation is solid and correctly configured. The primary fix needed is updating the legacy sync hook to use the correct table.
