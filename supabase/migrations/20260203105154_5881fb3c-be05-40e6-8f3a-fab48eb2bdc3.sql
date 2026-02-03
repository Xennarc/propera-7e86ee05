-- RPC: Driver trip state machine
-- Phase 5: Driver Portal Lifecycle Transitions

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
  v_request_count int;
BEGIN
  -- 1) Lock and validate trip
  SELECT * INTO v_trip
  FROM buggy_trips
  WHERE id = p_trip_id
    AND resort_id = p_resort_id
  FOR UPDATE NOWAIT;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found or does not belong to this resort';
  END IF;
  
  -- 2) Verify driver ownership
  IF v_trip.driver_user_id IS DISTINCT FROM p_driver_user_id THEN
    RAISE EXCEPTION 'Trip is not assigned to this driver';
  END IF;
  
  -- 3) Get current lifecycle state (fallback to status if null)
  v_current_state := COALESCE(v_trip.lifecycle_state, v_trip.status);
  
  -- 4) Validate state transition
  -- Allowed: assigned → enroute_to_pickup → arrived_pickup → enroute_to_dropoff → completed
  IF v_current_state = 'assigned' AND p_next_state = 'enroute_to_pickup' THEN
    v_valid_transition := true;
  ELSIF v_current_state = 'enroute_to_pickup' AND p_next_state = 'arrived_pickup' THEN
    v_valid_transition := true;
  ELSIF v_current_state = 'arrived_pickup' AND p_next_state = 'enroute_to_dropoff' THEN
    v_valid_transition := true;
  ELSIF v_current_state = 'enroute_to_dropoff' AND p_next_state = 'completed' THEN
    v_valid_transition := true;
  END IF;
  
  IF NOT v_valid_transition THEN
    RAISE EXCEPTION 'Invalid state transition: % → %', v_current_state, p_next_state;
  END IF;
  
  -- 5) Handle completed state specially
  IF p_next_state = 'completed' THEN
    -- Mark trip completed
    UPDATE buggy_trips
    SET 
      lifecycle_state = 'completed',
      status = 'completed',
      completed_at = now(),
      updated_at = now()
    WHERE id = p_trip_id;
    
    -- Mark all attached requests as completed
    UPDATE buggy_requests
    SET 
      status = 'completed',
      completed_at = now(),
      updated_at = now()
    WHERE attached_trip_id = p_trip_id
      AND cancelled_at IS NULL;
    
    -- Get count for event
    GET DIAGNOSTICS v_request_count = ROW_COUNT;
    
    -- Update buggy to available
    UPDATE buggies
    SET status = 'available', updated_at = now()
    WHERE id = v_trip.buggy_id;
    
    -- Update driver to online
    UPDATE buggy_drivers
    SET 
      status = 'online',
      assigned_buggy_id = NULL,
      updated_at = now()
    WHERE user_id = p_driver_user_id
      AND resort_id = p_resort_id;
    
    -- Insert COMPLETED event
    INSERT INTO transport_events (
      resort_id, trip_id, actor_type, actor_id, event_type, payload
    ) VALUES (
      p_resort_id, p_trip_id, 'driver', p_driver_user_id, 'TRIP_COMPLETED',
      jsonb_build_object(
        'from_state', v_current_state,
        'completed_request_count', v_request_count
      )
    );
  ELSE
    -- Regular state transition
    UPDATE buggy_trips
    SET 
      lifecycle_state = p_next_state,
      -- Also update legacy status column for backwards compatibility
      status = CASE 
        WHEN p_next_state = 'enroute_to_pickup' THEN 'en_route'
        WHEN p_next_state = 'arrived_pickup' THEN 'active'
        WHEN p_next_state = 'enroute_to_dropoff' THEN 'active'
        ELSE status
      END,
      start_at = CASE WHEN p_next_state = 'enroute_to_pickup' THEN COALESCE(start_at, now()) ELSE start_at END,
      updated_at = now()
    WHERE id = p_trip_id;
    
    -- Insert state change event
    INSERT INTO transport_events (
      resort_id, trip_id, actor_type, actor_id, event_type, payload
    ) VALUES (
      p_resort_id, p_trip_id, 'driver', p_driver_user_id, 'TRIP_STATE_CHANGED',
      jsonb_build_object(
        'from_state', v_current_state,
        'to_state', p_next_state
      )
    );
  END IF;
  
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.rpc_transport_driver_update_trip_state(uuid, uuid, uuid, text) TO authenticated;