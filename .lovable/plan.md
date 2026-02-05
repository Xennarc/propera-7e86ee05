

# Fix: Invalid Enum Value 'pending' in Trip Creation Validation

## Problem

When creating a trip, the error occurs:
```
invalid input value for enum buggy_request_status: "pending"
Code: 22P02
```

**Root Cause**: The `rpc_transport_create_trip_from_requests` function (just updated in the last migration) validates requests using:
```sql
AND br.status IN ('requested', 'pending')  -- 'pending' is INVALID
```

The `buggy_request_status` enum does not contain `'pending'`. The valid values are:
- `requested`
- `queued` ← This is what should be used instead of 'pending'
- `assigned_to_trip`
- `driver_en_route`
- `arrived`
- `picked_up`
- `completed`
- `cancelled`
- `failed`
- `no_show`

---

## Solution

Update the validation check to use `'queued'` instead of `'pending'`:

```sql
AND br.status IN ('requested', 'queued')  -- FIXED: 'queued' instead of 'pending'
```

---

## Database Migration

```sql
-- Fix: Replace 'pending' with valid enum value 'queued'
CREATE OR REPLACE FUNCTION public.rpc_transport_create_trip_from_requests(...)
  -- In the validation check:
  AND br.status IN ('requested', 'queued')  -- ✅ Both are valid enum values
```

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| New migration | CREATE | Fix status validation from `'pending'` to `'queued'` |

---

## Verification

After migration:
1. Staff Dashboard → Transport → Dispatch Queue
2. Select 1+ pending requests (status = 'requested' or 'queued')
3. Click "Create Trip"
4. Trip should be created successfully

