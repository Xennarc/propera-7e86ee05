-- ============================================================
-- Fix Transport Dispatch Lifecycle: Enum + Actor Type Case
-- ============================================================
-- Issues fixed:
-- 1. buggy_status enum missing 'in_use' value
-- 2. RPCs inserting uppercase 'STAFF' into buggy_trip_events.actor_type
--    which violates CHECK constraint requiring lowercase values

-- Phase 1A: Add missing 'in_use' to buggy_status enum
ALTER TYPE public.buggy_status ADD VALUE IF NOT EXISTS 'in_use';

-- Phase 1B: Recreate add_request_to_trip with lowercase actor_type
CREATE OR REPLACE FUNCTION public.add_request_to_trip(
  p_trip_id uuid,
  p_request_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resort_id uuid;
  v_trip_status text;
  v_request_status text;
  v_request_resort_id uuid;
  v_party_size int;
  v_pickup_stop_id uuid;
  v_dropoff_stop_id uuid;
  v_pickup_text text;
  v_dropoff_text text;
  v_max_seq int;
BEGIN
  -- Lock trip row
  SELECT resort_id, status INTO v_resort_id, v_trip_status
  FROM buggy_trips
  WHERE id = p_trip_id
  FOR UPDATE;
  
  IF v_resort_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Trip not found');
  END IF;
  
  IF v_trip_status NOT IN ('planning', 'assigned') THEN
    RETURN json_build_object('success', false, 'error', 'Trip is not in a state that allows adding requests');
  END IF;
  
  -- Lock request row
  SELECT resort_id, status, party_size, pickup_stop_id, dropoff_stop_id, pickup_text, dropoff_text
  INTO v_request_resort_id, v_request_status, v_party_size, v_pickup_stop_id, v_dropoff_stop_id, v_pickup_text, v_dropoff_text
  FROM buggy_requests
  WHERE id = p_request_id
  FOR UPDATE;
  
  IF v_request_resort_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Request not found');
  END IF;
  
  IF v_request_resort_id != v_resort_id THEN
    RETURN json_build_object('success', false, 'error', 'Request does not belong to this resort');
  END IF;
  
  -- FIXED: Use correct enum values (was 'pending', now 'requested' or 'queued')
  IF v_request_status NOT IN ('requested', 'queued') THEN
    RETURN json_build_object('success', false, 'error', 'Request is not in a queued state (status: ' || v_request_status || ')');
  END IF;
  
  -- Attach request to trip
  UPDATE buggy_requests
  SET attached_trip_id = p_trip_id,
      status = 'assigned_to_trip',
      assigned_at = now(),
      updated_at = now()
  WHERE id = p_request_id;
  
  -- FIXED: Create junction entry with correct enum value (was 'active', now 'queued')
  INSERT INTO buggy_trip_requests (
    trip_id, request_id, resort_id, party_size, state
  ) VALUES (
    p_trip_id, p_request_id, v_resort_id, v_party_size, 'queued'
  );
  
  -- Get max sequence for stops
  SELECT COALESCE(MAX(sequence), 0) INTO v_max_seq
  FROM buggy_trip_stops
  WHERE trip_id = p_trip_id;
  
  -- Add pickup stop
  INSERT INTO buggy_trip_stops (
    trip_id, resort_id, stop_id, stop_kind, title, sequence, status, related_request_id
  ) VALUES (
    p_trip_id, v_resort_id, v_pickup_stop_id, 'pickup',
    COALESCE((SELECT name FROM buggy_stops WHERE id = v_pickup_stop_id), v_pickup_text, 'Pickup'),
    v_max_seq + 1, 'pending', p_request_id
  );
  
  -- Add dropoff stop
  INSERT INTO buggy_trip_stops (
    trip_id, resort_id, stop_id, stop_kind, title, sequence, status, related_request_id
  ) VALUES (
    p_trip_id, v_resort_id, v_dropoff_stop_id, 'dropoff',
    COALESCE((SELECT name FROM buggy_stops WHERE id = v_dropoff_stop_id), v_dropoff_text, 'Dropoff'),
    v_max_seq + 2, 'pending', p_request_id
  );
  
  -- Log event - FIXED: Use lowercase 'staff' (was 'STAFF')
  INSERT INTO buggy_trip_events (
    trip_id, resort_id, event_type, actor_type, payload
  ) VALUES (
    p_trip_id, v_resort_id, 'REQUEST_ATTACHED', 'staff',
    json_build_object('request_id', p_request_id, 'party_size', v_party_size)
  );
  
  RETURN json_build_object(
    'success', true,
    'trip_id', p_trip_id,
    'request_id', p_request_id
  );
END;
$$;

-- Phase 1C: Recreate rpc_transport_attach_requests_to_trip with lowercase actor_type
CREATE OR REPLACE FUNCTION public.rpc_transport_attach_requests_to_trip(
  p_resort_id uuid,
  p_trip_id uuid,
  p_request_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_resort_id uuid;
  v_trip_status text;
  v_trip_lifecycle text;
  v_req record;
  v_attached_count int := 0;
  v_attached_ids uuid[] := '{}';
  v_max_seq int;
  v_validation_errors text[] := '{}';
BEGIN
  -- Validate trip exists and lock it
  SELECT resort_id, status, lifecycle_state
  INTO v_trip_resort_id, v_trip_status, v_trip_lifecycle
  FROM buggy_trips
  WHERE id = p_trip_id
  FOR UPDATE;
  
  IF v_trip_resort_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trip not found');
  END IF;
  
  IF v_trip_resort_id != p_resort_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trip does not belong to this resort');
  END IF;
  
  -- Trip must be in planning state
  IF v_trip_status != 'planning' AND v_trip_lifecycle != 'planning' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trip must be in planning state to add requests');
  END IF;
  
  -- Get current max sequence
  SELECT COALESCE(MAX(sequence), 0) INTO v_max_seq
  FROM buggy_trip_stops
  WHERE trip_id = p_trip_id;
  
  -- Validate and attach each request
  FOR v_req IN
    SELECT id, resort_id, status, attached_trip_id, party_size, 
           pickup_stop_id, dropoff_stop_id, pickup_text, dropoff_text,
           cancelled_at
    FROM buggy_requests
    WHERE id = ANY(p_request_ids)
    FOR UPDATE
  LOOP
    -- Validation checks
    IF v_req.resort_id != p_resort_id THEN
      v_validation_errors := array_append(v_validation_errors, 'Request ' || v_req.id || ' belongs to different resort');
      CONTINUE;
    END IF;
    
    IF v_req.cancelled_at IS NOT NULL THEN
      v_validation_errors := array_append(v_validation_errors, 'Request ' || v_req.id || ' is cancelled');
      CONTINUE;
    END IF;
    
    IF v_req.attached_trip_id IS NOT NULL THEN
      v_validation_errors := array_append(v_validation_errors, 'Request ' || v_req.id || ' already attached to a trip');
      CONTINUE;
    END IF;
    
    IF v_req.status NOT IN ('requested', 'queued') THEN
      v_validation_errors := array_append(v_validation_errors, 'Request ' || v_req.id || ' has invalid status: ' || v_req.status);
      CONTINUE;
    END IF;
    
    -- Attach request to trip
    UPDATE buggy_requests
    SET attached_trip_id = p_trip_id,
        status = 'assigned_to_trip',
        assigned_at = now(),
        updated_at = now()
    WHERE id = v_req.id;
    
    -- Create junction entry
    INSERT INTO buggy_trip_requests (
      trip_id, request_id, resort_id, party_size, state
    ) VALUES (
      p_trip_id, v_req.id, p_resort_id, v_req.party_size, 'queued'
    );
    
    -- Add pickup stop
    v_max_seq := v_max_seq + 1;
    INSERT INTO buggy_trip_stops (
      trip_id, resort_id, stop_id, stop_kind, title, sequence, status, related_request_id
    ) VALUES (
      p_trip_id, p_resort_id, v_req.pickup_stop_id, 'pickup',
      COALESCE((SELECT name FROM buggy_stops WHERE id = v_req.pickup_stop_id), v_req.pickup_text, 'Pickup'),
      v_max_seq, 'pending', v_req.id
    );
    
    -- Add dropoff stop
    v_max_seq := v_max_seq + 1;
    INSERT INTO buggy_trip_stops (
      trip_id, resort_id, stop_id, stop_kind, title, sequence, status, related_request_id
    ) VALUES (
      p_trip_id, p_resort_id, v_req.dropoff_stop_id, 'dropoff',
      COALESCE((SELECT name FROM buggy_stops WHERE id = v_req.dropoff_stop_id), v_req.dropoff_text, 'Dropoff'),
      v_max_seq, 'pending', v_req.id
    );
    
    -- Log event - FIXED: Use lowercase 'staff' (was 'STAFF')
    INSERT INTO buggy_trip_events (
      trip_id, resort_id, event_type, actor_type, payload
    ) VALUES (
      p_trip_id, p_resort_id, 'REQUEST_ATTACHED', 'staff',
      jsonb_build_object('request_id', v_req.id, 'party_size', v_req.party_size)
    );
    
    v_attached_count := v_attached_count + 1;
    v_attached_ids := array_append(v_attached_ids, v_req.id);
  END LOOP;
  
  -- If no requests were attached, rollback-safe return
  IF v_attached_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No requests were attached',
      'validation_errors', v_validation_errors
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'trip_id', p_trip_id,
    'attached_count', v_attached_count,
    'request_ids', v_attached_ids,
    'validation_errors', v_validation_errors
  );
END;
$$;

-- Phase 1D: Recreate rpc_transport_cancel_empty_trip with lowercase actor_type
CREATE OR REPLACE FUNCTION public.rpc_transport_cancel_empty_trip(
  p_resort_id uuid,
  p_trip_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_resort_id uuid;
  v_trip_status text;
  v_trip_lifecycle text;
  v_active_request_count int;
BEGIN
  -- Lock trip row
  SELECT resort_id, status, lifecycle_state
  INTO v_trip_resort_id, v_trip_status, v_trip_lifecycle
  FROM buggy_trips
  WHERE id = p_trip_id
  FOR UPDATE;
  
  IF v_trip_resort_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trip not found');
  END IF;
  
  IF v_trip_resort_id != p_resort_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trip does not belong to this resort');
  END IF;
  
  -- Trip must be in planning state
  IF v_trip_status != 'planning' AND v_trip_lifecycle != 'planning' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only planning trips can be cancelled this way');
  END IF;
  
  -- Count active attached requests
  SELECT COUNT(*) INTO v_active_request_count
  FROM buggy_trip_requests btr
  JOIN buggy_requests br ON br.id = btr.request_id
  WHERE btr.trip_id = p_trip_id
    AND btr.state IN ('queued', 'picked_up')
    AND br.cancelled_at IS NULL;
  
  IF v_active_request_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot cancel trip with ' || v_active_request_count || ' active request(s). Remove requests first.'
    );
  END IF;
  
  -- Cancel the trip
  UPDATE buggy_trips
  SET status = 'cancelled',
      lifecycle_state = 'cancelled',
      cancelled_at = now(),
      updated_at = now()
  WHERE id = p_trip_id;
  
  -- Mark any remaining junction entries as cancelled
  UPDATE buggy_trip_requests
  SET state = 'cancelled',
      updated_at = now()
  WHERE trip_id = p_trip_id
    AND state NOT IN ('cancelled', 'dropped_off', 'no_show');
  
  -- Log event - FIXED: Use lowercase 'staff' (was 'STAFF')
  INSERT INTO buggy_trip_events (
    trip_id, resort_id, event_type, actor_type, payload
  ) VALUES (
    p_trip_id, p_resort_id, 'TRIP_CANCELLED', 'staff',
    jsonb_build_object('reason', 'Empty trip removed by staff')
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'trip_id', p_trip_id
  );
END;
$$;