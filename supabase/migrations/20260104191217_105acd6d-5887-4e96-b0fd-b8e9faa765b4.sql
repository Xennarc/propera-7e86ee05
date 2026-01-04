-- ============================================================================
-- BOOKING SYSTEM HARDENING: Constraints and Duplicate Prevention
-- ============================================================================

-- 1. Add unique constraint to prevent same guest booking same session twice
-- while status is PENDING or CONFIRMED
CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_bookings_guest_session_active
ON activity_bookings (guest_id, session_id)
WHERE status IN ('PENDING', 'CONFIRMED');

-- 2. Add unique constraint to prevent same guest booking same slot twice
-- while status is PENDING or CONFIRMED  
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_reservations_guest_slot_active
ON restaurant_reservations (guest_id, restaurant_slot_id)
WHERE status IN ('PENDING', 'CONFIRMED');

-- 3. Add unique constraint to prevent duplicate attendees in same booking
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_attendees_activity_member
ON booking_attendees (activity_booking_id, member_id)
WHERE activity_booking_id IS NOT NULL AND member_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_attendees_activity_guest
ON booking_attendees (activity_booking_id, guest_id)
WHERE activity_booking_id IS NOT NULL AND guest_id IS NOT NULL AND member_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_attendees_restaurant_member
ON booking_attendees (restaurant_reservation_id, member_id)
WHERE restaurant_reservation_id IS NOT NULL AND member_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_attendees_restaurant_guest
ON booking_attendees (restaurant_reservation_id, guest_id)
WHERE restaurant_reservation_id IS NOT NULL AND guest_id IS NOT NULL AND member_id IS NULL;

-- 4. Add version column for optimistic concurrency on frequently-edited tables
ALTER TABLE activity_bookings 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE restaurant_reservations 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE activity_sessions 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE restaurant_time_slots 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- 5. Create trigger to auto-increment version on updates
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.version := COALESCE(OLD.version, 0) + 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Apply version increment triggers
DROP TRIGGER IF EXISTS trg_activity_bookings_version ON activity_bookings;
CREATE TRIGGER trg_activity_bookings_version
BEFORE UPDATE ON activity_bookings
FOR EACH ROW
EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trg_restaurant_reservations_version ON restaurant_reservations;
CREATE TRIGGER trg_restaurant_reservations_version
BEFORE UPDATE ON restaurant_reservations
FOR EACH ROW
EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trg_activity_sessions_version ON activity_sessions;
CREATE TRIGGER trg_activity_sessions_version
BEFORE UPDATE ON activity_sessions
FOR EACH ROW
EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trg_restaurant_time_slots_version ON restaurant_time_slots;
CREATE TRIGGER trg_restaurant_time_slots_version
BEFORE UPDATE ON restaurant_time_slots
FOR EACH ROW
EXECUTE FUNCTION increment_version();

-- 6. Create idempotent booking function for activities (prevents double-submit)
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
    v_status::booking_status, v_price, v_total_pax * v_price,
    p_created_by_user_id
  )
  RETURNING id INTO v_booking_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'status', v_status,
    'requires_approval', v_session.requires_approval
  );
  
EXCEPTION
  WHEN unique_violation THEN
    -- Race condition: another request created the booking
    SELECT id INTO v_existing_id
    FROM activity_bookings
    WHERE guest_id = p_guest_id
      AND session_id = p_session_id
      AND status IN ('PENDING', 'CONFIRMED')
    LIMIT 1;
    
    RETURN jsonb_build_object(
      'success', true,
      'booking_id', v_existing_id,
      'already_exists', true
    );
END;
$$;

