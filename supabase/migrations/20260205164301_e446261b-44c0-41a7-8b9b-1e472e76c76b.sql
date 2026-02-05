-- Fix: Replace invalid 'pending' with valid enum value 'queued'
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
  -- Validate: all request IDs belong to this resort and are in valid status
  IF EXISTS (
    SELECT 1 FROM unnest(p_request_ids) AS rid
    WHERE NOT EXISTS (
      SELECT 1 FROM buggy_requests br
      WHERE br.id = rid
        AND br.resort_id = p_resort_id
        AND br.status IN ('requested', 'queued')  -- ✅ FIXED: was 'pending'
        AND br.attached_trip_id IS NULL
    )
  ) THEN
    RAISE EXCEPTION 'One or more requests are invalid, already assigned, or not in a valid status';
  END IF;

  -- Create the trip
  INSERT INTO buggy_trips (
    resort_id, status, trip_type, created_by_staff_id, lifecycle_state, created_at, updated_at
  ) VALUES (
    p_resort_id,
    'planning',
    'pooled_custom',
    p_created_by_staff_id,
    'planning',
    now(),
    now()
  )
  RETURNING id INTO v_trip_id;

  -- Attach requests to trip (MUST happen before status update for trigger validation)
  FOREACH v_request_id IN ARRAY p_request_ids
  LOOP
    -- Get party size for junction table
    SELECT party_size INTO v_total_party_size
    FROM buggy_requests WHERE id = v_request_id;

    -- Insert junction record first
    INSERT INTO buggy_trip_requests (
      trip_id, request_id, resort_id, party_size, state, created_at, updated_at
    ) VALUES (
      v_trip_id, v_request_id, p_resort_id, COALESCE(v_total_party_size, 1), 'queued', now(), now()
    );

    -- Update request to point to trip and set status
    UPDATE buggy_requests
    SET attached_trip_id = v_trip_id,
        status = 'queued',
        updated_at = now()
    WHERE id = v_request_id;

    v_attached_count := v_attached_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'trip_id', v_trip_id,
    'attached_request_count', v_attached_count
  );
END;
$function$;