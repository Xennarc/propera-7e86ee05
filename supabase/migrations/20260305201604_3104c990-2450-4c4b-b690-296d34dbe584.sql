
-- ============================================================================
-- Phase 1: department_bindings — single source of truth for department scope
-- ============================================================================

-- 1) Create table
CREATE TABLE public.department_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.resort_departments(id) ON DELETE CASCADE,
  binding_type text NOT NULL,
  binding_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resort_id, department_id, binding_type, binding_key)
);

-- 2) Indexes
CREATE INDEX idx_department_bindings_dept
  ON public.department_bindings (resort_id, department_id, binding_type);

CREATE INDEX idx_department_bindings_lookup
  ON public.department_bindings (resort_id, binding_type, binding_key);

-- 3) updated_at trigger
CREATE OR REPLACE FUNCTION public.set_department_bindings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_department_bindings_updated_at
  BEFORE UPDATE ON public.department_bindings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_department_bindings_updated_at();

-- 4) Enable RLS
ALTER TABLE public.department_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_bindings FORCE ROW LEVEL SECURITY;

-- 5) RLS Policies

CREATE POLICY "dept_bindings_select"
  ON public.department_bindings FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.staff_has_resort_access(auth.uid(), resort_id)
  );

CREATE POLICY "dept_bindings_insert"
  ON public.department_bindings FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      WHERE rm.user_id = auth.uid() AND rm.resort_id = department_bindings.resort_id AND rm.resort_role = 'RESORT_ADMIN'
    )
    OR EXISTS (
      SELECT 1 FROM public.department_memberships dm
      WHERE dm.user_id = auth.uid() AND dm.department_id = department_bindings.department_id
        AND dm.is_active = true AND dm.dept_role IN ('manager', 'MANAGER')
    )
  );

CREATE POLICY "dept_bindings_update"
  ON public.department_bindings FOR UPDATE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.resort_memberships rm WHERE rm.user_id = auth.uid() AND rm.resort_id = department_bindings.resort_id AND rm.resort_role = 'RESORT_ADMIN')
    OR EXISTS (SELECT 1 FROM public.department_memberships dm WHERE dm.user_id = auth.uid() AND dm.department_id = department_bindings.department_id AND dm.is_active = true AND dm.dept_role IN ('manager', 'MANAGER'))
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.resort_memberships rm WHERE rm.user_id = auth.uid() AND rm.resort_id = department_bindings.resort_id AND rm.resort_role = 'RESORT_ADMIN')
    OR EXISTS (SELECT 1 FROM public.department_memberships dm WHERE dm.user_id = auth.uid() AND dm.department_id = department_bindings.department_id AND dm.is_active = true AND dm.dept_role IN ('manager', 'MANAGER'))
  );

CREATE POLICY "dept_bindings_delete"
  ON public.department_bindings FOR DELETE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.resort_memberships rm WHERE rm.user_id = auth.uid() AND rm.resort_id = department_bindings.resort_id AND rm.resort_role = 'RESORT_ADMIN')
    OR EXISTS (SELECT 1 FROM public.department_memberships dm WHERE dm.user_id = auth.uid() AND dm.department_id = department_bindings.department_id AND dm.is_active = true AND dm.dept_role IN ('manager', 'MANAGER'))
  );

-- 6) Backfill from existing activity_scope_key (idempotent)
INSERT INTO public.department_bindings (resort_id, department_id, binding_type, binding_key)
SELECT rd.resort_id, rd.id, 'activity_category', rd.activity_scope_key
FROM public.resort_departments rd
WHERE rd.activity_scope_key IS NOT NULL AND rd.is_active = true
ON CONFLICT (resort_id, department_id, binding_type, binding_key) DO NOTHING;

-- 7) Immutable resort_id trigger
CREATE OR REPLACE FUNCTION public.immutable_department_bindings_resort_id()
RETURNS trigger LANGUAGE plpgsql SET search_path TO public AS $$
BEGIN
  IF OLD.resort_id IS DISTINCT FROM NEW.resort_id THEN
    RAISE EXCEPTION 'resort_id on department_bindings is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_immutable_dept_bindings_resort_id
  BEFORE UPDATE ON public.department_bindings
  FOR EACH ROW
  EXECUTE FUNCTION public.immutable_department_bindings_resort_id();
