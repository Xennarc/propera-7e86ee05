-- =============================================================================
-- PHASE 2: LOCK DOWN ROLE AND MEMBERSHIP ESCALATION
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 2.1 Create trigger to prevent global_role self-escalation on profiles
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_profile_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only SUPER_ADMIN can change global_role
  IF OLD.global_role IS DISTINCT FROM NEW.global_role THEN
    IF NOT public.is_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only super admins can modify global_role';
    END IF;
  END IF;
  
  -- Only SUPER_ADMIN can change account_type
  IF OLD.account_type IS DISTINCT FROM NEW.account_type THEN
    IF NOT public.is_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only super admins can modify account_type';
    END IF;
  END IF;
  
  -- Only SUPER_ADMIN can assign vendor_id
  IF OLD.vendor_id IS DISTINCT FROM NEW.vendor_id THEN
    IF NOT public.is_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only super admins can modify vendor_id';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_profile_escalation() IS 
'Security trigger: Prevents privilege escalation by blocking non-super-admins from modifying sensitive profile fields';

DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_escalation();

-- -----------------------------------------------------------------------------
-- 2.2 Update profiles UPDATE policy to be more explicit
-- Users can update their own profile, but trigger blocks sensitive fields
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
CREATE POLICY "users_update_own_profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Super admins can update any profile
DROP POLICY IF EXISTS "superadmin_update_any_profile" ON public.profiles;
CREATE POLICY "superadmin_update_any_profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- 2.3 Create trigger to prevent membership self-grant
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_membership_self_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cannot add membership for yourself unless super admin
  IF NEW.user_id = auth.uid() AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Cannot grant yourself resort membership';
  END IF;
  
  -- Cannot escalate to RESORT_ADMIN unless caller is SUPER_ADMIN or already RESORT_ADMIN of that resort
  IF NEW.resort_role = 'RESORT_ADMIN' THEN
    IF NOT public.is_super_admin(auth.uid()) 
       AND NOT public.has_resort_role(auth.uid(), NEW.resort_id, ARRAY['RESORT_ADMIN']::public.resort_role[]) THEN
      RAISE EXCEPTION 'Only super admins or resort admins can grant RESORT_ADMIN role';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_membership_self_grant() IS 
'Security trigger: Prevents self-granting resort membership and unauthorized RESORT_ADMIN escalation';

DROP TRIGGER IF EXISTS trg_prevent_membership_self_grant ON public.resort_memberships;
CREATE TRIGGER trg_prevent_membership_self_grant
  BEFORE INSERT OR UPDATE ON public.resort_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_membership_self_grant();

-- -----------------------------------------------------------------------------
-- 2.4 Harden resort_memberships policies
-- -----------------------------------------------------------------------------

-- Super admins can insert any membership
DROP POLICY IF EXISTS "superadmin_insert_memberships" ON public.resort_memberships;
CREATE POLICY "superadmin_insert_memberships"
  ON public.resort_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Resort admins can insert memberships for their resort (trigger validates role limits)
DROP POLICY IF EXISTS "resort_admin_insert_memberships" ON public.resort_memberships;
CREATE POLICY "resort_admin_insert_memberships"
  ON public.resort_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::public.resort_role[])
  );

-- Super admins can delete any membership
DROP POLICY IF EXISTS "superadmin_delete_memberships" ON public.resort_memberships;
CREATE POLICY "superadmin_delete_memberships"
  ON public.resort_memberships
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Resort admins can delete memberships in their resort (except other resort admins unless super admin)
DROP POLICY IF EXISTS "resort_admin_delete_memberships" ON public.resort_memberships;
CREATE POLICY "resort_admin_delete_memberships"
  ON public.resort_memberships
  FOR DELETE
  TO authenticated
  USING (
    public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::public.resort_role[])
    AND (
      resort_role != 'RESORT_ADMIN' 
      OR public.is_super_admin(auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 2.5 Create audited RPCs for membership changes
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_add_resort_member(
  p_resort_id uuid,
  p_user_id uuid,
  p_role public.resort_role,
  p_department text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership_id uuid;
  v_caller_id uuid := auth.uid();
BEGIN
  -- Permission check
  IF NOT public.is_super_admin(v_caller_id) 
     AND NOT public.has_resort_role(v_caller_id, p_resort_id, ARRAY['RESORT_ADMIN']::public.resort_role[]) THEN
    RAISE EXCEPTION 'Insufficient permissions to add resort members';
  END IF;
  
  -- Cannot self-grant (unless super admin)
  IF p_user_id = v_caller_id AND NOT public.is_super_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Cannot grant yourself resort membership';
  END IF;
  
  -- Cannot grant RESORT_ADMIN unless caller is super admin
  IF p_role = 'RESORT_ADMIN' AND NOT public.is_super_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Only super admins can grant RESORT_ADMIN role';
  END IF;
  
  -- Insert membership
  INSERT INTO public.resort_memberships (resort_id, user_id, resort_role, department)
  VALUES (p_resort_id, p_user_id, p_role, p_department)
  ON CONFLICT (resort_id, user_id) DO UPDATE SET
    resort_role = EXCLUDED.resort_role,
    department = EXCLUDED.department,
    updated_at = now()
  RETURNING id INTO v_membership_id;
  
  -- Audit log
  INSERT INTO public.admin_audit_logs (actor_id, action, resort_id, metadata_json)
  VALUES (
    v_caller_id,
    'membership_granted',
    p_resort_id,
    jsonb_build_object(
      'target_user_id', p_user_id,
      'role', p_role,
      'department', p_department
    )
  );
  
  RETURN v_membership_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_resort_member(
  p_resort_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_deleted_role public.resort_role;
BEGIN
  -- Permission check
  IF NOT public.is_super_admin(v_caller_id) 
     AND NOT public.has_resort_role(v_caller_id, p_resort_id, ARRAY['RESORT_ADMIN']::public.resort_role[]) THEN
    RAISE EXCEPTION 'Insufficient permissions to remove resort members';
  END IF;
  
  -- Get the role being deleted for audit and validation
  SELECT resort_role INTO v_deleted_role
  FROM public.resort_memberships
  WHERE resort_id = p_resort_id AND user_id = p_user_id;
  
  IF v_deleted_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Only super admin can remove RESORT_ADMIN
  IF v_deleted_role = 'RESORT_ADMIN' AND NOT public.is_super_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Only super admins can remove RESORT_ADMIN members';
  END IF;
  
  -- Delete membership
  DELETE FROM public.resort_memberships
  WHERE resort_id = p_resort_id AND user_id = p_user_id;
  
  -- Audit log
  INSERT INTO public.admin_audit_logs (actor_id, action, resort_id, metadata_json)
  VALUES (
    v_caller_id,
    'membership_revoked',
    p_resort_id,
    jsonb_build_object(
      'target_user_id', p_user_id,
      'previous_role', v_deleted_role
    )
  );
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.admin_add_resort_member IS 'Audited RPC to add/update resort membership with proper authorization checks';
COMMENT ON FUNCTION public.admin_remove_resort_member IS 'Audited RPC to remove resort membership with proper authorization checks';