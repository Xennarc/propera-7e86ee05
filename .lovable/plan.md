

# Fix Demo Reset RPC: Wrong Table Names

## Root Cause
The `reset_demo_resort` RPC function references 3 non-existent tables, causing every reset attempt to fail silently:

| RPC references | Actual table name |
|---|---|
| `service_request_messages` | Does not exist (`service_request_events` exists) |
| `service_request_assignments` | Does not exist |
| `guest_notifications` | `notifications` |

Additionally, the FK deletion order needs updating to match the real schema:
- `service_request_items` and `service_request_events` should be deleted before `service_requests`
- `booking_attendees` has FKs to both `activity_bookings` and `restaurant_reservations`

## Fix

### 1. Database Migration: Recreate `reset_demo_resort` function

Replace the broken DELETE block with the correct table names and proper FK-safe ordering:

```text
-- Old (broken):
DELETE FROM service_request_messages WHERE resort_id = p_resort_id;
DELETE FROM service_request_assignments WHERE resort_id = p_resort_id;
DELETE FROM guest_notifications WHERE resort_id = p_resort_id;

-- New (fixed):
DELETE FROM service_request_items WHERE resort_id = p_resort_id;
DELETE FROM service_request_events WHERE resort_id = p_resort_id;
DELETE FROM notifications WHERE resort_id = p_resort_id;
```

Also add error logging to the edge function's RPC call so future issues are visible.

### 2. Edge Function: Log RPC errors

Update `provision-demo/index.ts` at line ~1524 to destructure and log both `data` and `error` from the reset RPC call, so failures are visible in logs.

### 3. Verify end-to-end

After the fix:
- `demo_instance_id` should increment from 1 to 2
- `demo_last_reset_at` should be set
- `demo_reset_runs` should contain a "success" row with summary counts

## Files Changed

| File | Change |
|---|---|
| New SQL migration | Fix `reset_demo_resort` function with correct table names |
| `supabase/functions/provision-demo/index.ts` | Add error logging for reset RPC call |

## What This Does NOT Change
- No schema changes, no new tables
- No changes to `should_reset_demo`
- No frontend changes
- Edge function API contract unchanged

