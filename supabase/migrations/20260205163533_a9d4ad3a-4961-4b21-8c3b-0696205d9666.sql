-- Fix: Use valid enum value 'pooled_custom' instead of invalid 'on_demand'
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
  
  -- Validate all requests exist and are in correct status
  IF EXISTS (
    SELECT 1 FROM unnest(p_request_ids) AS rid
    WHERE NOT EXISTS (
      SELECT 1 FROM buggy_requests br
      WHERE br.id = rid
        AND br.resort_id = p_resort_id
        AND br.status IN ('requested', 'pending')
    )
  ) THEN
    RAISE EXCEPTION 'One or more requests are not in a valid state for trip creation';
  END IF;
  
  -- Create the trip with CORRECT enum value
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
    'pooled_custom',  -- FIXED: was 'on_demand' which is not a valid enum value
    p_created_by_staff_id,
    'planning',
    now(),
    now()
  )
  RETURNING id INTO v_trip_id;
  
  -- Process each request
  FOREACH v_request_id IN ARRAY p_request_ids
  LOOP
    -- FIRST: Create junction table entry (trip link) - must come before status update
    INSERT INTO buggy_trip_requests (
      resort_id, 
      trip_id, 
      request_id, 
      party_size, 
      state, 
      created_at, 
      updated_at
    )
    SELECT 
      p_resort_id, 
      v_trip_id, 
      v_request_id, 
      br.party_size, 
      'queued', 
      now(), 
      now()
    FROM buggy_requests br
    WHERE br.id = v_request_id
    ON CONFLICT DO NOTHING;
    
    -- THEN: Update the request status (trigger can now find the trip link)
    UPDATE buggy_requests
    SET 
      attached_trip_id = v_trip_id,
      assigned_at = NULL,
      status = 'assigned_to_trip',
      updated_at = now()
    WHERE id = v_request_id
      AND resort_id = p_resort_id;
    
    IF FOUND THEN
      v_attached_count := v_attached_count + 1;
      
      -- Get party size for total
      SELECT v_total_party_size + COALESCE(br.party_size, 1)
      INTO v_total_party_size
      FROM buggy_requests br
      WHERE br.id = v_request_id;
    END IF;
  END LOOP;
  
  -- Update trip capacity
  UPDATE buggy_trips
  SET capacity_total = v_total_party_size
  WHERE id = v_trip_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'trip_id', v_trip_id,
    'attached_request_count', v_attached_count
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$function$;