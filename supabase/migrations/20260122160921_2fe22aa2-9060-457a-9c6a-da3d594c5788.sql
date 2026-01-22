-- =====================================================
-- PROPER RLS POLICIES FOR MULTI-SELECT TABLES
-- Uses existing helper functions with correct signatures:
-- guest_in_resort(resort_id, guest_id)
-- has_resort_membership(user_id, resort_id)
-- staff_can_view_request(user_id, resort_id, dept_key, assigned_to)
-- is_super_admin(user_id)
-- =====================================================

-- Drop the basic policies created in previous migration
DROP POLICY IF EXISTS "Staff can view submissions for their resort" ON public.service_request_submissions;
DROP POLICY IF EXISTS "Service role can manage submissions" ON public.service_request_submissions;
DROP POLICY IF EXISTS "Staff can view items for their resort" ON public.service_request_items;
DROP POLICY IF EXISTS "Service role can manage items" ON public.service_request_items;
DROP POLICY IF EXISTS "Staff can view archived items for their resort" ON public.service_request_items_archive;
DROP POLICY IF EXISTS "Service role can manage archived items" ON public.service_request_items_archive;

-- =====================================================
-- service_request_submissions POLICIES
-- =====================================================

-- Guests: SELECT only their own submissions
CREATE POLICY "Guests can view own submissions"
  ON public.service_request_submissions FOR SELECT
  USING (
    public.guest_in_resort(resort_id, guest_id)
  );

-- Staff: SELECT if they can view at least one related request
CREATE POLICY "Staff can view submissions with viewable requests"
  ON public.service_request_submissions FOR SELECT
  USING (
    public.has_resort_membership(auth.uid(), resort_id)
    AND EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.submission_id = service_request_submissions.id
        AND sr.resort_id = service_request_submissions.resort_id
        AND public.staff_can_view_request(auth.uid(), sr.resort_id, sr.department_key, sr.assigned_to)
    )
  );

-- Super admins: full SELECT access
CREATE POLICY "Super admins can view all submissions"
  ON public.service_request_submissions FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- INSERT: Only via service role (RPC pattern)
CREATE POLICY "Service role can insert submissions"
  ON public.service_request_submissions FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- UPDATE/DELETE: Only via service role
CREATE POLICY "Service role can update submissions"
  ON public.service_request_submissions FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can delete submissions"
  ON public.service_request_submissions FOR DELETE
  USING (auth.jwt() ->> 'role' = 'service_role');


-- =====================================================
-- service_request_items POLICIES
-- =====================================================

-- Guests: SELECT items only if they own the parent request
CREATE POLICY "Guests can view items for own requests"
  ON public.service_request_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = service_request_items.request_id
        AND sr.resort_id = service_request_items.resort_id
        AND public.guest_in_resort(sr.resort_id, sr.guest_id)
    )
  );

-- Staff: SELECT items if staff_can_view_request for parent
CREATE POLICY "Staff can view items for viewable requests"
  ON public.service_request_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = service_request_items.request_id
        AND sr.resort_id = service_request_items.resort_id
        AND public.staff_can_view_request(auth.uid(), sr.resort_id, sr.department_key, sr.assigned_to)
    )
  );

-- Super admins: full SELECT access
CREATE POLICY "Super admins can view all items"
  ON public.service_request_items FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- INSERT/UPDATE/DELETE: Only via service role (managed via RPC)
CREATE POLICY "Service role can insert items"
  ON public.service_request_items FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can update items"
  ON public.service_request_items FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can delete items"
  ON public.service_request_items FOR DELETE
  USING (auth.jwt() ->> 'role' = 'service_role');


-- =====================================================
-- service_request_items_archive POLICIES
-- Staff only - guests should not see archives
-- =====================================================

-- Staff: SELECT archived items if they have resort membership
CREATE POLICY "Staff can view archived items for their resort"
  ON public.service_request_items_archive FOR SELECT
  USING (
    public.has_resort_membership(auth.uid(), resort_id)
    AND EXISTS (
      SELECT 1 FROM public.service_requests_archive sra
      WHERE sra.id = service_request_items_archive.request_archive_id
        AND sra.resort_id = service_request_items_archive.resort_id
    )
  );

-- Super admins: full SELECT access
CREATE POLICY "Super admins can view all archived items"
  ON public.service_request_items_archive FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- INSERT/UPDATE/DELETE: Only via service role (archival process)
CREATE POLICY "Service role can insert archived items"
  ON public.service_request_items_archive FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can update archived items"
  ON public.service_request_items_archive FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can delete archived items"
  ON public.service_request_items_archive FOR DELETE
  USING (auth.jwt() ->> 'role' = 'service_role');