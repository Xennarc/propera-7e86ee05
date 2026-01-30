-- Phase 3: Trip-based RPCs for pooled transport
-- Implements idempotent request creation, trip management, driver operations

-- ============================================================================
-- RPC 1: create_buggy_request_idempotent
-- Creates a new buggy request or returns existing one with same idempotency_key
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_buggy_request_idempotent(
  _resort_id uuid,
  _guest_id uuid DEFAULT NULL,
  _created_by_staff_user_id uuid DEFAULT NULL,
  _request_source public.buggy_request_source DEFAULT 'guest',
  _request_type public.buggy_request_type DEFAULT 'on_demand',
  _party_size int DEFAULT 1,
  _pickup_stop_id uuid DEFAULT NULL,
  _pickup_text text DEFAULT NULL,
  _pickup_location jsonb DEFAULT NULL,
  _dropoff_stop_id uuid DEFAULT NULL,
  _dropoff_text text DEFAULT NULL,
  _dropoff_location jsonb DEFAULT NULL,
  _scheduled_for timestamptz DEFAULT NULL,
  _route_id uuid DEFAULT NULL,
  _priority public.buggy_priority DEFAULT 'normal',
  _needs_accessible bool DEFAULT false,
  _idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_request buggy_requests%ROWTYPE;
  v_new_request buggy_requests%ROWTYPE;
  v_has_pickup boolean;
  v_has_dropoff boolean;
BEGIN
  -- Validate idempotency_key is provided
  IF _idempotency_key IS NULL OR _idempotency_key = '' THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'INVALID_IDEMPOTENCY_KEY', 'message', 'Idempotency key is required');
  END IF;

  -- Check for existing request with same idempotency key
  SELECT * INTO v_existing_request
  FROM buggy_requests
  WHERE resort_id = _resort_id AND idempotency_key = _idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'request_id', v_existing_request.id,
      'status', v_existing_request.status,
      'idempotent_hit', true
    );
  END IF;

  -- Validate party_size
  IF _party_size < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'INVALID_PAX', 'message', 'Party size must be at least 1');
  END IF;

  -- Validate pickup location exists
  v_has_pickup := (_pickup_stop_id IS NOT NULL) OR (_pickup_text IS NOT NULL AND _pickup_text <> '') OR (_pickup_location IS NOT NULL);
  IF NOT v_has_pickup THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'MISSING_PICKUP', 'message', 'Pickup location is required (stop, text, or coordinates)');
  END IF;

  -- Validate dropoff location exists
  v_has_dropoff := (_dropoff_stop_id IS NOT NULL) OR (_dropoff_text IS NOT NULL AND _dropoff_text <> '') OR (_dropoff_location IS NOT NULL);
  IF NOT v_has_dropoff THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'MISSING_DROPOFF', 'message', 'Dropoff location is required (stop, text, or coordinates)');
  END IF;

  -- Validate scheduled_for for scheduled requests
  IF _request_type = 'scheduled' AND _scheduled_for IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'MISSING_SCHEDULE', 'message', 'Scheduled time is required for scheduled requests');
  END IF;

  -- Validate route_id for fixed_route requests
  IF _request_type = 'fixed_route' AND _route_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'MISSING_ROUTE', 'message', 'Route is required for fixed route requests');
  END IF;

  -- Validate pickup_stop_id exists and belongs to resort
  IF _pickup_stop_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM buggy_stops WHERE id = _pickup_stop_id AND resort_id = _resort_id AND is_active = true) THEN
      RETURN jsonb_build_object('ok', false, 'error_code', 'INVALID_PICKUP_STOP', 'message', 'Pickup stop not found or inactive');
    END IF;
  END IF;

  -- Validate dropoff_stop_id exists and belongs to resort
  IF _dropoff_stop_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM buggy_stops WHERE id = _dropoff_stop_id AND resort_id = _resort_id AND is_active = true) THEN
      RETURN jsonb_build_object('ok', false, 'error_code', 'INVALID_DROPOFF_STOP', 'message', 'Dropoff stop not found or inactive');
    END IF;
  END IF;

  -- Validate route_id exists and belongs to resort
  IF _route_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM buggy_routes WHERE id = _route_id AND resort_id = _resort_id AND is_active = true) THEN
      RETURN jsonb_build_object('ok', false, 'error_code', 'INVALID_ROUTE', 'message', 'Route not found or inactive');
    END IF;
  END IF;

  -- Create the request
  INSERT INTO buggy_requests (
    resort_id, guest_id, created_by_staff_user_id, request_source, request_type,
    party_size, needs_accessible, pickup_stop_id, pickup_text, pickup_location,
    dropoff_stop_id, dropoff_text, dropoff_location, scheduled_for, route_id,
    priority, status, idempotency_key
  ) VALUES (
    _resort_id, _guest_id, _created_by_staff_user_id, _request_source, _request_type,
    _party_size, _needs_accessible, _pickup_stop_id, _pickup_text, _pickup_location,
    _dropoff_stop_id, _dropoff_text, _dropoff_location, _scheduled_for, _route_id,
    _priority, 'requested', _idempotency_key
  )
  RETURNING * INTO v_new_request;

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', v_new_request.id,
    'status', v_new_request.status,
    'idempotent_hit', false
  );
