-- Add guest portal columns to guests table
ALTER TABLE public.guests
ADD COLUMN portal_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN portal_pin_hash text,
ADD COLUMN last_login_at timestamp with time zone;

-- Create index for guest portal lookup
CREATE INDEX idx_guests_portal_lookup ON public.guests (resort_id, room_number, portal_enabled) WHERE portal_enabled = true;

-- Create a function for guest portal login that returns guest data if credentials match
-- This runs with security definer to bypass RLS for the login check
CREATE OR REPLACE FUNCTION public.guest_portal_login(
  p_resort_id uuid,
  p_room_number text,
  p_last_name text,
  p_pin_hash text
)
RETURNS TABLE (
  guest_id uuid,
  full_name text,
  room_number text,
  check_in_date date,
  check_out_date date,
  resort_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id as guest_id,
    g.full_name,
    g.room_number,
    g.check_in_date,
    g.check_out_date,
    g.resort_id
  FROM public.guests g
  WHERE g.resort_id = p_resort_id
    AND LOWER(g.room_number) = LOWER(p_room_number)
    AND g.portal_enabled = true
    AND g.portal_pin_hash = p_pin_hash
    AND LOWER(g.full_name) LIKE '%' || LOWER(p_last_name) || '%'
    AND g.check_in_date <= CURRENT_DATE
    AND g.check_out_date >= CURRENT_DATE;
  
  -- Update last_login_at if found
  UPDATE public.guests g
  SET last_login_at = now()
  WHERE g.resort_id = p_resort_id
    AND LOWER(g.room_number) = LOWER(p_room_number)
    AND g.portal_enabled = true
    AND g.portal_pin_hash = p_pin_hash
    AND LOWER(g.full_name) LIKE '%' || LOWER(p_last_name) || '%';
END;
$$;

-- Grant execute permission to anon role for guest login
GRANT EXECUTE ON FUNCTION public.guest_portal_login TO anon;

-- Create RLS policy for guest portal to read their own data
-- Activities that guests can book
CREATE POLICY "Guests can view bookable activities"
ON public.activities
FOR SELECT
TO anon
USING (guest_can_book = true AND is_active = true);

-- Sessions that are scheduled and bookable
CREATE POLICY "Guests can view scheduled sessions"
ON public.activity_sessions
FOR SELECT
TO anon
USING (status = 'SCHEDULED');

-- Restaurants that guests can book
CREATE POLICY "Guests can view bookable restaurants"
ON public.restaurants
FOR SELECT
TO anon
USING (guest_can_book = true AND is_active = true);

-- Restaurant slots that are open
CREATE POLICY "Guests can view open slots"
ON public.restaurant_time_slots
FOR SELECT
TO anon
USING (status = 'OPEN');

-- Create function for guest to create activity booking (with all validations)
CREATE OR REPLACE FUNCTION public.guest_create_activity_booking(
  p_guest_id uuid,
  p_session_id uuid,
  p_num_adults integer,
  p_num_children integer,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest guests%ROWTYPE;
  v_session activity_sessions%ROWTYPE;
  v_activity activities%ROWTYPE;
  v_confirmed_pax integer;
  v_total_pax integer;
  v_booking_id uuid;
  v_booking_status booking_status;
  v_session_datetime timestamp with time zone;
  v_cutoff_datetime timestamp with time zone;
  v_has_overlap boolean;
BEGIN
  -- Get guest record
  SELECT * INTO v_guest FROM guests WHERE id = p_guest_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guest not found');
  END IF;
  
  -- Check guest is within stay dates
  IF CURRENT_DATE < v_guest.check_in_date OR CURRENT_DATE > v_guest.check_out_date THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking is only available during your stay');
  END IF;
  
  -- Get session record
  SELECT * INTO v_session FROM activity_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found');
  END IF;
  
  -- Check session is in same resort
  IF v_session.resort_id != v_guest.resort_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not available');
  END IF;
  
  -- Check session status
  IF v_session.status != 'SCHEDULED' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session is no longer available');
  END IF;
  
  -- Check session date is within guest stay
  IF v_session.date < v_guest.check_in_date OR v_session.date > v_guest.check_out_date THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session date is outside your stay period');
  END IF;
  
  -- Get activity record
  SELECT * INTO v_activity FROM activities WHERE id = v_session.activity_id;
  IF NOT FOUND OR NOT v_activity.guest_can_book THEN
    RETURN jsonb_build_object('success', false, 'error', 'This activity is not available for guest booking');
  END IF;
  
  -- Check cutoff time
  v_session_datetime := (v_session.date || ' ' || v_session.start_time)::timestamp with time zone;
  v_cutoff_datetime := v_session_datetime - (v_activity.guest_cutoff_hours || ' hours')::interval;
  IF now() > v_cutoff_datetime THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking cutoff time has passed. Please contact front desk.');
  END IF;
  
  -- Check max pax per booking
  v_total_pax := p_num_adults + p_num_children;
  IF v_total_pax > v_activity.max_pax_per_booking THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum ' || v_activity.max_pax_per_booking || ' guests per booking');
  END IF;
  
  IF v_total_pax < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'At least 1 guest is required');
  END IF;
  
  -- Check capacity
  SELECT COALESCE(SUM(num_adults + num_children), 0) INTO v_confirmed_pax
  FROM activity_bookings
  WHERE session_id = p_session_id AND status IN ('CONFIRMED', 'COMPLETED');
  
  IF v_confirmed_pax + v_total_pax > v_session.capacity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough spots available. Only ' || (v_session.capacity - v_confirmed_pax) || ' spots left.');
  END IF;
  
  -- Check for overlapping bookings
  SELECT EXISTS (
    SELECT 1 FROM activity_bookings ab
    JOIN activity_sessions s ON ab.session_id = s.id
    WHERE ab.guest_id = p_guest_id
    AND ab.status = 'CONFIRMED'
    AND s.date = v_session.date
    AND (
      (s.start_time, s.end_time) OVERLAPS (v_session.start_time, v_session.end_time)
    )
  ) INTO v_has_overlap;
  
  IF v_has_overlap THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have a booking at this time');
  END IF;
  
  -- Determine status based on requires_approval
  IF v_activity.requires_approval THEN
    v_booking_status := 'PENDING';
  ELSE
    v_booking_status := 'CONFIRMED';
  END IF;
  
  -- Create booking
  INSERT INTO activity_bookings (
    guest_id,
    session_id,
    resort_id,
    room_number,
    num_adults,
    num_children,
    price_per_person,
    total_amount,
    notes,
    status,
    source
  ) VALUES (
    p_guest_id,
    p_session_id,
    v_guest.resort_id,
    v_guest.room_number,
    p_num_adults,
    p_num_children,
    v_activity.default_price_per_person,
    v_total_pax * v_activity.default_price_per_person,
    p_notes,
    v_booking_status,
    'GUEST_PORTAL'
  ) RETURNING id INTO v_booking_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'booking_id', v_booking_id,
    'status', v_booking_status,
    'requires_approval', v_activity.requires_approval
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.guest_create_activity_booking TO anon;

-- Create function for guest to create restaurant reservation
CREATE OR REPLACE FUNCTION public.guest_create_restaurant_reservation(
  p_guest_id uuid,
  p_slot_id uuid,
  p_num_adults integer,
  p_num_children integer,
  p_special_requests text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest guests%ROWTYPE;
  v_slot restaurant_time_slots%ROWTYPE;
  v_restaurant restaurants%ROWTYPE;
  v_confirmed_covers integer;
  v_total_pax integer;
  v_reservation_id uuid;
  v_reservation_status booking_status;
  v_slot_datetime timestamp with time zone;
  v_cutoff_datetime timestamp with time zone;
BEGIN
  -- Get guest record
  SELECT * INTO v_guest FROM guests WHERE id = p_guest_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guest not found');
  END IF;
  
  -- Check guest is within stay dates
  IF CURRENT_DATE < v_guest.check_in_date OR CURRENT_DATE > v_guest.check_out_date THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservations are only available during your stay');
  END IF;
  
  -- Get slot record
  SELECT * INTO v_slot FROM restaurant_time_slots WHERE id = p_slot_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Time slot not found');
  END IF;
  
  -- Check slot is in same resort
  IF v_slot.resort_id != v_guest.resort_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Time slot not available');
  END IF;
  
  -- Check slot status
  IF v_slot.status != 'OPEN' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Time slot is no longer available');
  END IF;
  
  -- Check slot date is within guest stay
  IF v_slot.date < v_guest.check_in_date OR v_slot.date > v_guest.check_out_date THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slot date is outside your stay period');
  END IF;
  
  -- Get restaurant record
  SELECT * INTO v_restaurant FROM restaurants WHERE id = v_slot.restaurant_id;
  IF NOT FOUND OR NOT v_restaurant.guest_can_book THEN
    RETURN jsonb_build_object('success', false, 'error', 'This restaurant is not available for guest booking');
  END IF;
  
  -- Check cutoff time
  v_slot_datetime := (v_slot.date || ' ' || v_slot.start_time)::timestamp with time zone;
  v_cutoff_datetime := v_slot_datetime - (v_restaurant.guest_cutoff_minutes || ' minutes')::interval;
  IF now() > v_cutoff_datetime THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking cutoff time has passed. Please contact front desk.');
  END IF;
  
  -- Check max pax per booking
  v_total_pax := p_num_adults + p_num_children;
  IF v_total_pax > v_restaurant.max_pax_per_booking THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum ' || v_restaurant.max_pax_per_booking || ' guests per reservation');
  END IF;
  
  IF v_total_pax < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'At least 1 guest is required');
  END IF;
  
  -- Check capacity
  SELECT COALESCE(SUM(num_adults + num_children), 0) INTO v_confirmed_covers
  FROM restaurant_reservations
  WHERE restaurant_slot_id = p_slot_id AND status IN ('CONFIRMED', 'COMPLETED');
  
  IF v_confirmed_covers + v_total_pax > v_slot.capacity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough covers available. Only ' || (v_slot.capacity - v_confirmed_covers) || ' spots left.');
  END IF;
  
  -- Determine status based on requires_approval
  IF v_restaurant.requires_approval THEN
    v_reservation_status := 'PENDING';
  ELSE
    v_reservation_status := 'CONFIRMED';
  END IF;
  
  -- Create reservation
  INSERT INTO restaurant_reservations (
    guest_id,
    restaurant_slot_id,
    resort_id,
    room_number,
    num_adults,
    num_children,
    special_requests,
    status,
    source
  ) VALUES (
    p_guest_id,
    p_slot_id,
    v_guest.resort_id,
    v_guest.room_number,
    p_num_adults,
    p_num_children,
    p_special_requests,
    v_reservation_status,
    'GUEST_PORTAL'
  ) RETURNING id INTO v_reservation_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'reservation_id', v_reservation_id,
    'status', v_reservation_status,
    'requires_approval', v_restaurant.requires_approval
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.guest_create_restaurant_reservation TO anon;

-- Function to cancel guest booking
CREATE OR REPLACE FUNCTION public.guest_cancel_activity_booking(
  p_guest_id uuid,
  p_booking_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking activity_bookings%ROWTYPE;
  v_session activity_sessions%ROWTYPE;
  v_activity activities%ROWTYPE;
  v_session_datetime timestamp with time zone;
  v_cancel_cutoff timestamp with time zone;
BEGIN
  -- Get booking
  SELECT * INTO v_booking FROM activity_bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;
  
  -- Check ownership
  IF v_booking.guest_id != p_guest_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;
  
  -- Check status
  IF v_booking.status != 'CONFIRMED' AND v_booking.status != 'PENDING' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This booking cannot be cancelled');
  END IF;
  
  -- Get session and activity
  SELECT * INTO v_session FROM activity_sessions WHERE id = v_booking.session_id;
  SELECT * INTO v_activity FROM activities WHERE id = v_session.activity_id;
  
  -- Check if activity allows guest cancellation
  IF NOT v_activity.guest_can_cancel THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please contact front desk to cancel this booking');
  END IF;
  
  -- Check cancellation cutoff
  v_session_datetime := (v_session.date || ' ' || v_session.start_time)::timestamp with time zone;
  v_cancel_cutoff := v_session_datetime - (v_activity.guest_cancel_cutoff_hours || ' hours')::interval;
  IF now() > v_cancel_cutoff THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cancellation deadline has passed. Please contact front desk.');
  END IF;
  
  -- Cancel booking
  UPDATE activity_bookings SET status = 'CANCELLED', updated_at = now() WHERE id = p_booking_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.guest_cancel_activity_booking TO anon;

-- Function to cancel guest restaurant reservation
CREATE OR REPLACE FUNCTION public.guest_cancel_restaurant_reservation(
  p_guest_id uuid,
  p_reservation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation restaurant_reservations%ROWTYPE;
  v_slot restaurant_time_slots%ROWTYPE;
  v_restaurant restaurants%ROWTYPE;
  v_slot_datetime timestamp with time zone;
  v_cancel_cutoff timestamp with time zone;
BEGIN
  -- Get reservation
  SELECT * INTO v_reservation FROM restaurant_reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found');
  END IF;
  
  -- Check ownership
  IF v_reservation.guest_id != p_guest_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found');
  END IF;
  
  -- Check status
  IF v_reservation.status != 'CONFIRMED' AND v_reservation.status != 'PENDING' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This reservation cannot be cancelled');
  END IF;
  
  -- Get slot and restaurant
  SELECT * INTO v_slot FROM restaurant_time_slots WHERE id = v_reservation.restaurant_slot_id;
  SELECT * INTO v_restaurant FROM restaurants WHERE id = v_slot.restaurant_id;
  
  -- Check if restaurant allows guest cancellation
  IF NOT v_restaurant.guest_can_cancel THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please contact front desk to cancel this reservation');
  END IF;
  
  -- Check cancellation cutoff
  v_slot_datetime := (v_slot.date || ' ' || v_slot.start_time)::timestamp with time zone;
  v_cancel_cutoff := v_slot_datetime - (v_restaurant.guest_cancel_cutoff_minutes || ' minutes')::interval;
  IF now() > v_cancel_cutoff THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cancellation deadline has passed. Please contact front desk.');
  END IF;
  
  -- Cancel reservation
  UPDATE restaurant_reservations SET status = 'CANCELLED', updated_at = now() WHERE id = p_reservation_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.guest_cancel_restaurant_reservation TO anon;

-- Function to get guest bookings
CREATE OR REPLACE FUNCTION public.guest_get_bookings(p_guest_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity_bookings jsonb;
  v_restaurant_reservations jsonb;
BEGIN
  -- Get activity bookings
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_activity_bookings
  FROM (
    SELECT 
      ab.id,
      ab.status,
      ab.num_adults,
      ab.num_children,
      ab.notes,
      ab.created_at,
      s.date,
      s.start_time,
      s.end_time,
      a.name as activity_name,
      a.description as activity_description,
      a.guest_can_cancel,
      a.guest_cancel_cutoff_hours
    FROM activity_bookings ab
    JOIN activity_sessions s ON ab.session_id = s.id
    JOIN activities a ON s.activity_id = a.id
    WHERE ab.guest_id = p_guest_id
    ORDER BY s.date DESC, s.start_time DESC
  ) t;
  
  -- Get restaurant reservations
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_restaurant_reservations
  FROM (
    SELECT 
      rr.id,
      rr.status,
      rr.num_adults,
      rr.num_children,
      rr.special_requests,
      rr.created_at,
      ts.date,
      ts.start_time,
      ts.end_time,
      ts.meal_period,
      r.name as restaurant_name,
      r.guest_can_cancel,
      r.guest_cancel_cutoff_minutes
    FROM restaurant_reservations rr
    JOIN restaurant_time_slots ts ON rr.restaurant_slot_id = ts.id
    JOIN restaurants r ON ts.restaurant_id = r.id
    WHERE rr.guest_id = p_guest_id
    ORDER BY ts.date DESC, ts.start_time DESC
  ) t;
  
  RETURN jsonb_build_object(
    'activity_bookings', v_activity_bookings,
    'restaurant_reservations', v_restaurant_reservations
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.guest_get_bookings TO anon;

-- Function to get available activity sessions for guest
CREATE OR REPLACE FUNCTION public.guest_get_available_sessions(
  p_guest_id uuid,
  p_date date DEFAULT NULL,
  p_category activity_category DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest guests%ROWTYPE;
  v_result jsonb;
BEGIN
  SELECT * INTO v_guest FROM guests WHERE id = p_guest_id;
  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;
  
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT 
      s.id,
      s.date,
      s.start_time,
      s.end_time,
      s.capacity,
      a.id as activity_id,
      a.name as activity_name,
      a.description,
      a.category,
      a.duration_minutes,
      a.default_price_per_person as price_per_person,
      a.max_pax_per_booking,
      a.requires_approval,
      a.guest_cutoff_hours,
      s.capacity - COALESCE((
        SELECT SUM(ab.num_adults + ab.num_children)
        FROM activity_bookings ab
        WHERE ab.session_id = s.id AND ab.status IN ('CONFIRMED', 'COMPLETED')
      ), 0) as remaining_spots
    FROM activity_sessions s
    JOIN activities a ON s.activity_id = a.id
    WHERE s.resort_id = v_guest.resort_id
      AND s.status = 'SCHEDULED'
      AND a.guest_can_book = true
      AND a.is_active = true
      AND s.date >= v_guest.check_in_date
      AND s.date <= v_guest.check_out_date
      AND (p_date IS NULL OR s.date = p_date)
      AND (p_category IS NULL OR a.category = p_category)
      AND now() < ((s.date || ' ' || s.start_time)::timestamp with time zone - (a.guest_cutoff_hours || ' hours')::interval)
    ORDER BY s.date, s.start_time
  ) t
  WHERE t.remaining_spots > 0;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.guest_get_available_sessions TO anon;

-- Function to get available restaurant slots for guest
CREATE OR REPLACE FUNCTION public.guest_get_available_slots(
  p_guest_id uuid,
  p_restaurant_id uuid DEFAULT NULL,
  p_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest guests%ROWTYPE;
  v_result jsonb;
BEGIN
  SELECT * INTO v_guest FROM guests WHERE id = p_guest_id;
  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;
  
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT 
      ts.id,
      ts.date,
      ts.start_time,
      ts.end_time,
      ts.meal_period,
      ts.capacity,
      r.id as restaurant_id,
      r.name as restaurant_name,
      r.description,
      r.max_pax_per_booking,
      r.requires_approval,
      r.guest_cutoff_minutes,
      ts.capacity - COALESCE((
        SELECT SUM(rr.num_adults + rr.num_children)
        FROM restaurant_reservations rr
        WHERE rr.restaurant_slot_id = ts.id AND rr.status IN ('CONFIRMED', 'COMPLETED')
      ), 0) as remaining_covers
    FROM restaurant_time_slots ts
    JOIN restaurants r ON ts.restaurant_id = r.id
    WHERE ts.resort_id = v_guest.resort_id
      AND ts.status = 'OPEN'
      AND r.guest_can_book = true
      AND r.is_active = true
      AND ts.date >= v_guest.check_in_date
      AND ts.date <= v_guest.check_out_date
      AND (p_restaurant_id IS NULL OR r.id = p_restaurant_id)
      AND (p_date IS NULL OR ts.date = p_date)
      AND now() < ((ts.date || ' ' || ts.start_time)::timestamp with time zone - (r.guest_cutoff_minutes || ' minutes')::interval)
    ORDER BY ts.date, ts.start_time
  ) t
  WHERE t.remaining_covers > 0;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.guest_get_available_slots TO anon;

-- Get restaurants list for guest
CREATE OR REPLACE FUNCTION public.guest_get_restaurants(p_resort_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(t))
    FROM (
      SELECT id, name, description
      FROM restaurants
      WHERE resort_id = p_resort_id
        AND guest_can_book = true
        AND is_active = true
      ORDER BY name
    ) t
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.guest_get_restaurants TO anon;