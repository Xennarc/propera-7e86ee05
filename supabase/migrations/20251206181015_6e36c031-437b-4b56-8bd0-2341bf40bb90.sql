-- Drop existing guest management policies
DROP POLICY IF EXISTS "Front office and admin can delete guests" ON public.guests;
DROP POLICY IF EXISTS "Front office and admin can manage guests" ON public.guests;
DROP POLICY IF EXISTS "Front office and admin can update guests" ON public.guests;

-- Create new policies with expanded roles (ADMIN, MANAGER, FRONT_OFFICE, RESERVATIONS)
CREATE POLICY "Staff can delete guests" 
ON public.guests 
FOR DELETE 
USING (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'MANAGER'::app_role, 'FRONT_OFFICE'::app_role, 'RESERVATIONS'::app_role]));

CREATE POLICY "Staff can insert guests" 
ON public.guests 
FOR INSERT 
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'MANAGER'::app_role, 'FRONT_OFFICE'::app_role, 'RESERVATIONS'::app_role]));

CREATE POLICY "Staff can update guests" 
ON public.guests 
FOR UPDATE 
USING (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'MANAGER'::app_role, 'FRONT_OFFICE'::app_role, 'RESERVATIONS'::app_role]));