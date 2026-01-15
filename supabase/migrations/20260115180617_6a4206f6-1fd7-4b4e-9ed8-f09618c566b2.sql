-- =============================================================================
-- PHASE 3: SECURITY DEFINER FUNCTION HARDENING + AUDIT LOG (SIMPLIFIED)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3.1 Fix known functions missing search_path
-- Recreate with proper SET search_path = public
-- -----------------------------------------------------------------------------

-- Fix create_resort_settings_on_insert
CREATE OR REPLACE FUNCTION public.create_resort_settings_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.resort_settings (resort_id)
  VALUES (NEW.id)
  ON CONFLICT (resort_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column (common trigger function)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3.2 Create platform_audit_log table for comprehensive security auditing
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.platform_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid,
  actor_type text NOT NULL CHECK (actor_type IN ('staff', 'guest', 'system', 'super_admin')),
  action text NOT NULL,
  target_table text,
  target_id uuid,
  resort_id uuid REFERENCES public.resorts(id) ON DELETE SET NULL,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  request_id uuid DEFAULT gen_random_uuid(),
  ip_address text,
  user_agent text
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_platform_audit_log_created 
  ON public.platform_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_log_actor 
  ON public.platform_audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_log_resort 
  ON public.platform_audit_log(resort_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_log_action 
  ON public.platform_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_platform_audit_log_target 
  ON public.platform_audit_log(target_table, target_id);

-- Enable RLS
ALTER TABLE public.platform_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_audit_log FORCE ROW LEVEL SECURITY;

-- Only super admins can read the full audit log
DROP POLICY IF EXISTS "superadmin_select_audit_log" ON public.platform_audit_log;
CREATE POLICY "superadmin_select_audit_log"
  ON public.platform_audit_log
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Resort admins can read audit entries for their resort
DROP POLICY IF EXISTS "resort_admin_select_audit_log" ON public.platform_audit_log;
CREATE POLICY "resort_admin_select_audit_log"
  ON public.platform_audit_log
  FOR SELECT
  TO authenticated
  USING (
    resort_id IS NOT NULL 
    AND public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::public.resort_role[])
  );

-- No direct inserts from client - only via SECURITY DEFINER RPC
DROP POLICY IF EXISTS "deny_direct_insert_audit_log" ON public.platform_audit_log;
CREATE POLICY "deny_direct_insert_audit_log"
  ON public.platform_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- -----------------------------------------------------------------------------
-- 3.3 Create log_security_event RPC for inserting audit entries
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action text,
  p_target_table text DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_resort_id uuid DEFAULT NULL,
  p_old_value jsonb DEFAULT NULL,
  p_new_value jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_actor_type text;
  v_caller_id uuid := auth.uid();
BEGIN
  -- Determine actor type
  IF v_caller_id IS NULL THEN
    v_actor_type := 'system';
  ELSIF public.is_super_admin(v_caller_id) THEN
    v_actor_type := 'super_admin';
  ELSE
    v_actor_type := 'staff';
  END IF;
  
  INSERT INTO public.platform_audit_log (
    actor_user_id,
    actor_type,
    action,
    target_table,
    target_id,
    resort_id,
    old_value,
    new_value,
    metadata
  )
  VALUES (
    v_caller_id,
    v_actor_type,
    p_action,
    p_target_table,
    p_target_id,
    p_resort_id,
    p_old_value,
    p_new_value,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION public.log_security_event IS 
'Centralized security audit logging. Automatically determines actor type and enforces audit trail.';

-- Helper for admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action text,
  p_resort_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.log_security_event(
    p_action := p_action,
    p_resort_id := p_resort_id,
    p_metadata := p_metadata
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 3.4 Enable realtime for audit log (super admin monitoring)
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'platform_audit_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_audit_log;
  END IF;
END $$;