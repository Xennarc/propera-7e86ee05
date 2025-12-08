-- Drop the existing update policy
DROP POLICY IF EXISTS "Admins can update resorts" ON public.resorts;

-- Create a new update policy that allows both super admins and resort admins
CREATE POLICY "Admins and resort admins can update resorts" 
ON public.resorts 
FOR UPDATE 
USING (
  is_super_admin(auth.uid()) OR 
  has_resort_role(auth.uid(), id, ARRAY['RESORT_ADMIN'::resort_role])
);