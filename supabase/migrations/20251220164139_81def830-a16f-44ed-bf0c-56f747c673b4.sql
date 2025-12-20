-- Create table for staff review tracking of prearrival profiles
CREATE TABLE IF NOT EXISTS public.prearrival_staff_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(guest_id)
);

-- Enable RLS
ALTER TABLE public.prearrival_staff_reviews ENABLE ROW LEVEL SECURITY;

-- Policies for staff access (resort-scoped)
CREATE POLICY "Staff can view reviews for their resort"
ON public.prearrival_staff_reviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.resort_memberships rm
    WHERE rm.user_id = auth.uid()
    AND rm.resort_id = prearrival_staff_reviews.resort_id
  )
);

CREATE POLICY "Staff can create reviews for their resort"
ON public.prearrival_staff_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.resort_memberships rm
    WHERE rm.user_id = auth.uid()
    AND rm.resort_id = prearrival_staff_reviews.resort_id
  )
);

CREATE POLICY "Staff can update reviews for their resort"
ON public.prearrival_staff_reviews
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.resort_memberships rm
    WHERE rm.user_id = auth.uid()
    AND rm.resort_id = prearrival_staff_reviews.resort_id
  )
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_prearrival_staff_reviews_guest 
ON public.prearrival_staff_reviews(guest_id);

CREATE INDEX IF NOT EXISTS idx_prearrival_staff_reviews_resort 
ON public.prearrival_staff_reviews(resort_id);