-- 7. Create idempotent booking function for restaurants
CREATE OR REPLACE FUNCTION create_restaurant_reservation_idempotent(
  p_resort_id UUID,
  p_slot_id UUID,
  p_guest_id UUID,
  p_room_number TEXT,
  p_num_adults INTEGER,
  p_num_children INTEGER,
  p_special_requests TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'STAFF_FRONT_DESK',
  p_created_by_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_reservation_id UUID;
  v_slot RECORD;
  v_remaining INTEGER;
  v_total_pax INTEGER;
  v_status TEXT;
BEGIN
  v_total_pax := p_num_adults + p_num_children;
  
  -- Check for existing active reservation (prevents duplicates)
  SELECT id INTO v_existing_id
  FROM restaurant_reservations
  WHERE guest_id = p_guest_id
    AND restaurant_slot_id = p_slot_id
    AND status IN ('PENDING', 'CONFIRMED')
  LIMIT 1;
  
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'reservation_id', v_existing_id,
      'already_exists', true
    );
  END IF;
  
  -- Get slot and restaurant details
  SELECT s.*, r.requires_approval, r.max_pax_per_booking
  INTO v_slot
  FROM restaurant_time_slots s
  JOIN restaurants r ON r.id = s.restaurant_id
  WHERE s.id = p_slot_id AND s.resort_id = p_resort_id;
  
  IF v_slot IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slot not found');
  END IF;
  
  IF v_slot.status != 'OPEN' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slot is not available');
  END IF;
  
  -- Check max pax per booking
  IF v_slot.max_pax_per_booking IS NOT NULL AND v_total_pax > v_slot.max_pax_per_booking THEN
    RETURN jsonb_build_object('success', false, 'error', 'Party size exceeds maximum allowed');
  END IF;
  
  -- Calculate remaining capacity
  SELECT v_slot.capacity - COALESCE(SUM(num_adults + num_children), 0)
  INTO v_remaining
  FROM restaurant_reservations
  WHERE restaurant_slot_id = p_slot_id
    AND status IN ('CONFIRMED', 'COMPLETED');
  
  IF v_total_pax > v_remaining THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough covers available');
  END IF;
  
  -- Determine status
  v_status := CASE WHEN v_slot.requires_approval THEN 'PENDING' ELSE 'CONFIRMED' END;
  
  -- Insert reservation
  INSERT INTO restaurant_reservations (
    resort_id, restaurant_slot_id, guest_id, room_number,
    num_adults, num_children, special_requests, source,
    status, created_by_user_id
  ) VALUES (
    p_resort_id, p_slot_id, p_guest_id, p_room_number,
    p_num_adults, p_num_children, p_special_requests, p_source::booking_source,
    v_status::booking_status, p_created_by_user_id
  )
  RETURNING id INTO v_reservation_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'status', v_status,
    'requires_approval', v_slot.requires_approval
  );
  
EXCEPTION
  WHEN unique_violation THEN
    -- Race condition: another request created the reservation
    SELECT id INTO v_existing_id
    FROM restaurant_reservations
    WHERE guest_id = p_guest_id
      AND restaurant_slot_id = p_slot_id
      AND status IN ('PENDING', 'CONFIRMED')
    LIMIT 1;
    
    RETURN jsonb_build_object(
      'success', true,
      'reservation_id', v_existing_id,
      'already_exists', true
    );
END;
$$;

-- 8. Create cancel booking function with status validation
CREATE OR REPLACE FUNCTION cancel_activity_booking_safe(
  p_booking_id UUID,
  p_cancelled_by_user_id UUID DEFAULT NULL,
  p_expected_version INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_updated_count INTEGER;
BEGIN
  -- Get current booking state
  SELECT * INTO v_booking
  FROM activity_bookings
  WHERE id = p_booking_id;
  
  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;
  
  -- Validate current status allows cancellation
  IF v_booking.status NOT IN ('PENDING', 'CONFIRMED') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking cannot be cancelled in current status');
  END IF;
  
  -- Optimistic concurrency check
  IF p_expected_version IS NOT NULL AND v_booking.version != p_expected_version THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking was modified by another user');
  END IF;
  
  -- Update to cancelled
  UPDATE activity_bookings
  SET status = 'CANCELLED'
  WHERE id = p_booking_id
    AND status IN ('PENDING', 'CONFIRMED')
  RETURNING 1 INTO v_updated_count;
  
  IF v_updated_count IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to cancel - status may have changed');
  END IF;
  
  RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id);
END;
$$;

CREATE OR REPLACE FUNCTION cancel_restaurant_reservation_safe(
  p_reservation_id UUID,
  p_cancelled_by_user_id UUID DEFAULT NULL,
  p_expected_version INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation RECORD;
  v_updated_count INTEGER;
BEGIN
  -- Get current reservation state
  SELECT * INTO v_reservation
  FROM restaurant_reservations
  WHERE id = p_reservation_id;
  
  IF v_reservation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found');
  END IF;
  
  -- Validate current status allows cancellation
  IF v_reservation.status NOT IN ('PENDING', 'CONFIRMED') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation cannot be cancelled in current status');
  END IF;
  
  -- Optimistic concurrency check
  IF p_expected_version IS NOT NULL AND v_reservation.version != p_expected_version THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation was modified by another user');
  END IF;
  
  -- Update to cancelled
  UPDATE restaurant_reservations
  SET status = 'CANCELLED'
  WHERE id = p_reservation_id
    AND status IN ('PENDING', 'CONFIRMED')
  RETURNING 1 INTO v_updated_count;
  
  IF v_updated_count IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to cancel - status may have changed');
  END IF;
  
  RETURN jsonb_build_object('success', true, 'reservation_id', p_reservation_id);
END;
$$;

-- 9. Add index for faster duplicate checks
CREATE INDEX IF NOT EXISTS idx_activity_bookings_session_status 
ON activity_bookings (session_id, status);

CREATE INDEX IF NOT EXISTS idx_restaurant_reservations_slot_status 
ON restaurant_reservations (restaurant_slot_id, status);

-- 10. Grant execute permissions
GRANT EXECUTE ON FUNCTION create_activity_booking_idempotent TO authenticated;
GRANT EXECUTE ON FUNCTION create_restaurant_reservation_idempotent TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_activity_booking_safe TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_restaurant_reservation_safe TO authenticated;