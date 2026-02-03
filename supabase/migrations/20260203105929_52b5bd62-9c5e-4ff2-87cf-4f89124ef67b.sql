-- RPC: Cancel transport request with trip reconciliation
-- Phase 6: Guest Cancellation Reconciliation

CREATE OR REPLACE FUNCTION public.rpc_transport_cancel_request(
  p_resort_id uuid,
  p_request_id uuid,
  p_actor_type text,
  p_actor_id uuid,
  p_reason text DEFAULT 'Cancelled'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_trip_id uuid;
  v_remaining_requests int;
BEGIN
  -- 1) Lock and validate request
  SELECT * INTO v_request
  FROM buggy_requests
  WHERE id = p_request_id
    AND resort_id = p_resort_id
  FOR UPDATE NOWAIT;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or does not belong to this resort';
  END IF;
  
  -- 2) Check if already cancelled/completed
  IF v_request.cancelled_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_cancelled', true,
      'request_id', p_request_id
    );
  END IF;
  
  IF v_request.status = 'completed' OR v_request.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot cancel a completed request';
  END IF;
  
  -- 3) Store attached trip id before detaching
  v_trip_id := v_request.attached_trip_id;
  
  -- 4) Mark request as cancelled
  UPDATE buggy_requests
  SET 
    status = 'cancelled',
    cancelled_at = now(),
    status_reason = p_reason,
    attached_trip_id = NULL,
    updated_at = now()
  WHERE id = p_request_id;
  
  -- 5) Insert CANCELLED event
  INSERT INTO transport_events (
    resort_id, request_id, actor_type, actor_id, event_type, payload
  ) VALUES (
    p_resort_id, p_request_id, p_actor_type, p_actor_id, 'REQUEST_CANCELLED',
    jsonb_build_object(
      'reason', p_reason,
      'previous_status', v_request.status,
      'was_attached_to_trip', v_trip_id IS NOT NULL
    )
  );
  
  -- 6) If request was attached to a trip, handle reconciliation
  IF v_trip_id IS NOT NULL THEN
    -- Remove from buggy_trip_requests junction if exists
    DELETE FROM buggy_trip_requests
    WHERE request_id = p_request_id
      AND trip_id = v_trip_id;
    
    -- Count remaining active requests on trip
    SELECT COUNT(*) INTO v_remaining_requests
    FROM buggy_requests
    WHERE attached_trip_id = v_trip_id
      AND cancelled_at IS NULL;
    
    -- If trip has 0 remaining requests and is still in planning/assigned state, cancel it
    IF v_remaining_requests = 0 THEN
      UPDATE buggy_trips
      SET 
        status = 'cancelled',
        lifecycle_state = 'cancelled',
        cancelled_at = now(),
        updated_at = now()
      WHERE id = v_trip_id
        AND status IN ('planning', 'assigned')
        AND completed_at IS NULL
        AND cancelled_at IS NULL;
      
      -- If trip was cancelled, log event
      IF FOUND THEN
        INSERT INTO transport_events (
          resort_id, trip_id, actor_type, actor_id, event_type, payload
        ) VALUES (
          p_resort_id, v_trip_id, 'system', NULL, 'TRIP_AUTO_CANCELLED',
          jsonb_build_object(
            'reason', 'All attached requests cancelled',
            'triggering_request_id', p_request_id
          )
        );
        
        -- Release buggy/driver if assigned
        UPDATE buggies
        SET status = 'available', updated_at = now()
        WHERE id = (SELECT buggy_id FROM buggy_trips WHERE id = v_trip_id)
          AND status = 'in_use';
        
        UPDATE buggy_drivers
        SET 
          status = 'online',
          assigned_buggy_id = NULL,
          updated_at = now()
        WHERE user_id = (SELECT driver_user_id FROM buggy_trips WHERE id = v_trip_id)
          AND status = 'on_trip';
      END IF;
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'was_attached_to_trip', v_trip_id IS NOT NULL,
    'trip_cancelled', v_trip_id IS NOT NULL AND v_remaining_requests = 0
  );

EXCEPTION
  WHEN lock_not_available THEN
    RAISE EXCEPTION 'Could not acquire lock. Another operation is in progress.';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.rpc_transport_cancel_request(uuid, uuid, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_transport_cancel_request(uuid, uuid, text, uuid, text) TO anon;