END;
$$;

-- ============================================================================
-- RPC 2: create_trip_from_requests
-- Creates a new trip from a set of requests (staff-only)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_trip_from_requests(
  _resort_id uuid,
  _request_ids uuid[],
  _trip_type public.buggy_trip_type DEFAULT 'pooled_custom'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_trip_id uuid;
  v_request_record RECORD;
  v_stop_sequence int := 0;
  v_total_party_size int := 0;
  v_request_count int := 0;
BEGIN
  -- Check staff authorization
  IF NOT staff_can_write_transport(v_user_id, _resort_id) THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'UNAUTHORIZED', 'message', 'Not authorized to create trips');
  END IF;

  -- Validate at least one request provided
  IF _request_ids IS NULL OR array_length(_request_ids, 1) IS NULL OR array_length(_request_ids, 1) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'NO_REQUESTS', 'message', 'At least one request is required');
  END IF;

  -- Lock and validate all requests
  FOR v_request_record IN 
    SELECT id, party_size, pickup_stop_id, pickup_text, pickup_location,
           dropoff_stop_id, dropoff_text, dropoff_location, resort_id, status
    FROM buggy_requests
    WHERE id = ANY(_request_ids)
    FOR UPDATE
  LOOP
    -- Validate resort
    IF v_request_record.resort_id <> _resort_id THEN
      RETURN jsonb_build_object('ok', false, 'error_code', 'RESORT_MISMATCH', 'message', 'Request ' || v_request_record.id || ' belongs to different resort');
    END IF;

    -- Validate status is eligible
    IF v_request_record.status NOT IN ('requested', 'queued') THEN
      RETURN jsonb_build_object('ok', false, 'error_code', 'INVALID_REQUEST_STATUS', 'message', 'Request ' || v_request_record.id || ' is not eligible (status: ' || v_request_record.status || ')');
    END IF;

    v_total_party_size := v_total_party_size + v_request_record.party_size;
    v_request_count := v_request_count + 1;
  END LOOP;

  -- Verify we found all requests
  IF v_request_count <> array_length(_request_ids, 1) THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'REQUEST_NOT_FOUND', 'message', 'One or more requests not found');
  END IF;

  -- Create the trip
  INSERT INTO buggy_trips (resort_id, trip_type, status)
  VALUES (_resort_id, _trip_type, 'planning')
  RETURNING id INTO v_trip_id;

  -- Add requests to trip and create stops
  FOR v_request_record IN 
    SELECT id, party_size, pickup_stop_id, pickup_text, pickup_location,
           dropoff_stop_id, dropoff_text, dropoff_location
    FROM buggy_requests
    WHERE id = ANY(_request_ids)
  LOOP
    -- Insert trip membership
    INSERT INTO buggy_trip_requests (resort_id, trip_id, request_id, party_size, state)
    VALUES (_resort_id, v_trip_id, v_request_record.id, v_request_record.party_size, 'queued');

    -- Update request status
    UPDATE buggy_requests SET status = 'assigned_to_trip' WHERE id = v_request_record.id;

    -- Create pickup stop
    v_stop_sequence := v_stop_sequence + 10;
    INSERT INTO buggy_trip_stops (
      resort_id, trip_id, stop_kind, stop_id, title, location, sequence, related_request_id, status
    ) VALUES (
      _resort_id, v_trip_id, 'pickup', v_request_record.pickup_stop_id,
      COALESCE(v_request_record.pickup_text, (SELECT name FROM buggy_stops WHERE id = v_request_record.pickup_stop_id)),
      v_request_record.pickup_location,
      v_stop_sequence, v_request_record.id, 'pending'
    );

    -- Create dropoff stop
    v_stop_sequence := v_stop_sequence + 10;
    INSERT INTO buggy_trip_stops (
      resort_id, trip_id, stop_kind, stop_id, title, location, sequence, related_request_id, status
    ) VALUES (
      _resort_id, v_trip_id, 'dropoff', v_request_record.dropoff_stop_id,
      COALESCE(v_request_record.dropoff_text, (SELECT name FROM buggy_stops WHERE id = v_request_record.dropoff_stop_id)),
      v_request_record.dropoff_location,
      v_stop_sequence, v_request_record.id, 'pending'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'trip_id', v_trip_id,
    'request_count', v_request_count,
    'total_party_size', v_total_party_size
  );
