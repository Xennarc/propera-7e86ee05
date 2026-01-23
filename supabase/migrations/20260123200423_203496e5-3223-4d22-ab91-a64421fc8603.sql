-- Fix overly permissive RLS policies on demo_leads and demo_rate_limits tables
-- These tables contain sensitive marketing and rate limiting data that should only be accessible to super admins

-- ============================================
-- FIX 1: demo_leads table
-- ============================================

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Allow service role full access to demo_leads" ON public.demo_leads;

-- Super admins can view demo leads
CREATE POLICY "Super admins can view demo leads"
ON public.demo_leads
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Super admins can manage demo leads (insert, update, delete)
CREATE POLICY "Super admins can manage demo leads"
ON public.demo_leads
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- ============================================
-- FIX 2: demo_rate_limits table
-- ============================================

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "System can manage rate limits" ON public.demo_rate_limits;

-- Super admins can view rate limits for debugging
CREATE POLICY "Super admins can view rate limits"
ON public.demo_rate_limits
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Note: Edge functions use service_role which bypasses RLS entirely
-- No direct user write access is needed for this table