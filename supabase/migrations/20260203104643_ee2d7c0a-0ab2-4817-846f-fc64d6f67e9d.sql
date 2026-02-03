-- RPC: Atomic trip assignment with validation
-- Phase 4: Assign Buggy & Driver

CREATE OR REPLACE FUNCTION public.rpc_transport_assign_trip(
  p_resort_id uuid,
  p_trip_id uuid,
  p_buggy_id uuid,
  p_driver_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_record RECORD;
  v_buggy_record RECORD;
  v_driver_record RECORD;
  v_attached_count int;
BEGIN
  -- 1) Lock and validate trip
  SELECT * INTO v_trip_record
  FROM buggy_trips
  WHERE id = p_trip_id
    AND resort_id = p_resort_id
  FOR UPDATE NOWAIT;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found or does not belong to this resort';
  END IF;
  
  IF v_trip_record.lifecycle_state NOT IN ('planning', NULL) OR v_trip_record.status != 'planning' THEN
    RAISE EXCEPTION 'Trip is not in planning state (current: %)', COALESCE(v_trip_record.lifecycle_state, v_trip_record.status);
  END IF;
  
  IF v_trip_record.cancelled_at IS NOT NULL THEN
    RAISE EXCEPTION 'Trip has been cancelled';
  END IF;
  
  -- 2) Validate trip has at least 1 attached request
  SELECT COUNT(*) INTO v_attached_count
  FROM buggy_trip_requests
  WHERE trip_id = p_trip_id
    AND state IN ('queued', 'picked_up');
  
  IF v_attached_count < 1 THEN
    RAISE EXCEPTION 'Trip must have at least one attached request to assign';
  END IF;
  
  -- 3) Lock and validate buggy
  SELECT * INTO v_buggy_record
  FROM buggies
  WHERE id = p_buggy_id
    AND resort_id = p_resort_id
  FOR UPDATE NOWAIT;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Buggy not found or does not belong to this resort';
  END IF;
  
  IF v_buggy_record.status != 'available' THEN
    RAISE EXCEPTION 'Buggy is not available (current status: %)', v_buggy_record.status;
  END IF;
  
  -- 4) Lock and validate driver
  SELECT * INTO v_driver_record
  FROM buggy_drivers
  WHERE user_id = p_driver_user_id
    AND resort_id = p_resort_id
  FOR UPDATE NOWAIT;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Driver not found or does not belong to this resort';
  END IF;
  
  IF v_driver_record.status != 'online' THEN
    RAISE EXCEPTION 'Driver is not online (current status: %)', v_driver_record.status;
  END IF;
  
  -- 5) Assign buggy and driver to trip
  UPDATE buggy_trips
  SET 
    buggy_id = p_buggy_id,
    driver_user_id = p_driver_user_id,
    status = 'assigned',
    lifecycle_state = 'assigned',
    updated_at = now()
  WHERE id = p_trip_id;
  
  -- 6) Set assigned_at on all attached requests
  UPDATE buggy_requests
  SET 
    assigned_at = now(),
    status = 'assigned_to_trip',
    updated_at = now()
  WHERE attached_trip_id = p_trip_id
    AND cancelled_at IS NULL;
  
  -- 7) Update buggy status to in_use
  UPDATE buggies
  SET 
    status = 'in_use',
    updated_at = now()
  WHERE id = p_buggy_id;
  
  -- 8) Update driver status to on_trip and assign buggy
  UPDATE buggy_drivers
  SET 
    status = 'on_trip',
    assigned_buggy_id = p_buggy_id,
    updated_at = now()
  WHERE user_id = p_driver_user_id
    AND resort_id = p_resort_id;
  
  -- 9) Insert ASSIGNED event
  INSERT INTO transport_events (
    resort_id,
    trip_id,
    actor_type,
    actor_id,
    event_type,
    payload
  ) VALUES (
    p_resort_id,
    p_trip_id,
    'staff',
    auth.uid(),
    'TRIP_ASSIGNED',
    jsonb_build_object(
      'buggy_id', p_buggy_id,
      'buggy_name', v_buggy_record.name,
      'driver_user_id', p_driver_user_id,
      'attached_request_count', v_attached_count
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'trip_id', p_trip_id,
    'buggy_id', p_buggy_id,
    'driver_user_id', p_driver_user_id,
    'assigned_request_count', v_attached_count
  );

EXCEPTION
  WHEN lock_not_available THEN
    RAISE EXCEPTION 'Could not acquire lock on resources. Another operation is in progress.';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.rpc_transport_assign_trip(uuid, uuid, uuid, uuid) TO authenticated;