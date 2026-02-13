
-- ============================================================
-- Fix: Release buggy & driver on trip completion/cancellation
-- ============================================================

-- 1) Recreate rpc_transport_driver_update_trip_state with resource release on completion
CREATE OR REPLACE FUNCTION public.rpc_transport_driver_update_trip_state(
  p_resort_id uuid,
  p_trip_id uuid,
  p_driver_user_id uuid,
  p_next_state text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip RECORD;
  v_current_state text;
  v_valid_transition boolean := false;
BEGIN
  SELECT * INTO v_trip
  FROM buggy_trips
  WHERE id = p_trip_id AND resort_id = p_resort_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found or does not belong to this resort';
  END IF;

  IF v_trip.driver_user_id IS DISTINCT FROM p_driver_user_id THEN
    RAISE EXCEPTION 'Trip is not assigned to this driver';
  END IF;

  v_current_state := COALESCE(v_trip.lifecycle_state, v_trip.status::text);

  v_current_state := CASE v_current_state
    WHEN 'en_route' THEN 'enroute_to_pickup'
    WHEN 'active'   THEN 'enroute_to_dropoff'
    WHEN 'planning' THEN 'assigned'
    ELSE v_current_state
  END;

  CASE v_current_state
    WHEN 'assigned' THEN
      v_valid_transition := p_next_state = 'enroute_to_pickup';
    WHEN 'enroute_to_pickup' THEN
      v_valid_transition := p_next_state IN ('arrived_pickup', 'completed');
    WHEN 'arrived_pickup' THEN
      v_valid_transition := p_next_state IN ('enroute_to_dropoff', 'completed');
    WHEN 'enroute_to_dropoff' THEN
      v_valid_transition := p_next_state = 'completed';
    ELSE
      v_valid_transition := false;
  END CASE;

  IF NOT v_valid_transition THEN
    RAISE EXCEPTION 'Invalid state transition from % to %', v_current_state, p_next_state;
  END IF;

  UPDATE buggy_trips
  SET
    lifecycle_state = p_next_state,
    status = CASE
      WHEN p_next_state = 'enroute_to_pickup' THEN 'en_route'::buggy_trip_status
      WHEN p_next_state IN ('arrived_pickup', 'enroute_to_dropoff') THEN 'active'::buggy_trip_status
      WHEN p_next_state = 'completed' THEN 'completed'::buggy_trip_status
      ELSE status
    END,
    start_at = CASE
      WHEN p_next_state = 'enroute_to_pickup' AND start_at IS NULL THEN now()
      ELSE start_at
    END,
    completed_at = CASE
      WHEN p_next_state = 'completed' THEN now()
      ELSE completed_at
    END,
    updated_at = now()
  WHERE id = p_trip_id;

  IF p_next_state IN ('enroute_to_pickup', 'arrived_pickup', 'enroute_to_dropoff') THEN
    UPDATE buggy_trip_requests
    SET state = 'picked_up'::buggy_trip_request_state, updated_at = now()
    WHERE trip_id = p_trip_id AND state = 'queued';

    UPDATE buggy_requests
    SET status = 'picked_up'::buggy_request_status, updated_at = now()
    WHERE id IN (SELECT request_id FROM buggy_trip_requests WHERE trip_id = p_trip_id)
      AND status IN ('assigned_to_trip', 'driver_en_route', 'arrived');
  END IF;

  IF p_next_state = 'completed' THEN
    UPDATE buggy_trip_requests
    SET state = 'dropped_off'::buggy_trip_request_state, updated_at = now()
    WHERE trip_id = p_trip_id AND state IN ('queued', 'picked_up');

    UPDATE buggy_requests
    SET status = 'completed'::buggy_request_status, completed_at = now(), updated_at = now()
    WHERE id IN (SELECT request_id FROM buggy_trip_requests WHERE trip_id = p_trip_id)
      AND status NOT IN ('completed', 'cancelled', 'failed', 'no_show');

    -- Release buggy back to available
    UPDATE buggies
    SET status = 'available', updated_at = now()
    WHERE id = v_trip.buggy_id
      AND v_trip.buggy_id IS NOT NULL;

    -- Release driver back to online
    UPDATE buggy_drivers
    SET status = 'online', assigned_buggy_id = NULL, updated_at = now()
    WHERE user_id = p_driver_user_id
      AND resort_id = p_resort_id;
  END IF;

  INSERT INTO buggy_trip_events (trip_id, resort_id, event_type, from_status, to_status, actor_type, actor_user_id, payload)
  VALUES (p_trip_id, p_resort_id, 'state_change', v_current_state, p_next_state, 'driver', p_driver_user_id,
    jsonb_build_object('previous_state', v_current_state, 'new_state', p_next_state));

  RETURN jsonb_build_object(
    'success', true,
    'trip_id', p_trip_id,
    'previous_state', v_current_state,
    'current_state', p_next_state
  );
EXCEPTION
  WHEN lock_not_available THEN
    RAISE EXCEPTION 'Could not acquire lock. Another operation is in progress.';
END;
$$;

-- 2) Recreate rpc_transport_staff_update_trip_status with resource release
CREATE OR REPLACE FUNCTION public.rpc_transport_staff_update_trip_status(
  p_resort_id uuid,
  p_trip_id uuid,
  p_action text,
  p_staff_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_record RECORD;
  v_affected_count integer := 0;
  v_result jsonb;
BEGIN
  IF p_action NOT IN ('complete', 'cancel') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid action. Must be "complete" or "cancel".'
    );
  END IF;

  SELECT id, status, resort_id, buggy_id, driver_user_id
  INTO v_trip_record
  FROM buggy_trips
  WHERE id = p_trip_id
  FOR UPDATE;

  IF v_trip_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Trip not found.'
    );
  END IF;

  IF v_trip_record.resort_id != p_resort_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Trip does not belong to this resort.'
    );
  END IF;

  -- Handle COMPLETE
  IF p_action = 'complete' THEN
    IF v_trip_record.status NOT IN ('assigned', 'en_route', 'active') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Cannot complete trip with status "%s". Must be assigned, en_route, or active.', v_trip_record.status)
      );
    END IF;

    UPDATE buggy_trips
    SET
      status = 'completed',
      lifecycle_state = 'completed',
      end_at = now(),
      completed_at = now(),
      updated_at = now()
    WHERE id = p_trip_id;

    UPDATE buggy_trip_requests
    SET state = 'dropped_off', updated_at = now()
    WHERE trip_id = p_trip_id
      AND state NOT IN ('dropped_off', 'cancelled', 'no_show');

    GET DIAGNOSTICS v_affected_count = ROW_COUNT;

    UPDATE buggy_requests
    SET status = 'completed', completed_at = now(), updated_at = now()
    WHERE id IN (SELECT request_id FROM buggy_trip_requests WHERE trip_id = p_trip_id)
      AND status NOT IN ('completed', 'cancelled', 'failed', 'no_show');

    -- Release buggy
    UPDATE buggies
    SET status = 'available', updated_at = now()
    WHERE id = v_trip_record.buggy_id
      AND v_trip_record.buggy_id IS NOT NULL;

    -- Release driver
    UPDATE buggy_drivers
    SET status = 'online', assigned_buggy_id = NULL, updated_at = now()
    WHERE user_id = v_trip_record.driver_user_id
      AND v_trip_record.driver_user_id IS NOT NULL
      AND resort_id = p_resort_id;

    INSERT INTO buggy_trip_events (trip_id, resort_id, event_type, from_status, to_status, actor_type, actor_user_id, payload)
    VALUES (p_trip_id, p_resort_id, 'staff_completed', v_trip_record.status::text, 'completed', 'staff', p_staff_user_id,
      jsonb_build_object('reason', p_reason, 'affected_requests', v_affected_count));

    v_result := jsonb_build_object(
      'success', true,
      'trip_id', p_trip_id,
      'action', 'complete',
      'affected_requests', v_affected_count
    );

  -- Handle CANCEL
  ELSIF p_action = 'cancel' THEN
    IF v_trip_record.status NOT IN ('planning', 'assigned', 'en_route') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Cannot cancel trip with status "%s". Must be planning, assigned, or en_route.', v_trip_record.status)
      );
    END IF;

    UPDATE buggy_trips
    SET
      status = 'cancelled',
      cancelled_at = now(),
      updated_at = now()
    WHERE id = p_trip_id;

    UPDATE buggy_trip_requests
    SET state = 'cancelled', updated_at = now()
    WHERE trip_id = p_trip_id
      AND state NOT IN ('dropped_off', 'cancelled', 'no_show');

    GET DIAGNOSTICS v_affected_count = ROW_COUNT;

    UPDATE buggy_requests
    SET status = 'queued', attached_trip_id = NULL, assigned_at = NULL, updated_at = now()
    WHERE id IN (SELECT request_id FROM buggy_trip_requests WHERE trip_id = p_trip_id)
      AND status NOT IN ('completed', 'cancelled', 'failed', 'no_show');

    -- Release buggy (if assigned)
    UPDATE buggies
    SET status = 'available', updated_at = now()
    WHERE id = v_trip_record.buggy_id
      AND v_trip_record.buggy_id IS NOT NULL;

    -- Release driver (if assigned)
    UPDATE buggy_drivers
    SET status = 'online', assigned_buggy_id = NULL, updated_at = now()
    WHERE user_id = v_trip_record.driver_user_id
      AND v_trip_record.driver_user_id IS NOT NULL
      AND resort_id = p_resort_id;

    INSERT INTO buggy_trip_events (trip_id, resort_id, event_type, from_status, to_status, actor_type, actor_user_id, payload)
    VALUES (p_trip_id, p_resort_id, 'staff_cancelled', v_trip_record.status::text, 'cancelled', 'staff', p_staff_user_id,
      jsonb_build_object('reason', p_reason, 'affected_requests', v_affected_count));

    v_result := jsonb_build_object(
      'success', true,
      'trip_id', p_trip_id,
      'action', 'cancel',
      'affected_requests', v_affected_count
    );
  END IF;

  RETURN v_result;
END;
$$;

-- 3) One-time fix: release stuck buggies and drivers
UPDATE buggies SET status = 'available', updated_at = now()
WHERE status = 'in_use'
  AND id NOT IN (
    SELECT buggy_id FROM buggy_trips
    WHERE buggy_id IS NOT NULL
      AND status NOT IN ('completed', 'cancelled')
  );

UPDATE buggy_drivers SET status = 'online', assigned_buggy_id = NULL, updated_at = now()
WHERE status = 'on_trip'
  AND user_id NOT IN (
    SELECT driver_user_id FROM buggy_trips
    WHERE driver_user_id IS NOT NULL
      AND status NOT IN ('completed', 'cancelled')
  );
