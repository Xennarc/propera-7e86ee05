

# Fix RPC Column Name: guest_cancel_cutoff_hours vs guest_cancel_cutoff_minutes

## Root Cause Identified

The debug panel clearly shows the error:
```
RPC Error: column a.guest_cancel_cutoff_minutes does not exist
```

### Schema Mismatch

| Table | RPC Uses (Wrong) | Actual Column Name |
|-------|------------------|-------------------|
| `activities` | `a.guest_cancel_cutoff_minutes` | `a.guest_cancel_cutoff_hours` |
| `restaurants` | `r.guest_cancel_cutoff_minutes` | `r.guest_cancel_cutoff_minutes` (correct) |

The two tables use different time units for cancellation cutoffs:
- **Activities**: Uses `hours` (e.g., "cancel 24 hours before")
- **Restaurants**: Uses `minutes` (e.g., "cancel 60 minutes before")

The `guest_get_room_bookings` RPC incorrectly references `guest_cancel_cutoff_minutes` for the activities table.

## Solution

Create a database migration to fix the RPC function by changing the column reference for activities:

```sql
-- BEFORE (incorrect):
'guest_cancel_cutoff_minutes', a.guest_cancel_cutoff_minutes

-- AFTER (correct):
'guest_cancel_cutoff_hours', a.guest_cancel_cutoff_hours
```

## Technical Implementation

### Database Migration

Update the `guest_get_room_bookings` RPC function to use the correct column name for activities:

```sql
CREATE OR REPLACE FUNCTION public.guest_get_room_bookings(p_guest_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
-- ... existing declarations ...
BEGIN
  -- ... existing logic ...

  -- Activity bookings section - FIX the column name:
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      -- ... other fields ...
      'activity', jsonb_build_object(
        'id', a.id,
        'name', a.name,
        'description', a.description,
        'category', a.category,
        'guest_can_cancel', a.guest_can_cancel,
        'guest_cancel_cutoff_hours', a.guest_cancel_cutoff_hours  -- FIXED
      )
    )
  ), '[]'::jsonb)
  INTO v_activity_bookings
  FROM activity_bookings ab
  -- ... rest of query ...

  -- Restaurant reservations section - already correct:
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      -- ... other fields ...
      'restaurant', jsonb_build_object(
        'id', r.id,
        'name', r.name,
        'guest_can_cancel', r.guest_can_cancel,
        'guest_cancel_cutoff_minutes', r.guest_cancel_cutoff_minutes  -- Already correct
      )
    )
  ), '[]'::jsonb)
  INTO v_restaurant_reservations
  -- ... rest of query ...
END;
$$;
```

### Frontend Update (if needed)

Check `GuestMyBookings.tsx` to ensure it handles both field names correctly when calculating cancellation eligibility:

```typescript
// For activities - use hours
const cutoffHours = activity.guest_cancel_cutoff_hours || 24;
const cutoffMs = cutoffHours * 60 * 60 * 1000;

// For restaurants - use minutes  
const cutoffMinutes = restaurant.guest_cancel_cutoff_minutes || 60;
const cutoffMs = cutoffMinutes * 60 * 1000;
```

## Files to Modify

| File | Change |
|------|--------|
| New migration | Fix RPC to use `a.guest_cancel_cutoff_hours` for activities |
| `src/pages/guest/GuestMyBookings.tsx` | Verify cancellation logic uses correct field per booking type |

## Pattern of Issues

This is the fourth column name mismatch discovered in this RPC:

| # | Wrong | Correct | Fixed |
|---|-------|---------|-------|
| 1 | `slot_id` | `restaurant_slot_id` | Yes |
| 2 | `cuisine_type`, `image_url` | (don't exist) | Yes |
| 3 | `ab.special_requests` | `ab.notes` | Yes |
| 4 | `a.guest_cancel_cutoff_minutes` | `a.guest_cancel_cutoff_hours` | **This fix** |

## Expected Result

After this fix:
- RPC executes without column errors
- Debug panel shows actual booking counts (Activities: 11+, Reservations: 6+)
- My Bookings page displays all seeded demo bookings correctly

