-- Create RPC for staff to complete or cancel trips
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
  -- Validate action
  IF p_action NOT IN ('complete', 'cancel') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid action. Must be "complete" or "cancel".'
    );
  END IF;

  -- Lock and fetch the trip
  SELECT id, status, resort_id
  INTO v_trip_record
  FROM buggy_trips
  WHERE id = p_trip_id
  FOR UPDATE;

  -- Validate trip exists
  IF v_trip_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Trip not found.'
    );
  END IF;

  -- Validate resort ownership
  IF v_trip_record.resort_id != p_resort_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Trip does not belong to this resort.'
    );
  END IF;

  -- Handle COMPLETE action
  IF p_action = 'complete' THEN
    -- Validate status allows completion
    IF v_trip_record.status NOT IN ('assigned', 'en_route', 'active') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Cannot complete trip with status "%s". Must be assigned, en_route, or active.', v_trip_record.status)
      );
    END IF;

    -- Update trip to completed
    UPDATE buggy_trips
    SET 
      status = 'completed',
      lifecycle_state = 'completed',
      end_at = now(),
      completed_at = now(),
      updated_at = now()
    WHERE id = p_trip_id;

    -- Update all trip_requests to dropped_off
    UPDATE buggy_trip_requests
    SET 
      state = 'dropped_off',
      updated_at = now()
    WHERE trip_id = p_trip_id
      AND state NOT IN ('dropped_off', 'cancelled', 'no_show');

    GET DIAGNOSTICS v_affected_count = ROW_COUNT;

    -- Update all linked requests to completed
    UPDATE buggy_requests
    SET 
      status = 'completed',
      completed_at = now(),
      updated_at = now()
    WHERE id IN (
      SELECT request_id FROM buggy_trip_requests WHERE trip_id = p_trip_id
    )
    AND status NOT IN ('completed', 'cancelled', 'failed', 'no_show');

    -- Log the event
    INSERT INTO buggy_trip_events (
      trip_id,
      resort_id,
      event_type,
      from_status,
      to_status,
      actor_type,
      actor_user_id,
      payload
    ) VALUES (
      p_trip_id,
      p_resort_id,
      'staff_completed',
      v_trip_record.status::text,
      'completed',
      'staff',
      p_staff_user_id,
      jsonb_build_object('reason', p_reason, 'affected_requests', v_affected_count)
    );

    v_result := jsonb_build_object(
      'success', true,
      'trip_id', p_trip_id,
      'action', 'complete',
      'affected_requests', v_affected_count
    );

  -- Handle CANCEL action
  ELSIF p_action = 'cancel' THEN
    -- Validate status allows cancellation
    IF v_trip_record.status NOT IN ('planning', 'assigned', 'en_route') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Cannot cancel trip with status "%s". Must be planning, assigned, or en_route.', v_trip_record.status)
      );
    END IF;

    -- Update trip to cancelled
    UPDATE buggy_trips
    SET 
      status = 'cancelled',
      cancelled_at = now(),
      updated_at = now()
    WHERE id = p_trip_id;

    -- Update trip_requests to cancelled
    UPDATE buggy_trip_requests
    SET 
      state = 'cancelled',
      updated_at = now()
    WHERE trip_id = p_trip_id
      AND state NOT IN ('dropped_off', 'cancelled', 'no_show');

    GET DIAGNOSTICS v_affected_count = ROW_COUNT;

    -- Return requests to queue (set status back to queued, clear trip reference)
    UPDATE buggy_requests
    SET 
      status = 'queued',
      attached_trip_id = NULL,
      assigned_at = NULL,
      updated_at = now()
    WHERE id IN (
      SELECT request_id FROM buggy_trip_requests WHERE trip_id = p_trip_id
    )
    AND status NOT IN ('completed', 'cancelled', 'failed', 'no_show');

    -- Log the event
    INSERT INTO buggy_trip_events (
      trip_id,
      resort_id,
      event_type,
      from_status,
      to_status,
      actor_type,
      actor_user_id,
      payload
    ) VALUES (
      p_trip_id,
      p_resort_id,
      'staff_cancelled',
      v_trip_record.status::text,
      'cancelled',
      'staff',
      p_staff_user_id,
      jsonb_build_object('reason', p_reason, 'affected_requests', v_affected_count)
    );

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