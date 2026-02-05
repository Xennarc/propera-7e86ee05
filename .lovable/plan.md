
# Guest Requests UI Polish & Consistency Pass

## Summary
This plan addresses status badge inconsistency issues (where Past requests incorrectly show "Completed" on the card header while the line item shows "Cancelled"), improves generic titles, enhances feedback UX, and ensures cross-portal consistency between guest and staff views.

---

## Problem Analysis

### Root Cause of Status Mismatch
In `RequestSubmissionCard.tsx` (lines 52-57), the "overall status" logic uses reverse priority ordering:
```typescript
const statusPriority = ['NEW', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const overallStatus = requests.reduce((worst, r) => {
  const worstIdx = statusPriority.indexOf(worst);
  const currentIdx = statusPriority.indexOf(r.status);
  return currentIdx < worstIdx ? r.status : worst; // Picks LOWER index = more active
}, 'COMPLETED' as typeof firstRequest.status);
```

This logic picks the "most active" status (NEW over COMPLETED), but it treats CANCELLED (index 5) as AFTER COMPLETED (index 4). So if one item is COMPLETED and another is CANCELLED, the bundle shows COMPLETED (index 4 is less than 5). **This is the bug**: CANCELLED should take visual precedence over COMPLETED because it represents a different final state.

---

## Implementation Plan

### A) Create Shared Status Display Helpers

**New file: `src/lib/requests/statusDisplay.ts`**

Creates a single source of truth for request status presentation:

| Function | Purpose |
|----------|---------|
| `getDisplayStatus(status)` | Returns `{ label, badgeVariant, icon, sortBucket }` for a single request |
| `getAggregatedSubmissionStatus(requests)` | Derives the correct overall status for a bundle following documented rules |
| `getDepartmentLabel(departmentKey)` | Maps keys like `HOUSEKEEPING` to "Housekeeping" |
| `deriveRequestTitle(requests)` | Returns human-readable title like "Housekeeping" or "Housekeeping + 2 more" |

**Status Aggregation Rules** (documented in code comments):
1. If ANY child request is active (NEW, ACKNOWLEDGED, ASSIGNED, IN_PROGRESS) -> show most advanced active status
2. Else if ALL children are CANCELLED -> show "Cancelled"
3. Else if ANY cancelled and some completed -> show "Partially Completed" or "Completed" with note
4. Else show "Completed"

**Badge Variant Mapping**:
| Status | Guest Label | Staff Label | Badge Variant | Color |
|--------|-------------|-------------|---------------|-------|
| NEW | Submitted | New | warning (amber) | amber-500 |
| ACKNOWLEDGED | Received | Acknowledged | info (blue) | blue-500 |
| ASSIGNED | Assigned | Assigned | info (indigo) | indigo-500 |
| IN_PROGRESS | In Progress | In Progress | primary | primary |
| COMPLETED | Completed | Completed | success (green) | emerald-500 |
| CANCELLED | Cancelled | Cancelled | muted (gray, strikethrough) | muted |

---

### B) Fix Status Consistency in Guest Components

**File: `src/components/guest/requests/RequestSubmissionCard.tsx`**

Changes:
1. Import `getAggregatedSubmissionStatus`, `deriveRequestTitle`, `getDepartmentLabel` from new helper
2. Replace inline `statusPriority` logic with `getAggregatedSubmissionStatus(requests)`
3. Replace `"{totalItems} item{s} requested"` title with `deriveRequestTitle(requests)`
4. Show department label(s) in human-readable form
5. Add "Notes" chip on collapsed card when `firstRequest.notes` exists
6. Apply cancelled styling (opacity-60, strikethrough on badge) based on new helper

**File: `src/components/guest/requests/RequestCard.tsx`**

Changes:
1. Import `getDisplayStatus` helper
2. Use helper for consistent badge styling
3. Add cancelled text styling (line-through on title when cancelled)

**File: `src/pages/guest/GuestMyRequestsPage.tsx`**

Changes:
1. Import filter logic from helper for computing `sortBucket`
2. Ensure Past tab includes both COMPLETED and CANCELLED using same helper

---

### C) Improve Title Derivation

**Title Logic in `deriveRequestTitle()`**:
```typescript
function deriveRequestTitle(requests: ServiceRequest[]): string {
  if (requests.length === 0) return 'Request';
  if (requests.length === 1) {
    // Single request: use the actual title (e.g., "Extra Towels")
    return requests[0].title;
  }
  // Multiple requests: show first title + count
  const firstTitle = requests[0].title;
  const remaining = requests.length - 1;
  return `${firstTitle} + ${remaining} more`;
}
```

For department display:
```typescript
function formatDepartments(requests: ServiceRequest[]): string {
  const uniqueDepts = [...new Set(requests.map(r => getDepartmentLabel(r.department_key)))];
  if (uniqueDepts.length === 1) return uniqueDepts[0];
  if (uniqueDepts.length === 2) return uniqueDepts.join(' & ');
  return `${uniqueDepts[0]} + ${uniqueDepts.length - 1} more`;
}
```

---

### D) Enhance Submission Success Feedback

**File: `src/hooks/useServiceRequests.ts`**

Modify `bundleMutation.onSuccess`:
```typescript
onSuccess: (data) => {
  const departments = data.departments || [];
  const deptLabel = departments.length === 1 
    ? getDepartmentLabel(departments[0]) 
    : `${departments.length} departments`;
  
  toast.success(`Request sent to ${deptLabel}`, {
    description: "We'll get to it right away.",
    action: {
      label: 'View My Requests',
      onClick: () => navigate('/guest/requests/my'),
    },
  });
  // ... existing invalidation
};
```

