

# Fix Plan: Remove Invalid `room_number` Column Reference

## Problem Summary

The `create_service_request_bundle` RPC function is failing with:
```
column "room_number" of relation "service_requests" does not exist
```

## Root Cause

The migration added to fix the table name issue (`20260204153458`) incorrectly attempts to insert `room_number` (a TEXT value from the `guests` table) into a column that doesn't exist in `service_requests`.

| Table | Column | Type | Exists? |
|-------|--------|------|---------|
| `guests` | `room_number` | TEXT | Yes |
| `service_requests` | `room_number` | - | **No** |
| `service_requests` | `room_id` | UUID | Yes |

The RPC is selecting `room_number` from `guests` and trying to insert it into `service_requests.room_number`, but that column doesn't exist.

---

## Solution

Fix the RPC by removing the `room_number` column from the INSERT statement. The `room_id` column exists but requires a UUID reference to a rooms table - since we don't have a direct room lookup available, we should simply omit this field (it's nullable).

### Database Migration

Create a new migration to fix the RPC:

```sql
-- Fix: Remove room_number from INSERT (column doesn't exist)
-- The service_requests table has room_id (UUID FK) not room_number (TEXT)

CREATE OR REPLACE FUNCTION public.create_service_request_bundle(...)
...
      INSERT INTO public.service_requests (
        resort_id,
        guest_id,
        -- room_number,  -- REMOVED: column doesn't exist
        department_key,
        catalog_id,
        title,
        is_asap,
        requested_for_at,
        notes,           -- Use 'notes' not 'guest_notes'
        status,
        quantity,        -- ADD: required column with default
        priority,        -- ADD: required column with default
        submission_id
      ) VALUES (
        p_resort_id,
        p_guest_id,
        -- v_room_number, -- REMOVED
        v_dept_key,
        v_catalog_id,
        v_catalog_item.title,
        v_is_asap,
        v_requested_for_at,
        v_guest_notes,   -- Map to notes column
        'NEW',
        v_quantity,      -- Use item quantity
        COALESCE(v_catalog_item.default_priority, 'NORMAL'),
        v_submission_id
      )
...
```

Key changes:
1. Remove `room_number` from INSERT columns and values
2. Change `guest_notes` column to `notes` (correct column name)
3. Add `quantity` column (required, NOT NULL)
4. Add `priority` column (required, NOT NULL - use catalog item's default or 'NORMAL')

---

## Files to Modify

| File | Changes |
|------|---------|
| New migration | Fix `create_service_request_bundle` RPC |

---

## Verification

After the fix, test:
1. Guest Portal → `/guest/requests` → Select an item → Submit
2. Verify success toast appears
3. Check "My Requests" → Active should show the new request
4. Check Staff Dashboard → "New" lane should show the request

