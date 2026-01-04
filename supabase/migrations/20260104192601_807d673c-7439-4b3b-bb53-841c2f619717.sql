
-- ============================================
-- RBAC Finalization: Single Source of Truth
-- ============================================

-- 1. Add key column to roles table for mapping from resort_role enum
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS key TEXT UNIQUE;

-- Set keys for existing system roles
UPDATE public.roles SET key = 'RESORT_ADMIN' WHERE name = 'Resort Administrator';
UPDATE public.roles SET key = 'MANAGER' WHERE name = 'Manager';
UPDATE public.roles SET key = 'FRONT_OFFICE' WHERE name = 'Front Office';
UPDATE public.roles SET key = 'RESERVATIONS' WHERE name = 'Reservations';
UPDATE public.roles SET key = 'ACTIVITIES' WHERE name = 'Activities Coordinator';
UPDATE public.roles SET key = 'FNB' WHERE name = 'F&B Staff';

-- Make key NOT NULL after setting values
ALTER TABLE public.roles ALTER COLUMN key SET NOT NULL;

-- 2. Create function to map resort_role to role_id
CREATE OR REPLACE FUNCTION public.get_role_id_for_resort_role(p_resort_role TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT id FROM roles WHERE key = p_resort_role LIMIT 1);
END;
$$;

-- 3. Create enhanced resolve_permissions function
-- This is the single source of truth for permission resolution
CREATE OR REPLACE FUNCTION public.resolve_permissions(p_user_id UUID, p_resort_id UUID)
RETURNS TABLE(permission_key TEXT, source TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
BEGIN
  -- Check if super admin via profiles.global_role
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user_id AND global_role = 'SUPER_ADMIN'
  ) INTO v_is_super_admin;
  
  IF v_is_super_admin THEN
    -- Super admin has all permissions
    RETURN QUERY 
    SELECT p.key, 'super_admin'::TEXT 
    FROM permissions p;
    RETURN;
  END IF;
  
  -- Get permissions from all sources with proper precedence
  RETURN QUERY
  WITH 
  -- Get role from resort_memberships (primary source)
  membership_role AS (
    SELECT get_role_id_for_resort_role(rm.resort_role::TEXT) as role_id
    FROM resort_memberships rm
    WHERE rm.user_id = p_user_id AND rm.resort_id = p_resort_id
  ),
  -- Get any additional roles from user_resort_roles (for custom role assignments)
  custom_roles AS (
    SELECT urr.role_id
    FROM user_resort_roles urr
    WHERE urr.user_id = p_user_id AND urr.resort_id = p_resort_id
  ),
  -- Combine all role IDs
  all_roles AS (
    SELECT role_id FROM membership_role WHERE role_id IS NOT NULL
    UNION
    SELECT role_id FROM custom_roles
  ),
  -- Get all permissions from all assigned roles
  role_perms AS (
    SELECT DISTINCT rp.permission_key, 'role'::TEXT as source
    FROM all_roles ar
    JOIN role_permissions rp ON rp.role_id = ar.role_id
  ),
  -- Get permission overrides
  overrides AS (
    SELECT 
      upo.permission_key,
      CASE WHEN upo.effect = 'grant' THEN 'override_grant'::TEXT ELSE 'override_revoke'::TEXT END as source,
      upo.effect
    FROM user_permission_overrides upo
    WHERE upo.user_id = p_user_id AND upo.resort_id = p_resort_id
  ),
  -- Apply override logic: DENY removes, ALLOW adds
  combined AS (
    -- Role permissions NOT revoked by override
    SELECT rp.permission_key, rp.source
    FROM role_perms rp
    WHERE NOT EXISTS (
      SELECT 1 FROM overrides o 
      WHERE o.permission_key = rp.permission_key AND o.effect = 'revoke'
    )
    UNION
    -- Explicitly granted permissions via override
    SELECT o.permission_key, o.source
    FROM overrides o
    WHERE o.effect = 'grant'
  )
  SELECT * FROM combined;
END;
$$;

-- 4. Update get_user_effective_permissions to use resolve_permissions
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(p_user_id UUID, p_resort_id UUID)
RETURNS TABLE(permission_key TEXT, source TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM resolve_permissions(p_user_id, p_resort_id);
END;
$$;

-- 5. Create helper function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id UUID, p_resort_id UUID, p_permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM resolve_permissions(p_user_id, p_resort_id) rp
    WHERE rp.permission_key = p_permission_key
  );
END;
$$;

-- 6. Create helper function to check any permissions
CREATE OR REPLACE FUNCTION public.user_has_any_permission(p_user_id UUID, p_resort_id UUID, p_permission_keys TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM resolve_permissions(p_user_id, p_resort_id) rp
    WHERE rp.permission_key = ANY(p_permission_keys)
  );
END;
$$;

-- 7. Create helper function to check all permissions
CREATE OR REPLACE FUNCTION public.user_has_all_permissions(p_user_id UUID, p_resort_id UUID, p_permission_keys TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT rp.permission_key) INTO v_count
  FROM resolve_permissions(p_user_id, p_resort_id) rp
  WHERE rp.permission_key = ANY(p_permission_keys);
  
  RETURN v_count = array_length(p_permission_keys, 1);
END;
$$;

-- 8. Create function to get user's effective role info for a resort
CREATE OR REPLACE FUNCTION public.get_user_resort_info(p_user_id UUID, p_resort_id UUID)
RETURNS TABLE(
  resort_role TEXT,
  role_id UUID,
  role_name TEXT,
  is_super_admin BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rm.resort_role::TEXT,
    r.id as role_id,
    r.name as role_name,
    COALESCE((SELECT global_role = 'SUPER_ADMIN' FROM profiles WHERE id = p_user_id), FALSE) as is_super_admin
  FROM resort_memberships rm
  LEFT JOIN roles r ON r.key = rm.resort_role::TEXT
  WHERE rm.user_id = p_user_id AND rm.resort_id = p_resort_id;
END;
$$;

-- 9. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.resolve_permissions(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_any_permission(UUID, UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_all_permissions(UUID, UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_resort_info(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_role_id_for_resort_role(TEXT) TO authenticated;
