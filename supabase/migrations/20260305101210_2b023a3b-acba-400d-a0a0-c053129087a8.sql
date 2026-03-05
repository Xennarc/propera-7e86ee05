-- Fix: Allow department managers to manage memberships in their own department
-- Previously only RESORT_ADMIN/MANAGER resort roles could manage

DROP POLICY IF EXISTS "staff_manage_dept_memberships" ON public.department_memberships;

CREATE POLICY "staff_manage_dept_memberships"
  ON public.department_memberships
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER']::resort_role[])
    OR public.user_is_department_manager(department_id)
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER']::resort_role[])
    OR public.user_is_department_manager(department_id)
  );