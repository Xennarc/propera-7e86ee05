-- Drop existing function with cascade to remove dependent policies
DROP FUNCTION IF EXISTS public.driver_can_access_trip(UUID) CASCADE;

-- Recreate helper: Check if current user is a driver for the given trip's resort
CREATE OR REPLACE FUNCTION public.driver_can_access_trip(p_trip_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_trip_resort_id UUID;
  v_trip_driver_user_id UUID;
BEGIN
  -- Get trip info
  SELECT resort_id, driver_user_id INTO v_trip_resort_id, v_trip_driver_user_id
  FROM public.buggy_trips
  WHERE id = p_trip_id;

  IF v_trip_resort_id IS NULL THEN
    RETURN false;
  END IF;

  -- Driver must be assigned to this trip
  IF v_trip_driver_user_id IS NOT NULL AND v_trip_driver_user_id = v_user_id THEN
    RETURN true;
  END IF;

  -- Or be a transport staff member (for admin override)
  RETURN public.staff_can_write_transport(v_user_id, v_trip_resort_id);
END;
$$;

-- Recreate the dropped RLS policies for buggy_trip_requests
CREATE POLICY "driver_select_trip_requests"
  ON public.buggy_trip_requests
  FOR SELECT
  USING (
    public.driver_can_access_trip(trip_id)
    OR public.staff_can_write_transport(auth.uid(), resort_id)
  );

CREATE POLICY "driver_update_trip_requests"
  ON public.buggy_trip_requests
  FOR UPDATE
  USING (
    public.driver_can_access_trip(trip_id)
    OR public.staff_can_write_transport(auth.uid(), resort_id)
  );

-- Recreate the dropped RLS policies for buggy_trip_stops
CREATE POLICY "driver_select_trip_stops"
  ON public.buggy_trip_stops
  FOR SELECT
  USING (
    public.driver_can_access_trip(trip_id)
    OR public.staff_can_write_transport(auth.uid(), resort_id)
  );

CREATE POLICY "driver_update_trip_stops"
  ON public.buggy_trip_stops
  FOR UPDATE
  USING (
    public.driver_can_access_trip(trip_id)
    OR public.staff_can_write_transport(auth.uid(), resort_id)
  );

-- 3a) driver_set_status_atomic
CREATE OR REPLACE FUNCTION public.driver_set_status_atomic(
  p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_driver_id UUID;
  v_resort_id UUID;
  v_valid_statuses TEXT[] := ARRAY['offline', 'online', 'on_trip', 'break'];
BEGIN
  -- Validate status
  IF NOT (p_new_status = ANY(v_valid_statuses)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid status: ' || p_new_status);
  END IF;

  -- Find driver record for current user
  SELECT id, resort_id INTO v_driver_id, v_resort_id
  FROM public.buggy_drivers
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_driver_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No driver record found for current user');
  END IF;

  -- Update driver status
  UPDATE public.buggy_drivers
  SET 
    status = p_new_status::driver_status,
    last_seen_at = now(),
    updated_at = now()
  WHERE id = v_driver_id;

  RETURN jsonb_build_object(
    'ok', true,
    'driver_id', v_driver_id,
    'status', p_new_status
  );
END;
$$;

-- 3b) driver_start_trip_atomic
CREATE OR REPLACE FUNCTION public.driver_start_trip_atomic(
  p_trip_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_trip RECORD;
BEGIN
  -- Lock and fetch trip
  SELECT * INTO v_trip
  FROM public.buggy_trips
  WHERE id = p_trip_id
  FOR UPDATE;

  IF v_trip IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Trip not found');
  END IF;

  -- Verify driver access
  IF NOT public.driver_can_access_trip(p_trip_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized: not assigned to this trip');
  END IF;

  -- Trip must be in 'assigned' status
  IF v_trip.status != 'assigned' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Trip must be in assigned status to start. Current: ' || v_trip.status);
  END IF;

  -- Update trip to en_route
  UPDATE public.buggy_trips
  SET 
    status = 'en_route',
    start_at = now(),
    updated_at = now()
  WHERE id = p_trip_id;

  -- Update driver status to on_trip
  UPDATE public.buggy_drivers
  SET 
    status = 'on_trip',
    last_seen_at = now(),
    updated_at = now()
  WHERE user_id = v_user_id
    AND resort_id = v_trip.resort_id;

  -- Update buggy status to en_route
  IF v_trip.buggy_id IS NOT NULL THEN
    UPDATE public.buggies
    SET 
      status = 'en_route',
      updated_at = now()
    WHERE id = v_trip.buggy_id;
  END IF;

  -- Update all queued requests in this trip to driver_en_route
  UPDATE public.buggy_requests
  SET 
    status = 'driver_en_route',
    updated_at = now()
  WHERE id IN (
    SELECT request_id FROM public.buggy_trip_requests
    WHERE trip_id = p_trip_id
      AND state = 'queued'
  )
  AND status = 'assigned_to_trip';

  RETURN jsonb_build_object(
    'ok', true,
    'trip_id', p_trip_id,
    'status', 'en_route'
  );
END;
$$;

-- 3c) driver_complete_trip_atomic
CREATE OR REPLACE FUNCTION public.driver_complete_trip_atomic(
  p_trip_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_trip RECORD;
  v_pending_stops INTEGER;
BEGIN
  -- Lock and fetch trip
  SELECT * INTO v_trip
  FROM public.buggy_trips
  WHERE id = p_trip_id
  FOR UPDATE;

  IF v_trip IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Trip not found');
  END IF;

  -- Verify driver access
  IF NOT public.driver_can_access_trip(p_trip_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized: not assigned to this trip');
  END IF;

  -- Trip must be active or en_route
  IF v_trip.status NOT IN ('en_route', 'active') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Trip must be en_route or active to complete. Current: ' || v_trip.status);
  END IF;

  -- Check all stops are completed or skipped
  SELECT COUNT(*) INTO v_pending_stops
  FROM public.buggy_trip_stops
  WHERE trip_id = p_trip_id
    AND status = 'pending';

  IF v_pending_stops > 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot complete trip: ' || v_pending_stops || ' stops still pending');
  END IF;

  -- Update trip to completed
  UPDATE public.buggy_trips
  SET 
    status = 'completed',
    end_at = now(),
    updated_at = now()
  WHERE id = p_trip_id;

  -- Update driver status to online
  UPDATE public.buggy_drivers
  SET 
    status = 'online',
    last_seen_at = now(),
    updated_at = now()
  WHERE user_id = v_user_id
    AND resort_id = v_trip.resort_id;

  -- Update buggy status to available
  IF v_trip.buggy_id IS NOT NULL THEN
    UPDATE public.buggies
    SET 
      status = 'available',
      updated_at = now()
    WHERE id = v_trip.buggy_id;
  END IF;

  -- Mark all trip requests as completed (those that were dropped off)
  UPDATE public.buggy_requests
  SET 
    status = 'completed',
    updated_at = now()
  WHERE id IN (
    SELECT request_id FROM public.buggy_trip_requests
    WHERE trip_id = p_trip_id
      AND state = 'dropped_off'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'trip_id', p_trip_id,
    'status', 'completed'
  );
END;
$$;