END;
$$;

-- ============================================================================
-- RPC 3: add_request_to_trip
-- Adds a request to an existing trip (staff-only)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.add_request_to_trip(
  _trip_id uuid,
  _request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_trip buggy_trips%ROWTYPE;
  v_request buggy_requests%ROWTYPE;
  v_max_sequence int;
  v_current_party_size int;
BEGIN
  -- Lock and fetch trip
  SELECT * INTO v_trip FROM buggy_trips WHERE id = _trip_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'TRIP_NOT_FOUND', 'message', 'Trip not found');
  END IF;

  -- Check staff authorization
  IF NOT staff_can_write_transport(v_user_id, v_trip.resort_id) THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'UNAUTHORIZED', 'message', 'Not authorized to modify trips');
  END IF;

  -- Validate trip status allows additions
  IF v_trip.status NOT IN ('planning', 'assigned') THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'TRIP_NOT_MODIFIABLE', 'message', 'Trip is not in a modifiable state');
  END IF;

  -- Lock and fetch request
  SELECT * INTO v_request FROM buggy_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'REQUEST_NOT_FOUND', 'message', 'Request not found');
  END IF;

  -- Validate same resort
  IF v_request.resort_id <> v_trip.resort_id THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'RESORT_MISMATCH', 'message', 'Request belongs to different resort');
  END IF;

  -- Validate request is eligible
  IF v_request.status NOT IN ('requested', 'queued') THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'INVALID_REQUEST_STATUS', 'message', 'Request is not eligible for trip assignment');
  END IF;

  -- Check if already in a trip
  IF EXISTS (SELECT 1 FROM buggy_trip_requests WHERE request_id = _request_id AND state NOT IN ('cancelled', 'no_show')) THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'ALREADY_IN_TRIP', 'message', 'Request is already assigned to a trip');
  END IF;

  -- If trip is assigned, check capacity
  IF v_trip.status = 'assigned' AND v_trip.buggy_id IS NOT NULL THEN
    SELECT COALESCE(SUM(party_size), 0) INTO v_current_party_size
    FROM buggy_trip_requests
    WHERE trip_id = _trip_id AND state = 'queued';

    DECLARE
      v_buggy_capacity int;
      v_buggy_is_accessible bool;
    BEGIN
      SELECT capacity, is_accessible INTO v_buggy_capacity, v_buggy_is_accessible
      FROM buggies WHERE id = v_trip.buggy_id;

      IF v_current_party_size + v_request.party_size > v_buggy_capacity THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'CAPACITY_EXCEEDED', 'message', 'Adding this request would exceed buggy capacity');
      END IF;

      IF v_request.needs_accessible AND NOT v_buggy_is_accessible THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'ACCESSIBILITY_REQUIRED', 'message', 'Request requires accessible buggy but assigned buggy is not accessible');
      END IF;
    END;
  END IF;

  -- Get max sequence
  SELECT COALESCE(MAX(sequence), 0) INTO v_max_sequence FROM buggy_trip_stops WHERE trip_id = _trip_id;

  -- Insert trip membership
  INSERT INTO buggy_trip_requests (resort_id, trip_id, request_id, party_size, state)
  VALUES (v_trip.resort_id, _trip_id, _request_id, v_request.party_size, 'queued');

  -- Update request status
  UPDATE buggy_requests SET status = 'assigned_to_trip' WHERE id = _request_id;

  -- Create pickup stop
  INSERT INTO buggy_trip_stops (
    resort_id, trip_id, stop_kind, stop_id, title, location, sequence, related_request_id, status
  ) VALUES (
    v_trip.resort_id, _trip_id, 'pickup', v_request.pickup_stop_id,
    COALESCE(v_request.pickup_text, (SELECT name FROM buggy_stops WHERE id = v_request.pickup_stop_id)),
    v_request.pickup_location,
    v_max_sequence + 10, _request_id, 'pending'
  );

  -- Create dropoff stop
  INSERT INTO buggy_trip_stops (
    resort_id, trip_id, stop_kind, stop_id, title, location, sequence, related_request_id, status
  ) VALUES (
    v_trip.resort_id, _trip_id, 'dropoff', v_request.dropoff_stop_id,
    COALESCE(v_request.dropoff_text, (SELECT name FROM buggy_stops WHERE id = v_request.dropoff_stop_id)),
    v_request.dropoff_location,
    v_max_sequence + 20, _request_id, 'pending'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'trip_id', _trip_id,
    'request_id', _request_id,
    'party_size', v_request.party_size
  );
