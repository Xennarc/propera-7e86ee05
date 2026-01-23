-- Fix guest_get_room_bookings RPC: use correct column name for activities
-- Activities use 'guest_cancel_cutoff_hours', Restaurants use 'guest_cancel_cutoff_minutes'

CREATE OR REPLACE FUNCTION public.guest_get_room_bookings(p_guest_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guest_record RECORD;
  v_activity_bookings jsonb;
  v_restaurant_reservations jsonb;
BEGIN
  -- Rate limit check
  IF NOT public.check_rate_limit('guest_get_room_bookings', p_guest_id::TEXT, 100, 60) THEN
    RAISE EXCEPTION 'Rate limit exceeded';
  END IF;

  -- Get guest info (resort_id and room_number)
  SELECT g.id, g.resort_id, g.room_number
  INTO v_guest_record
  FROM guests g
  WHERE g.id = p_guest_id;

  IF v_guest_record IS NULL THEN
    RETURN jsonb_build_object(
      'activity_bookings', '[]'::jsonb,
      'restaurant_reservations', '[]'::jsonb
    );
  END IF;

  -- Get activity bookings for this guest
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ab.id,
      'status', ab.status,
      'num_guests', ab.num_guests,
      'notes', ab.notes,
      'created_at', ab.created_at,
      'session', jsonb_build_object(
        'id', s.id,
        'session_date', s.session_date,
        'start_time', s.start_time,
        'end_time', s.end_time,
        'status', s.status
      ),
      'activity', jsonb_build_object(
        'id', a.id,
        'name', a.name,
        'description', a.description,
        'category', a.category,
        'guest_can_cancel', a.guest_can_cancel,
        'guest_cancel_cutoff_hours', a.guest_cancel_cutoff_hours
      )
    )
  ), '[]'::jsonb)
  INTO v_activity_bookings
  FROM activity_bookings ab
  JOIN activity_sessions s ON s.id = ab.session_id
  JOIN activities a ON a.id = s.activity_id
  WHERE ab.guest_id = p_guest_id
    AND a.resort_id = v_guest_record.resort_id;

  -- Get restaurant reservations for this guest
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', rr.id,
      'status', rr.status,
      'num_adults', rr.num_adults,
      'num_children', rr.num_children,
      'special_requests', rr.special_requests,
      'created_at', rr.created_at,
      'slot', jsonb_build_object(
        'id', rs.id,
        'slot_date', rs.slot_date,
        'meal_period', rs.meal_period,
        'start_time', rs.start_time,
        'end_time', rs.end_time,
        'status', rs.status
      ),
      'restaurant', jsonb_build_object(
        'id', r.id,
        'name', r.name,
        'guest_can_cancel', r.guest_can_cancel,
        'guest_cancel_cutoff_minutes', r.guest_cancel_cutoff_minutes
      )
    )
  ), '[]'::jsonb)
  INTO v_restaurant_reservations
  FROM restaurant_reservations rr
  JOIN restaurant_time_slots rs ON rs.id = rr.restaurant_slot_id
  JOIN restaurants r ON r.id = rs.restaurant_id
  WHERE rr.guest_id = p_guest_id
    AND r.resort_id = v_guest_record.resort_id;

  RETURN jsonb_build_object(
    'activity_bookings', v_activity_bookings,
    'restaurant_reservations', v_restaurant_reservations
  );
END;
$$;