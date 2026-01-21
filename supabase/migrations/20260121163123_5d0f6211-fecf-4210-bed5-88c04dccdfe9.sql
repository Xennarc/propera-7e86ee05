-- =====================================================
-- Guest Requests RLS + Permission Helpers
-- Follows existing Propera multi-tenant scoping pattern
-- =====================================================

-- ===========================================
-- SECURITY DEFINER HELPER FUNCTIONS
-- ===========================================

-- Get staff department role for a specific department
CREATE OR REPLACE FUNCTION public.staff_dept_role(_user_id uuid, _resort_id uuid, _dept_key text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dept_role
  FROM public.department_memberships
  WHERE user_id = _user_id
    AND resort_id = _resort_id
    AND department_key = _dept_key
  LIMIT 1
$$;

-- Check if staff can view a specific request
-- Logic:
-- - Super admin: always true
-- - Resort admin/manager: always true for their resort
-- - MANAGER/SUPERVISOR in department: can view all dept requests
-- - LINE in department: can view if assigned_to = self OR department_visibility_policy = 'DEPARTMENT_QUEUE'
CREATE OR REPLACE FUNCTION public.staff_can_view_request(
  _user_id uuid, 
  _resort_id uuid, 
  _dept_key text, 
  _assigned_to uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dept_role text;
  _visibility_policy text;
BEGIN
  -- Super admin can see everything
  IF public.is_super_admin(_user_id) THEN
    RETURN true;
  END IF;
  
  -- Must have resort access first
  IF NOT public.has_resort_membership(_user_id, _resort_id) THEN
    RETURN false;
  END IF;
  
  -- Resort admin/manager can view all requests in their resort
  IF public.has_resort_role(_user_id, _resort_id, ARRAY['RESORT_ADMIN', 'MANAGER']::resort_role[]) THEN
    RETURN true;
  END IF;
  
  -- Check department role
  SELECT dept_role INTO _dept_role
  FROM public.department_memberships
  WHERE user_id = _user_id
    AND resort_id = _resort_id
    AND department_key = _dept_key;
  
  -- No department membership = no access
  IF _dept_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- MANAGER/SUPERVISOR can view all department requests
  IF _dept_role IN ('MANAGER', 'SUPERVISOR') THEN
    RETURN true;
  END IF;
  
  -- LINE staff: can view if assigned to them
  IF _assigned_to = _user_id THEN
    RETURN true;
  END IF;
  
  -- LINE staff: check visibility policy for department queue access
  SELECT department_visibility_policy INTO _visibility_policy
  FROM public.resort_retention_policies
  WHERE resort_id = _resort_id;
  
  IF _visibility_policy = 'DEPARTMENT_QUEUE' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Check if staff can manage a request (acknowledge, complete, add internal notes)
-- Logic:
-- - Super admin: always true
-- - Resort admin/manager: always true for their resort
-- - MANAGER/SUPERVISOR in department: can manage
-- - LINE in department: can manage only if assigned_to = self
CREATE OR REPLACE FUNCTION public.staff_can_manage_request(
  _user_id uuid, 
  _resort_id uuid, 
  _dept_key text,
  _assigned_to uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dept_role text;
BEGIN
  -- Super admin can manage everything
  IF public.is_super_admin(_user_id) THEN
    RETURN true;
  END IF;
  
  -- Must have resort access first
  IF NOT public.has_resort_membership(_user_id, _resort_id) THEN
    RETURN false;
  END IF;
  
  -- Resort admin/manager can manage all requests in their resort
  IF public.has_resort_role(_user_id, _resort_id, ARRAY['RESORT_ADMIN', 'MANAGER']::resort_role[]) THEN
    RETURN true;
  END IF;
  
  -- Check department role
  SELECT dept_role INTO _dept_role
  FROM public.department_memberships
  WHERE user_id = _user_id
    AND resort_id = _resort_id
    AND department_key = _dept_key;
  
  -- No department membership = no manage access
  IF _dept_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- MANAGER/SUPERVISOR can manage all department requests
  IF _dept_role IN ('MANAGER', 'SUPERVISOR') THEN
    RETURN true;
  END IF;
  
  -- LINE staff: can manage only if assigned to them
  IF _dept_role = 'LINE' AND _assigned_to = _user_id THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Check if staff can assign/reassign requests (MANAGER level or above)
CREATE OR REPLACE FUNCTION public.staff_can_assign_request(
  _user_id uuid, 
  _resort_id uuid, 
  _dept_key text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dept_role text;
BEGIN
  -- Super admin can assign
  IF public.is_super_admin(_user_id) THEN
    RETURN true;
  END IF;
  
  -- Must have resort access first
  IF NOT public.has_resort_membership(_user_id, _resort_id) THEN
    RETURN false;
  END IF;
  
  -- Resort admin/manager can assign in their resort
  IF public.has_resort_role(_user_id, _resort_id, ARRAY['RESORT_ADMIN', 'MANAGER']::resort_role[]) THEN
    RETURN true;
  END IF;
  
  -- Check department role - only MANAGER can assign
  SELECT dept_role INTO _dept_role
  FROM public.department_memberships
  WHERE user_id = _user_id
    AND resort_id = _resort_id
    AND department_key = _dept_key;
  
  RETURN _dept_role = 'MANAGER';
END;
$$;

-- Helper: Check if user has any department membership in resort
CREATE OR REPLACE FUNCTION public.staff_has_dept_access(_user_id uuid, _resort_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_super_admin(_user_id) 
    OR public.has_resort_role(_user_id, _resort_id, ARRAY['RESORT_ADMIN', 'MANAGER']::resort_role[])
    OR EXISTS (
      SELECT 1
      FROM public.department_memberships
      WHERE user_id = _user_id
        AND resort_id = _resort_id
    )
$$;

-- ===========================================
-- RLS POLICIES FOR request_catalog
-- ===========================================

-- Drop existing policies if any (safe recreation)
DROP POLICY IF EXISTS "staff_select_request_catalog" ON public.request_catalog;
DROP POLICY IF EXISTS "staff_manage_request_catalog" ON public.request_catalog;
DROP POLICY IF EXISTS "guest_select_request_catalog" ON public.request_catalog;

-- Staff can view catalog items for their resort + global templates
CREATE POLICY "staff_select_request_catalog"
  ON public.request_catalog
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (resort_id IS NULL) -- global templates visible to all staff
    OR public.staff_has_resort_access(auth.uid(), resort_id)
  );

-- Staff with resort admin/manager role can manage catalog
CREATE POLICY "staff_manage_request_catalog"
  ON public.request_catalog
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (resort_id IS NOT NULL AND public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER']::resort_role[]))
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR (resort_id IS NOT NULL AND public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER']::resort_role[]))
  );

-- Guests can view active catalog items for their resort + global templates
CREATE POLICY "guest_select_request_catalog"
  ON public.request_catalog
  FOR SELECT
  TO anon
  USING (
    is_active = true
    AND (
      resort_id IS NULL -- global templates
      OR resort_id = ((current_setting('request.headers', true)::json)->>'x-resort-id')::uuid
    )
  );

-- ===========================================
-- RLS POLICIES FOR service_requests
-- ===========================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "guest_insert_service_requests" ON public.service_requests;
DROP POLICY IF EXISTS "guest_select_service_requests" ON public.service_requests;
DROP POLICY IF EXISTS "guest_update_service_requests" ON public.service_requests;
DROP POLICY IF EXISTS "staff_select_service_requests" ON public.service_requests;
DROP POLICY IF EXISTS "staff_update_service_requests" ON public.service_requests;
DROP POLICY IF EXISTS "staff_insert_service_requests" ON public.service_requests;

-- Guests can insert their own requests (via RPC is preferred, but RLS backup)
CREATE POLICY "guest_insert_service_requests"
  ON public.service_requests
  FOR INSERT
  TO anon
  WITH CHECK (
    guest_id = ((auth.jwt() ->> 'guest_id')::uuid)
    AND resort_id = ((auth.jwt() ->> 'resort_id')::uuid)
  );

-- Guests can view only their own requests
CREATE POLICY "guest_select_service_requests"
  ON public.service_requests
  FOR SELECT
  TO anon
  USING (
    guest_id = ((auth.jwt() ->> 'guest_id')::uuid)
    AND resort_id = ((auth.jwt() ->> 'resort_id')::uuid)
  );

-- Guests can update only to cancel their own NEW requests
CREATE POLICY "guest_update_service_requests"
  ON public.service_requests
  FOR UPDATE
  TO anon
  USING (
    guest_id = ((auth.jwt() ->> 'guest_id')::uuid)
    AND resort_id = ((auth.jwt() ->> 'resort_id')::uuid)
    AND status = 'NEW'
  )
  WITH CHECK (
    guest_id = ((auth.jwt() ->> 'guest_id')::uuid)
    AND resort_id = ((auth.jwt() ->> 'resort_id')::uuid)
    AND status = 'CANCELLED'
  );

-- Staff can view requests based on their access level
CREATE POLICY "staff_select_service_requests"
  ON public.service_requests
  FOR SELECT
  TO authenticated
  USING (
    public.staff_can_view_request(auth.uid(), resort_id, department_key, assigned_to)
  );

-- Staff can update requests based on their manage permissions
CREATE POLICY "staff_update_service_requests"
  ON public.service_requests
  FOR UPDATE
  TO authenticated
  USING (
    public.staff_can_manage_request(auth.uid(), resort_id, department_key, assigned_to)
  )
  WITH CHECK (
    public.staff_can_manage_request(auth.uid(), resort_id, department_key, assigned_to)
  );

-- Staff with resort access can insert requests on behalf of guests
CREATE POLICY "staff_insert_service_requests"
  ON public.service_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.staff_has_resort_access(auth.uid(), resort_id)
  );

-- ===========================================
-- RLS POLICIES FOR service_request_events
-- ===========================================

DROP POLICY IF EXISTS "guest_select_request_events" ON public.service_request_events;
DROP POLICY IF EXISTS "staff_select_request_events" ON public.service_request_events;
DROP POLICY IF EXISTS "system_insert_request_events" ON public.service_request_events;

-- Guests can view events for their own requests
CREATE POLICY "guest_select_request_events"
  ON public.service_request_events
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = request_id
        AND sr.guest_id = ((auth.jwt() ->> 'guest_id')::uuid)
        AND sr.resort_id = ((auth.jwt() ->> 'resort_id')::uuid)
    )
  );

-- Staff can view events for requests they can access
CREATE POLICY "staff_select_request_events"
  ON public.service_request_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = request_id
        AND public.staff_can_view_request(auth.uid(), sr.resort_id, sr.department_key, sr.assigned_to)
    )
  );

