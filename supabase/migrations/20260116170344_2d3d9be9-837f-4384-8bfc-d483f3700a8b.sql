-- Fix profiles table FK to allow resort deletion (set NULL instead of blocking)
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_resort_id_fkey;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_resort_id_fkey 
  FOREIGN KEY (resort_id) 
  REFERENCES public.resorts(id) 
  ON DELETE SET NULL;

-- Fix rollout_job_steps table FK to cascade delete
ALTER TABLE public.rollout_job_steps 
  DROP CONSTRAINT IF EXISTS rollout_job_steps_resort_id_fkey;

ALTER TABLE public.rollout_job_steps 
  ADD CONSTRAINT rollout_job_steps_resort_id_fkey 
  FOREIGN KEY (resort_id) 
  REFERENCES public.resorts(id) 
  ON DELETE CASCADE;

-- Drop the old DELETE policy that uses deprecated has_role function
DROP POLICY IF EXISTS "Admins can delete resorts" ON public.resorts;

-- Create new DELETE policy using is_super_admin
CREATE POLICY "Super admins can delete resorts" 
  ON public.resorts 
  FOR DELETE 
  TO authenticated 
  USING (is_super_admin(auth.uid()));