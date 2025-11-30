-- Create staff invitations table
CREATE TABLE public.staff_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  name text,
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  resort_role resort_role NOT NULL,
  department text,
  invited_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED')),
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add indexes for efficient lookups
CREATE INDEX idx_staff_invitations_token ON public.staff_invitations(token);
CREATE INDEX idx_staff_invitations_resort_id ON public.staff_invitations(resort_id);
CREATE INDEX idx_staff_invitations_email ON public.staff_invitations(email);
CREATE INDEX idx_staff_invitations_status ON public.staff_invitations(status);

-- Enable RLS
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_invitations
CREATE POLICY "Super admins can manage all invitations"
ON public.staff_invitations
FOR ALL
USING (is_super_admin(auth.uid()));

CREATE POLICY "Resort admins can view invitations for their resort"
ON public.staff_invitations
FOR SELECT
USING (has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role]));

CREATE POLICY "Resort admins can create invitations for their resort"
ON public.staff_invitations
FOR INSERT
WITH CHECK (has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role]));

CREATE POLICY "Resort admins can update invitations for their resort"
ON public.staff_invitations
FOR UPDATE
USING (has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role]));

CREATE POLICY "Anyone can view invitation by token for acceptance"
ON public.staff_invitations
FOR SELECT
USING (true);

-- Add onboarding fields to resorts table
ALTER TABLE public.resorts 
ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'NOT_STARTED' CHECK (onboarding_status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')),
ADD COLUMN IF NOT EXISTS onboarding_basics_done boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_activities_done boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_restaurants_done boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_staff_done boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_portal_done boolean NOT NULL DEFAULT false;

-- Add updated_at trigger for staff_invitations
CREATE TRIGGER update_staff_invitations_updated_at
  BEFORE UPDATE ON public.staff_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();