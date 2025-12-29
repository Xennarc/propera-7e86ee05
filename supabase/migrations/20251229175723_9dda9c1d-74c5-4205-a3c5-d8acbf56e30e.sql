-- Drop the existing public SELECT policy
DROP POLICY IF EXISTS "Anyone can view permissions" ON public.permissions;

-- Create restrictive policy for super admins only
CREATE POLICY "Super admins can view permissions" 
ON public.permissions 
FOR SELECT
USING (is_super_admin(auth.uid()));