-- Events are inserted by triggers/system (allow authenticated for trigger context)
CREATE POLICY "system_insert_request_events"
  ON public.service_request_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.staff_has_resort_access(auth.uid(), resort_id)
  );

-- Also allow anon insert for guest-triggered events (via RPC)
CREATE POLICY "guest_insert_request_events"
  ON public.service_request_events
  FOR INSERT
  TO anon
  WITH CHECK (
    actor_guest_id = ((auth.jwt() ->> 'guest_id')::uuid)
    AND resort_id = ((auth.jwt() ->> 'resort_id')::uuid)
  );

-- ===========================================
-- RLS POLICIES FOR service_requests_archive
-- ===========================================

DROP POLICY IF EXISTS "staff_select_requests_archive" ON public.service_requests_archive;
DROP POLICY IF EXISTS "staff_insert_requests_archive" ON public.service_requests_archive;

-- Only staff with resort access can view archived requests
CREATE POLICY "staff_select_requests_archive"
  ON public.service_requests_archive
  FOR SELECT
  TO authenticated
  USING (
    public.staff_has_resort_access(auth.uid(), resort_id)
  );

-- Only resort admin/manager can archive requests
CREATE POLICY "staff_insert_requests_archive"
  ON public.service_requests_archive
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER']::resort_role[])
  );

