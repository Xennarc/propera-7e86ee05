

# Fix RPC Error: Multiple Column Mismatches + Rate Limit Syntax

## Root Cause Analysis

The debug panel shows:
```
RPC Error: argument of NOT must be type boolean, not type void
```

**Database investigation confirms multiple issues in the latest migration:**

### Issue 1: Rate Limit Function Call Syntax (CRITICAL)
The `check_rate_limit` function returns `void`, not `boolean`:

| Migration | Syntax | Status |
|-----------|--------|--------|
| Previous (working) | `PERFORM check_rate_limit(...)` | ✅ Correct |
| Latest (broken) | `IF NOT public.check_rate_limit(...) THEN` | ❌ Breaks - void cannot be used with NOT |

### Issue 2: Additional Column Mismatches

| Table | RPC Uses (Wrong) | Actual Column |
|-------|------------------|---------------|
| `activity_bookings` | `ab.num_guests` | `ab.num_adults` + `ab.num_children` |
| `activity_sessions` | `s.session_date` | `s.date` |
| `restaurant_time_slots` | `rs.slot_date` | `rs.date` |

### What Happened
The latest migration (20260123133837) simplified/rewrote the RPC but introduced:
1. Wrong rate limit syntax
2. Several column name guesses that don't match the actual schema
3. Removed guest joining logic and room-based booking aggregation

---

## Solution

Revert to the correct RPC structure from migration 20260123131709, applying ONLY the necessary fix (changing `guest_cancel_cutoff_minutes` → `guest_cancel_cutoff_hours` for activities).

### Database Migration

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
  -- Rate limit check (PERFORM, not IF NOT)
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

  -- Activity bookings - using correct column names
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ab.id,
      'guest_id', ab.guest_id,
      'session_id', ab.session_id,
      'status', ab.status,
      'num_adults', ab.num_adults,
      'num_children', ab.num_children,
      'notes', ab.notes,
      'created_at', ab.created_at,
      'room_number', ab.room_number,
      'session', jsonb_build_object(
        'id', s.id,
        'date', s.date,              -- Correct: 'date' not 'session_date'
        'start_time', s.start_time,
        'end_time', s.end_time,
        'activity', jsonb_build_object(
          'id', a.id,
          'name', a.name,
          'description', a.description,
          'category', a.category,
          'guest_can_cancel', a.guest_can_cancel,
          'guest_cancel_cutoff_hours', a.guest_cancel_cutoff_hours  -- FIXED: was _minutes
        )
      ),
      'guest', jsonb_build_object(
        'id', g.id,
        'full_name', g.full_name
      )
    )
  ), '[]'::jsonb)
  INTO v_activity_bookings
  FROM activity_bookings ab
  JOIN activity_sessions s ON s.id = ab.session_id
  JOIN activities a ON a.id = s.activity_id
  JOIN guests g ON g.id = ab.guest_id
  WHERE ab.guest_id = ANY(v_room_guest_ids)
    AND ab.resort_id = v_guest.resort_id;

  -- Restaurant reservations
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
        'date', ts.date,              -- Correct: 'date' not 'slot_date'
        'start_time', ts.start_time,
        'end_time', ts.end_time,
        'meal_period', ts.meal_period,
        'restaurant', jsonb_build_object(
          'id', r.id,
          'name', r.name,
          'guest_can_cancel', r.guest_can_cancel,
          'guest_cancel_cutoff_minutes', r.guest_cancel_cutoff_minutes
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

---

## Key Corrections Summary

| Component | Wrong (Broken Migration) | Correct |
|-----------|--------------------------|---------|
| Rate limit | `IF NOT check_rate_limit(...) THEN` | `PERFORM check_rate_limit(...)` |
| Activity cutoff | `guest_cancel_cutoff_minutes` | `guest_cancel_cutoff_hours` |
| Session date | `s.session_date` | `s.date` |
| Slot date | `rs.slot_date` | `rs.date` |
| Booking guests | `ab.num_guests` | `ab.num_adults`, `ab.num_children` |
| Guest scope | Single guest only | All room guests (v_room_guest_ids) |

---

## Files to Modify

| File | Action |
|------|--------|
| New migration | Fix RPC with all correct column names |

No frontend changes needed - the mapping in `GuestMyBookings.tsx` was already updated correctly.

---

## Expected Result After Fix

1. RPC executes without errors
2. Debug panel shows: Activities: 11+, Reservations: 6+
3. My Bookings page displays all seeded demo bookings
4. Room-based booking aggregation works (all guests in Room 101 see shared bookings)

