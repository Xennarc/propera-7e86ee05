-- =============================================================================
-- PHASE 1 & 2 & 3: Past Session Blocking for Guest Portal
-- Creates resort_now() function and updates guest-facing RPCs to filter past sessions
-- Also adds server-side enforcement to prevent booking past sessions
-- =============================================================================

-- 1. Create resort_now() function - returns current time in resort's timezone
CREATE OR REPLACE FUNCTION public.resort_now(p_resort_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_timezone text;
BEGIN
  -- Get resort timezone (defaults to UTC if null)
  SELECT COALESCE(timezone, 'UTC') INTO v_timezone
  FROM resorts WHERE id = p_resort_id;
  
  IF v_timezone IS NULL THEN
    v_timezone := 'UTC';
  END IF;
  
  -- Return current time (now() is always in UTC, we just return it as timestamptz)
  -- The comparison will be done correctly since activity_sessions.date + start_time
  -- should be interpreted in the resort's timezone
  RETURN now();
END;
$$;

-- 2. Create helper to convert session date+time to timestamptz in resort timezone
CREATE OR REPLACE FUNCTION public.session_start_timestamptz(
  p_date date,
  p_start_time time,
  p_resort_id uuid
)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_timezone text;
BEGIN
  SELECT COALESCE(timezone, 'UTC') INTO v_timezone
  FROM resorts WHERE id = p_resort_id;
  
  IF v_timezone IS NULL THEN
    v_timezone := 'UTC';
  END IF;
  
  -- Combine date and time, interpret in resort timezone, return as timestamptz
  RETURN (p_date::text || ' ' || p_start_time::text)::timestamp AT TIME ZONE v_timezone;
END;
$$;

-- 3. Update guest_get_available_sessions to filter out past sessions
CREATE OR REPLACE FUNCTION public.guest_get_available_sessions(
  p_guest_id uuid,
  p_date date,
  p_category text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  activity_id uuid,
  activity_name text,
  description text,
  category text,
  start_time time,
  end_time time,
  duration_minutes integer,
  capacity integer,
  remaining_spots bigint,
  requires_approval boolean,
  difficulty_level text,
  image_url text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resort_id uuid;
  v_resort_tz text;
  v_now_in_tz timestamptz;
BEGIN
  -- Get resort from guest
  SELECT g.resort_id INTO v_resort_id
  FROM guests g
  WHERE g.id = p_guest_id;

  IF v_resort_id IS NULL THEN
    RETURN;
  END IF;

  -- Get resort timezone
  SELECT COALESCE(r.timezone, 'UTC') INTO v_resort_tz
  FROM resorts r WHERE r.id = v_resort_id;
  
  v_now_in_tz := now();

  RETURN QUERY
  SELECT 
    s.id,
    s.activity_id,
    a.name::text AS activity_name,
    a.description::text,
    a.category::text,
    s.start_time,
    s.end_time,
    a.duration_minutes,
    s.capacity,
    (s.capacity - COALESCE(
      (SELECT SUM(ab.num_adults + ab.num_children) 
       FROM activity_bookings ab 
       WHERE ab.session_id = s.id 
       AND ab.status IN ('CONFIRMED', 'PENDING')),
      0
    ))::bigint AS remaining_spots,
    a.requires_approval,
    a.difficulty_level::text,
    a.image_url::text
  FROM activity_sessions s
  JOIN activities a ON a.id = s.activity_id
  WHERE s.resort_id = v_resort_id
    AND s.date = p_date
    AND s.status = 'SCHEDULED'
    AND a.is_active = true
    AND a.guest_can_book = true
    AND (p_category IS NULL OR a.category::text = p_category)
    -- PHASE 2: Filter out sessions that have already started
    AND session_start_timestamptz(s.date, s.start_time, v_resort_id) > v_now_in_tz
    AND (s.capacity - COALESCE(
      (SELECT SUM(ab.num_adults + ab.num_children) 
       FROM activity_bookings ab 
       WHERE ab.session_id = s.id 
       AND ab.status IN ('CONFIRMED', 'PENDING')),
      0
    )) > 0
  ORDER BY s.start_time;
END;
$$;

-- 4. Update guest_create_activity_booking to reject past sessions
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
  v_resort_tz text;
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

  -- Get resort timezone
  SELECT COALESCE(timezone, 'UTC') INTO v_resort_tz
  FROM resorts WHERE id = v_guest.resort_id;
  
  -- PHASE 3: Check if session has already started (using resort timezone)
  v_session_datetime := session_start_timestamptz(v_session.date, v_session.start_time, v_guest.resort_id);
  IF v_session_datetime <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This session has already started and can no longer be booked.');
  END IF;
  
  -- Check cutoff time
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
    v_activity.default_price_per_person * v_total_pax,
    p_notes,
    v_booking_status,
    'GUEST_PORTAL'
  ) RETURNING id INTO v_booking_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'booking_id', v_booking_id,
    'status', v_booking_status::text,
    'requires_approval', v_activity.requires_approval
  );
