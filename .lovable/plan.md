
# Fix Plan: Insert Submission Record Before Service Requests

## Problem Summary

The `create_service_request_bundle` RPC is failing with:
```
insert or update on table "service_requests" violates foreign key constraint "service_requests_submission_id_fkey"
```

## Root Cause

| Table | Column | References |
|-------|--------|------------|
| `service_requests` | `submission_id` | → `service_request_submissions.id` |

The RPC generates a UUID for `submission_id` but inserts it directly into `service_requests` without first creating a corresponding row in `service_request_submissions`. This violates the foreign key constraint.

### `service_request_submissions` Table Structure
```
| Column            | Type        | Nullable | Default           |
|-------------------|-------------|----------|-------------------|
| id                | uuid        | NO       | gen_random_uuid() |
| resort_id         | uuid        | NO       |                   |
| guest_id          | uuid        | NO       |                   |
| room_number       | text        | YES      |                   |
| is_asap           | boolean     | NO       | true              |
| requested_for_at  | timestamptz | YES      |                   |
| guest_notes       | text        | YES      |                   |
| created_at        | timestamptz | NO       | now()             |
```

---

## Solution

Fix the RPC to insert into `service_request_submissions` first, then use the returned ID for the `submission_id` foreign key in `service_requests`.

### Database Migration

```sql
CREATE OR REPLACE FUNCTION public.create_service_request_bundle(...)
...
  -- NEW: Insert submission record FIRST
  INSERT INTO public.service_request_submissions (
    id,
    resort_id,
    guest_id,
    is_asap,
    requested_for_at,
    guest_notes
  ) VALUES (
    v_submission_id,  -- Use pre-generated UUID
    p_resort_id,
    p_guest_id,
    v_is_asap,
    v_requested_for_at,
    v_guest_notes
  );

  -- THEN process items and insert service_requests with valid FK
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    ...
    INSERT INTO public.service_requests (
      ...
      submission_id  -- Now references valid row
    ) VALUES (
      ...
      v_submission_id
    );
    ...
  END LOOP;
...
```

---

## Files to Modify

| File | Changes |
|------|---------|
| New migration | Add `INSERT INTO service_request_submissions` before inserting requests |

---

## Verification

After the fix, test:
1. Guest Portal → `/guest/requests` → Select an item → Submit
2. Verify success toast appears
3. Check "My Requests" → Active should show the new request
4. Check Staff Dashboard → "New" lane should show the request
