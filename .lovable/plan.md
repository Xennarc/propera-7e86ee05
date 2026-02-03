

# Fix: Driver RPC Function Parameter Mismatches

## Problem
When drivers attempt to go online, they encounter the error:
> "Could not find the function public.driver_set_status_atomic(_new_status) in the schema cache"

This is caused by parameter name mismatches between the frontend code and the database function definitions.

## Root Cause Analysis

Supabase RPC calls are matched by **function name AND parameter names**. When the frontend passes `_new_status` but the database expects `p_new_status`, PostgreSQL cannot find a matching function signature.

| Function | Database Parameter | Frontend Parameter | Result |
|----------|-------------------|-------------------|--------|
| `driver_set_status_atomic` | `p_new_status` | `_new_status` | FAILS |
| `driver_update_trip_stop_status` | `_stop_id` | `_trip_stop_id` | FAILS |

---

## Solution

Update `useDriverSession.ts` to use the correct parameter names that match the database function signatures.

### Changes Required

**File: `src/hooks/transport/useDriverSession.ts`**

#### 1. Fix `useDriverStatusMutation` (Line 76-79)

Change from:
```typescript
const { data, error } = await (supabase.rpc as Function)(
  'driver_set_status_atomic',
  { _new_status: newStatus }
);
```

Change to:
```typescript
const { data, error } = await (supabase.rpc as Function)(
  'driver_set_status_atomic',
  { p_new_status: newStatus }
);
```

#### 2. Fix `useUpdateStopStatusMutation` (Line 246-251)

Change from:
```typescript
const { data, error } = await (supabase.rpc as Function)(
  'driver_update_trip_stop_status',
  { 
    _trip_stop_id: stopId,
    _new_status: newStatus,
  }
);
```

Change to:
```typescript
const { data, error } = await (supabase.rpc as Function)(
  'driver_update_trip_stop_status',
  { 
    _stop_id: stopId,
    _new_status: newStatus,
  }
);
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/transport/useDriverSession.ts` | Fix RPC parameter names for 2 mutations |

---

## Technical Note

These are simple string replacements:
- `_new_status` → `p_new_status` for `driver_set_status_atomic`
- `_trip_stop_id` → `_stop_id` for `driver_update_trip_stop_status`

No database migration needed - the functions exist correctly, only the frontend call parameters need to match.

---

## Testing After Fix

1. Log in as a registered driver
2. Navigate to Driver Portal (`/driver`)
3. Click "Go Online" button
4. Should see success toast: "You are now Online"
5. Status indicator should change to green/online
6. Test going offline as well

