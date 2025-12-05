
-- Create enum for guest request status
CREATE TYPE public.guest_request_status AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED');

-- Create enum for guest request source type
CREATE TYPE public.guest_request_source AS ENUM ('ACTIVITY', 'RESTAURANT');

-- Create guest_requests table
CREATE TABLE public.guest_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  source_type public.guest_request_source NOT NULL,
  activity_booking_id UUID REFERENCES public.activity_bookings(id) ON DELETE CASCADE,
  restaurant_reservation_id UUID REFERENCES public.restaurant_reservations(id) ON DELETE CASCADE,
  special_request_text TEXT NOT NULL,
  status public.guest_request_status NOT NULL DEFAULT 'OPEN',
  room_number TEXT,
  reservation_date DATE,
  reservation_time TIME WITHOUT TIME ZONE,
  staff_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_one_source CHECK (
    (activity_booking_id IS NOT NULL AND restaurant_reservation_id IS NULL) OR
    (activity_booking_id IS NULL AND restaurant_reservation_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX idx_guest_requests_resort_id ON public.guest_requests(resort_id);
CREATE INDEX idx_guest_requests_status ON public.guest_requests(status);
CREATE INDEX idx_guest_requests_source_type ON public.guest_requests(source_type);
CREATE INDEX idx_guest_requests_activity_booking_id ON public.guest_requests(activity_booking_id);
CREATE INDEX idx_guest_requests_restaurant_reservation_id ON public.guest_requests(restaurant_reservation_id);

-- Enable RLS
ALTER TABLE public.guest_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view guest requests"
  ON public.guest_requests
  FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert guest requests"
  ON public.guest_requests
  FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'ACTIVITIES'::app_role, 'FNB'::app_role, 'MANAGER'::app_role]));

CREATE POLICY "Staff can update guest requests"
  ON public.guest_requests
  FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'ACTIVITIES'::app_role, 'FNB'::app_role, 'MANAGER'::app_role]));

CREATE POLICY "Staff can delete guest requests"
  ON public.guest_requests
  FOR DELETE
  USING (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'ACTIVITIES'::app_role, 'FNB'::app_role, 'MANAGER'::app_role]));

-- Trigger to update updated_at
CREATE TRIGGER update_guest_requests_updated_at
  BEFORE UPDATE ON public.guest_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle activity booking special requests
CREATE OR REPLACE FUNCTION public.handle_activity_booking_special_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session RECORD;
  v_existing_request_id UUID;
BEGIN
  -- Get session info for date/time
  SELECT date, start_time INTO v_session
  FROM activity_sessions
  WHERE id = NEW.session_id;

  -- Check if a guest request already exists for this booking
  SELECT id INTO v_existing_request_id
  FROM guest_requests
  WHERE activity_booking_id = NEW.id;

  -- Handle based on notes content
  IF NEW.notes IS NOT NULL AND TRIM(NEW.notes) != '' THEN
    -- Non-empty special request
    IF v_existing_request_id IS NOT NULL THEN
      -- Update existing request
      UPDATE guest_requests
      SET special_request_text = TRIM(NEW.notes),
          room_number = NEW.room_number,
          reservation_date = v_session.date,
          reservation_time = v_session.start_time,
          updated_at = now()
      WHERE id = v_existing_request_id;
    ELSE
      -- Create new request
      INSERT INTO guest_requests (
        resort_id, guest_id, source_type, activity_booking_id,
        special_request_text, room_number, reservation_date, reservation_time
      ) VALUES (
        NEW.resort_id, NEW.guest_id, 'ACTIVITY', NEW.id,
        TRIM(NEW.notes), NEW.room_number, v_session.date, v_session.start_time
      );
    END IF;
  ELSE
    -- Empty special request - mark as completed if exists
    IF v_existing_request_id IS NOT NULL THEN
      UPDATE guest_requests
      SET status = 'COMPLETED', updated_at = now()
      WHERE id = v_existing_request_id AND status != 'COMPLETED';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to handle restaurant reservation special requests
CREATE OR REPLACE FUNCTION public.handle_restaurant_reservation_special_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_slot RECORD;
  v_existing_request_id UUID;
