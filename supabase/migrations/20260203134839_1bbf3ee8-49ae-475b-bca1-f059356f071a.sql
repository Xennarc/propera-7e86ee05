-- Phase 1A: Add missing columns to service_request_events table
ALTER TABLE public.service_request_events 
  ADD COLUMN IF NOT EXISTS actor_type TEXT DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index on actor_type for filtering
CREATE INDEX IF NOT EXISTS idx_service_request_events_actor_type 
  ON public.service_request_events(actor_type);

-- Phase 1B: Update existing trigger function for request creation to set actor_type = 'GUEST'
CREATE OR REPLACE FUNCTION public.service_request_created_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  INSERT INTO public.service_request_events (
    request_id,
    resort_id,
    actor_guest_id,
    event_type,
    actor_type,
    meta
  ) VALUES (
    NEW.id,
    NEW.resort_id,
    NEW.guest_id,
    'CREATED',
    'GUEST',
    jsonb_build_object(
      'title', NEW.title,
      'is_asap', NEW.is_asap,
      'department_key', NEW.department_key,
      'priority', NEW.priority
    )
  );
  RETURN NEW;
END;
$$;

-- Phase 1B: Update status change trigger to include actor_type = 'SYSTEM' for auto-triggered changes
CREATE OR REPLACE FUNCTION public.service_request_status_change_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Only fire if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.service_request_events (
      request_id,
      resort_id,
      event_type,
      actor_type,
      meta
    ) VALUES (
      NEW.id,
      NEW.resort_id,
      'STATUS_CHANGED',
      'SYSTEM',
      jsonb_build_object(
        'from_status', OLD.status,
        'to_status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Phase 3A: Update guest_create_service_request RPC to insert CREATED event with actor_type = 'GUEST'
-- First, we need to drop the trigger so we can handle event creation in the RPC directly
-- But actually, let's keep the trigger and just update existing CREATED events to have actor_type = 'GUEST'

-- Update existing CREATED events to have actor_type = 'GUEST' (backfill)
UPDATE public.service_request_events
SET actor_type = 'GUEST'
WHERE event_type = 'CREATED' AND actor_type = 'SYSTEM';

-- Phase 3B: Also update the bundle RPC's event creation
-- The bundle RPC calls guest_create_service_request internally, so the trigger will handle it

-- Add a compatibility view for frontends that expect created_at and metadata
CREATE OR REPLACE VIEW public.service_request_events_compat AS
SELECT 
  id,
  request_id,
  resort_id,
  actor_user_id,
  actor_guest_id,
  event_type,
  event_at AS created_at,
  meta AS metadata,
  actor_type,
  notes
FROM public.service_request_events;

-- Grant permissions on the view
GRANT SELECT ON public.service_request_events_compat TO authenticated;
GRANT SELECT ON public.service_request_events_compat TO anon;