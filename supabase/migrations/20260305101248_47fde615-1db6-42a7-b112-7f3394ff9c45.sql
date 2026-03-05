-- Fix: session_staff_assignments RLS policies have swapped parameter order
-- staff_has_resort_access(resort_id, auth.uid()) should be staff_has_resort_access(auth.uid(), resort_id)

DROP POLICY IF EXISTS "Staff can read session_staff_assignments" ON public.session_staff_assignments;
DROP POLICY IF EXISTS "Staff can insert session_staff_assignments" ON public.session_staff_assignments;
DROP POLICY IF EXISTS "Staff can delete session_staff_assignments" ON public.session_staff_assignments;

CREATE POLICY "Staff can read session_staff_assignments"
  ON public.session_staff_assignments FOR SELECT TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "Staff can insert session_staff_assignments"
  ON public.session_staff_assignments FOR INSERT TO authenticated
  WITH CHECK (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "Staff can delete session_staff_assignments"
  ON public.session_staff_assignments FOR DELETE TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));