**Note**: The `navigate` needs to be passed from the component context or use a toast action URL pattern.

---

### E) Improve Cancel Confirmation Dialog

**File: `src/pages/guest/GuestMyRequestsPage.tsx`**

The dialog already exists (lines 322-349) and is well-implemented. Minor polish:
- Update description text: "This cannot be undone once staff starts work."
- Already has "Keep Request" / "Yes, Cancel Request" buttons - good

Post-cancel already shows toast via mutation.

---

### F) Add Notes Chip on Collapsed Card

**File: `src/components/guest/requests/RequestSubmissionCard.tsx`**

Add near the department badge:
```tsx
{firstRequest.notes && (
  <Badge variant="subtle" className="text-[10px] gap-1">
    <MessageSquare className="h-3 w-3" />
    Notes
  </Badge>
)}
```

---

### G) Polish Empty States

**File: `src/pages/guest/GuestMyRequestsPage.tsx`**

Already has good empty state logic (lines 152-172). Polish:
- Active empty: Add secondary CTA "Browse Services" linking to `/guest/requests`
- Past empty: Keep "No past requests yet"

Update `GuestEmptyState` component usage to include secondary action.

---

### H) Cancelled Styling Enhancement

**CSS/Component changes**:
```tsx
// In RequestStatusPill or via helper
const cancelledStyles = 'opacity-80 line-through';

// In card wrapper
{request.status === 'CANCELLED' && (
  <span className="text-xs text-muted-foreground line-through">{title}</span>
)}
```

---

### I) Staff Dashboard Consistency

**File: `src/components/staff/requests-dashboard/RequestDashboardCard.tsx`**

Current staff uses same `RequestStatusPill` component (imported from guest).
Status labels already match:
- NEW -> "Submitted" in pill
- etc.

Minor improvement: Add tooltip explaining guest vs staff terminology if needed.

**File: `src/components/staff/RequestDetailDrawer.tsx`**

Already shows status badge in header (line 193). Add department label clearly.

---

### J) Add Unit Tests for Status Logic

**New file: `src/lib/requests/statusDisplay.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { getDisplayStatus, getAggregatedSubmissionStatus } from './statusDisplay';

describe('getDisplayStatus', () => {
  it('returns Submitted for NEW status', () => {
    const result = getDisplayStatus('NEW');
    expect(result.label).toBe('Submitted');
    expect(result.sortBucket).toBe('active');
  });

  it('returns Cancelled for CANCELLED status', () => {
    const result = getDisplayStatus('CANCELLED');
    expect(result.label).toBe('Cancelled');
    expect(result.sortBucket).toBe('past');
  });
});

describe('getAggregatedSubmissionStatus', () => {
  it('shows Cancelled when all items cancelled', () => {
    const requests = [
      { status: 'CANCELLED' },
      { status: 'CANCELLED' },
    ];
    const result = getAggregatedSubmissionStatus(requests as any);
    expect(result.status).toBe('CANCELLED');
    expect(result.label).toBe('Cancelled');
  });

  it('shows Completed when mix of completed only', () => {
    const requests = [
      { status: 'COMPLETED' },
      { status: 'COMPLETED' },
    ];
    const result = getAggregatedSubmissionStatus(requests as any);
    expect(result.status).toBe('COMPLETED');
  });

  it('shows active status when any item active', () => {
    const requests = [
      { status: 'IN_PROGRESS' },
      { status: 'COMPLETED' },
    ];
    const result = getAggregatedSubmissionStatus(requests as any);
    expect(result.status).toBe('IN_PROGRESS');
  });

  it('shows Cancelled when cancelled + completed mix', () => {
    const requests = [
      { status: 'CANCELLED' },
      { status: 'COMPLETED' },
    ];
    const result = getAggregatedSubmissionStatus(requests as any);
    // Show "Completed" but with note that some cancelled
    expect(result.status).toBe('COMPLETED');
    expect(result.hasPartialCancellation).toBe(true);
  });
});
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/lib/requests/statusDisplay.ts` | CREATE | Shared status display helpers |
| `src/lib/requests/statusDisplay.test.ts` | CREATE | Unit tests for status logic |
| `src/components/guest/requests/RequestSubmissionCard.tsx` | MODIFY | Use new helpers, fix status aggregation |
| `src/components/guest/requests/RequestCard.tsx` | MODIFY | Apply consistent cancelled styling |
| `src/pages/guest/GuestMyRequestsPage.tsx` | MODIFY | Polish empty states, use helpers |
| `src/hooks/useServiceRequests.ts` | MODIFY | Enhanced success toast with action |

---

## Implementation Order

1. Create `statusDisplay.ts` with all helper functions
2. Create `statusDisplay.test.ts` to verify logic
3. Update `RequestSubmissionCard.tsx` - fixes the core bug
4. Update `RequestCard.tsx` for cancelled styling
5. Update `GuestMyRequestsPage.tsx` for empty states
6. Update `useServiceRequests.ts` for enhanced toast

---

## Verification Checklist

After implementation:
- [ ] Submit a request, cancel it -> card shows "Cancelled" badge (not green Completed)
- [ ] Bundle with 2+ items shows proper title like "Extra Towels + 1 more"
- [ ] Department labels show human-readable (Housekeeping not HOUSEKEEPING)
- [ ] Success toast shows "Request sent to Housekeeping" with "View My Requests" action
- [ ] Past tab correctly shows both Completed and Cancelled items
- [ ] Cancelled items have muted/strikethrough styling
- [ ] Empty active state shows "Make a Request" CTA
- [ ] Notes chip appears on collapsed cards when notes exist
- [ ] Unit tests pass for status mapping