END;
$$;

-- ============================================================================
-- RPC 4: remove_request_from_trip
-- Removes a request from a trip (staff-only, or called by cancel_buggy_request)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.remove_request_from_trip(
  _trip_id uuid,
  _request_id uuid,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_trip buggy_trips%ROWTYPE;
  v_request buggy_requests%ROWTYPE;
  v_membership buggy_trip_requests%ROWTYPE;
BEGIN
  -- Lock and fetch trip
  SELECT * INTO v_trip FROM buggy_trips WHERE id = _trip_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'TRIP_NOT_FOUND', 'message', 'Trip not found');
  END IF;

  -- Check staff authorization
  IF NOT staff_can_write_transport(v_user_id, v_trip.resort_id) THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'UNAUTHORIZED', 'message', 'Not authorized to modify trips');
  END IF;

  -- Check membership exists
  SELECT * INTO v_membership FROM buggy_trip_requests WHERE trip_id = _trip_id AND request_id = _request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'NOT_IN_TRIP', 'message', 'Request is not in this trip');
  END IF;

  -- Cannot remove if already picked up (use driver controls)
  IF v_membership.state = 'picked_up' THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'ALREADY_PICKED_UP', 'message', 'Cannot remove request after pickup - use driver controls instead');
  END IF;

  -- Update membership state to cancelled
  UPDATE buggy_trip_requests SET state = 'cancelled' WHERE id = v_membership.id;

  -- Remove pending stops for this request
  DELETE FROM buggy_trip_stops 
  WHERE trip_id = _trip_id AND related_request_id = _request_id AND status = 'pending';

  -- Update request status
  UPDATE buggy_requests 
  SET status = 'cancelled', status_reason = _reason 
  WHERE id = _request_id;

  RETURN jsonb_build_object(
    'ok', true,
    'trip_id', _trip_id,
    'request_id', _request_id,
    'removed', true
  );
END;
$$;

