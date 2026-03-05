
CREATE OR REPLACE FUNCTION public.update_department_settings(
  p_department_id UUID,
  p_name TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_activity_scope_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_dept RECORD;
  v_caller_id UUID;
  v_is_super BOOLEAN;
  v_resort_role TEXT;
  v_dept_role TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get department
  SELECT * INTO v_dept FROM resort_departments WHERE id = p_department_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Department not found';
  END IF;

  -- Check super admin
  SELECT (global_role = 'SUPER_ADMIN') INTO v_is_super
  FROM profiles WHERE id = v_caller_id;

  IF NOT v_is_super THEN
    -- Check resort admin
    SELECT resort_role INTO v_resort_role
    FROM resort_memberships
    WHERE user_id = v_caller_id AND resort_id = v_dept.resort_id
    LIMIT 1;

    IF v_resort_role IS NULL OR v_resort_role != 'RESORT_ADMIN' THEN
      -- Check department manager
      SELECT dept_role INTO v_dept_role
      FROM department_memberships
      WHERE user_id = v_caller_id
        AND department_id = p_department_id
        AND is_active = true
      LIMIT 1;

      IF v_dept_role IS NULL OR (v_dept_role != 'manager' AND v_dept_role != 'MANAGER') THEN
        RAISE EXCEPTION 'Insufficient permissions: must be department manager, resort admin, or super admin';
      END IF;
    END IF;
  END IF;

  -- Apply updates
  UPDATE resort_departments SET
    name = COALESCE(p_name, name),
    is_active = COALESCE(p_is_active, is_active),
    activity_scope_key = CASE
      WHEN p_activity_scope_key IS NOT NULL THEN p_activity_scope_key
      ELSE activity_scope_key
    END
  WHERE id = p_department_id;

  RETURN jsonb_build_object(
    'success', true,
    'department_id', p_department_id
  );
END;
$$;
