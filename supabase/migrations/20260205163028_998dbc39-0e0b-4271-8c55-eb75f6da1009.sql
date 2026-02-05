-- Fix race condition: insert trip link BEFORE updating request status
-- This ensures the trigger can find the trip link when validating

CREATE OR REPLACE FUNCTION public.rpc_transport_create_trip_from_requests(
  p_resort_id uuid,
  p_request_ids uuid[],
  p_created_by_staff_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_trip_id uuid;
  v_request_id uuid;
  v_attached_count integer := 0;
  v_total_party_size integer := 0;
BEGIN
  -- Validate inputs
  IF p_resort_id IS NULL THEN
    RAISE EXCEPTION 'Resort ID is required';
  END IF;
  
  IF p_request_ids IS NULL OR array_length(p_request_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one request ID is required';
  END IF;

  -- Lock and validate all requests exist and are in valid state
  PERFORM 1 FROM buggy_requests
  WHERE id = ANY(p_request_ids)
    AND resort_id = p_resort_id
    AND status IN ('requested', 'queued')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'One or more requests not found or not in valid state';
  END IF;

  -- Create the trip
  INSERT INTO buggy_trips (
    resort_id,
    status,
    trip_type,
    created_by_staff_id,
    lifecycle_state,
    created_at,
    updated_at
  ) VALUES (
    p_resort_id,
    'planning',
    'on_demand',
    p_created_by_staff_id,
    'planning',
    now(),
    now()
  )
  RETURNING id INTO v_trip_id;

  -- Process each request
  FOREACH v_request_id IN ARRAY p_request_ids
  LOOP
    -- 1. FIRST: Create junction table entry (trip link)
    -- This MUST happen before updating request status so the trigger can find it
    INSERT INTO buggy_trip_requests (
      resort_id, trip_id, request_id, party_size, state, created_at, updated_at
    )
    SELECT p_resort_id, v_trip_id, v_request_id, br.party_size, 'queued', now(), now()
    FROM buggy_requests br
    WHERE br.id = v_request_id
    ON CONFLICT DO NOTHING;

    -- 2. THEN: Update the request status (trigger can now find the trip link)
    UPDATE buggy_requests
    SET 
      attached_trip_id = v_trip_id,
      assigned_at = NULL,
      status = 'assigned_to_trip',
      updated_at = now()
    WHERE id = v_request_id
      AND resort_id = p_resort_id;

    -- Track counts
    SELECT party_size INTO v_total_party_size
    FROM buggy_requests WHERE id = v_request_id;
    
    v_attached_count := v_attached_count + 1;
  END LOOP;

  -- Update trip capacity
  UPDATE buggy_trips
  SET capacity_total = (
    SELECT COALESCE(SUM(party_size), 0)
    FROM buggy_trip_requests
    WHERE trip_id = v_trip_id AND state = 'queued'
  )
  WHERE id = v_trip_id;

  RETURN jsonb_build_object(
    'success', true,
    'trip_id', v_trip_id,
    'attached_request_count', v_attached_count
  );
END;
$function$;