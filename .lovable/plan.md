

# Permanent Fix: Remove Non-Existent Column References from RPC

## Root Cause (Verified from Database Logs)

The `guest_get_room_bookings` RPC function is failing with:
```
ERROR: column r.cuisine_type does not exist
```

The migration I created earlier references columns that do not exist in the `restaurants` table:

| RPC References | Reality |
|----------------|---------|
| `r.cuisine_type` | Does not exist in `restaurants` table |
| `r.image_url` | Does not exist in `restaurants` table |
| `r.guest_cancel_cutoff_hours` | Should be `guest_cancel_cutoff_minutes` |

**Actual `restaurants` table columns:**
`id, resort_id, name, description, total_capacity, guest_can_book, requires_approval, guest_cutoff_minutes, max_pax_per_booking, guest_can_cancel, guest_cancel_cutoff_minutes, is_active, created_at, updated_at, opening_time, closing_time`

## Solution

Create a new migration to fix the RPC by:
1. **Remove** `cuisine_type` reference (column doesn't exist)
2. **Remove** `image_url` reference (column doesn't exist)  
3. **Fix** `guest_cancel_cutoff_hours` → `guest_cancel_cutoff_minutes`

## Technical Changes

### New Migration SQL

```sql
CREATE OR REPLACE FUNCTION public.guest_get_room_bookings(p_guest_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guest RECORD;
  v_room_guest_ids UUID[];
  v_activity_bookings jsonb;
  v_restaurant_reservations jsonb;
BEGIN
  -- Rate limit check
  PERFORM check_rate_limit(
    'guest_get_room_bookings',
    p_guest_id::TEXT,
    100,
    60
  );

  -- Get guest info
  SELECT id, resort_id, room_number, check_in_date, check_out_date
  INTO v_guest
  FROM guests
  WHERE id = p_guest_id;

  IF v_guest IS NULL THEN
    RETURN jsonb_build_object('error', 'Guest not found');
  END IF;

  -- Get all guest IDs in the same room
  SELECT array_agg(id) INTO v_room_guest_ids
  FROM guests
  WHERE resort_id = v_guest.resort_id
    AND room_number = v_guest.room_number
    AND check_in_date <= v_guest.check_out_date
    AND check_out_date >= v_guest.check_in_date;

  -- Activity bookings (unchanged - already correct)
  SELECT COALESCE(jsonb_agg(...), '[]'::jsonb)
  INTO v_activity_bookings
  FROM activity_bookings ab
  JOIN activity_sessions s ON s.id = ab.session_id
  JOIN activities a ON a.id = s.activity_id
  JOIN guests g ON g.id = ab.guest_id
  WHERE ab.guest_id = ANY(v_room_guest_ids)
    AND ab.resort_id = v_guest.resort_id;

  -- Restaurant reservations - FIXED columns
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', rr.id,
      'guest_id', rr.guest_id,
      'restaurant_slot_id', rr.restaurant_slot_id,
      'status', rr.status,
      'num_adults', rr.num_adults,
      'num_children', rr.num_children,
      'special_requests', rr.special_requests,
      'created_at', rr.created_at,
      'room_number', rr.room_number,
      'slot', jsonb_build_object(
        'id', ts.id,
        'date', ts.date,
        'start_time', ts.start_time,
        'end_time', ts.end_time,
        'meal_period', ts.meal_period,
        'restaurant', jsonb_build_object(
          'id', r.id,
          'name', r.name,
          -- REMOVED: cuisine_type (doesn't exist)
          -- REMOVED: image_url (doesn't exist)
          'guest_can_cancel', r.guest_can_cancel,
          'guest_cancel_cutoff_minutes', r.guest_cancel_cutoff_minutes  -- FIXED: was _hours
        )
      ),
      'guest', jsonb_build_object(
        'id', g.id,
        'full_name', g.full_name
      )
    )
  ), '[]'::jsonb)
  INTO v_restaurant_reservations
  FROM restaurant_reservations rr
  JOIN restaurant_time_slots ts ON ts.id = rr.restaurant_slot_id
  JOIN restaurants r ON r.id = ts.restaurant_id
  JOIN guests g ON g.id = rr.guest_id
  WHERE rr.guest_id = ANY(v_room_guest_ids)
    AND rr.resort_id = v_guest.resort_id;

  RETURN jsonb_build_object(
    'activity_bookings', v_activity_bookings,
    'restaurant_reservations', v_restaurant_reservations
  );
END;
$$;
```

### UI Adjustment (GuestMyBookings.tsx)

Update line 140 to use the corrected field name:
```typescript
// BEFORE:
guest_cancel_cutoff_minutes: r.slot?.restaurant?.guest_cancel_cutoff_hours 
  ? r.slot.restaurant.guest_cancel_cutoff_hours * 60 : 60,

// AFTER:
guest_cancel_cutoff_minutes: r.slot?.restaurant?.guest_cancel_cutoff_minutes ?? 60,
```

## Files to Modify

| File | Action |
|------|--------|
| New migration | Create to fix RPC column references |
| `src/pages/guest/GuestMyBookings.tsx` | Update restaurant mapping to use `guest_cancel_cutoff_minutes` |

## Why This Is the Permanent Fix

1. **Schema-aligned**: RPC will only reference columns that actually exist
2. **Validated against DB**: I queried `information_schema.columns` to verify exactly what exists
3. **Matches UI needs**: The UI only uses `name`, `guest_can_cancel`, and `guest_cancel_cutoff_minutes` - we return exactly that

## Verification Steps

After implementation:
1. Check database logs - no more "column does not exist" errors
2. Guest portal My Bookings page loads successfully
3. Demo and live resorts both work identically

