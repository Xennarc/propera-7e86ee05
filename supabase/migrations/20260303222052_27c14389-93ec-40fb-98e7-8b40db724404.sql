
-- 1. Add CHECK_IN and DEPARTED values to session_status enum
ALTER TYPE public.session_status ADD VALUE IF NOT EXISTS 'CHECK_IN';
ALTER TYPE public.session_status ADD VALUE IF NOT EXISTS 'DEPARTED';

-- 2. Create session_events table for timeline logging
CREATE TABLE public.session_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.activity_sessions(id) ON DELETE CASCADE,
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  actor_user_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Index for fast lookups
CREATE INDEX idx_session_events_session_id ON public.session_events(session_id);
CREATE INDEX idx_session_events_resort_id ON public.session_events(resort_id);

-- 4. Enable RLS
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_events FORCE ROW LEVEL SECURITY;

-- 5. RLS policies using existing staff_has_resort_access function
CREATE POLICY "Staff can view session events for their resort"
  ON public.session_events FOR SELECT TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "Staff can insert session events for their resort"
  ON public.session_events FOR INSERT TO authenticated
  WITH CHECK (public.staff_has_resort_access(auth.uid(), resort_id));
