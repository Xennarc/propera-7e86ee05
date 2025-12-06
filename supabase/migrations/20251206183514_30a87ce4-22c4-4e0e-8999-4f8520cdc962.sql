-- Fix guests table RLS policies to use resort_role instead of app_role
-- RESORT_ADMIN should have full access to guests in their resort

-- Drop existing policies
DROP POLICY IF EXISTS "Staff can delete guests" ON public.guests;
DROP POLICY IF EXISTS "Staff can insert guests" ON public.guests;
DROP POLICY IF EXISTS "Staff can update guests" ON public.guests;

-- Create new policies using resort_role
CREATE POLICY "Staff can insert guests" 
ON public.guests 
FOR INSERT 
WITH CHECK (
  is_super_admin(auth.uid()) OR 
  has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role, 'MANAGER'::resort_role, 'FRONT_OFFICE'::resort_role, 'RESERVATIONS'::resort_role])
);

CREATE POLICY "Staff can update guests" 
ON public.guests 
FOR UPDATE 
USING (
  is_super_admin(auth.uid()) OR 
  has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role, 'MANAGER'::resort_role, 'FRONT_OFFICE'::resort_role, 'RESERVATIONS'::resort_role])
);

CREATE POLICY "Staff can delete guests" 
ON public.guests 
FOR DELETE 
USING (
  is_super_admin(auth.uid()) OR 
  has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role, 'MANAGER'::resort_role, 'FRONT_OFFICE'::resort_role, 'RESERVATIONS'::resort_role])
);