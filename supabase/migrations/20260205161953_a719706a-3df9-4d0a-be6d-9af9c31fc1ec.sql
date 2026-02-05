-- Fix sync_trip_request_on_request_update: cast through text and map incompatible enum values
CREATE OR REPLACE FUNCTION public.sync_trip_request_on_request_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_state buggy_trip_request_state;
BEGIN
  -- When request reaches a terminal state, update corresponding trip_request
  IF NEW.status IN ('cancelled', 'completed', 'failed', 'no_show') THEN
    -- Map request status to trip_request state (different enums!)
    v_new_state := CASE NEW.status
      WHEN 'completed' THEN 'dropped_off'::buggy_trip_request_state
      WHEN 'failed' THEN 'cancelled'::buggy_trip_request_state
      ELSE (NEW.status::text)::buggy_trip_request_state
    END;
    
    UPDATE buggy_trip_requests 
    SET state = v_new_state, updated_at = now()
    WHERE request_id = NEW.id AND state = 'queued';
  END IF;
  
  RETURN NEW;
END;
$function$;