-- Drop the overly permissive policy that exposes loyalty tiers to everyone
DROP POLICY IF EXISTS "Anyone can view loyalty tiers" ON public.loyalty_tiers;

-- The remaining policies are sufficient:
-- - "Resort admins can manage loyalty tiers" for admin management
-- - "Staff can view loyalty tiers in their resort" for staff viewing
-- Guests access tier data through guest_get_loyalty_info RPC (SECURITY DEFINER)