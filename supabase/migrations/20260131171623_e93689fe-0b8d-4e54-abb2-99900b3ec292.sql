-- Create admin_update_resort_member_role function
-- This allows SUPER_ADMIN to update an existing membership role by membership_id
CREATE OR REPLACE FUNCTION public.admin_update_resort_member_role(
  p_membership_id uuid,
  p_new_role resort_role
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_membership RECORD;
  v_old_role public.resort_role;
BEGIN
  -- Only super admins can use this function
  IF NOT public.is_super_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Only super admins can update resort member roles via this function';
  END IF;
  
  -- Get the membership details
  SELECT m.id, m.resort_id, m.user_id, m.resort_role
  INTO v_membership
  FROM public.resort_memberships m
  WHERE m.id = p_membership_id;
  
  IF v_membership IS NULL THEN
    RAISE EXCEPTION 'Membership not found';
  END IF;
  
  v_old_role := v_membership.resort_role;
  
  -- Don't update if same role
  IF v_old_role = p_new_role THEN
    RETURN true;
  END IF;
  
  -- Update the membership
  UPDATE public.resort_memberships
  SET resort_role = p_new_role,
      updated_at = now()
  WHERE id = p_membership_id;
  
  -- Audit log
  INSERT INTO public.admin_audit_logs (actor_id, action, resort_id, metadata_json)
  VALUES (
    v_caller_id,
    'membership_role_updated',
    v_membership.resort_id,
    jsonb_build_object(
      'target_user_id', v_membership.user_id,
      'membership_id', p_membership_id,
      'previous_role', v_old_role,
      'new_role', p_new_role
    )
  );
  
  RETURN true;
END;
$$;

-- Create admin_remove_membership_by_id function
-- This allows removal by membership_id rather than resort_id + user_id
CREATE OR REPLACE FUNCTION public.admin_remove_membership_by_id(
  p_membership_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_membership RECORD;
  v_resort_admin_count int;
BEGIN
  -- Only super admins can use this function
  IF NOT public.is_super_admin(v_caller_id) THEN
    RAISE EXCEPTION 'Only super admins can remove memberships via this function';
  END IF;
  
  -- Get the membership details
  SELECT m.id, m.resort_id, m.user_id, m.resort_role
  INTO v_membership
  FROM public.resort_memberships m
  WHERE m.id = p_membership_id;
  
  IF v_membership IS NULL THEN
    RAISE EXCEPTION 'Membership not found';
  END IF;
  
  -- Safety check: prevent removing the last RESORT_ADMIN for a resort
  IF v_membership.resort_role = 'RESORT_ADMIN' THEN
    SELECT COUNT(*) INTO v_resort_admin_count
    FROM public.resort_memberships
    WHERE resort_id = v_membership.resort_id
      AND resort_role = 'RESORT_ADMIN';
    
    IF v_resort_admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last Resort Admin from this resort';
    END IF;
  END IF;
  
  -- Delete membership
  DELETE FROM public.resort_memberships
  WHERE id = p_membership_id;
  
  -- Audit log
  INSERT INTO public.admin_audit_logs (actor_id, action, resort_id, metadata_json)
  VALUES (
    v_caller_id,
    'membership_removed',
    v_membership.resort_id,
    jsonb_build_object(
      'target_user_id', v_membership.user_id,
      'membership_id', p_membership_id,
      'previous_role', v_membership.resort_role
    )
  );
  
  RETURN true;
END;
$$;