-- =========================================================================
-- EVENT OUTBOX TABLE for reliable notification delivery
-- =========================================================================

-- Create event outbox status enum
CREATE TYPE public.outbox_status AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- Create the event outbox table
CREATE TABLE public.event_outbox (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status public.outbox_status NOT NULL DEFAULT 'PENDING',
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for efficient processing
CREATE INDEX idx_event_outbox_pending ON public.event_outbox(status, next_attempt_at) 
  WHERE status IN ('PENDING', 'PROCESSING');
CREATE INDEX idx_event_outbox_resort ON public.event_outbox(resort_id);
CREATE INDEX idx_event_outbox_created ON public.event_outbox(created_at DESC);
CREATE INDEX idx_event_outbox_failed ON public.event_outbox(status, updated_at DESC) 
  WHERE status = 'FAILED';

-- Add comment
COMMENT ON TABLE public.event_outbox IS 'Outbox pattern for reliable async notification delivery';

-- Enable RLS
ALTER TABLE public.event_outbox ENABLE ROW LEVEL SECURITY;

-- RLS policies - only staff and super admins can view
CREATE POLICY "Super admins can view all outbox events"
  ON public.event_outbox FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Staff can view resort outbox events"
  ON public.event_outbox FOR SELECT
  USING (public.has_resort_membership(auth.uid(), resort_id));

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role full access"
  ON public.event_outbox FOR ALL
  USING (auth.role() = 'service_role');

-- =========================================================================
-- OUTBOX HELPER FUNCTIONS
-- =========================================================================

-- Function to enqueue an event
CREATE OR REPLACE FUNCTION public.enqueue_event(
  p_resort_id UUID,
  p_event_type TEXT,
  p_payload JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.event_outbox (resort_id, event_type, payload)
  VALUES (p_resort_id, p_event_type, p_payload)
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- Function to claim events for processing (atomic)
CREATE OR REPLACE FUNCTION public.claim_outbox_events(
  p_limit INT DEFAULT 10
) RETURNS SETOF public.event_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.event_outbox
  SET 
    status = 'PROCESSING',
    attempts = attempts + 1,
    updated_at = now()
  WHERE id IN (
    SELECT id FROM public.event_outbox
    WHERE status = 'PENDING'
      AND next_attempt_at <= now()
    ORDER BY created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

-- Function to mark event as done
CREATE OR REPLACE FUNCTION public.mark_outbox_done(
  p_event_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.event_outbox
  SET 
    status = 'DONE',
    processed_at = now(),
    updated_at = now()
  WHERE id = p_event_id;
END;
$$;

-- Function to mark event as failed with backoff
CREATE OR REPLACE FUNCTION public.mark_outbox_failed(
  p_event_id UUID,
  p_error TEXT,
  p_max_attempts INT DEFAULT 5
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts INT;
  v_backoff INTERVAL;
BEGIN
  SELECT attempts INTO v_attempts FROM public.event_outbox WHERE id = p_event_id;
  
  -- Exponential backoff: 1min, 4min, 16min, 64min, 256min
  v_backoff := (power(4, LEAST(v_attempts, 5))::INT || ' minutes')::INTERVAL;
  
  UPDATE public.event_outbox
  SET 
    status = CASE WHEN v_attempts >= p_max_attempts THEN 'FAILED'::public.outbox_status ELSE 'PENDING'::public.outbox_status END,
    last_error = p_error,
    next_attempt_at = CASE WHEN v_attempts >= p_max_attempts THEN next_attempt_at ELSE now() + v_backoff END,
    updated_at = now()
  WHERE id = p_event_id;
END;
$$;

-- Function to retry failed events
CREATE OR REPLACE FUNCTION public.retry_failed_events(
  p_event_ids UUID[]
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.event_outbox
  SET 
    status = 'PENDING',
    attempts = 0,
    next_attempt_at = now(),
    last_error = NULL,
    updated_at = now()
  WHERE id = ANY(p_event_ids)
    AND status = 'FAILED';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =========================================================================
-- TRIGGERS TO ENQUEUE EVENTS ON BOOKING CHANGES
-- =========================================================================

-- Activity booking trigger
CREATE OR REPLACE FUNCTION public.enqueue_activity_booking_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type TEXT;
  v_guest RECORD;
  v_session RECORD;
  v_activity RECORD;
BEGIN
  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'ACTIVITY_BOOKING_CREATED';
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'CANCELLED' AND OLD.status != 'CANCELLED' THEN
    v_event_type := 'ACTIVITY_BOOKING_CANCELLED';
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'CONFIRMED' AND OLD.status = 'PENDING' THEN
    v_event_type := 'ACTIVITY_BOOKING_CONFIRMED';
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'REJECTED' AND OLD.status = 'PENDING' THEN
    v_event_type := 'ACTIVITY_BOOKING_REJECTED';
  ELSE
    RETURN NEW;
  END IF;
  
  -- Get related data
  SELECT * INTO v_guest FROM public.guests WHERE id = NEW.guest_id;
  SELECT * INTO v_session FROM public.activity_sessions WHERE id = NEW.session_id;
  SELECT * INTO v_activity FROM public.activities WHERE id = v_session.activity_id;
  
  -- Enqueue the event
  PERFORM public.enqueue_event(
    NEW.resort_id,
    v_event_type,
    jsonb_build_object(
      'booking_id', NEW.id,
      'guest_id', NEW.guest_id,
      'guest_name', v_guest.full_name,
      'guest_email', v_guest.email,
      'room_number', NEW.room_number,
      'session_id', NEW.session_id,
      'activity_id', v_activity.id,
      'activity_name', v_activity.name,
      'session_date', v_session.date,
      'session_time', v_session.start_time,
      'num_adults', NEW.num_adults,
      'num_children', NEW.num_children,
      'status', NEW.status,
      'requires_approval', v_activity.requires_approval
    )
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activity_booking_outbox
  AFTER INSERT OR UPDATE ON public.activity_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_activity_booking_event();

-- Restaurant reservation trigger
CREATE OR REPLACE FUNCTION public.enqueue_restaurant_reservation_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type TEXT;
  v_guest RECORD;
  v_slot RECORD;
  v_restaurant RECORD;
BEGIN
  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'RESTAURANT_RESERVATION_CREATED';
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'CANCELLED' AND OLD.status != 'CANCELLED' THEN
    v_event_type := 'RESTAURANT_RESERVATION_CANCELLED';
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'CONFIRMED' AND OLD.status = 'PENDING' THEN
    v_event_type := 'RESTAURANT_RESERVATION_CONFIRMED';
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'REJECTED' AND OLD.status = 'PENDING' THEN
    v_event_type := 'RESTAURANT_RESERVATION_REJECTED';
  ELSE
    RETURN NEW;
  END IF;
  
  -- Get related data
  SELECT * INTO v_guest FROM public.guests WHERE id = NEW.guest_id;
  SELECT * INTO v_slot FROM public.restaurant_time_slots WHERE id = NEW.restaurant_slot_id;
  SELECT * INTO v_restaurant FROM public.restaurants WHERE id = v_slot.restaurant_id;
  
  -- Enqueue the event
  PERFORM public.enqueue_event(
    NEW.resort_id,
    v_event_type,
    jsonb_build_object(
      'reservation_id', NEW.id,
      'guest_id', NEW.guest_id,
      'guest_name', v_guest.full_name,
      'guest_email', v_guest.email,
      'room_number', NEW.room_number,
      'slot_id', NEW.restaurant_slot_id,
      'restaurant_id', v_restaurant.id,
      'restaurant_name', v_restaurant.name,
      'slot_date', v_slot.date,
      'slot_time', v_slot.start_time,
      'num_adults', NEW.num_adults,
      'num_children', NEW.num_children,
      'status', NEW.status,
      'requires_approval', v_restaurant.requires_approval
    )
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_restaurant_reservation_outbox
  AFTER INSERT OR UPDATE ON public.restaurant_reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_restaurant_reservation_event();

-- Prearrival link sent trigger (for guest_outbound_messages)
CREATE OR REPLACE FUNCTION public.enqueue_prearrival_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.template_key = 'prearrival_invite' AND NEW.status = 'sent' AND (OLD IS NULL OR OLD.status != 'sent') THEN
    PERFORM public.enqueue_event(
      NEW.resort_id,
      'PREARRIVAL_SENT',
      jsonb_build_object(
        'message_id', NEW.id,
        'guest_id', NEW.guest_id,
        'to_address', NEW.to_address,
        'channel', NEW.channel,
        'sent_at', NEW.sent_at
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prearrival_outbox
  AFTER INSERT OR UPDATE ON public.guest_outbound_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_prearrival_event();

-- Enable realtime for outbox monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_outbox;