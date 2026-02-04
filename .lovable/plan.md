
# Fix: Add Missing `resort_id` to Service Request Items

## Problem

The enhanced error reporting revealed the actual issue:
```
null value in column "resort_id" of relation "service_request_items" violates not-null constraint
```

The current RPC inserts into `service_request_items` but omits the required `resort_id` column.

## Root Cause

In the latest migration, the INSERT statement for `service_request_items` is:
```sql
INSERT INTO public.service_request_items (
  request_id,
  catalog_id,
  title,
  quantity
) VALUES (...)
```

But the table requires `resort_id` (NOT NULL, no default).

## Solution

Update the RPC to include `resort_id` in the `service_request_items` INSERT:

```sql
INSERT INTO public.service_request_items (
  resort_id,      -- ADD THIS
  request_id,
  catalog_id,
  title,
  quantity
) VALUES (
  p_resort_id,    -- ADD THIS
  v_request_id,
  v_catalog_id,
  v_catalog_item.title,
  v_quantity
);
```

---

## Technical Details

### Database Migration

Create a new migration to fix `create_service_request_bundle`:

**Changes:**
1. Add `resort_id` to the `INSERT INTO service_request_items` column list
2. Add `p_resort_id` to the corresponding VALUES

The rest of the function (submission insert, service_requests insert, error handling, RLS bypass) remains unchanged.

### Files to Modify

| File | Changes |
|------|---------|
| New migration | Fix `service_request_items` INSERT to include `resort_id` |

---

## Verification

After the fix:
1. Guest Portal → `/guest/requests` → Select an item → Submit
2. Verify success toast appears
3. Check "My Requests" → Active should show the new request
4. Check Staff Dashboard → "New" lane should show the request
