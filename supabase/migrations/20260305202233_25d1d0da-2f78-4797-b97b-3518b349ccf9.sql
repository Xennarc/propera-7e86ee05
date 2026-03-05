
-- ============================================================================
-- Phase 5: department_modules table + upsert RPC
-- ============================================================================

-- 1) Create table
CREATE TABLE public.department_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.resort_departments(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_id, module_key)
);

CREATE INDEX idx_department_modules_dept ON public.department_modules (department_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_department_modules_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_department_modules_updated_at
  BEFORE UPDATE ON public.department_modules
  FOR EACH ROW EXECUTE FUNCTION public.set_department_modules_updated_at();

-- 2) RLS
ALTER TABLE public.department_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_modules FORCE ROW LEVEL SECURITY;

-- Read: anyone with resort access
CREATE POLICY "dept_modules_select"
  ON public.department_modules FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.resort_departments rd
      WHERE rd.id = department_modules.department_id
        AND public.staff_has_resort_access(auth.uid(), rd.resort_id)
    )
  );

-- No direct writes — use RPC
CREATE POLICY "dept_modules_no_direct_insert"
  ON public.department_modules FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "dept_modules_no_direct_update"
  ON public.department_modules FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "dept_modules_no_direct_delete"
  ON public.department_modules FOR DELETE TO authenticated USING (false);

-- 3) Upsert RPC
CREATE OR REPLACE FUNCTION public.upsert_department_modules(
  p_department_id uuid,
  p_modules jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_mod jsonb;
  v_key text;
  v_enabled boolean;
  v_sort int;
  v_count int := 0;
BEGIN
  IF NOT public.can_manage_department(auth.uid(), p_department_id) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_modules) <> 'array' THEN
    RAISE EXCEPTION 'p_modules must be a JSON array' USING ERRCODE = '22023';
  END IF;

  FOR v_mod IN SELECT * FROM jsonb_array_elements(p_modules)
  LOOP
    v_key := v_mod ->> 'module_key';
    v_enabled := COALESCE((v_mod ->> 'enabled')::boolean, true);
    v_sort := COALESCE((v_mod ->> 'sort_order')::int, 0);

    IF v_key IS NULL THEN
      RAISE EXCEPTION 'Each module must have module_key' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.department_modules (department_id, module_key, enabled, sort_order)
    VALUES (p_department_id, v_key, v_enabled, v_sort)
    ON CONFLICT (department_id, module_key)
    DO UPDATE SET enabled = EXCLUDED.enabled, sort_order = EXCLUDED.sort_order, updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'upserted', v_count);
END;
$$;