END;
$$;

-- 5. Also update create_activity_booking_idempotent to include past session check for guest source
CREATE OR REPLACE FUNCTION create_activity_booking_idempotent(
  p_resort_id UUID,
  p_session_id UUID,
  p_guest_id UUID,
  p_room_number TEXT,
  p_num_adults INTEGER,
  p_num_children INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'STAFF_FRONT_DESK',
  p_created_by_user_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_booking_id UUID;
  v_activity RECORD;
  v_session RECORD;
  v_remaining INTEGER;
  v_total_pax INTEGER;
  v_status TEXT;
  v_price NUMERIC;
  v_session_start timestamptz;
BEGIN
  v_total_pax := p_num_adults + p_num_children;
  
  -- Check for existing active booking (prevents duplicates)
  SELECT id INTO v_existing_id
  FROM activity_bookings
  WHERE guest_id = p_guest_id
    AND session_id = p_session_id
    AND status IN ('PENDING', 'CONFIRMED')
  LIMIT 1;
  
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'booking_id', v_existing_id,
      'already_exists', true
    );
  END IF;
  
  -- Get session and activity details
  SELECT s.*, a.default_price_per_person, a.requires_approval, a.max_pax_per_booking
  INTO v_session
  FROM activity_sessions s
  JOIN activities a ON a.id = s.activity_id
  WHERE s.id = p_session_id AND s.resort_id = p_resort_id;
  
  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found');
  END IF;
  
  IF v_session.status != 'SCHEDULED' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session is not available');
  END IF;

  -- PHASE 3: For guest portal bookings, check if session has already started
  IF p_source = 'GUEST_PORTAL' THEN
    v_session_start := session_start_timestamptz(v_session.date, v_session.start_time, p_resort_id);
    IF v_session_start <= now() THEN
      RETURN jsonb_build_object('success', false, 'error', 'This session has already started and can no longer be booked.');
    END IF;
  END IF;
  
  -- Check max pax per booking
  IF v_session.max_pax_per_booking IS NOT NULL AND v_total_pax > v_session.max_pax_per_booking THEN
    RETURN jsonb_build_object('success', false, 'error', 'Party size exceeds maximum allowed');
  END IF;
  
  -- Calculate remaining capacity
  SELECT v_session.capacity - COALESCE(SUM(num_adults + num_children), 0)
  INTO v_remaining
  FROM activity_bookings
  WHERE session_id = p_session_id
    AND status IN ('CONFIRMED', 'COMPLETED');
  
  IF v_total_pax > v_remaining THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough capacity available');
  END IF;
  
  -- Determine status
  v_status := CASE WHEN v_session.requires_approval THEN 'PENDING' ELSE 'CONFIRMED' END;
  v_price := COALESCE(v_session.default_price_per_person, 0);
  
  -- Insert booking
  INSERT INTO activity_bookings (
    resort_id, session_id, guest_id, room_number,
    num_adults, num_children, notes, source,
    status, price_per_person, total_amount,
    created_by_user_id
  ) VALUES (
    p_resort_id, p_session_id, p_guest_id, p_room_number,
    p_num_adults, p_num_children, p_notes, p_source::booking_source,
    v_status::booking_status, v_price, v_price * v_total_pax,
    p_created_by_user_id
  ) RETURNING id INTO v_booking_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'status', v_status,
    'already_exists', false
  );
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION public.resort_now(uuid) IS 'Returns current UTC time for comparing with session times (resort timezone handled by session_start_timestamptz)';
COMMENT ON FUNCTION public.session_start_timestamptz(date, time, uuid) IS 'Converts session date+time to timestamptz using resort timezone for accurate time comparison';