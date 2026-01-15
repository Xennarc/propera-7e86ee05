-- =============================================================================
-- PHASE 4: SECURITY AUDIT VIEW + RPC (FIXED)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 4.1 Create security_rls_audit view
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.security_rls_audit AS
SELECT * FROM (
  -- Tables with RLS disabled
  SELECT 
    'RLS_DISABLED'::text as issue_type,
    'CRITICAL'::text as severity,
    'public'::text as schema_name,
    c.relname::text as table_name,
    'Row Level Security is disabled on this table'::text as details,
    format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', c.relname) as recommended_fix,
    1 as severity_order,
    1 as type_order
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' 
    AND c.relkind = 'r'
    AND NOT c.relrowsecurity
    AND c.relname NOT IN ('schema_migrations')

  UNION ALL

  -- Tables without FORCE RLS
  SELECT 
    'FORCE_RLS_DISABLED'::text,
    'HIGH'::text,
    'public'::text,
    c.relname::text,
    'FORCE ROW LEVEL SECURITY is not enabled - table owners bypass RLS'::text,
    format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', c.relname),
    2, 3
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' 
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
    AND c.relforcerowsecurity = false

  UNION ALL

  -- Tables with RLS but zero policies
  SELECT 
    'NO_POLICIES'::text,
    'CRITICAL'::text,
    'public'::text,
    c.relname::text,
    'RLS enabled but no policies - all access denied'::text,
    'Add appropriate RLS policies for this table'::text,
    1, 2
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  LEFT JOIN pg_policies p ON p.tablename = c.relname::text AND p.schemaname = n.nspname::text
  WHERE n.nspname = 'public' 
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
  GROUP BY c.relname
  HAVING COUNT(p.policyname) = 0

  UNION ALL

  -- UPDATE policies missing WITH CHECK
  SELECT 
    'UPDATE_MISSING_WITH_CHECK'::text,
    'MEDIUM'::text,
    schemaname::text,
    tablename::text,
    format('Policy "%s" has USING but no WITH CHECK', policyname)::text,
    format('Recreate policy "%s" with WITH CHECK clause', policyname)::text,
    3, 5
  FROM pg_policies
  WHERE schemaname = 'public'
    AND cmd = 'UPDATE'
    AND qual IS NOT NULL
    AND with_check IS NULL

  UNION ALL

  -- Tenant tables with nullable resort_id
  SELECT 
    'NULLABLE_RESORT_ID'::text,
    'MEDIUM'::text,
    'public'::text,
    c.relname::text,
    'resort_id column is nullable on tenant-owned table'::text,
    format('ALTER TABLE public.%I ALTER COLUMN resort_id SET NOT NULL;', c.relname)::text,
    3, 6
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  JOIN pg_attribute a ON c.oid = a.attrelid
  WHERE n.nspname = 'public' 
    AND c.relkind = 'r'
    AND a.attname = 'resort_id'
    AND NOT a.attnotnull
    AND a.attnum > 0
    AND c.relname NOT IN (
      'access_audit_log', 'admin_audit_logs', 'admin_notifications',
      'audit_logs', 'demo_login_tokens', 'demo_workspaces',
      'feature_flags', 'notifications', 'platform_activity_events',
      'platform_errors', 'platform_audit_log', 'profiles',
      'roles', 'staff_audit_logs', 'rollout_jobs'
    )

  UNION ALL

  -- Tables missing resort_id immutability trigger
  SELECT 
    'MISSING_IMMUTABILITY_TRIGGER'::text,
    'HIGH'::text,
    'public'::text,
    c.relname::text,
    'Table has resort_id but no immutability trigger'::text,
    format('CREATE TRIGGER trg_prevent_resort_id_change BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.prevent_resort_id_change();', c.relname)::text,
    2, 4
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  JOIN pg_attribute a ON c.oid = a.attrelid
  LEFT JOIN pg_trigger t ON t.tgrelid = c.oid AND t.tgname = 'trg_prevent_resort_id_change'
  WHERE n.nspname = 'public' 
    AND c.relkind = 'r'
    AND a.attname = 'resort_id'
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND t.tgname IS NULL
) sub
ORDER BY severity_order, type_order, table_name;

COMMENT ON VIEW public.security_rls_audit IS 
'Security audit view showing RLS posture issues. Super Admin only.';

-- -----------------------------------------------------------------------------
-- 4.2 Create RPC to query audit view
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_security_audit_results()
RETURNS TABLE (
  issue_type text,
  severity text,
  schema_name text,
  table_name text,
  details text,
  recommended_fix text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT issue_type, severity, schema_name, table_name, details, recommended_fix
  FROM public.security_rls_audit
  WHERE public.is_super_admin(auth.uid());
$$;

-- -----------------------------------------------------------------------------
-- 4.3 Create summary stats function
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_security_audit_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RETURN NULL;
  END IF;
  
  SELECT jsonb_build_object(
    'total_issues', (SELECT COUNT(*) FROM public.security_rls_audit),
    'critical_count', (SELECT COUNT(*) FROM public.security_rls_audit WHERE severity = 'CRITICAL'),
    'high_count', (SELECT COUNT(*) FROM public.security_rls_audit WHERE severity = 'HIGH'),
    'medium_count', (SELECT COUNT(*) FROM public.security_rls_audit WHERE severity = 'MEDIUM'),
    'by_type', (
      SELECT COALESCE(jsonb_object_agg(issue_type, cnt), '{}'::jsonb)
      FROM (SELECT issue_type, COUNT(*) as cnt FROM public.security_rls_audit GROUP BY issue_type) s
    ),
    'last_checked', now()
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;