

# Guest Request Rate Limiting & System Performance Protection Plan

## Problem Statement
The Guest Portal allows guests to submit service requests, book activities, and make reservations without sufficient throttling. A malicious actor or a simple rapid-clicking user could overwhelm the system, causing slowdowns for all users.

## Audit Results: Performance Risks Identified

### 1. **Unprotected Creation RPCs** (HIGH PRIORITY)
These guest-initiated write operations lack rate limiting:

| RPC | Current Limit | Risk |
|-----|--------------|------|
| `guest_create_service_request` | None | Guests can spam unlimited requests |
| `create_service_request_bundle` | None | Multi-item bundles with no throttle |
| `guest_create_activity_booking` | None | Could reserve all session capacity |
| `guest_create_restaurant_reservation` | None | Could block dining slots |
| `guest_submit_feedback` | Check for duplicate only | No submission frequency limit |

### 2. **Client-Side Gaps** (MEDIUM PRIORITY)
- No visible cooldown timer after submitting requests
- Double-click prevention exists but no user feedback
- Multi-select allows unlimited item selection

### 3. **Query Performance Concerns** (LOW PRIORITY)
- `useServiceRequests` hook performs a secondary query for items (N+1 pattern)
- Realtime subscriptions work well but trigger refetches on every change

---

## Implementation Plan

### Phase 1: Server-Side Rate Limiting (Database Migration)

Add `check_rate_limit` calls to all unprotected guest RPCs:

```text
Proposed Limits:
┌────────────────────────────────────┬──────────────┬────────────────┐
│ RPC Function                       │ Max Attempts │ Window (mins)  │
├────────────────────────────────────┼──────────────┼────────────────┤
│ guest_create_service_request       │ 20           │ 60             │
│ create_service_request_bundle      │ 10           │ 60             │
│ guest_create_activity_booking      │ 10           │ 60             │
│ guest_create_restaurant_reservation│ 10           │ 60             │
│ guest_submit_feedback              │ 5            │ 60             │
│ guest_cancel_service_request       │ 10           │ 60             │
└────────────────────────────────────┴──────────────┴────────────────┘
```

**SQL Pattern** (applied to each RPC):
```sql
-- Add at the start of each function body
PERFORM check_rate_limit(
  'guest_create_service_request',
  p_guest_id::TEXT,
  20,  -- max attempts
  60   -- window in minutes
);
```

### Phase 2: Client-Side Cooldown UI

Create a reusable `useSubmitCooldown` hook:

```typescript
// src/hooks/useSubmitCooldown.ts
interface CooldownState {
  isOnCooldown: boolean;
  remainingSeconds: number;
  startCooldown: (durationSec?: number) => void;
}
```

**Features:**
- 30-second default cooldown after successful submission
- Visible countdown timer on submit button
- Persists to localStorage to survive page refresh
- Scoped per action type (e.g., `request_submit`, `booking_create`)

**UI Integration:**
- Submit button shows countdown: "Submit (27s)"
- Button disabled during cooldown with subtle animation
- Toast message explains cooldown on first trigger

### Phase 3: Multi-Select Guardrails

Add client-side limits to the multi-select flow:

| Limit | Value | Rationale |
|-------|-------|-----------|
| Max items per bundle | 10 | Prevents overwhelming staff queue |
| Max total quantity | 20 | Limits total items across selections |
| Max bundles per hour | 5 | Matches server-side limit |

**UI Feedback:**
- Show remaining selection slots: "8/10 items selected"
- Disable "Add" when limit reached
- Toast explaining limit: "Maximum 10 items per request"

### Phase 4: Performance Optimizations

#### 4.1 Fix N+1 Query Pattern
Update `guest_get_service_requests` RPC to include items in a single query using lateral joins or JSON aggregation:

```sql
-- Return items embedded in the response
SELECT 
  sr.*,
  COALESCE(
    json_agg(json_build_object(
      'id', sri.id,
      'title', sri.title,
      'quantity', sri.quantity
    )) FILTER (WHERE sri.id IS NOT NULL),
    '[]'
  ) AS items
FROM service_requests sr
LEFT JOIN service_request_items sri ON sri.request_id = sr.id
WHERE sr.guest_id = p_guest_id
GROUP BY sr.id
```

#### 4.2 Realtime Debouncing
Add debounce to realtime invalidation handlers to prevent rapid refetch storms:

```typescript
// In useGuestRequestsSync
const debouncedInvalidate = useDebouncedCallback(
  () => queryClient.invalidateQueries({ queryKey }),
  500 // 500ms debounce
);
```

---

## Files to Create/Modify

### New Files
1. `src/hooks/useSubmitCooldown.ts` - Reusable cooldown timer hook
2. `supabase/migrations/TIMESTAMP_add_guest_rate_limits.sql` - Rate limit updates

### Modified Files
1. `src/hooks/useServiceRequests.ts` - Add cooldown integration
2. `src/components/guest/requests/RequestCreateSheet.tsx` - Display cooldown on button
3. `src/components/guest/requests/RequestBundleSheet.tsx` - Display cooldown + item limits
4. `src/pages/guest/GuestRequestsPage.tsx` - Add selection limits
5. `src/components/guest/requests/MultiSelectItemGrid.tsx` - Enforce max items
6. `src/hooks/useGuestRequestsSync.ts` - Add debounced invalidation

### Database Updates (Migration)
- Update `guest_create_service_request` with rate limit
- Update `create_service_request_bundle` with rate limit
- Update `guest_create_activity_booking` with rate limit
- Update `guest_create_restaurant_reservation` with rate limit
- Update `guest_cancel_service_request` with rate limit
- Update `guest_submit_feedback` with rate limit

---

## Success Criteria

1. **Guests cannot submit more than 20 requests per hour** (enforced server-side)
2. **UI shows a 30-second cooldown** after each submission
3. **Multi-select limited to 10 items per bundle**
4. **No breaking changes** to existing flows
5. **Graceful error handling** when rate limit is hit (friendly message, not a crash)

---

## Technical Notes

- The existing `check_rate_limit` helper already exists and is battle-tested on login/cancellation flows
- All limits are configurable per-function and can be adjusted later
- Cooldown state uses localStorage to persist across page refreshes
- Server-side is the source of truth; client-side is UX enhancement only

