-- Fix 4 error-level security vulnerabilities:
-- 1. demo_login_tokens - exposed to public with USING(true)
-- 2. demo_workspaces - exposed to public with USING(true)  
-- 3. prearrival_tokens - public SELECT allows token harvesting
-- 4. access_audit_log - public insert policy with USING(true)

-- ============================================
-- FIX 1: demo_login_tokens table
-- Tokens should only be accessed via service_role (edge functions)
-- ============================================

DROP POLICY IF EXISTS "System can manage demo tokens" ON public.demo_login_tokens;

-- Super admins can view demo login tokens for debugging
CREATE POLICY "Super admins can view demo login tokens"
ON public.demo_login_tokens
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Note: Edge functions use service_role which bypasses RLS
-- No direct user write access needed

-- ============================================
-- FIX 2: demo_workspaces table
-- Contains email addresses - restrict to super admins only
-- ============================================

DROP POLICY IF EXISTS "System can manage demo workspaces" ON public.demo_workspaces;

-- Super admins can view demo workspaces
CREATE POLICY "Super admins can view demo workspaces"
ON public.demo_workspaces
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Super admins can manage demo workspaces (for cleanup)
CREATE POLICY "Super admins can manage demo workspaces"
ON public.demo_workspaces
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- ============================================
-- FIX 3: prearrival_tokens table
-- Remove public SELECT that allows token harvesting
-- Token validation should happen via RPC
-- ============================================

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "public_validate_prearrival_tokens" ON public.prearrival_tokens;
DROP POLICY IF EXISTS "Staff can manage pre-arrival tokens" ON public.prearrival_tokens;

-- Note: validate_prearrival_token RPC (SECURITY DEFINER) handles token validation
-- Staff access policies remain in place via staff_manage_prearrival_tokens

-- ============================================
-- FIX 4: access_audit_log table
-- Remove public INSERT with true, restrict to service_role
-- ============================================

DROP POLICY IF EXISTS "System can insert audit logs" ON public.access_audit_log;

-- Audit log inserts should only happen through triggers/RPCs with service_role
-- The system_insert_access_audit_log policy for authenticated users is acceptable
-- as it's used for direct audit logging from authenticated sessions