

## Fix: Remove `item_count` Reference from Bundle RPC

### Problem
The `create_service_request_bundle` function references a column `item_count` in the `service_request_submissions` table, but this column doesn't exist in the schema.

**Error:** `column "item_count" of relation "service_request_submissions" does not exist`

### Root Cause
The migration created a function that tries to INSERT into `item_count`, but this column was never part of the original `service_request_submissions` schema:

```sql
-- Current columns in service_request_submissions:
id, resort_id, guest_id, room_number, is_asap, requested_for_at, guest_notes, created_at
-- Missing: item_count ❌
```

### Solution
Two options:
1. **Option A (Preferred):** Remove the `item_count` from the INSERT statement since it's not essential — the item count can be derived from `service_request_items` when needed.
2. **Option B:** Add the `item_count` column to the table.

I recommend **Option A** because:
- It's the minimal fix
- Item count is already derivable from the `service_request_items` table
- No schema changes required

### Changes Required

**Database Migration:** Update the `create_service_request_bundle` function to remove the `item_count` column reference.

```sql
-- Before (broken):
INSERT INTO public.service_request_submissions (
  guest_id, resort_id, is_asap, requested_for_at, guest_notes, item_count
) VALUES (..., jsonb_array_length(v_items));

-- After (fixed):
INSERT INTO public.service_request_submissions (
  guest_id, resort_id, is_asap, requested_for_at, guest_notes
) VALUES (...);
```

### Files Changed

| File | Change |
|------|--------|
| New migration SQL | Fix `create_service_request_bundle` function to not reference `item_count` |

### Verification Steps
1. Log in as a guest
2. Navigate to `/guest/requests`
3. Select one or more items
4. Tap "Send request"
5. Verify request submits successfully (no column error)
6. Verify request appears in Staff Portal