-- ============================================================================
-- RPC 5: reorder_trip_stops
-- Reorders stops within a trip (staff-only)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reorder_trip_stops(
  _trip_id uuid,
  _ordered_stop_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_trip buggy_trips%ROWTYPE;
  v_stop_id uuid;
  v_sequence int := 0;
  v_stop_count int;
BEGIN
  -- Lock and fetch trip
  SELECT * INTO v_trip FROM buggy_trips WHERE id = _trip_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'TRIP_NOT_FOUND', 'message', 'Trip not found');
  END IF;

  -- Check staff authorization
  IF NOT staff_can_write_transport(v_user_id, v_trip.resort_id) THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'UNAUTHORIZED', 'message', 'Not authorized to modify trips');
  END IF;

  -- Validate trip status allows reordering
  IF v_trip.status NOT IN ('planning', 'assigned', 'en_route', 'active') THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'TRIP_NOT_MODIFIABLE', 'message', 'Trip stops cannot be reordered in current state');
  END IF;

  -- Validate all stop_ids belong to this trip
  SELECT COUNT(*) INTO v_stop_count FROM buggy_trip_stops WHERE trip_id = _trip_id AND id = ANY(_ordered_stop_ids);
  IF v_stop_count <> array_length(_ordered_stop_ids, 1) THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'INVALID_STOPS', 'message', 'Some stop IDs do not belong to this trip');
  END IF;

  -- Update sequences
  FOREACH v_stop_id IN ARRAY _ordered_stop_ids
  LOOP
    v_sequence := v_sequence + 10;
    UPDATE buggy_trip_stops SET sequence = v_sequence WHERE id = v_stop_id;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'trip_id', _trip_id,
    'stops_reordered', array_length(_ordered_stop_ids, 1)
  );
END;
$$;

-- ============================================================================
-- RPC 6: assign_trip_atomic
-- Assigns a buggy and driver to a trip atomically (staff-only)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.assign_trip_atomic(
  _trip_id uuid,
  _buggy_id uuid,
  _driver_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_trip buggy_trips%ROWTYPE;
  v_buggy buggies%ROWTYPE;
  v_driver buggy_drivers%ROWTYPE;
  v_total_party_size int;
  v_needs_accessible bool;
BEGIN
  -- Lock and fetch trip
  SELECT * INTO v_trip FROM buggy_trips WHERE id = _trip_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'TRIP_NOT_FOUND', 'message', 'Trip not found');
  END IF;

  -- Check staff authorization
  IF NOT staff_can_write_transport(v_user_id, v_trip.resort_id) THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'UNAUTHORIZED', 'message', 'Not authorized to assign trips');
  END IF;

  -- Validate trip status
  IF v_trip.status NOT IN ('planning') THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'TRIP_NOT_ASSIGNABLE', 'message', 'Trip is not in planning status');
  END IF;

  -- Lock and fetch buggy
  SELECT * INTO v_buggy FROM buggies WHERE id = _buggy_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'BUGGY_NOT_FOUND', 'message', 'Buggy not found');
  END IF;

  -- Validate buggy is in same resort
  IF v_buggy.resort_id <> v_trip.resort_id THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'RESORT_MISMATCH', 'message', 'Buggy belongs to different resort');
  END IF;

  -- Validate buggy is available
  IF v_buggy.status <> 'available' THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'BUGGY_NOT_AVAILABLE', 'message', 'Buggy is not available (status: ' || v_buggy.status || ')');
  END IF;

  -- Lock and fetch driver
  SELECT * INTO v_driver FROM buggy_drivers WHERE user_id = _driver_user_id AND resort_id = v_trip.resort_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'DRIVER_NOT_FOUND', 'message', 'Driver not found in this resort');
  END IF;

  -- Validate driver is online
  IF v_driver.status NOT IN ('online') THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'DRIVER_NOT_AVAILABLE', 'message', 'Driver is not online (status: ' || v_driver.status || ')');
  END IF;

  -- Calculate total party size and accessibility needs
  SELECT COALESCE(SUM(btr.party_size), 0), BOOL_OR(br.needs_accessible)
  INTO v_total_party_size, v_needs_accessible
  FROM buggy_trip_requests btr
  JOIN buggy_requests br ON br.id = btr.request_id
  WHERE btr.trip_id = _trip_id AND btr.state = 'queued';

  -- Validate capacity
  IF v_total_party_size > v_buggy.capacity THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'CAPACITY_EXCEEDED', 
      'message', 'Total party size (' || v_total_party_size || ') exceeds buggy capacity (' || v_buggy.capacity || ')');
  END IF;

  -- Validate accessibility
  IF v_needs_accessible AND NOT v_buggy.is_accessible THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'ACCESSIBILITY_REQUIRED', 'message', 'One or more requests require an accessible buggy');
  END IF;

  -- Assign trip
  UPDATE buggy_trips 
  SET buggy_id = _buggy_id, 
      driver_user_id = _driver_user_id, 
      capacity_total = v_total_party_size,
      status = 'assigned',
      start_at = now()
  WHERE id = _trip_id;

  -- Update buggy status
  UPDATE buggies SET status = 'en_route' WHERE id = _buggy_id;

  -- Update driver status and assigned buggy
  UPDATE buggy_drivers SET status = 'on_trip', assigned_buggy_id = _buggy_id WHERE id = v_driver.id;

  -- Update all queued requests to driver_en_route
  UPDATE buggy_requests 
  SET status = 'driver_en_route' 
  WHERE id IN (SELECT request_id FROM buggy_trip_requests WHERE trip_id = _trip_id AND state = 'queued');

  RETURN jsonb_build_object(
    'ok', true,
    'trip_id', _trip_id,
    'buggy_id', _buggy_id,
    'driver_user_id', _driver_user_id,
    'total_party_size', v_total_party_size,
    'status', 'assigned'
  );
