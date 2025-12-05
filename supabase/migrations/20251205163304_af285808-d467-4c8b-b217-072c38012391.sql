-- Fix profiles table RLS: remove overly permissive public SELECT policy
-- and create proper access-controlled policies

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create policy for users to view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Create policy for authenticated users to view profiles in same resort
CREATE POLICY "Staff can view profiles in same resort"
ON public.profiles
FOR SELECT
USING (
  -- User has membership in a resort and the target profile has membership in the same resort
  EXISTS (
    SELECT 1 FROM public.resort_memberships my_membership
    JOIN public.resort_memberships their_membership ON my_membership.resort_id = their_membership.resort_id
    WHERE my_membership.user_id = auth.uid()
    AND their_membership.user_id = profiles.id
  )
);

-- Create policy for super admins to view all profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_super_admin(auth.uid()));