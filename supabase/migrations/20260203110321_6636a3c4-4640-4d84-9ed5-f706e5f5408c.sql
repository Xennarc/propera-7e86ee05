-- Phase 7: Orphan Trip Cleanup Function
-- Auto-cancels planning trips with no attached requests after a delay

-- Function to cleanup orphan planning trips
CREATE OR REPLACE FUNCTION public.cleanup_orphan_planning_trips()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip RECORD;
  v_orphan_threshold interval := interval '60 seconds';
  v_cleanup_count int := 0;
BEGIN
  -- Find planning trips with no attached requests that are older than threshold
  FOR v_trip IN
    SELECT t.id, t.resort_id, t.buggy_id, t.driver_user_id
    FROM buggy_trips t
    WHERE t.status = 'planning'
      AND t.lifecycle_state = 'planning'
      AND t.cancelled_at IS NULL
      AND t.completed_at IS NULL
      AND t.created_at < now() - v_orphan_threshold
      AND NOT EXISTS (
        SELECT 1 FROM buggy_requests r
        WHERE r.attached_trip_id = t.id
          AND r.cancelled_at IS NULL
      )
    FOR UPDATE OF t SKIP LOCKED
  LOOP
    -- Cancel the orphan trip
    UPDATE buggy_trips
    SET 
      status = 'cancelled',
      lifecycle_state = 'cancelled',
      cancelled_at = now(),
      updated_at = now()
    WHERE id = v_trip.id;
    
    -- Insert cleanup event
    INSERT INTO transport_events (
      resort_id, trip_id, actor_type, actor_id, event_type, payload
    ) VALUES (
      v_trip.resort_id, v_trip.id, 'system', NULL, 'ORPHAN_TRIP_CLEANUP',
      jsonb_build_object(
        'reason', 'No attached requests after planning timeout',
        'cleanup_threshold_seconds', 60
      )
    );
    
    -- Release buggy if assigned (shouldn't be for planning, but safety check)
    IF v_trip.buggy_id IS NOT NULL THEN
      UPDATE buggies
      SET status = 'available', updated_at = now()
      WHERE id = v_trip.buggy_id
        AND status = 'in_use';
    END IF;
    
    -- Release driver if assigned
    IF v_trip.driver_user_id IS NOT NULL THEN
      UPDATE buggy_drivers
      SET 
        status = 'online',
        assigned_buggy_id = NULL,
        updated_at = now()
      WHERE user_id = v_trip.driver_user_id
        AND status = 'on_trip';
    END IF;
    
    v_cleanup_count := v_cleanup_count + 1;
  END LOOP;
  
  IF v_cleanup_count > 0 THEN
    RAISE NOTICE 'Cleaned up % orphan planning trips', v_cleanup_count;
  END IF;
END;
$$;

-- Grant execute permission (for cron jobs or manual invocation)
GRANT EXECUTE ON FUNCTION public.cleanup_orphan_planning_trips() TO authenticated;

-- Optional: Create a trigger function that can be called on request detachment
-- This provides immediate cleanup rather than waiting for cron
CREATE OR REPLACE FUNCTION public.check_trip_orphan_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining_count int;
  v_trip RECORD;
BEGIN
  -- Only act on updates that detach from a trip
  IF OLD.attached_trip_id IS NOT NULL AND NEW.attached_trip_id IS NULL THEN
    -- Check if trip still has attached requests
    SELECT COUNT(*) INTO v_remaining_count
    FROM buggy_requests
    WHERE attached_trip_id = OLD.attached_trip_id
      AND cancelled_at IS NULL
      AND id != NEW.id;
    
    -- If no remaining requests and trip is still in planning state, cancel it
    IF v_remaining_count = 0 THEN
      SELECT * INTO v_trip
      FROM buggy_trips
      WHERE id = OLD.attached_trip_id
        AND status = 'planning'
        AND cancelled_at IS NULL
      FOR UPDATE NOWAIT;
      
      IF FOUND THEN
        UPDATE buggy_trips
        SET 
          status = 'cancelled',
          lifecycle_state = 'cancelled',
          cancelled_at = now(),
          updated_at = now()
        WHERE id = OLD.attached_trip_id;
        
        INSERT INTO transport_events (
          resort_id, trip_id, actor_type, actor_id, event_type, payload
        ) VALUES (
          v_trip.resort_id, v_trip.id, 'system', NULL, 'ORPHAN_TRIP_CLEANUP',
          jsonb_build_object(
            'reason', 'Last request detached from planning trip',
            'trigger_request_id', NEW.id
          )
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN lock_not_available THEN
    -- Another transaction is handling it, skip
    RETURN NEW;
END;
$$;

-- Create trigger on buggy_requests for immediate orphan detection
DROP TRIGGER IF EXISTS trg_check_trip_orphan ON buggy_requests;
CREATE TRIGGER trg_check_trip_orphan
  AFTER UPDATE OF attached_trip_id ON buggy_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_trip_orphan_status();