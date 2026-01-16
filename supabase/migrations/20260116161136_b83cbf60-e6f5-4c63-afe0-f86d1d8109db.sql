-- Create a comprehensive guest bookings RPC for "My Bookings" page
-- This replaces direct table SELECTs that fail for guest sessions without JWT claims

CREATE OR REPLACE FUNCTION public.guest_get_room_bookings(p_guest_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest RECORD;
  v_room_guest_ids UUID[];
  v_activity_bookings jsonb;
  v_restaurant_reservations jsonb;
BEGIN
  -- Rate limit check
  PERFORM check_rate_limit('guest_get_room_bookings', 100, 3600);

  -- Get guest info and validate
  SELECT id, resort_id, room_number, check_in_date, check_out_date
  INTO v_guest
  FROM guests
  WHERE id = p_guest_id;

  IF v_guest IS NULL THEN
    RETURN jsonb_build_object('error', 'Guest not found');
  END IF;

  -- Get all guest IDs in the same room (for shared-room visibility)
  SELECT array_agg(id) INTO v_room_guest_ids
  FROM guests
  WHERE resort_id = v_guest.resort_id
    AND room_number = v_guest.room_number
    AND check_in_date <= v_guest.check_out_date
    AND check_out_date >= v_guest.check_in_date;

  -- Get activity bookings with all needed fields
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
      'created_by_user_id', ab.created_by_user_id,
      'session', jsonb_build_object(
        'id', s.id,
        'date', s.date,
        'start_time', s.start_time,
        'end_time', s.end_time,
        'activity', jsonb_build_object(
          'id', a.id,
          'name', a.name,
          'category', a.category,
          'duration_minutes', a.duration_minutes,
          'image_url', a.image_url,
          'guest_can_cancel', a.guest_can_cancel,
          'guest_cancel_cutoff_hours', a.guest_cancel_cutoff_hours
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

  -- Get restaurant reservations with all needed fields
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', rr.id,
      'guest_id', rr.guest_id,
      'slot_id', rr.slot_id,
      'status', rr.status,
      'party_size', rr.party_size,
      'special_requests', rr.special_requests,
      'created_at', rr.created_at,
      'room_number', rr.room_number,
      'created_by_user_id', rr.created_by_user_id,
      'slot', jsonb_build_object(
        'id', ts.id,
        'date', ts.date,
        'start_time', ts.start_time,
        'end_time', ts.end_time,
        'meal_period', ts.meal_period,
        'restaurant', jsonb_build_object(
          'id', r.id,
          'name', r.name,
          'cuisine_type', r.cuisine_type,
          'image_url', r.image_url,
          'guest_can_cancel', r.guest_can_cancel,
          'guest_cancel_cutoff_hours', r.guest_cancel_cutoff_hours
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
  JOIN restaurant_time_slots ts ON ts.id = rr.slot_id
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

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.guest_get_room_bookings(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.guest_get_room_bookings(UUID) TO authenticated;