BEGIN
  -- Get slot info for date/time
  SELECT date, start_time INTO v_slot
  FROM restaurant_time_slots
  WHERE id = NEW.restaurant_slot_id;

  -- Check if a guest request already exists for this reservation
  SELECT id INTO v_existing_request_id
  FROM guest_requests
  WHERE restaurant_reservation_id = NEW.id;

  -- Handle based on special_requests content
  IF NEW.special_requests IS NOT NULL AND TRIM(NEW.special_requests) != '' THEN
    -- Non-empty special request
    IF v_existing_request_id IS NOT NULL THEN
      -- Update existing request
      UPDATE guest_requests
      SET special_request_text = TRIM(NEW.special_requests),
          room_number = NEW.room_number,
          reservation_date = v_slot.date,
          reservation_time = v_slot.start_time,
          updated_at = now()
      WHERE id = v_existing_request_id;
    ELSE
      -- Create new request
      INSERT INTO guest_requests (
        resort_id, guest_id, source_type, restaurant_reservation_id,
        special_request_text, room_number, reservation_date, reservation_time
      ) VALUES (
        NEW.resort_id, NEW.guest_id, 'RESTAURANT', NEW.id,
        TRIM(NEW.special_requests), NEW.room_number, v_slot.date, v_slot.start_time
      );
    END IF;
  ELSE
    -- Empty special request - mark as completed if exists
    IF v_existing_request_id IS NOT NULL THEN
      UPDATE guest_requests
      SET status = 'COMPLETED', updated_at = now()
      WHERE id = v_existing_request_id AND status != 'COMPLETED';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to handle booking/reservation cancellation
CREATE OR REPLACE FUNCTION public.handle_booking_cancellation_guest_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When a booking is cancelled, mark its guest request as completed
  IF NEW.status = 'CANCELLED' AND OLD.status != 'CANCELLED' THEN
    IF TG_TABLE_NAME = 'activity_bookings' THEN
      UPDATE guest_requests
      SET status = 'COMPLETED', 
          staff_notes = COALESCE(staff_notes, '') || CASE WHEN staff_notes IS NOT NULL THEN E'\n' ELSE '' END || '[Booking cancelled]',
          updated_at = now()
      WHERE activity_booking_id = NEW.id AND status != 'COMPLETED';
    ELSIF TG_TABLE_NAME = 'restaurant_reservations' THEN
      UPDATE guest_requests
      SET status = 'COMPLETED',
          staff_notes = COALESCE(staff_notes, '') || CASE WHEN staff_notes IS NOT NULL THEN E'\n' ELSE '' END || '[Reservation cancelled]',
          updated_at = now()
      WHERE restaurant_reservation_id = NEW.id AND status != 'COMPLETED';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers for activity bookings
CREATE TRIGGER activity_booking_special_request_trigger
  AFTER INSERT OR UPDATE OF notes ON public.activity_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_activity_booking_special_request();

CREATE TRIGGER activity_booking_cancellation_trigger
  AFTER UPDATE OF status ON public.activity_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_cancellation_guest_request();

-- Create triggers for restaurant reservations
CREATE TRIGGER restaurant_reservation_special_request_trigger
  AFTER INSERT OR UPDATE OF special_requests ON public.restaurant_reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_restaurant_reservation_special_request();

CREATE TRIGGER restaurant_reservation_cancellation_trigger
  AFTER UPDATE OF status ON public.restaurant_reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_cancellation_guest_request();

-- Backfill existing special requests from activity bookings
INSERT INTO guest_requests (resort_id, guest_id, source_type, activity_booking_id, special_request_text, room_number, reservation_date, reservation_time)
SELECT 
  ab.resort_id,
  ab.guest_id,
  'ACTIVITY',
  ab.id,
  TRIM(ab.notes),
  ab.room_number,
  s.date,
  s.start_time
FROM activity_bookings ab
JOIN activity_sessions s ON ab.session_id = s.id
WHERE ab.notes IS NOT NULL 
  AND TRIM(ab.notes) != ''
  AND ab.status NOT IN ('CANCELLED');

-- Backfill existing special requests from restaurant reservations
INSERT INTO guest_requests (resort_id, guest_id, source_type, restaurant_reservation_id, special_request_text, room_number, reservation_date, reservation_time)
SELECT 
  rr.resort_id,
  rr.guest_id,
  'RESTAURANT',
  rr.id,
  TRIM(rr.special_requests),
  rr.room_number,
  ts.date,
  ts.start_time
FROM restaurant_reservations rr
JOIN restaurant_time_slots ts ON rr.restaurant_slot_id = ts.id
WHERE rr.special_requests IS NOT NULL 
  AND TRIM(rr.special_requests) != ''
  AND rr.status NOT IN ('CANCELLED');
