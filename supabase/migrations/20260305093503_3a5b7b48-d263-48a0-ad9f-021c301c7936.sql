
-- =============================================================================
-- 1. Create resort_departments table (does not exist yet)
-- =============================================================================
CREATE TABLE public.resort_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(resort_id, key)
);

ALTER TABLE public.resort_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resort_departments FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. Evolve department_memberships (additive)
-- =============================================================================
-- Add department_id FK column (nullable initially for backward compat with existing rows)
ALTER TABLE public.department_memberships
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.resort_departments(id) ON DELETE CASCADE;

-- Add is_active column
ALTER TABLE public.department_memberships
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Expand dept_role CHECK to include 'staff' (drop old, add new)
ALTER TABLE public.department_memberships
  DROP CONSTRAINT IF EXISTS department_memberships_dept_role_check;

ALTER TABLE public.department_memberships
  ADD CONSTRAINT department_memberships_dept_role_check
  CHECK (dept_role IN ('LINE', 'SUPERVISOR', 'MANAGER', 'staff', 'manager'));

-- Add unique constraint on (department_id, user_id) if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.department_memberships'::regclass
      AND conname = 'department_memberships_department_id_user_id_key'
  ) THEN
    ALTER TABLE public.department_memberships
      ADD CONSTRAINT department_memberships_department_id_user_id_key
      UNIQUE (department_id, user_id);
  END IF;
END$$;

-- =============================================================================
-- 3. Create department_module_access table
-- =============================================================================
CREATE TABLE public.department_module_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.resort_departments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(department_id, user_id, module_key)
);

ALTER TABLE public.department_module_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_module_access FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- 4. Trigger: auto-insert default module access on membership creation
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trg_department_membership_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _all_modules text[] := ARRAY[
    'ops_planner', 'master_ops_sheet', 'ops_inbox', 'session_run_sheet',
    'resources_assets', 'resources_shifts', 'resources_unavailability',
    'pickup_runs', 'compliance_verify', 'compliance_medical'
  ];
  _staff_defaults text[] := ARRAY[
    'ops_planner', 'master_ops_sheet', 'ops_inbox', 'session_run_sheet'
  ];
  _modules text[];
  _mod text;
BEGIN
  -- Only fire when department_id is set (new flow)
  IF NEW.department_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.dept_role IN ('manager', 'MANAGER') THEN
    _modules := _all_modules;
  ELSE
    _modules := _staff_defaults;
  END IF;

  FOREACH _mod IN ARRAY _modules LOOP
    INSERT INTO public.department_module_access (resort_id, department_id, user_id, module_key, enabled)
    VALUES (NEW.resort_id, NEW.department_id, NEW.user_id, _mod, true)
    ON CONFLICT (department_id, user_id, module_key) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_department_membership_defaults ON public.department_memberships;

CREATE TRIGGER trg_department_membership_defaults
  AFTER INSERT ON public.department_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_department_membership_defaults();

-- =============================================================================
-- 5. Security definer helpers
-- =============================================================================
CREATE OR REPLACE FUNCTION public.user_has_department_access(_department_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.department_memberships
    WHERE department_id = _department_id
      AND user_id = auth.uid()
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_department_manager(_department_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.department_memberships
    WHERE department_id = _department_id
      AND user_id = auth.uid()
      AND dept_role IN ('manager', 'MANAGER')
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_department_module(_department_id uuid, _module_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.department_module_access
    WHERE department_id = _department_id
      AND user_id = auth.uid()
      AND module_key = _module_key
      AND enabled = true
  );
$$;

-- =============================================================================
-- 6. RLS Policies for resort_departments
-- =============================================================================
CREATE POLICY "resort_departments_select_staff"
  ON public.resort_departments FOR SELECT TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "resort_departments_insert_admin"
  ON public.resort_departments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
  );

CREATE POLICY "resort_departments_update_admin"
  ON public.resort_departments FOR UPDATE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
  );

-- =============================================================================
-- 7. Additional RLS for department_memberships (dept manager self-management)
-- =============================================================================
-- Add policy allowing dept managers to manage their department
CREATE POLICY "dept_manager_manages_memberships"
  ON public.department_memberships FOR ALL TO authenticated
  USING (
    department_id IS NOT NULL
    AND public.user_is_department_manager(department_id)
  )
  WITH CHECK (
    department_id IS NOT NULL
    AND public.user_is_department_manager(department_id)
  );

-- =============================================================================
-- 8. RLS Policies for department_module_access
-- =============================================================================
CREATE POLICY "dept_module_access_select"
  ON public.department_module_access FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR public.user_is_department_manager(department_id)
    OR public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
  );

CREATE POLICY "dept_module_access_insert"
  ON public.department_module_access FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.user_is_department_manager(department_id)
    OR public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
  );

CREATE POLICY "dept_module_access_update"
  ON public.department_module_access FOR UPDATE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.user_is_department_manager(department_id)
    OR public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
  );

CREATE POLICY "dept_module_access_delete"
  ON public.department_module_access FOR DELETE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.user_is_department_manager(department_id)
    OR public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
  );
