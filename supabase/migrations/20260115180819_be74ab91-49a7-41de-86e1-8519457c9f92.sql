-- Fix: Remove SECURITY DEFINER from view (use INVOKER which is default)
-- The view should be accessed via the RPC which handles auth

DROP VIEW IF EXISTS public.security_rls_audit;

CREATE VIEW public.security_rls_audit 
WITH (security_invoker = true) AS
SELECT * FROM (
  SELECT 
    'RLS_DISABLED'::text as issue_type,
    'CRITICAL'::text as severity,
    'public'::text as schema_name,
    c.relname::text as table_name,
    'Row Level Security is disabled on this table'::text as details,
    format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', c.relname) as recommended_fix,
    1 as severity_order, 1 as type_order
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
    AND c.relname NOT IN ('schema_migrations')

  UNION ALL

  SELECT 
    'FORCE_RLS_DISABLED'::text, 'HIGH'::text, 'public'::text, c.relname::text,
    'FORCE ROW LEVEL SECURITY is not enabled'::text,
    format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', c.relname),
    2, 3
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relkind = 'r' 
    AND c.relrowsecurity = true AND c.relforcerowsecurity = false

  UNION ALL

  SELECT 
    'NO_POLICIES'::text, 'CRITICAL'::text, 'public'::text, c.relname::text,
    'RLS enabled but no policies'::text, 'Add appropriate RLS policies'::text, 1, 2
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  LEFT JOIN pg_policies p ON p.tablename = c.relname::text AND p.schemaname = n.nspname::text
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true
  GROUP BY c.relname
  HAVING COUNT(p.policyname) = 0

  UNION ALL

  SELECT 
    'UPDATE_MISSING_WITH_CHECK'::text, 'MEDIUM'::text, schemaname::text, tablename::text,
    format('Policy "%s" missing WITH CHECK', policyname)::text,
    format('Recreate policy with WITH CHECK', policyname)::text, 3, 5
  FROM pg_policies
  WHERE schemaname = 'public' AND cmd = 'UPDATE' AND qual IS NOT NULL AND with_check IS NULL

  UNION ALL

  SELECT 
    'NULLABLE_RESORT_ID'::text, 'MEDIUM'::text, 'public'::text, c.relname::text,
    'resort_id is nullable on tenant table'::text,
    format('ALTER TABLE public.%I ALTER COLUMN resort_id SET NOT NULL;', c.relname)::text, 3, 6
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  JOIN pg_attribute a ON c.oid = a.attrelid
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.attname = 'resort_id'
    AND NOT a.attnotnull AND a.attnum > 0
    AND c.relname NOT IN (
      'access_audit_log', 'admin_audit_logs', 'admin_notifications', 'audit_logs',
      'demo_login_tokens', 'demo_workspaces', 'feature_flags', 'notifications',
      'platform_activity_events', 'platform_errors', 'platform_audit_log',
      'profiles', 'roles', 'staff_audit_logs', 'rollout_jobs'
    )

  UNION ALL

  SELECT 
    'MISSING_IMMUTABILITY_TRIGGER'::text, 'HIGH'::text, 'public'::text, c.relname::text,
    'No resort_id immutability trigger'::text,
    format('CREATE TRIGGER trg_prevent_resort_id_change...', c.relname)::text, 2, 4
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  JOIN pg_attribute a ON c.oid = a.attrelid
  LEFT JOIN pg_trigger t ON t.tgrelid = c.oid AND t.tgname = 'trg_prevent_resort_id_change'
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.attname = 'resort_id'
    AND a.attnum > 0 AND NOT a.attisdropped AND t.tgname IS NULL
) sub
ORDER BY severity_order, type_order, table_name;