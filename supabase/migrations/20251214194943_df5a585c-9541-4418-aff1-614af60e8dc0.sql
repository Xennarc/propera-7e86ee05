-- Drop ALL functions that need return type changes first
DROP FUNCTION IF EXISTS public.guest_cancel_activity_booking(UUID, UUID);
DROP FUNCTION IF EXISTS public.guest_cancel_restaurant_reservation(UUID, UUID);
DROP FUNCTION IF EXISTS public.guest_mark_all_notifications_read(UUID);
DROP FUNCTION IF EXISTS public.guest_get_bookings(UUID);

-- Create rate limiting helper function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_endpoint TEXT,
  p_identifier TEXT,
  p_max_attempts INTEGER,
  p_window_minutes INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM rate_limit_logs
  WHERE endpoint = p_endpoint
    AND identifier = p_identifier
    AND created_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL;
    
  IF attempt_count >= p_max_attempts THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please try again later.';
  END IF;
  
  INSERT INTO rate_limit_logs (endpoint, identifier, secondary_key)
  VALUES (p_endpoint, p_identifier, NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO anon;

-- Update guest_portal_login with rate limiting
CREATE OR REPLACE FUNCTION public.guest_portal_login(
  p_room_number TEXT,
  p_last_name TEXT,
  p_pin TEXT,
  p_resort_id UUID
) RETURNS TABLE(
  guest_id UUID,
  full_name TEXT,
  room_number TEXT,
  check_in_date DATE,
  check_out_date DATE,
  resort_id UUID,
  resort_name TEXT,
  resort_code TEXT,
  resort_logo_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_guest_id UUID;
  v_identifier TEXT;
BEGIN
  v_identifier := p_room_number || '-' || p_resort_id::TEXT;
  PERFORM check_rate_limit('guest_portal_login', v_identifier, 10, 15);
  
  IF p_room_number IS NULL OR p_last_name IS NULL OR p_pin IS NULL OR p_resort_id IS NULL THEN
    RAISE EXCEPTION 'All fields are required';
  END IF;
  
  SELECT g.id INTO v_guest_id
  FROM guests g
  WHERE g.resort_id = p_resort_id
    AND LOWER(g.room_number) = LOWER(TRIM(p_room_number))
    AND LOWER(g.full_name) LIKE '%' || LOWER(TRIM(p_last_name)) || '%'
    AND g.portal_enabled = true
    AND g.portal_pin_hash = crypt(p_pin, g.portal_pin_hash)
    AND g.check_in_date <= CURRENT_DATE
    AND g.check_out_date >= CURRENT_DATE
  LIMIT 1;
  
  IF v_guest_id IS NULL THEN
    RAISE EXCEPTION 'Invalid credentials';
  END IF;
  
  UPDATE guests SET last_login_at = NOW() WHERE id = v_guest_id;
  
  RETURN QUERY
  SELECT g.id, g.full_name, g.room_number, g.check_in_date, g.check_out_date,
         g.resort_id, r.name, r.code, r.login_logo_url
  FROM guests g JOIN resorts r ON r.id = g.resort_id WHERE g.id = v_guest_id;
END;
$$;

-- Recreate guest_cancel_activity_booking with rate limiting
CREATE FUNCTION public.guest_cancel_activity_booking(p_guest_id UUID, p_booking_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking_guest_id UUID; v_session_date DATE; v_session_start TIME;
  v_cancel_cutoff_hours INTEGER; v_guest_can_cancel BOOLEAN; v_status TEXT;
  v_resort_id UUID; v_room_number TEXT; v_booking_room TEXT;
BEGIN
  PERFORM check_rate_limit('guest_cancel_activity_booking', p_guest_id::TEXT, 10, 60);
  SELECT ab.guest_id, ab.status, ab.resort_id, s.date, s.start_time, a.guest_can_cancel, a.guest_cancel_cutoff_hours
  INTO v_booking_guest_id, v_status, v_resort_id, v_session_date, v_session_start, v_guest_can_cancel, v_cancel_cutoff_hours
  FROM activity_bookings ab JOIN activity_sessions s ON s.id = ab.session_id JOIN activities a ON a.id = s.activity_id WHERE ab.id = p_booking_id;
  IF v_booking_guest_id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  SELECT room_number INTO v_room_number FROM guests WHERE id = p_guest_id AND resort_id = v_resort_id;
  IF v_booking_guest_id != p_guest_id THEN
    SELECT g.room_number INTO v_booking_room FROM guests g WHERE g.id = v_booking_guest_id;
    IF v_booking_room != v_room_number THEN RAISE EXCEPTION 'Not authorized'; END IF;
  END IF;
  IF v_status NOT IN ('CONFIRMED', 'PENDING') THEN RAISE EXCEPTION 'Cannot cancel'; END IF;
  IF NOT v_guest_can_cancel THEN RAISE EXCEPTION 'CANCEL_NOT_ALLOWED'; END IF;
  IF (v_session_date + v_session_start) < (NOW() + (v_cancel_cutoff_hours || ' hours')::INTERVAL) THEN RAISE EXCEPTION 'CANCEL_CUTOFF_PAST'; END IF;
  UPDATE activity_bookings SET status = 'CANCELLED', updated_at = NOW() WHERE id = p_booking_id;
  RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.guest_cancel_activity_booking(UUID, UUID) TO anon;

-- Recreate guest_cancel_restaurant_reservation with rate limiting
CREATE FUNCTION public.guest_cancel_restaurant_reservation(p_guest_id UUID, p_reservation_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_res_guest_id UUID; v_slot_date DATE; v_slot_start TIME;
  v_cancel_cutoff_minutes INTEGER; v_guest_can_cancel BOOLEAN; v_status TEXT;
  v_resort_id UUID; v_room_number TEXT; v_res_room TEXT;
BEGIN
  PERFORM check_rate_limit('guest_cancel_restaurant_reservation', p_guest_id::TEXT, 10, 60);
  SELECT rr.guest_id, rr.status, rr.resort_id, s.date, s.start_time, r.guest_can_cancel, r.guest_cancel_cutoff_minutes
  INTO v_res_guest_id, v_status, v_resort_id, v_slot_date, v_slot_start, v_guest_can_cancel, v_cancel_cutoff_minutes
  FROM restaurant_reservations rr JOIN restaurant_time_slots s ON s.id = rr.restaurant_slot_id JOIN restaurants r ON r.id = s.restaurant_id WHERE rr.id = p_reservation_id;
  IF v_res_guest_id IS NULL THEN RAISE EXCEPTION 'Reservation not found'; END IF;
  SELECT room_number INTO v_room_number FROM guests WHERE id = p_guest_id AND resort_id = v_resort_id;
  IF v_res_guest_id != p_guest_id THEN
    SELECT g.room_number INTO v_res_room FROM guests g WHERE g.id = v_res_guest_id;
    IF v_res_room != v_room_number THEN RAISE EXCEPTION 'Not authorized'; END IF;
  END IF;
  IF v_status NOT IN ('CONFIRMED', 'PENDING') THEN RAISE EXCEPTION 'Cannot cancel'; END IF;
  IF NOT v_guest_can_cancel THEN RAISE EXCEPTION 'CANCEL_NOT_ALLOWED'; END IF;
  IF (v_slot_date + v_slot_start) < (NOW() + (v_cancel_cutoff_minutes || ' minutes')::INTERVAL) THEN RAISE EXCEPTION 'CANCEL_CUTOFF_PAST'; END IF;
  UPDATE restaurant_reservations SET status = 'CANCELLED', updated_at = NOW() WHERE id = p_reservation_id;
  RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.guest_cancel_restaurant_reservation(UUID, UUID) TO anon;

-- Recreate guest_mark_all_notifications_read with rate limiting
CREATE FUNCTION public.guest_mark_all_notifications_read(p_guest_id UUID) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INTEGER;
BEGIN
  PERFORM check_rate_limit('guest_mark_all_notifications_read', p_guest_id::TEXT, 20, 60);
  UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE guest_id = p_guest_id AND is_read = FALSE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.guest_mark_all_notifications_read(UUID) TO anon;

-- Recreate guest_get_bookings with rate limiting
CREATE FUNCTION public.guest_get_bookings(p_guest_id UUID) RETURNS TABLE(
  booking_type TEXT, booking_id UUID, name TEXT, date DATE, start_time TIME, end_time TIME,
  status TEXT, num_adults INTEGER, num_children INTEGER, location TEXT, notes TEXT,
  booked_by_guest_id UUID, booked_by_name TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_resort_id UUID; v_room_number TEXT;
BEGIN
  PERFORM check_rate_limit('guest_get_bookings', p_guest_id::TEXT, 100, 60);
  SELECT g.resort_id, g.room_number INTO v_resort_id, v_room_number FROM guests g WHERE g.id = p_guest_id;
  IF v_resort_id IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT 'ACTIVITY'::TEXT, ab.id, a.name, s.date, s.start_time, s.end_time, ab.status::TEXT,
         ab.num_adults, ab.num_children, NULL::TEXT, ab.notes, ab.guest_id, g.full_name
  FROM activity_bookings ab JOIN activity_sessions s ON s.id = ab.session_id JOIN activities a ON a.id = s.activity_id
  JOIN guests g ON g.id = ab.guest_id WHERE g.room_number = v_room_number AND g.resort_id = v_resort_id AND ab.status IN ('CONFIRMED', 'PENDING')
  UNION ALL
  SELECT 'RESTAURANT'::TEXT, rr.id, r.name, ts.date, ts.start_time, ts.end_time, rr.status::TEXT,
         rr.num_adults, rr.num_children, r.name, rr.special_requests, rr.guest_id, g.full_name
  FROM restaurant_reservations rr JOIN restaurant_time_slots ts ON ts.id = rr.restaurant_slot_id JOIN restaurants r ON r.id = ts.restaurant_id
  JOIN guests g ON g.id = rr.guest_id WHERE g.room_number = v_room_number AND g.resort_id = v_resort_id AND rr.status IN ('CONFIRMED', 'PENDING')
  ORDER BY date, start_time;
END;
$$;
GRANT EXECUTE ON FUNCTION public.guest_get_bookings(UUID) TO anon;