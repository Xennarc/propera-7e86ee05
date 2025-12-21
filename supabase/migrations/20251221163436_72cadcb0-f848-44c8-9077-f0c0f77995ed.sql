
-- Create guest_profile_events table for prearrival audit history
CREATE TABLE IF NOT EXISTS public.guest_profile_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  changed_fields JSONB DEFAULT '{}'::jsonb,
  actor TEXT NOT NULL DEFAULT 'guest' CHECK (actor IN ('guest', 'staff', 'system')),
  actor_user_id UUID,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on guest_profile_events
ALTER TABLE public.guest_profile_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for guest_profile_events
CREATE POLICY "Staff can view profile events in their resort"
ON public.guest_profile_events FOR SELECT
USING (has_resort_membership(auth.uid(), resort_id) OR is_super_admin(auth.uid()));

CREATE POLICY "System can insert profile events"
ON public.guest_profile_events FOR INSERT
WITH CHECK (true);

-- Add index for efficient queries
CREATE INDEX idx_guest_profile_events_guest_id ON public.guest_profile_events(guest_id);
CREATE INDEX idx_guest_profile_events_resort_created ON public.guest_profile_events(resort_id, created_at DESC);

-- Enable realtime for prearrival_profiles
ALTER PUBLICATION supabase_realtime ADD TABLE public.prearrival_profiles;

-- Enable realtime for guest_profile_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_profile_events;

-- Create trigger function to log prearrival changes
CREATE OR REPLACE FUNCTION public.log_prearrival_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changes JSONB := '{}'::jsonb;
  v_summary TEXT;
  v_actor TEXT := 'guest';
  v_key TEXT;
  v_old_val JSONB;
  v_new_val JSONB;
BEGIN
  -- Compare and record changes
  IF TG_OP = 'UPDATE' THEN
    -- Check each relevant field
    IF OLD.arrival_time IS DISTINCT FROM NEW.arrival_time THEN
      v_changes := v_changes || jsonb_build_object('arrival_time', jsonb_build_array(OLD.arrival_time, NEW.arrival_time));
    END IF;
    
    IF OLD.arrival_flight_number IS DISTINCT FROM NEW.arrival_flight_number THEN
      v_changes := v_changes || jsonb_build_object('arrival_flight_number', jsonb_build_array(OLD.arrival_flight_number, NEW.arrival_flight_number));
    END IF;
    
    IF OLD.transfer_preference IS DISTINCT FROM NEW.transfer_preference THEN
      v_changes := v_changes || jsonb_build_object('transfer_preference', jsonb_build_array(OLD.transfer_preference, NEW.transfer_preference));
    END IF;
    
    IF OLD.dietary_preferences IS DISTINCT FROM NEW.dietary_preferences THEN
      v_changes := v_changes || jsonb_build_object('dietary_preferences', jsonb_build_array(OLD.dietary_preferences, NEW.dietary_preferences));
    END IF;
    
    IF OLD.allergies IS DISTINCT FROM NEW.allergies THEN
      v_changes := v_changes || jsonb_build_object('allergies', jsonb_build_array(OLD.allergies, NEW.allergies));
    END IF;
    
    IF OLD.special_occasions IS DISTINCT FROM NEW.special_occasions THEN
      v_changes := v_changes || jsonb_build_object('special_occasions', jsonb_build_array(OLD.special_occasions, NEW.special_occasions));
    END IF;
    
    IF OLD.special_requests IS DISTINCT FROM NEW.special_requests THEN
      v_changes := v_changes || jsonb_build_object('special_requests', jsonb_build_array(OLD.special_requests, NEW.special_requests));
    END IF;
    
    IF OLD.prearrival_status IS DISTINCT FROM NEW.prearrival_status THEN
      v_changes := v_changes || jsonb_build_object('prearrival_status', jsonb_build_array(OLD.prearrival_status, NEW.prearrival_status));
    END IF;
    
    IF OLD.checkin_completed_at IS DISTINCT FROM NEW.checkin_completed_at THEN
      v_changes := v_changes || jsonb_build_object('checkin_completed_at', jsonb_build_array(OLD.checkin_completed_at, NEW.checkin_completed_at));
    END IF;
    
    IF OLD.policy_acknowledged_at IS DISTINCT FROM NEW.policy_acknowledged_at THEN
      v_changes := v_changes || jsonb_build_object('policy_acknowledged_at', jsonb_build_array(OLD.policy_acknowledged_at, NEW.policy_acknowledged_at));
    END IF;
    
    IF OLD.staff_notes IS DISTINCT FROM NEW.staff_notes THEN
      v_changes := v_changes || jsonb_build_object('staff_notes', jsonb_build_array(OLD.staff_notes, NEW.staff_notes));
      v_actor := 'staff';
    END IF;
    
    IF OLD.staff_processed IS DISTINCT FROM NEW.staff_processed THEN
      v_changes := v_changes || jsonb_build_object('staff_processed', jsonb_build_array(OLD.staff_processed, NEW.staff_processed));
      v_actor := 'staff';
    END IF;
    
    -- Only log if there were changes
    IF v_changes != '{}'::jsonb THEN
      -- Generate summary
      v_summary := 'Updated: ' || array_to_string(ARRAY(SELECT jsonb_object_keys(v_changes)), ', ');
      
      -- Determine event type
      IF NEW.prearrival_status = 'completed' AND OLD.prearrival_status != 'completed' THEN
        INSERT INTO guest_profile_events (resort_id, guest_id, event_type, changed_fields, actor, summary, actor_user_id)
        VALUES (NEW.resort_id, NEW.guest_id, 'prearrival_completed', v_changes, v_actor, 'Pre-arrival completed', auth.uid());
      ELSE
        INSERT INTO guest_profile_events (resort_id, guest_id, event_type, changed_fields, actor, summary, actor_user_id)
        VALUES (NEW.resort_id, NEW.guest_id, 'prearrival_updated', v_changes, v_actor, v_summary, auth.uid());
      END IF;
    END IF;
  
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO guest_profile_events (resort_id, guest_id, event_type, changed_fields, actor, summary, actor_user_id)
    VALUES (NEW.resort_id, NEW.guest_id, 'prearrival_created', '{}', 'system', 'Pre-arrival profile created', auth.uid());
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_prearrival_profile_changes ON prearrival_profiles;
CREATE TRIGGER trg_prearrival_profile_changes
AFTER INSERT OR UPDATE ON prearrival_profiles
FOR EACH ROW
EXECUTE FUNCTION log_prearrival_profile_changes();
