-- Create activity waitlist table for capacity & waitlist feature
CREATE TABLE public.activity_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.activity_sessions(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  num_adults INTEGER NOT NULL DEFAULT 1,
  num_children INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'PROMOTED', 'EXPIRED', 'CANCELLED')),
  priority INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  promoted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(session_id, guest_id)
);

-- Enable RLS
ALTER TABLE public.activity_waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view waitlist in their resort"
ON public.activity_waitlist
FOR SELECT
USING (has_resort_membership(auth.uid(), resort_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Staff can manage waitlist"
ON public.activity_waitlist
FOR INSERT
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'ACTIVITIES'::app_role]));

CREATE POLICY "Staff can update waitlist"
ON public.activity_waitlist
FOR UPDATE
USING (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'ACTIVITIES'::app_role]));

CREATE POLICY "Staff can delete waitlist entries"
ON public.activity_waitlist
FOR DELETE
USING (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'ACTIVITIES'::app_role]));

-- Create trigger for updated_at
CREATE TRIGGER update_activity_waitlist_updated_at
BEFORE UPDATE ON public.activity_waitlist
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for efficient queries
CREATE INDEX idx_activity_waitlist_session ON public.activity_waitlist(session_id);
CREATE INDEX idx_activity_waitlist_status ON public.activity_waitlist(status);
CREATE INDEX idx_activity_waitlist_resort ON public.activity_waitlist(resort_id);