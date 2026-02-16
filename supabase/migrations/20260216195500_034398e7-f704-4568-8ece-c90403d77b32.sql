-- Fix 1: Restrict storage upload policies to validate resort membership
-- Drop existing overly permissive policies for resort-branding bucket
DROP POLICY IF EXISTS "Resort admins can upload branding images" ON storage.objects;
DROP POLICY IF EXISTS "Resort admins can update branding images" ON storage.objects;
DROP POLICY IF EXISTS "Resort admins can delete branding images" ON storage.objects;

-- Recreate with resort membership validation
-- Upload: user must be admin of the resort matching the file path prefix
CREATE POLICY "Resort admins can upload branding images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'resort-branding'
  AND auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.resort_memberships
      WHERE user_id = auth.uid()
      AND resort_id::text = split_part(name, '/', 1)
      AND resort_role IN ('RESORT_ADMIN', 'MANAGER')
    )
    OR public.is_super_admin(auth.uid())
  )
);

-- Update: same restriction
CREATE POLICY "Resort admins can update branding images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'resort-branding'
  AND auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.resort_memberships
      WHERE user_id = auth.uid()
      AND resort_id::text = split_part(name, '/', 1)
      AND resort_role IN ('RESORT_ADMIN', 'MANAGER')
    )
    OR public.is_super_admin(auth.uid())
  )
);

-- Delete: same restriction
CREATE POLICY "Resort admins can delete branding images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'resort-branding'
  AND auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.resort_memberships
      WHERE user_id = auth.uid()
      AND resort_id::text = split_part(name, '/', 1)
      AND resort_role IN ('RESORT_ADMIN', 'MANAGER')
    )
    OR public.is_super_admin(auth.uid())
  )
);

-- Fix 2: Restrict audit log INSERT policy to validate actor_user_id
DROP POLICY IF EXISTS "system_insert_access_audit_log" ON public.access_audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.access_audit_log;

-- Only allow inserts where actor matches authenticated user
CREATE POLICY "authenticated_insert_own_audit_logs" ON public.access_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()
  );

-- Service role (used by SECURITY DEFINER RPCs) can insert any audit log
CREATE POLICY "service_role_insert_audit_logs" ON public.access_audit_log
  FOR INSERT TO service_role
  WITH CHECK (true);