-- ===========================================
-- RLS POLICIES FOR resort_retention_policies
-- ===========================================

DROP POLICY IF EXISTS "staff_select_retention_policies" ON public.resort_retention_policies;
DROP POLICY IF EXISTS "staff_manage_retention_policies" ON public.resort_retention_policies;

-- Staff with resort access can view retention policies
CREATE POLICY "staff_select_retention_policies"
  ON public.resort_retention_policies
  FOR SELECT
  TO authenticated
  USING (
    public.staff_has_resort_access(auth.uid(), resort_id)
  );

-- Only resort admin can manage retention policies
CREATE POLICY "staff_manage_retention_policies"
  ON public.resort_retention_policies
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[])
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[])
  );

-- ===========================================
-- RLS POLICIES FOR department_retention_overrides
-- ===========================================

DROP POLICY IF EXISTS "staff_select_dept_retention" ON public.department_retention_overrides;
DROP POLICY IF EXISTS "staff_manage_dept_retention" ON public.department_retention_overrides;

-- Staff with resort access can view department retention overrides
CREATE POLICY "staff_select_dept_retention"
  ON public.department_retention_overrides
  FOR SELECT
  TO authenticated
  USING (
    public.staff_has_resort_access(auth.uid(), resort_id)
  );

-- Only resort admin can manage department retention overrides
CREATE POLICY "staff_manage_dept_retention"
  ON public.department_retention_overrides
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[])
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[])
  );

-- ===========================================
-- RLS POLICIES FOR departments table
-- ===========================================

DROP POLICY IF EXISTS "staff_select_departments" ON public.departments;
DROP POLICY IF EXISTS "staff_manage_departments" ON public.departments;

-- Staff with resort access can view departments
CREATE POLICY "staff_select_departments"
  ON public.departments
  FOR SELECT
  TO authenticated
  USING (
    public.staff_has_resort_access(auth.uid(), resort_id)
  );

-- Only resort admin can manage departments
CREATE POLICY "staff_manage_departments"
  ON public.departments
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[])
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[])
  );

-- ===========================================
-- RLS POLICIES FOR department_memberships
-- ===========================================

DROP POLICY IF EXISTS "staff_select_dept_memberships" ON public.department_memberships;
DROP POLICY IF EXISTS "staff_manage_dept_memberships" ON public.department_memberships;

-- Staff with resort access can view department memberships
CREATE POLICY "staff_select_dept_memberships"
  ON public.department_memberships
  FOR SELECT
  TO authenticated
  USING (
    public.staff_has_resort_access(auth.uid(), resort_id)
  );

-- Only resort admin/manager can manage department memberships
CREATE POLICY "staff_manage_dept_memberships"
  ON public.department_memberships
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER']::resort_role[])
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER']::resort_role[])
  );

-- ===========================================
-- GRANT EXECUTE ON FUNCTIONS
-- ===========================================

GRANT EXECUTE ON FUNCTION public.staff_dept_role(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_can_view_request(uuid, uuid, text, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.staff_can_manage_request(uuid, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_can_assign_request(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_has_dept_access(uuid, uuid) TO authenticated;