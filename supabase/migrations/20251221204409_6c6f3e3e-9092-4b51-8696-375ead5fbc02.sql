-- ============================================================
-- PHASE 1: Update Activities RLS policies for RESORT_ADMIN
-- ============================================================

-- Drop existing write policies that use app_role instead of resort_role
DROP POLICY IF EXISTS "Admin can delete activities" ON public.activities;
DROP POLICY IF EXISTS "Staff can manage activities" ON public.activities;
DROP POLICY IF EXISTS "Staff can update activities" ON public.activities;

-- CREATE (resort admin for their resort, super admin for all)
CREATE POLICY "Resort admins can create activities"
ON public.activities
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin(auth.uid())
  OR has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
);

-- UPDATE (resort admin for their resort, super admin for all)
CREATE POLICY "Resort admins can update activities"
ON public.activities
FOR UPDATE
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
);

-- DELETE (resort admin for their resort, super admin for all)
CREATE POLICY "Resort admins can delete activities"
ON public.activities
FOR DELETE
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
);

-- ============================================================
-- PHASE 2: Update Activity Sessions RLS policies for RESORT_ADMIN
-- ============================================================

-- Drop existing write policies
DROP POLICY IF EXISTS "Admin can delete sessions" ON public.activity_sessions;
DROP POLICY IF EXISTS "Staff can manage sessions" ON public.activity_sessions;
DROP POLICY IF EXISTS "Staff can update sessions" ON public.activity_sessions;

-- CREATE (resort admin for their resort, super admin for all)
CREATE POLICY "Resort admins can create sessions"
ON public.activity_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin(auth.uid())
  OR has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
);

-- UPDATE (resort admin for their resort, super admin for all)
CREATE POLICY "Resort admins can update sessions"
ON public.activity_sessions
FOR UPDATE
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
);

-- DELETE (resort admin for their resort, super admin for all)
CREATE POLICY "Resort admins can delete sessions"
ON public.activity_sessions
FOR DELETE
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
);

-- ============================================================
-- PHASE 3: Add trigger to enforce session-resort matching
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_session_resort_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.activities a
    WHERE a.id = NEW.activity_id
      AND a.resort_id = NEW.resort_id
  ) THEN
    RAISE EXCEPTION 'activity_sessions.resort_id must match activities.resort_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_session_resort_match ON public.activity_sessions;
CREATE TRIGGER trg_enforce_session_resort_match
BEFORE INSERT OR UPDATE ON public.activity_sessions
FOR EACH ROW EXECUTE FUNCTION public.enforce_session_resort_match();