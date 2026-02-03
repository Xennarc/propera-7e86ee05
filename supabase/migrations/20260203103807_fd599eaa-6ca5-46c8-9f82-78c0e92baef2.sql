-- Phase 2: Atomic Trip Creation RPC
-- Creates a new SECURITY DEFINER RPC for atomic trip creation

CREATE OR REPLACE FUNCTION public.rpc_transport_create_trip_from_requests(
  p_resort_id uuid,
  p_request_ids uuid[],
  p_created_by_staff_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_id uuid;
  v_request_id uuid;
  v_request_count int := 0;
  v_valid_count int := 0;
  v_invalid_requests jsonb := '[]'::jsonb;
  v_request_record record;
BEGIN
  -- Validate input
  IF p_resort_id IS NULL THEN
    RAISE EXCEPTION 'resort_id is required';
  END IF;
  
  IF p_request_ids IS NULL OR array_length(p_request_ids, 1) IS NULL OR array_length(p_request_ids, 1) = 0 THEN
    RAISE EXCEPTION 'At least one request_id is required';
  END IF;
  
  v_request_count := array_length(p_request_ids, 1);
  
  -- Lock and validate ALL requests atomically
  FOR v_request_record IN
    SELECT 
      br.id,
      br.resort_id,
      br.status,
      br.attached_trip_id,
      br.cancelled_at
    FROM buggy_requests br
    WHERE br.id = ANY(p_request_ids)
    FOR UPDATE NOWAIT
  LOOP
    -- Check resort ownership
    IF v_request_record.resort_id != p_resort_id THEN
      v_invalid_requests := v_invalid_requests || jsonb_build_object(
        'request_id', v_request_record.id,
        'reason', 'Request does not belong to this resort'
      );
      CONTINUE;
    END IF;
    
    -- Check not cancelled
    IF v_request_record.status = 'cancelled' OR v_request_record.cancelled_at IS NOT NULL THEN
      v_invalid_requests := v_invalid_requests || jsonb_build_object(
        'request_id', v_request_record.id,
        'reason', 'Request is cancelled'
      );
      CONTINUE;
    END IF;
    
    -- Check not already attached to another trip
    IF v_request_record.attached_trip_id IS NOT NULL THEN
      v_invalid_requests := v_invalid_requests || jsonb_build_object(
        'request_id', v_request_record.id,
        'reason', 'Request is already attached to trip ' || v_request_record.attached_trip_id::text
      );
      CONTINUE;
    END IF;
    
    v_valid_count := v_valid_count + 1;
  END LOOP;
  
  -- Check if all requested IDs were found
  IF v_valid_count + jsonb_array_length(v_invalid_requests) < v_request_count THEN
    RAISE EXCEPTION 'Some request IDs were not found in the database';
  END IF;
  
  -- If ANY validation failed, rollback entirely
  IF jsonb_array_length(v_invalid_requests) > 0 THEN
    RAISE EXCEPTION 'Validation failed for % request(s): %', 
      jsonb_array_length(v_invalid_requests), 
      v_invalid_requests::text;
  END IF;
  
  -- All validations passed - create the trip
  INSERT INTO buggy_trips (
    resort_id,
    trip_type,
    status,
    lifecycle_state,
    created_by_staff_id,
    created_at,
    updated_at
  ) VALUES (
    p_resort_id,
    'pooled_custom',
    'planning',
    'planning',
    p_created_by_staff_id,
    now(),
    now()
  )
  RETURNING id INTO v_trip_id;
  
  -- Record TRIP_CREATED event
  INSERT INTO transport_events (
    resort_id,
    trip_id,
    request_id,
    actor_type,
    actor_id,
    event_type,
    payload,
    created_at
  ) VALUES (
    p_resort_id,
    v_trip_id,
    NULL,
    'staff',
    p_created_by_staff_id,
    'TRIP_CREATED',
    jsonb_build_object(
      'request_ids', p_request_ids,
      'request_count', v_request_count
    ),
    now()
  );
  
  -- Attach ALL requests to the trip
  FOREACH v_request_id IN ARRAY p_request_ids
  LOOP
    -- Update the request
    UPDATE buggy_requests
    SET 
      attached_trip_id = v_trip_id,
      assigned_at = NULL,  -- Will be set when driver is assigned
      status = 'assigned_to_trip',
      updated_at = now()
    WHERE id = v_request_id;
    
    -- Create junction table entry if buggy_trip_requests exists
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
    
    -- Record REQUEST_ATTACHED event
    INSERT INTO transport_events (
      resort_id,
      trip_id,
      request_id,
      actor_type,
      actor_id,
      event_type,
      payload,
      created_at
    ) VALUES (
      p_resort_id,
      v_trip_id,
      v_request_id,
      'staff',
      p_created_by_staff_id,
      'REQUEST_ATTACHED',
      jsonb_build_object(
        'trip_id', v_trip_id
      ),
      now()
    );
  END LOOP;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'trip_id', v_trip_id,
    'attached_request_count', v_request_count
  );
  
EXCEPTION
  WHEN lock_not_available THEN
    RAISE EXCEPTION 'Could not acquire lock on requests - another operation is in progress';
  WHEN OTHERS THEN
    -- Re-raise the exception to trigger rollback
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.rpc_transport_create_trip_from_requests(uuid, uuid[], uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.rpc_transport_create_trip_from_requests IS 
'Atomically creates a trip from multiple requests. 
Validates all requests belong to resort, are not cancelled, and not already attached.
On any failure, rolls back entirely - requests remain in queue.
Returns: {success: bool, trip_id: uuid, attached_request_count: int}';