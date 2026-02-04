
# Plan: Fix Transport Dispatch Operations

## Problem Summary

Testing revealed these issues:
1. **Trip creation failure**: "Creating..." then nothing happens, no trip appears
2. **Request cancellation error**: "invalid input value for enum" toast
3. **Resources button**: Works on desktop (toggles panel), works on mobile (tab navigation)
4. **No failure feedback**: Operations fail silently without clear error messaging

## Root Cause Analysis

| Issue | Root Cause |
|-------|------------|
| Trip creation silent failure | TripPreviewSheet doesn't keep sheet open on error; error toasts may not show full details |
| Cancel enum error | Using old `cancel_buggy_request` RPC instead of newer `rpc_transport_cancel_request` with proper trip reconciliation |
| Resources button | Actually works correctly - no fix needed |
| Silent failures | Error toasts lack debugging context; no "Copy details" action |

---

## Phase 1: Fix Trip Creation Flow

### 1A. Improve TripPreviewSheet Error Handling
**File**: `src/components/transport/dispatch/TripPreviewSheet.tsx`

Changes:
- Add an `error` state to show inline error message in the sheet
- Pass `onError` callback to keep sheet open on failure
- Show "Try again" instead of "Creating..." after error
- Add error banner with details and "Copy" button

### 1B. Enhance useTransportDispatchActions Error Toasts
**File**: `src/hooks/transport/useTransportDispatchActions.ts`

Changes:
- Add a helper function `showTransportErrorToast(actionName, error, context)` in a new utility file
- Include expandable technical details in toasts
- Add "Copy error details" action button to toasts
- Improve error message parsing for common RPC failures

### 1C. Create Error Toast Utility
**File**: `src/utils/transportErrorUtils.ts` (new file)

```typescript
// Standardized error toast with debugging context
export function showTransportErrorToast(
  action: string,
  error: { message: string; code?: string },
  context?: { resortId?: string; requestIds?: string[]; tripId?: string }
) {
  // Format user-friendly message + technical expandable details
  // Add "Copy details" action for debugging
}
```

---

## Phase 2: Fix Request Cancellation

### 2A. Switch to New RPC
**File**: `src/hooks/transport/useTransportMutations.ts`

Current code calls `cancel_buggy_request` which has enum issues. Update to call `rpc_transport_cancel_request` instead:

```typescript
// Before
const { data, error } = await supabase.rpc('cancel_buggy_request', {
  _request_id: requestId,
  _reason: reason,
});

// After
const { data, error } = await supabase.rpc('rpc_transport_cancel_request', {
  p_resort_id: resortId,  // Now required
  p_request_id: requestId,
  p_actor_type: 'staff',
  p_actor_id: user?.id ?? null,
  p_reason: reason,
});
```

### 2B. Add Confirmation Dialog
**File**: `src/components/transport/RequestQueueCard.tsx`

Changes:
- Add `AlertDialog` for cancel confirmation
- Show message: "Cancel request? This will remove it from the queue. If attached to a trip, it will be detached."
- Disable X button while cancellation in progress
- Pass through `isCancelling` loading state

### 2C. Update RequestQueuePanel Props
**File**: `src/components/transport/RequestQueuePanel.tsx`

Changes:
- Add `isCancellingRequest` prop to disable cancel buttons while in progress
- Pass cancelling state to RequestQueueCard

### 2D. Update TransportPage
**File**: `src/pages/staff/TransportPage.tsx`

Changes:
- Pass `isCancelling` state from mutations to RequestQueuePanel

---

## Phase 3: Standardize Error Feedback

### 3A. Update All Dispatch Action Hooks
**File**: `src/hooks/transport/useTransportDispatchActions.ts`

For each mutation (`createTripFromRequests`, `assignTrip`, `attachRequestsToTrip`, `cancelEmptyTrip`):
- Use the new `showTransportErrorToast` utility
- Include relevant context (trip IDs, request IDs, resort ID)
- Ensure non-thrown Supabase errors are caught (`data.error` check)

### 3B. Update useTransportMutations
**File**: `src/hooks/transport/useTransportMutations.ts`

For `cancelRequest` mutation:
- Switch to `rpc_transport_cancel_request`
- Use `showTransportErrorToast` with context
- Add loading state export

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/utils/transportErrorUtils.ts` | **New file** - error toast utility |
| `src/hooks/transport/useTransportDispatchActions.ts` | Enhanced error handling with utility |
| `src/hooks/transport/useTransportMutations.ts` | Switch cancel RPC + enhanced errors |
| `src/components/transport/dispatch/TripPreviewSheet.tsx` | Keep open on error, show inline error |
| `src/components/transport/RequestQueueCard.tsx` | Add cancel confirmation dialog |
| `src/components/transport/RequestQueuePanel.tsx` | Add isCancelling prop |
| `src/pages/staff/TransportPage.tsx` | Pass isCancelling to panel |

---

## Expected Outcomes

After implementation:

| Test Case | Expected Result |
|-----------|-----------------|
| Create Trip | Success: sheet closes, trip appears. Failure: sheet stays open, error shown with retry button |
| Cancel Request | Confirmation dialog appears, success toast on complete, error toast with details on failure |
| Any operation failure | Toast includes action name, friendly message, and "Copy details" button |
| Resources button | No change needed - already works correctly |

---

## Technical Notes

- All changes are strictly additive (no deletions/renames)
- New `rpc_transport_cancel_request` RPC already exists and handles enum values correctly
- Existing TypeScript types remain compatible
- No database migrations required - RPCs already exist
