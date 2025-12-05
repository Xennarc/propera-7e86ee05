-- Fix RLS policies to explicitly require authentication for sensitive tables
-- This prevents any possibility of unauthenticated access to guest PII

-- 1. Update guests table SELECT policy to explicitly require authentication
DROP POLICY IF EXISTS "Staff can view guests in their resort" ON public.guests;

CREATE POLICY "Staff can view guests in their resort" 
ON public.guests 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (has_resort_membership(auth.uid(), resort_id) OR is_super_admin(auth.uid()))
);

-- 2. Update profiles table SELECT policies to explicitly require authentication
DROP POLICY IF EXISTS "Staff can view profiles in same resort" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Staff can view profiles in same resort" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1
    FROM resort_memberships my_membership
    JOIN resort_memberships their_membership ON my_membership.resort_id = their_membership.resort_id
    WHERE my_membership.user_id = auth.uid() 
    AND their_membership.user_id = profiles.id
  )
);

CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_super_admin(auth.uid()));

-- 3. Update activity_bookings table SELECT policy to explicitly require authentication
DROP POLICY IF EXISTS "Staff can view bookings in their resort" ON public.activity_bookings;

CREATE POLICY "Staff can view bookings in their resort" 
ON public.activity_bookings 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (has_resort_membership(auth.uid(), resort_id) OR is_super_admin(auth.uid()))
);

-- 4. Also fix restaurant_reservations for consistency (same pattern)
DROP POLICY IF EXISTS "Staff can view reservations in their resort" ON public.restaurant_reservations;

CREATE POLICY "Staff can view reservations in their resort" 
ON public.restaurant_reservations 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (has_resort_membership(auth.uid(), resort_id) OR is_super_admin(auth.uid()))
);