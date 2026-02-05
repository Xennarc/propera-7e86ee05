-- Fix trigger 1: sync_trip_request_on_request_update
-- Changes 'active' to 'queued' which is a valid enum value
CREATE OR REPLACE FUNCTION public.sync_trip_request_on_request_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- When request is cancelled or completed, update corresponding trip_request
  IF NEW.status IN ('cancelled', 'completed', 'failed', 'no_show') THEN
    UPDATE buggy_trip_requests 
    SET state = NEW.status::buggy_trip_request_state, updated_at = now()
    WHERE request_id = NEW.id AND state = 'queued';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix trigger 2: validate_request_status_transition
-- Changes 'active' to 'queued' which is a valid enum value
CREATE OR REPLACE FUNCTION public.validate_request_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Prevent direct transition to 'assigned_to_trip' without going through RPC
  IF NEW.status = 'assigned_to_trip' AND OLD.status IN ('requested', 'queued') THEN
    IF NOT EXISTS (
      SELECT 1 FROM buggy_trip_requests 
      WHERE request_id = NEW.id AND state = 'queued'
    ) THEN
      RAISE EXCEPTION 'Request cannot be marked as assigned_to_trip without an active trip link';
    END IF;
  END IF;
  
  -- Prevent going backwards from later states to earlier states (except via cancel)
  IF OLD.status IN ('driver_en_route', 'arrived', 'picked_up') 
     AND NEW.status IN ('requested', 'queued', 'assigned_to_trip')
     AND NEW.status != 'cancelled' THEN
    RAISE EXCEPTION 'Cannot revert request status from % to %', OLD.status, NEW.status;
  END IF;
  
  RETURN NEW;
END;
$function$;