END;
$$;

-- ============================================================================
-- RPC 7: driver_update_trip_stop_status
-- Driver updates a stop status, which cascades to request and trip state
-- ============================================================================
CREATE OR REPLACE FUNCTION public.driver_update_trip_stop_status(
  _trip_stop_id uuid,
  _new_status public.buggy_trip_stop_status
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_stop buggy_trip_stops%ROWTYPE;
  v_trip buggy_trips%ROWTYPE;
  v_all_done boolean;
  v_request_status text;
BEGIN
  -- Fetch stop
  SELECT * INTO v_stop FROM buggy_trip_stops WHERE id = _trip_stop_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'STOP_NOT_FOUND', 'message', 'Trip stop not found');
  END IF;

  -- Fetch and lock trip
  SELECT * INTO v_trip FROM buggy_trips WHERE id = v_stop.trip_id FOR UPDATE;

  -- Check driver authorization
  IF NOT driver_can_access_trip(v_trip.id) AND NOT staff_can_write_transport(v_user_id, v_trip.resort_id) THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'UNAUTHORIZED', 'message', 'Not authorized to update this stop');
  END IF;

  -- Validate trip is active
  IF v_trip.status NOT IN ('assigned', 'en_route', 'active') THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'TRIP_NOT_ACTIVE', 'message', 'Trip is not in an active state');
  END IF;

  -- Update stop status and timestamps
  UPDATE buggy_trip_stops 
  SET status = _new_status,
      arrived_at = CASE WHEN _new_status = 'arrived' AND arrived_at IS NULL THEN now() ELSE arrived_at END,
      completed_at = CASE WHEN _new_status = 'completed' AND completed_at IS NULL THEN now() ELSE completed_at END
  WHERE id = _trip_stop_id;

  -- Update trip to active if en_route
  IF v_trip.status = 'assigned' OR v_trip.status = 'en_route' THEN
    UPDATE buggy_trips SET status = 'active' WHERE id = v_trip.id;
  END IF;

  -- Cascade to request state based on stop kind
  IF v_stop.related_request_id IS NOT NULL AND _new_status = 'completed' THEN
    IF v_stop.stop_kind = 'pickup' THEN
      -- Mark request as picked up
      UPDATE buggy_trip_requests SET state = 'picked_up' 
      WHERE trip_id = v_trip.id AND request_id = v_stop.related_request_id;
      
      UPDATE buggy_requests SET status = 'picked_up' WHERE id = v_stop.related_request_id;
      
    ELSIF v_stop.stop_kind = 'dropoff' THEN
      -- Mark request as dropped off / completed
      UPDATE buggy_trip_requests SET state = 'dropped_off' 
      WHERE trip_id = v_trip.id AND request_id = v_stop.related_request_id;
      
      UPDATE buggy_requests SET status = 'completed' WHERE id = v_stop.related_request_id;
    END IF;
  END IF;

  -- Check if all trip requests are done
  SELECT NOT EXISTS (
    SELECT 1 FROM buggy_trip_requests 
    WHERE trip_id = v_trip.id AND state NOT IN ('dropped_off', 'cancelled', 'no_show')
  ) INTO v_all_done;

  -- Complete trip if all done
  IF v_all_done THEN
    UPDATE buggy_trips SET status = 'completed', end_at = now() WHERE id = v_trip.id;
    
    -- Release buggy and driver
    IF v_trip.buggy_id IS NOT NULL THEN
      UPDATE buggies SET status = 'available' WHERE id = v_trip.buggy_id;
    END IF;
    
    UPDATE buggy_drivers SET status = 'online', assigned_buggy_id = NULL 
    WHERE user_id = v_trip.driver_user_id AND resort_id = v_trip.resort_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'stop_id', _trip_stop_id,
    'stop_status', _new_status,
    'trip_completed', v_all_done
  );
