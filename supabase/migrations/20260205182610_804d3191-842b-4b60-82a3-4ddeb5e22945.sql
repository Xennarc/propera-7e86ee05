-- Fix rpc_transport_create_trip_from_requests to generate buggy_trip_stops entries
-- This ensures drivers can see pickup/dropoff information in the Driver Portal

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
  v_request record;
  v_attached_count integer := 0;
  v_stop_sequence integer := 0;
  v_pickup_title text;
  v_dropoff_title text;
  v_pickup_location jsonb;
  v_dropoff_location jsonb;
BEGIN
  -- Validate: all request IDs belong to this resort and are in valid status
  IF EXISTS (
    SELECT 1 FROM unnest(p_request_ids) AS rid
    WHERE NOT EXISTS (
      SELECT 1 FROM buggy_requests br
      WHERE br.id = rid
        AND br.resort_id = p_resort_id
        AND br.status IN ('requested', 'queued')
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

  -- Attach requests to trip and create stops
  FOR v_request IN 
    SELECT br.*, 
           ps.name AS pickup_stop_name,
           ps.lat AS pickup_lat,
           ps.lng AS pickup_lng,
           ds.name AS dropoff_stop_name,
           ds.lat AS dropoff_lat,
           ds.lng AS dropoff_lng
    FROM buggy_requests br
    LEFT JOIN buggy_stops ps ON ps.id = br.pickup_stop_id
    LEFT JOIN buggy_stops ds ON ds.id = br.dropoff_stop_id
    WHERE br.id = ANY(p_request_ids)
    ORDER BY br.created_at ASC
  LOOP
    -- Insert junction record first (before status update for trigger validation)
    INSERT INTO buggy_trip_requests (
      trip_id, request_id, resort_id, party_size, state, created_at, updated_at
    ) VALUES (
      v_trip_id, v_request.id, p_resort_id, COALESCE(v_request.party_size, 1), 'queued', now(), now()
    );

    -- Update request to point to trip and set status
    UPDATE buggy_requests
    SET attached_trip_id = v_trip_id,
        status = 'queued',
        updated_at = now()
    WHERE id = v_request.id;

    -- Determine pickup title and location
    v_pickup_title := COALESCE(v_request.pickup_stop_name, v_request.pickup_text, 'Pickup');
    IF v_request.pickup_lat IS NOT NULL AND v_request.pickup_lng IS NOT NULL THEN
      v_pickup_location := jsonb_build_object('lat', v_request.pickup_lat, 'lng', v_request.pickup_lng);
    ELSIF v_request.pickup_location IS NOT NULL THEN
      v_pickup_location := v_request.pickup_location::jsonb;
    ELSE
      v_pickup_location := NULL;
    END IF;

    -- Create pickup stop
    v_stop_sequence := v_stop_sequence + 1;
    INSERT INTO buggy_trip_stops (
      trip_id, resort_id, stop_id, stop_kind, title, location, sequence, status, related_request_id, created_at, updated_at
    ) VALUES (
      v_trip_id, 
      p_resort_id, 
      v_request.pickup_stop_id, 
      'pickup',
      v_pickup_title,
      v_pickup_location,
      v_stop_sequence, 
      'pending',
      v_request.id,
      now(),
      now()
    );

    -- Determine dropoff title and location
    v_dropoff_title := COALESCE(v_request.dropoff_stop_name, v_request.dropoff_text, 'Dropoff');
    IF v_request.dropoff_lat IS NOT NULL AND v_request.dropoff_lng IS NOT NULL THEN
      v_dropoff_location := jsonb_build_object('lat', v_request.dropoff_lat, 'lng', v_request.dropoff_lng);
    ELSIF v_request.dropoff_location IS NOT NULL THEN
      v_dropoff_location := v_request.dropoff_location::jsonb;
    ELSE
      v_dropoff_location := NULL;
    END IF;

    -- Create dropoff stop
    v_stop_sequence := v_stop_sequence + 1;
    INSERT INTO buggy_trip_stops (
      trip_id, resort_id, stop_id, stop_kind, title, location, sequence, status, related_request_id, created_at, updated_at
    ) VALUES (
      v_trip_id, 
      p_resort_id, 
      v_request.dropoff_stop_id, 
      'dropoff',
      v_dropoff_title,
      v_dropoff_location,
      v_stop_sequence, 
      'pending',
      v_request.id,
      now(),
      now()
    );

    v_attached_count := v_attached_count + 1;
  END LOOP;

  -- Log transport event
  INSERT INTO buggy_trip_events (
    trip_id, resort_id, event_type, actor_type, actor_user_id, payload, created_at
  ) VALUES (
    v_trip_id,
    p_resort_id,
    'TRIP_CREATED',
    CASE WHEN p_created_by_staff_id IS NOT NULL THEN 'staff' ELSE 'system' END,
    p_created_by_staff_id,
    jsonb_build_object(
      'request_count', v_attached_count,
      'stop_count', v_stop_sequence,
      'request_ids', p_request_ids
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'trip_id', v_trip_id,
    'attached_request_count', v_attached_count,
    'stop_count', v_stop_sequence
  );
END;
$function$;