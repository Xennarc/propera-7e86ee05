
-- Create a helper to check if a user is a department manager or resort admin
CREATE OR REPLACE FUNCTION public.is_dept_manager_or_admin(_user_id uuid, _resort_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin(_user_id)
    OR public.has_resort_membership(_user_id, _resort_id)
    OR EXISTS (
      SELECT 1 FROM public.department_memberships
      WHERE user_id = _user_id
        AND resort_id = _resort_id
        AND dept_role = 'manager'
        AND is_active = true
    )
$$;

-- Drop and recreate write policies for staff_shifts to restrict to managers/admins
DROP POLICY IF EXISTS "Staff shifts managed by resort staff" ON public.staff_shifts;
DROP POLICY IF EXISTS "Staff shifts update by resort staff" ON public.staff_shifts;
DROP POLICY IF EXISTS "Staff shifts delete by resort staff" ON public.staff_shifts;

CREATE POLICY "Staff shifts insert by manager or admin"
  ON public.staff_shifts FOR INSERT TO authenticated
  WITH CHECK (public.is_dept_manager_or_admin(auth.uid(), resort_id));

CREATE POLICY "Staff shifts update by manager or admin"
  ON public.staff_shifts FOR UPDATE TO authenticated
  USING (public.is_dept_manager_or_admin(auth.uid(), resort_id));

CREATE POLICY "Staff shifts delete by manager or admin"
  ON public.staff_shifts FOR DELETE TO authenticated
  USING (public.is_dept_manager_or_admin(auth.uid(), resort_id));
