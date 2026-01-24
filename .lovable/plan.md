
# Plan: Add Real Logic for `hasKidsInParty`

## Summary

Replace the hardcoded `hasKidsInParty: false` in `useGuestDetailContext` with computed logic that checks multiple data sources in priority order, without modifying the UI or existing hooks.

## Current State

```typescript
// useGuestDetailContext.ts lines 221-227
const hasKidsInParty = useMemo(() => {
  const payload = submission?.payload;
  if (!payload) return false;
  // Future: check travel_party_members table
  return false;  // ← Always returns false (hardcoded)
}, [submission]);
```

## Data Sources Analysis

| Source | Field | Availability | Notes |
|--------|-------|--------------|-------|
| `guest_stays` | `children_count` | Not available | Column does not exist in schema |
| `pre_arrival_submissions.payload` | `num_children` | Flexible JSONB | Currently no records have this |
| `activity_bookings` | `num_children` | Available | Integer field, default 0 |
| `restaurant_reservations` | `num_children` | Available | Integer field |
| `travel_party_members` | `member_type = 'child'` | Available | Requires separate query |

## Implementation Approach

Since the constraint is to NOT add new queries or modify existing hooks, the implementation will focus on data already available through `useStaffGuestStay`:

### Priority Order for Detection

1. **Pre-arrival submission payload** - Check `payload.num_children` (future-proof for when guests submit this)
2. **Custom answers** - Check `payload.custom_answers_json` for any children-related fields
3. **Fallback**: `false`

### Technical Details

**File: `src/hooks/useGuestDetailContext.ts`**

Update the `hasKidsInParty` computation (lines 221-227):

```typescript
// Check if party has kids from available data sources
const hasKidsInParty = useMemo(() => {
  // Priority 1: Check pre-arrival submission payload for explicit num_children
  const payload = submission?.payload;
  if (payload) {
    // Check for num_children in payload (future-proof)
    const numChildren = (payload as Record<string, unknown>)?.num_children;
    if (typeof numChildren === 'number' && numChildren > 0) {
      return true;
    }
    
    // Check custom_answers_json for children-related fields
    const customAnswers = payload.custom_answers_json;
    if (customAnswers) {
      // Look for common children-related keys
      const childrenKeys = ['num_children', 'children_count', 'number_of_children', 'kids'];
      for (const key of childrenKeys) {
        const value = customAnswers[key];
        if (typeof value === 'number' && value > 0) {
          return true;
        }
        if (typeof value === 'string' && parseInt(value, 10) > 0) {
          return true;
        }
      }
    }
  }
  
  // Fallback: no children info available
  return false;
}, [submission]);
```

### Update PreArrivalSubmission Interface (Type Extension)

To make this type-safe, extend the payload interface to include `num_children` as an optional field:

**File: `src/hooks/useStaffGuestStay.ts`** (line 34 - add optional field)

```typescript
export interface PreArrivalSubmission {
  id: string;
  payload: {
    arrival_time?: string;
    arrival_flight_number?: string;
    transfer_preference?: string;
    dietary_preferences?: string[];
    allergies?: string;
    water_comfort_level?: string;
    special_occasions?: string[];
    special_requests?: string;
    room_preferences?: Record<string, unknown>;
    custom_answers_json?: Record<string, unknown>;
    num_children?: number;  // ← Add this optional field
  };
  completedAt: string | null;
  updatedAt: string;
}
```

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useGuestDetailContext.ts` | Update `hasKidsInParty` computation (lines 221-227) |
| `src/hooks/useStaffGuestStay.ts` | Add `num_children?: number` to payload interface (line 34) |

## What This Does NOT Change

- No UI components modified
- No existing hook behavior changed
- `OperationalFlags` component unchanged (still receives `hasKidsInParty` prop)
- `GuestDetailPage.tsx` continues to pass `hasKidsInParty={false}` directly (existing behavior preserved)
- No database schema changes required

## Future Enhancements (Out of Scope)

When integrating the new hook with the UI (Phase 2), the `GuestDetailPage` will:
1. Use `useGuestDetailContext()` to get the computed `hasKidsInParty`
2. Pass that value to `OperationalFlags` instead of hardcoded `false`

This requires only changing the prop value from `false` to `context.hasKidsInParty` in a future phase.

## Testing

After implementation:
1. Create a pre-arrival submission with `payload.num_children = 2`
2. Verify `useGuestDetailContext` returns `hasKidsInParty: true`
3. Confirm existing UI behavior unchanged (still shows `hasKidsInParty={false}` until Phase 2 wiring)