END;
$$;

-- ============================================================================
-- RPC 8: cancel_buggy_request
-- Cancels a buggy request (guest or staff), handling trip membership
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cancel_buggy_request(
  _request_id uuid,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_request buggy_requests%ROWTYPE;
  v_membership buggy_trip_requests%ROWTYPE;
  v_is_guest boolean := false;
  v_guest_id uuid;
BEGIN
  -- Lock and fetch request
  SELECT * INTO v_request FROM buggy_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'REQUEST_NOT_FOUND', 'message', 'Request not found');
  END IF;

  -- Check if caller is the guest who made the request
  v_guest_id := current_guest_id();
  IF v_guest_id IS NOT NULL AND v_request.guest_id = v_guest_id THEN
    v_is_guest := true;
  END IF;

  -- Authorization: must be staff or the guest who made the request
  IF NOT v_is_guest AND NOT staff_can_write_transport(v_user_id, v_request.resort_id) THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'UNAUTHORIZED', 'message', 'Not authorized to cancel this request');
  END IF;

  -- Check if already cancelled or completed
  IF v_request.status IN ('cancelled', 'completed', 'no_show') THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'ALREADY_FINAL', 'message', 'Request is already in a final state');
  END IF;

  -- Guests cannot cancel after pickup
  IF v_is_guest AND v_request.status = 'picked_up' THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'ALREADY_PICKED_UP', 'message', 'Cannot cancel after pickup - please speak with the driver');
  END IF;

  -- Check if request is in a trip
  SELECT * INTO v_membership 
  FROM buggy_trip_requests 
  WHERE request_id = _request_id AND state NOT IN ('cancelled', 'no_show')
  FOR UPDATE;

  IF FOUND THEN
    -- Request is in a trip
    IF v_membership.state = 'picked_up' THEN
      -- Staff-only: can mark no-show but not remove
      IF NOT v_is_guest AND staff_can_write_transport(v_user_id, v_request.resort_id) THEN
        UPDATE buggy_trip_requests SET state = 'no_show' WHERE id = v_membership.id;
        UPDATE buggy_requests SET status = 'no_show', status_reason = _reason WHERE id = _request_id;
        
        RETURN jsonb_build_object(
          'ok', true,
          'request_id', _request_id,
          'status', 'no_show',
          'message', 'Request marked as no-show (already picked up)'
        );
      ELSE
        RETURN jsonb_build_object('ok', false, 'error_code', 'ALREADY_PICKED_UP', 'message', 'Cannot cancel after pickup');
      END IF;
    END IF;

    -- Remove from trip
    UPDATE buggy_trip_requests SET state = 'cancelled' WHERE id = v_membership.id;
    
    -- Remove pending stops
    DELETE FROM buggy_trip_stops 
    WHERE trip_id = v_membership.trip_id AND related_request_id = _request_id AND status = 'pending';
  END IF;

  -- Update request status
  UPDATE buggy_requests 
  SET status = 'cancelled', status_reason = COALESCE(_reason, 'Cancelled by ' || CASE WHEN v_is_guest THEN 'guest' ELSE 'staff' END)
  WHERE id = _request_id;

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', _request_id,
    'status', 'cancelled',
    'was_in_trip', FOUND
  );
END;
$$;

-- ============================================================================
-- Grant execute permissions to authenticated users
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.create_buggy_request_idempotent TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_trip_from_requests TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_request_to_trip TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_request_from_trip TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_trip_stops TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_trip_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.driver_update_trip_stop_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_buggy_request TO authenticated, anon;