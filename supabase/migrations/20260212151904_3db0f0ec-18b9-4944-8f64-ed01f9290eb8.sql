
-- Phase 1: Create demo_reset_runs table
CREATE TABLE public.demo_reset_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  seed_version text NOT NULL DEFAULT 'v1',
  trigger text NOT NULL CHECK (trigger IN ('scheduled', 'manual', 'provisioning')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  summary jsonb DEFAULT '{}'::jsonb,
  error text,
  demo_instance_before int,
  demo_instance_after int
);

ALTER TABLE public.demo_reset_runs ENABLE ROW LEVEL SECURITY;

-- Only super admins can read/write
CREATE POLICY "Super admins can manage demo_reset_runs"
  ON public.demo_reset_runs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.global_role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.global_role = 'SUPER_ADMIN'
    )
  );

-- Phase 1b: Add additive columns to resorts (is_demo already exists)
ALTER TABLE public.resorts
  ADD COLUMN IF NOT EXISTS demo_seed_version text DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS demo_last_reset_at timestamptz,
  ADD COLUMN IF NOT EXISTS demo_instance_id int DEFAULT 1;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_demo_reset_runs_resort ON public.demo_reset_runs(resort_id, started_at DESC);

-- Phase 2: should_reset_demo function
CREATE OR REPLACE FUNCTION public.should_reset_demo(
  p_resort_id uuid,
  p_max_age_minutes int DEFAULT 120,
  p_seed_version text DEFAULT 'v1'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_demo boolean;
  v_code text;
  v_seed_version text;
  v_last_reset timestamptz;
  v_instance_id int;
  v_should_reset boolean := false;
  v_reason text := 'up_to_date';
BEGIN
  SELECT is_demo, code, demo_seed_version, demo_last_reset_at, demo_instance_id
  INTO v_is_demo, v_code, v_seed_version, v_last_reset, v_instance_id
  FROM resorts WHERE id = p_resort_id;

  IF NOT FOUND OR (v_code != 'DEMO' AND COALESCE(v_is_demo, false) != true) THEN
    RETURN jsonb_build_object('should_reset', false, 'reason', 'not_demo_resort', 'demo_instance_id', v_instance_id);
  END IF;

  IF v_last_reset IS NULL THEN
    v_should_reset := true;
    v_reason := 'never_reset';
  ELSIF v_last_reset < now() - (p_max_age_minutes || ' minutes')::interval THEN
    v_should_reset := true;
    v_reason := 'stale';
  ELSIF COALESCE(v_seed_version, 'v1') != p_seed_version THEN
    v_should_reset := true;
    v_reason := 'version_mismatch';
  END IF;

  RETURN jsonb_build_object(
    'should_reset', v_should_reset,
    'reason', v_reason,
    'demo_instance_id', COALESCE(v_instance_id, 1),
    'demo_last_reset_at', v_last_reset,
    'seed_version', v_seed_version
  );
END;
$$;

-- Phase 2: reset_demo_resort function
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

    -- Service requests & messages
    DELETE FROM service_request_messages WHERE resort_id = p_resort_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_summary := v_summary || jsonb_build_object('service_request_messages', v_deleted_count);

    DELETE FROM service_request_assignments WHERE resort_id = p_resort_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_summary := v_summary || jsonb_build_object('service_request_assignments', v_deleted_count);

    DELETE FROM service_requests WHERE resort_id = p_resort_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_summary := v_summary || jsonb_build_object('service_requests', v_deleted_count);

    -- Buggy trip stops -> trip requests -> trips -> request events -> requests
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

    -- Guest notifications
    DELETE FROM guest_notifications WHERE resort_id = p_resort_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_summary := v_summary || jsonb_build_object('guest_notifications', v_deleted_count);

    -- Booking audit logs for this resort's bookings (already deleted above, but clean up audit)
    -- Skip - these are cross-resort and don't have resort_id

    -- Increment instance
    v_instance_after := v_instance_before + 1;

    UPDATE resorts SET
      demo_instance_id = v_instance_after,
      demo_last_reset_at = now(),
      demo_seed_version = p_seed_version
    WHERE id = p_resort_id;

    -- Mark success
    UPDATE demo_reset_runs SET
      status = 'success',
      finished_at = now(),
      summary = v_summary,
      demo_instance_after = v_instance_after
    WHERE id = v_run_id;

    -- Release lock
    PERFORM pg_advisory_unlock(hashtext('propera_demo_reset_' || p_resort_id::text));

    RETURN jsonb_build_object(
      'success', true,
      'demo_instance_id', v_instance_after,
      'demo_last_reset_at', now(),
      'seed_version', p_seed_version,
      'summary', v_summary,
      'run_id', v_run_id
    );

  EXCEPTION WHEN OTHERS THEN
    -- Mark failed
    UPDATE demo_reset_runs SET
      status = 'failed',
      finished_at = now(),
      error = SQLERRM
    WHERE id = v_run_id;

    -- Release lock on error
    PERFORM pg_advisory_unlock(hashtext('propera_demo_reset_' || p_resort_id::text));

    RAISE;
  END;
END;
$$;
