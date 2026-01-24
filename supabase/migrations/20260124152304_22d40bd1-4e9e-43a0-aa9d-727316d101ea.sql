-- ============================================================================
-- ENABLE PRE-ARRIVAL ACTIVITY BOOKINGS
-- ============================================================================
-- This migration:
-- 1. Adds stay_id column to activity_bookings table
-- 2. Creates indexes for efficient querying
-- 3. Updates guest_create_activity_booking RPC to allow pre-arrival guests to book

-- 1. Add stay_id column to activity_bookings (nullable for backwards compatibility)
ALTER TABLE public.activity_bookings 
ADD COLUMN IF NOT EXISTS stay_id UUID REFERENCES public.guest_stays(id) ON DELETE SET NULL;

-- 2. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_activity_bookings_stay_id 
ON public.activity_bookings(stay_id);

CREATE INDEX IF NOT EXISTS idx_activity_bookings_resort_guest_source 
ON public.activity_bookings(resort_id, guest_id, booking_source);

-- 3. Update guest_create_activity_booking RPC to support pre-arrival guests
CREATE OR REPLACE FUNCTION public.guest_create_activity_booking(
  p_guest_id uuid,
  p_session_id uuid,
  p_num_adults integer,
  p_num_children integer,
  p_notes text DEFAULT NULL,
  p_stay_id uuid DEFAULT NULL  -- NEW: Optional stay context
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
  v_stay guest_stays%ROWTYPE;
  v_is_prearrival boolean := false;
  v_booking_source booking_source_context := 'NORMAL';
  v_confirmed_pax integer;
  v_total_pax integer;
  v_booking_id uuid;
  v_booking_status booking_status;
  v_session_datetime timestamp with time zone;
  v_cutoff_datetime timestamp with time zone;
  v_has_overlap boolean;
  v_resort_tz text;
  v_resolved_stay_id uuid := p_stay_id;
BEGIN
  -- Get guest record
  SELECT * INTO v_guest FROM guests WHERE id = p_guest_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guest not found');
  END IF;
  
  -- Determine if this is a pre-arrival booking
  IF p_stay_id IS NOT NULL THEN
    SELECT * INTO v_stay FROM guest_stays WHERE id = p_stay_id;
    IF FOUND AND v_stay.status = 'pre_arrival' THEN
      v_is_prearrival := true;
      v_booking_source := 'PRE_STAY';
    END IF;
  ELSIF CURRENT_DATE < v_guest.check_in_date THEN
    -- Auto-detect pre-arrival status from guest dates
    v_is_prearrival := true;
    v_booking_source := 'PRE_STAY';
    
    -- Try to find matching stay
    SELECT id INTO v_resolved_stay_id
    FROM guest_stays
    WHERE guest_id = p_guest_id AND resort_id = v_guest.resort_id
    ORDER BY CASE status WHEN 'pre_arrival' THEN 1 ELSE 2 END, arrival_date
    LIMIT 1;
  END IF;
  
  -- Check guest is within stay dates (MODIFIED: allow pre-arrival)
  IF NOT v_is_prearrival AND 
     (CURRENT_DATE < v_guest.check_in_date OR CURRENT_DATE > v_guest.check_out_date) THEN
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
  
  -- Check session date is within guest stay (applies to BOTH pre-arrival and in-house)
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
  
  -- Check if session has already started (applies to ALL bookings)
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
  
  -- Create booking with stay context and booking_source
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
    source,
    booking_source,
    stay_id
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
    'GUEST_PORTAL',
    v_booking_source,
    v_resolved_stay_id
  ) RETURNING id INTO v_booking_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'booking_id', v_booking_id,
    'status', v_booking_status::text,
    'requires_approval', v_activity.requires_approval,
    'is_prearrival', v_is_prearrival
  );
END;
$$;