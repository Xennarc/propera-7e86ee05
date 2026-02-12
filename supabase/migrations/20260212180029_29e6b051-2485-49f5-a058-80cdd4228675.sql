
-- Fix reset_demo_resort: correct table names and FK-safe deletion order
CREATE OR REPLACE FUNCTION public.reset_demo_resort(
  p_resort_id uuid,
  p_seed_version text DEFAULT 'v1',
  p_trigger text DEFAULT 'manual'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_demo boolean;
  v_code text;
  v_instance_before int;
  v_instance_after int;
  v_run_id uuid;
  v_summary jsonb := '{}'::jsonb;
  v_deleted_count int;
BEGIN
  -- HARD GUARD: verify target is demo resort
  SELECT is_demo, code, COALESCE(demo_instance_id, 1)
  INTO v_is_demo, v_code, v_instance_before
  FROM resorts WHERE id = p_resort_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resort not found: %', p_resort_id;
  END IF;

  IF v_code != 'DEMO' AND COALESCE(v_is_demo, false) != true THEN
    RAISE EXCEPTION 'SAFETY: Resort % (code=%) is not a demo resort. Reset denied.', p_resort_id, v_code;
  END IF;

  -- Acquire advisory lock to prevent concurrent resets
  PERFORM pg_advisory_lock(hashtext('propera_demo_reset_' || p_resort_id::text));

  -- Write audit row
  INSERT INTO demo_reset_runs (resort_id, seed_version, trigger, status, demo_instance_before)
  VALUES (p_resort_id, p_seed_version, p_trigger, 'running', v_instance_before)
  RETURNING id INTO v_run_id;

  BEGIN
    -- Delete transactional data in FK-safe order (resort-scoped only)

    -- Booking attendees first (FK to activity_bookings and restaurant_reservations)
    DELETE FROM booking_attendees WHERE resort_id = p_resort_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_summary := v_summary || jsonb_build_object('booking_attendees', v_deleted_count);

    -- Activity bookings
    DELETE FROM activity_bookings WHERE resort_id = p_resort_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_summary := v_summary || jsonb_build_object('activity_bookings', v_deleted_count);

    -- Activity waitlist
    DELETE FROM activity_waitlist WHERE resort_id = p_resort_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_summary := v_summary || jsonb_build_object('activity_waitlist', v_deleted_count);

    -- Restaurant reservations
    DELETE FROM restaurant_reservations WHERE resort_id = p_resort_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_summary := v_summary || jsonb_build_object('restaurant_reservations', v_deleted_count);

    -- Service request items & events before service_requests (FK dependencies)
    DELETE FROM service_request_items WHERE resort_id = p_resort_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_summary := v_summary || jsonb_build_object('service_request_items', v_deleted_count);

    DELETE FROM service_request_events WHERE resort_id = p_resort_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_summary := v_summary || jsonb_build_object('service_request_events', v_deleted_count);

    DELETE FROM service_requests WHERE resort_id = p_resort_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_summary := v_summary || jsonb_build_object('service_requests', v_deleted_count);

    -- Buggy trip stops -> trip requests -> trip events -> trips -> request events -> requests
    DELETE FROM buggy_trip_stops WHERE resort_id = p_resort_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_summary := v_summary || jsonb_build_object('buggy_trip_stops', v_deleted_count);

    DELETE FROM buggy_trip_requests WHERE resort_id = p_resort_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_summary := v_summary || jsonb_build_object('buggy_trip_requests', v_deleted_count);

    DELETE FROM buggy_trip_events WHERE resort_id = p_resort_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_summary := v_summary || jsonb_build_object('buggy_trip_events', v_deleted_count);

    DELETE FROM buggy_trips WHERE resort_id = p_resort_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_summary := v_summary || jsonb_build_object('buggy_trips', v_deleted_count);

    DELETE FROM buggy_request_events WHERE resort_id = p_resort_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_summary := v_summary || jsonb_build_object('buggy_request_events', v_deleted_count);

    DELETE FROM buggy_requests WHERE resort_id = p_resort_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_summary := v_summary || jsonb_build_object('buggy_requests', v_deleted_count);

    -- Notifications (correct table name)
    DELETE FROM notifications WHERE resort_id = p_resort_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_summary := v_summary || jsonb_build_object('notifications', v_deleted_count);

    -- Increment instance id
    UPDATE resorts
    SET demo_instance_id = COALESCE(demo_instance_id, 1) + 1,
        demo_last_reset_at = now(),
        demo_seed_version = p_seed_version
    WHERE id = p_resort_id
    RETURNING demo_instance_id INTO v_instance_after;

    -- Mark success
    UPDATE demo_reset_runs
    SET status = 'success',
        finished_at = now(),
        summary = v_summary,
        demo_instance_after = v_instance_after
    WHERE id = v_run_id;

    -- Release advisory lock
    PERFORM pg_advisory_unlock(hashtext('propera_demo_reset_' || p_resort_id::text));

    RETURN jsonb_build_object(
      'success', true,
      'demo_instance_id', v_instance_after,
      'demo_last_reset_at', now(),
      'seed_version', p_seed_version,
      'summary', v_summary
    );

  EXCEPTION WHEN OTHERS THEN
    -- Mark failed
    UPDATE demo_reset_runs
    SET status = 'failed',
        finished_at = now(),
        error = SQLERRM
    WHERE id = v_run_id;

    -- Release lock safely
    PERFORM pg_advisory_unlock(hashtext('propera_demo_reset_' || p_resort_id::text));

    RAISE;
  END;
END;
$$;
