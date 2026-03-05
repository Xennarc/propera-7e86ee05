
-- ============================================================================
-- Phase 2: Secure configuration RPCs for department_bindings & profile
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- Helper: check if caller can manage a department
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_manage_department(p_user_id uuid, p_department_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT
    public.is_super_admin(p_user_id)
    OR EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      JOIN public.resort_departments rd ON rd.resort_id = rm.resort_id
      WHERE rm.user_id = p_user_id
        AND rd.id = p_department_id
        AND rm.resort_role = 'RESORT_ADMIN'
    )
    OR EXISTS (
      SELECT 1 FROM public.department_memberships dm
      WHERE dm.user_id = p_user_id
        AND dm.department_id = p_department_id
        AND dm.is_active = true
        AND dm.dept_role IN ('manager', 'MANAGER')
    );
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 1) upsert_department_bindings
--    p_bindings: jsonb array of {binding_type, binding_key, is_active}
--    Upserts matching rows; soft-deactivates rows not in payload.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_department_bindings(
  p_department_id uuid,
  p_bindings jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_resort_id uuid;
  v_binding jsonb;
  v_type text;
  v_key text;
  v_active boolean;
  v_upserted_ids uuid[] := '{}';
  v_row_id uuid;
BEGIN
  -- Auth check
  IF NOT public.can_manage_department(auth.uid(), p_department_id) THEN
    RAISE EXCEPTION 'Permission denied: cannot manage this department'
      USING ERRCODE = '42501';
  END IF;

  -- Resolve resort_id
  SELECT resort_id INTO v_resort_id
  FROM public.resort_departments
  WHERE id = p_department_id;

  IF v_resort_id IS NULL THEN
    RAISE EXCEPTION 'Department not found'
      USING ERRCODE = 'P0002';
  END IF;

  -- Validate p_bindings is an array
  IF jsonb_typeof(p_bindings) <> 'array' THEN
    RAISE EXCEPTION 'p_bindings must be a JSON array'
      USING ERRCODE = '22023';
  END IF;

  -- Upsert each binding
  FOR v_binding IN SELECT * FROM jsonb_array_elements(p_bindings)
  LOOP
    v_type := v_binding ->> 'binding_type';
    v_key := v_binding ->> 'binding_key';
    v_active := COALESCE((v_binding ->> 'is_active')::boolean, true);

    -- Validate required fields
    IF v_type IS NULL OR v_key IS NULL THEN
      RAISE EXCEPTION 'Each binding must have binding_type and binding_key'
        USING ERRCODE = '22023';
    END IF;

    -- Validate binding_type
    IF v_type NOT IN ('activity_category', 'restaurant') THEN
      RAISE EXCEPTION 'Invalid binding_type: %. Must be activity_category or restaurant.', v_type
        USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.department_bindings (resort_id, department_id, binding_type, binding_key, is_active)
    VALUES (v_resort_id, p_department_id, v_type, v_key, v_active)
    ON CONFLICT (resort_id, department_id, binding_type, binding_key)
    DO UPDATE SET is_active = EXCLUDED.is_active, updated_at = now()
    RETURNING id INTO v_row_id;

    v_upserted_ids := array_append(v_upserted_ids, v_row_id);
  END LOOP;

  -- Soft-deactivate bindings NOT in the payload (same department)
  UPDATE public.department_bindings
  SET is_active = false, updated_at = now()
  WHERE department_id = p_department_id
    AND id <> ALL(v_upserted_ids)
    AND is_active = true;

  RETURN jsonb_build_object(
    'success', true,
    'upserted', array_length(v_upserted_ids, 1),
    'department_id', p_department_id
  );
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2) update_department_profile
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_department_profile(
  p_department_id uuid,
  p_name text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_updated_count int;
BEGIN
  -- Auth check
  IF NOT public.can_manage_department(auth.uid(), p_department_id) THEN
    RAISE EXCEPTION 'Permission denied: cannot manage this department'
      USING ERRCODE = '42501';
  END IF;

  -- Validate at least one field provided
  IF p_name IS NULL AND p_is_active IS NULL THEN
    RAISE EXCEPTION 'At least one of p_name or p_is_active must be provided'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.resort_departments
  SET
    name = COALESCE(p_name, name),
    is_active = COALESCE(p_is_active, is_active)
  WHERE id = p_department_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    RAISE EXCEPTION 'Department not found'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'department_id', p_department_id
  );
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3) get_department_bindings (read helper)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_department_bindings(p_department_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_resort_id uuid;
  v_result jsonb;
BEGIN
  -- Resolve resort_id and verify access
  SELECT resort_id INTO v_resort_id
  FROM public.resort_departments
  WHERE id = p_department_id;

  IF v_resort_id IS NULL THEN
    RAISE EXCEPTION 'Department not found'
      USING ERRCODE = 'P0002';
  END IF;

  -- Require at least resort-level access
  IF NOT public.is_super_admin(auth.uid())
     AND NOT public.staff_has_resort_access(auth.uid(), v_resort_id) THEN
    RAISE EXCEPTION 'Permission denied'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', db.id,
      'binding_type', db.binding_type,
      'binding_key', db.binding_key,
      'is_active', db.is_active,
      'created_at', db.created_at,
      'updated_at', db.updated_at
    )
  ), '[]'::jsonb)
  INTO v_result
  FROM public.department_bindings db
  WHERE db.department_id = p_department_id
    AND db.is_active = true;

  RETURN v_result;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4) Drop overly-permissive direct write policies; replace with deny-all
--    Writes should go through RPCs only.
-- ──────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "dept_bindings_insert" ON public.department_bindings;
DROP POLICY IF EXISTS "dept_bindings_update" ON public.department_bindings;
DROP POLICY IF EXISTS "dept_bindings_delete" ON public.department_bindings;

-- Deny direct writes from authenticated users (RPCs use SECURITY DEFINER which bypasses RLS)
CREATE POLICY "dept_bindings_no_direct_insert"
  ON public.department_bindings FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "dept_bindings_no_direct_update"
  ON public.department_bindings FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "dept_bindings_no_direct_delete"
  ON public.department_bindings FOR DELETE TO authenticated
  USING (false);
