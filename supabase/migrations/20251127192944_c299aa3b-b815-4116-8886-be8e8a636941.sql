-- Create global_role enum for platform-level access
CREATE TYPE public.global_role AS ENUM ('SUPER_ADMIN', 'STANDARD');

-- Create resort_role enum for resort-level access
CREATE TYPE public.resort_role AS ENUM ('RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'FNB');

-- Add global_role to profiles table (default STANDARD)
ALTER TABLE public.profiles 
ADD COLUMN global_role public.global_role NOT NULL DEFAULT 'STANDARD';

-- Create resort_memberships table
CREATE TABLE public.resort_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  resort_role public.resort_role NOT NULL,
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, resort_id)
);

-- Enable RLS on resort_memberships
ALTER TABLE public.resort_memberships ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is SUPER_ADMIN
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND global_role = 'SUPER_ADMIN'
  )
$$;

-- Create function to check if user has resort membership with specific role
CREATE OR REPLACE FUNCTION public.has_resort_role(_user_id uuid, _resort_id uuid, _roles resort_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.resort_memberships
    WHERE user_id = _user_id
      AND resort_id = _resort_id
      AND resort_role = ANY(_roles)
  )
$$;

-- Create function to check if user has any membership at a resort
CREATE OR REPLACE FUNCTION public.has_resort_membership(_user_id uuid, _resort_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.resort_memberships
    WHERE user_id = _user_id
      AND resort_id = _resort_id
  )
$$;

-- RLS Policies for resort_memberships

-- SUPER_ADMIN can view all memberships
CREATE POLICY "Super admins can view all memberships"
ON public.resort_memberships
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Users can view memberships for resorts they belong to
CREATE POLICY "Users can view memberships in their resorts"
ON public.resort_memberships
FOR SELECT
USING (has_resort_membership(auth.uid(), resort_id));

-- SUPER_ADMIN can manage all memberships
CREATE POLICY "Super admins can insert memberships"
ON public.resort_memberships
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update memberships"
ON public.resort_memberships
FOR UPDATE
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete memberships"
ON public.resort_memberships
FOR DELETE
USING (is_super_admin(auth.uid()));

-- RESORT_ADMIN can manage memberships for their resort
CREATE POLICY "Resort admins can insert memberships for their resort"
ON public.resort_memberships
FOR INSERT
WITH CHECK (has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[]));

CREATE POLICY "Resort admins can update memberships for their resort"
ON public.resort_memberships
FOR UPDATE
USING (has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[]));

CREATE POLICY "Resort admins can delete memberships for their resort"
ON public.resort_memberships
FOR DELETE
USING (has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[]));

-- Create trigger for updated_at
CREATE TRIGGER update_resort_memberships_updated_at
BEFORE UPDATE ON public.resort_memberships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data: Promote the first ADMIN user to SUPER_ADMIN
UPDATE public.profiles
SET global_role = 'SUPER_ADMIN'
WHERE id = (
  SELECT ur.user_id 
  FROM public.user_roles ur
  JOIN public.profiles p ON ur.user_id = p.id
  WHERE ur.role = 'ADMIN'
  ORDER BY p.created_at ASC
  LIMIT 1
);

-- Seed data: Create resort_memberships from existing user_roles
-- Map ADMIN -> RESORT_ADMIN, others stay the same
INSERT INTO public.resort_memberships (user_id, resort_id, resort_role, department)
SELECT 
  ur.user_id,
  COALESCE(p.resort_id, (SELECT id FROM public.resorts ORDER BY created_at LIMIT 1)),
  CASE 
    WHEN ur.role = 'ADMIN' THEN 'RESORT_ADMIN'::resort_role
    WHEN ur.role = 'MANAGER' THEN 'MANAGER'::resort_role
    WHEN ur.role = 'FRONT_OFFICE' THEN 'FRONT_OFFICE'::resort_role
    WHEN ur.role = 'ACTIVITIES' THEN 'ACTIVITIES'::resort_role
    WHEN ur.role = 'FNB' THEN 'FNB'::resort_role
  END,
  p.department
FROM public.user_roles ur
JOIN public.profiles p ON ur.user_id = p.id
WHERE ur.role IN ('ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'FNB')
ON CONFLICT (user_id, resort_id) DO NOTHING;