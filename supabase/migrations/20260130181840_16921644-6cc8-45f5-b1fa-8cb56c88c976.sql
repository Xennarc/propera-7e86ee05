-- ============================================================================
-- PHASE 2B: Transport/Buggy Module - RLS Policies and Helper Functions
-- Implements multi-tenant security for pooled transport
-- ============================================================================

-- ============================================================================
-- SECTION 1: HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================================================

-- 1.1: Check if staff can view transport resources
CREATE OR REPLACE FUNCTION public.staff_can_view_transport(_user_id uuid, _resort_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_super_admin(_user_id)
    OR (
      public.has_resort_membership(_user_id, _resort_id)
      AND public.has_resort_role(_user_id, _resort_id, ARRAY['TRANSPORT', 'MANAGER', 'RESORT_ADMIN']::resort_role[])
    )
$$;

-- 1.2: Check if staff can write transport resources
CREATE OR REPLACE FUNCTION public.staff_can_write_transport(_user_id uuid, _resort_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_super_admin(_user_id)
    OR public.has_resort_role(_user_id, _resort_id, ARRAY['TRANSPORT', 'MANAGER', 'RESORT_ADMIN']::resort_role[])
$$;

-- 1.3: Check if current guest can access a trip (via their request being part of it)
CREATE OR REPLACE FUNCTION public.guest_can_access_trip(_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.buggy_trip_requests btr
    JOIN public.buggy_requests br ON br.id = btr.request_id
    WHERE btr.trip_id = _trip_id
      AND br.guest_id = (auth.jwt() ->> 'guest_id')::uuid
  )
$$;

-- 1.4: Check if current authenticated user is the driver for a trip
CREATE OR REPLACE FUNCTION public.driver_can_access_trip(_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.buggy_trips bt
    WHERE bt.id = _trip_id
      AND bt.driver_user_id = auth.uid()
  )
$$;

-- 1.5: Check if current user is a registered driver in the resort
CREATE OR REPLACE FUNCTION public.is_resort_driver(_user_id uuid, _resort_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.buggy_drivers
    WHERE user_id = _user_id
      AND resort_id = _resort_id
  )
$$;

-- 1.6: Get current guest's ID from JWT (convenience wrapper)
CREATE OR REPLACE FUNCTION public.current_guest_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt() ->> 'guest_id')::uuid
$$;

-- 1.7: Get current guest's resort ID from JWT
CREATE OR REPLACE FUNCTION public.current_guest_resort_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt() ->> 'resort_id')::uuid
$$;

-- ============================================================================
-- SECTION 2: ENABLE RLS ON ALL TRANSPORT TABLES
-- ============================================================================

ALTER TABLE public.buggies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buggies FORCE ROW LEVEL SECURITY;

ALTER TABLE public.buggy_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buggy_drivers FORCE ROW LEVEL SECURITY;

ALTER TABLE public.buggy_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buggy_stops FORCE ROW LEVEL SECURITY;

ALTER TABLE public.buggy_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buggy_routes FORCE ROW LEVEL SECURITY;

ALTER TABLE public.buggy_route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buggy_route_stops FORCE ROW LEVEL SECURITY;

ALTER TABLE public.buggy_route_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buggy_route_schedules FORCE ROW LEVEL SECURITY;

ALTER TABLE public.buggy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buggy_requests FORCE ROW LEVEL SECURITY;

ALTER TABLE public.buggy_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buggy_trips FORCE ROW LEVEL SECURITY;

ALTER TABLE public.buggy_trip_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buggy_trip_requests FORCE ROW LEVEL SECURITY;

ALTER TABLE public.buggy_trip_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buggy_trip_stops FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: RESORT_ID IMMUTABILITY TRIGGERS
-- ============================================================================

CREATE TRIGGER trg_prevent_resort_id_change_buggies
  BEFORE UPDATE ON public.buggies
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_resort_id_change();

CREATE TRIGGER trg_prevent_resort_id_change_buggy_drivers
  BEFORE UPDATE ON public.buggy_drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_resort_id_change();

CREATE TRIGGER trg_prevent_resort_id_change_buggy_stops
  BEFORE UPDATE ON public.buggy_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_resort_id_change();

CREATE TRIGGER trg_prevent_resort_id_change_buggy_routes
  BEFORE UPDATE ON public.buggy_routes
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_resort_id_change();

CREATE TRIGGER trg_prevent_resort_id_change_buggy_route_stops
  BEFORE UPDATE ON public.buggy_route_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_resort_id_change();

CREATE TRIGGER trg_prevent_resort_id_change_buggy_route_schedules
  BEFORE UPDATE ON public.buggy_route_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_resort_id_change();

CREATE TRIGGER trg_prevent_resort_id_change_buggy_requests
  BEFORE UPDATE ON public.buggy_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_resort_id_change();

CREATE TRIGGER trg_prevent_resort_id_change_buggy_trips
  BEFORE UPDATE ON public.buggy_trips
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_resort_id_change();

CREATE TRIGGER trg_prevent_resort_id_change_buggy_trip_requests
  BEFORE UPDATE ON public.buggy_trip_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_resort_id_change();

CREATE TRIGGER trg_prevent_resort_id_change_buggy_trip_stops
  BEFORE UPDATE ON public.buggy_trip_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_resort_id_change();

-- ============================================================================
-- SECTION 4: RLS POLICIES - BUGGIES (Fleet Registry)
-- ============================================================================

CREATE POLICY "staff_select_buggies"
  ON public.buggies FOR SELECT
  TO authenticated
  USING (public.staff_can_view_transport(auth.uid(), resort_id));

CREATE POLICY "staff_insert_buggies"
  ON public.buggies FOR INSERT
  TO authenticated
  WITH CHECK (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "staff_update_buggies"
  ON public.buggies FOR UPDATE
  TO authenticated
  USING (public.staff_can_write_transport(auth.uid(), resort_id))
  WITH CHECK (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "staff_delete_buggies"
  ON public.buggies FOR DELETE
  TO authenticated
  USING (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "driver_select_assigned_buggy"
  ON public.buggies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.buggy_drivers bd
      WHERE bd.user_id = auth.uid()
        AND bd.assigned_buggy_id = buggies.id
        AND bd.resort_id = buggies.resort_id
    )
  );

-- ============================================================================
-- SECTION 5: RLS POLICIES - BUGGY_DRIVERS
-- ============================================================================

CREATE POLICY "staff_select_buggy_drivers"
  ON public.buggy_drivers FOR SELECT
  TO authenticated
  USING (public.staff_can_view_transport(auth.uid(), resort_id));

CREATE POLICY "staff_insert_buggy_drivers"
  ON public.buggy_drivers FOR INSERT
  TO authenticated
  WITH CHECK (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "staff_update_buggy_drivers"
  ON public.buggy_drivers FOR UPDATE
  TO authenticated
  USING (public.staff_can_write_transport(auth.uid(), resort_id))
  WITH CHECK (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "staff_delete_buggy_drivers"
  ON public.buggy_drivers FOR DELETE
  TO authenticated
  USING (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "driver_select_own"
  ON public.buggy_drivers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "driver_update_own_status"
  ON public.buggy_drivers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- SECTION 6: RLS POLICIES - BUGGY_STOPS
-- ============================================================================

CREATE POLICY "staff_select_buggy_stops"
  ON public.buggy_stops FOR SELECT
  TO authenticated
  USING (public.staff_can_view_transport(auth.uid(), resort_id));

CREATE POLICY "staff_insert_buggy_stops"
  ON public.buggy_stops FOR INSERT
  TO authenticated
  WITH CHECK (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "staff_update_buggy_stops"
  ON public.buggy_stops FOR UPDATE
  TO authenticated
  USING (public.staff_can_write_transport(auth.uid(), resort_id))
  WITH CHECK (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "staff_delete_buggy_stops"
  ON public.buggy_stops FOR DELETE
  TO authenticated
  USING (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "guest_select_active_buggy_stops"
  ON public.buggy_stops FOR SELECT
  TO anon
  USING (
    is_active = true
    AND resort_id = public.current_guest_resort_id()
  );

-- ============================================================================
-- SECTION 7: RLS POLICIES - BUGGY_ROUTES
-- ============================================================================

CREATE POLICY "staff_select_buggy_routes"
  ON public.buggy_routes FOR SELECT
  TO authenticated
  USING (public.staff_can_view_transport(auth.uid(), resort_id));

CREATE POLICY "staff_insert_buggy_routes"
  ON public.buggy_routes FOR INSERT
  TO authenticated
  WITH CHECK (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "staff_update_buggy_routes"
  ON public.buggy_routes FOR UPDATE
  TO authenticated
  USING (public.staff_can_write_transport(auth.uid(), resort_id))
  WITH CHECK (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "staff_delete_buggy_routes"
  ON public.buggy_routes FOR DELETE
  TO authenticated
  USING (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "guest_select_active_buggy_routes"
  ON public.buggy_routes FOR SELECT
  TO anon
  USING (
    is_active = true
    AND resort_id = public.current_guest_resort_id()
  );

-- ============================================================================
-- SECTION 8: RLS POLICIES - BUGGY_ROUTE_STOPS
-- ============================================================================

CREATE POLICY "staff_select_buggy_route_stops"
  ON public.buggy_route_stops FOR SELECT
  TO authenticated
  USING (public.staff_can_view_transport(auth.uid(), resort_id));

CREATE POLICY "staff_insert_buggy_route_stops"
  ON public.buggy_route_stops FOR INSERT
  TO authenticated
  WITH CHECK (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "staff_update_buggy_route_stops"
  ON public.buggy_route_stops FOR UPDATE
  TO authenticated
  USING (public.staff_can_write_transport(auth.uid(), resort_id))
  WITH CHECK (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "staff_delete_buggy_route_stops"
  ON public.buggy_route_stops FOR DELETE
  TO authenticated
  USING (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "guest_select_buggy_route_stops"
  ON public.buggy_route_stops FOR SELECT
  TO anon
  USING (
    resort_id = public.current_guest_resort_id()
    AND EXISTS (
      SELECT 1 FROM public.buggy_routes r
      WHERE r.id = buggy_route_stops.route_id
        AND r.is_active = true
    )
  );

-- ============================================================================
-- SECTION 9: RLS POLICIES - BUGGY_ROUTE_SCHEDULES
-- ============================================================================

CREATE POLICY "staff_select_buggy_route_schedules"
  ON public.buggy_route_schedules FOR SELECT
  TO authenticated
  USING (public.staff_can_view_transport(auth.uid(), resort_id));

CREATE POLICY "staff_insert_buggy_route_schedules"
  ON public.buggy_route_schedules FOR INSERT
  TO authenticated
  WITH CHECK (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "staff_update_buggy_route_schedules"
  ON public.buggy_route_schedules FOR UPDATE
  TO authenticated
  USING (public.staff_can_write_transport(auth.uid(), resort_id))
  WITH CHECK (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "staff_delete_buggy_route_schedules"
  ON public.buggy_route_schedules FOR DELETE
  TO authenticated
  USING (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "guest_select_active_buggy_route_schedules"
  ON public.buggy_route_schedules FOR SELECT
  TO anon
  USING (
    is_active = true
    AND resort_id = public.current_guest_resort_id()
  );

-- ============================================================================
-- SECTION 10: RLS POLICIES - BUGGY_REQUESTS
-- ============================================================================

CREATE POLICY "staff_select_buggy_requests"
  ON public.buggy_requests FOR SELECT
  TO authenticated
  USING (public.staff_can_view_transport(auth.uid(), resort_id));

CREATE POLICY "staff_insert_buggy_requests"
  ON public.buggy_requests FOR INSERT
  TO authenticated
  WITH CHECK (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "staff_update_buggy_requests"
  ON public.buggy_requests FOR UPDATE
  TO authenticated
  USING (public.staff_can_write_transport(auth.uid(), resort_id))
  WITH CHECK (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "staff_delete_buggy_requests"
  ON public.buggy_requests FOR DELETE
  TO authenticated
  USING (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "guest_select_own_buggy_requests"
  ON public.buggy_requests FOR SELECT
  TO anon
  USING (
    guest_id = public.current_guest_id()
    AND resort_id = public.current_guest_resort_id()
  );

CREATE POLICY "guest_insert_buggy_requests"
  ON public.buggy_requests FOR INSERT
  TO anon
  WITH CHECK (
    guest_id = public.current_guest_id()
    AND resort_id = public.current_guest_resort_id()
    AND request_source = 'guest'
  );

CREATE POLICY "guest_update_own_buggy_requests"
  ON public.buggy_requests FOR UPDATE
  TO anon
  USING (
    guest_id = public.current_guest_id()
    AND resort_id = public.current_guest_resort_id()
    AND status IN ('requested', 'queued', 'assigned_to_trip')
  )
  WITH CHECK (
    guest_id = public.current_guest_id()
    AND resort_id = public.current_guest_resort_id()
    AND status = 'cancelled'
  );

CREATE POLICY "driver_select_trip_buggy_requests"
  ON public.buggy_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.buggy_trip_requests btr
      JOIN public.buggy_trips bt ON bt.id = btr.trip_id
      WHERE btr.request_id = buggy_requests.id
        AND bt.driver_user_id = auth.uid()
    )
  );

-- ============================================================================
-- SECTION 11: RLS POLICIES - BUGGY_TRIPS
-- ============================================================================

CREATE POLICY "staff_select_buggy_trips"
  ON public.buggy_trips FOR SELECT
  TO authenticated
  USING (public.staff_can_view_transport(auth.uid(), resort_id));

CREATE POLICY "staff_insert_buggy_trips"
  ON public.buggy_trips FOR INSERT
  TO authenticated
  WITH CHECK (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "staff_update_buggy_trips"
  ON public.buggy_trips FOR UPDATE
  TO authenticated
  USING (public.staff_can_write_transport(auth.uid(), resort_id))
  WITH CHECK (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "staff_delete_buggy_trips"
  ON public.buggy_trips FOR DELETE
  TO authenticated
  USING (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "guest_select_own_buggy_trips"
  ON public.buggy_trips FOR SELECT
  TO anon
  USING (public.guest_can_access_trip(id));

CREATE POLICY "driver_select_assigned_trips"
  ON public.buggy_trips FOR SELECT
  TO authenticated
  USING (driver_user_id = auth.uid());

CREATE POLICY "driver_update_assigned_trips"
  ON public.buggy_trips FOR UPDATE
  TO authenticated
  USING (driver_user_id = auth.uid())
  WITH CHECK (driver_user_id = auth.uid());

-- ============================================================================
-- SECTION 12: RLS POLICIES - BUGGY_TRIP_REQUESTS
-- ============================================================================

CREATE POLICY "staff_select_buggy_trip_requests"
  ON public.buggy_trip_requests FOR SELECT
  TO authenticated
  USING (public.staff_can_view_transport(auth.uid(), resort_id));

CREATE POLICY "staff_insert_buggy_trip_requests"
  ON public.buggy_trip_requests FOR INSERT
  TO authenticated
  WITH CHECK (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "staff_update_buggy_trip_requests"
  ON public.buggy_trip_requests FOR UPDATE
  TO authenticated
  USING (public.staff_can_write_transport(auth.uid(), resort_id))
  WITH CHECK (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "staff_delete_buggy_trip_requests"
  ON public.buggy_trip_requests FOR DELETE
  TO authenticated
  USING (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "guest_select_own_buggy_trip_requests"
  ON public.buggy_trip_requests FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.buggy_requests br
      WHERE br.id = buggy_trip_requests.request_id
        AND br.guest_id = public.current_guest_id()
    )
  );

CREATE POLICY "driver_select_trip_requests"
  ON public.buggy_trip_requests FOR SELECT
  TO authenticated
  USING (public.driver_can_access_trip(trip_id));

CREATE POLICY "driver_update_trip_requests"
  ON public.buggy_trip_requests FOR UPDATE
  TO authenticated
  USING (public.driver_can_access_trip(trip_id))
  WITH CHECK (public.driver_can_access_trip(trip_id));

-- ============================================================================
-- SECTION 13: RLS POLICIES - BUGGY_TRIP_STOPS
-- ============================================================================

CREATE POLICY "staff_select_buggy_trip_stops"
  ON public.buggy_trip_stops FOR SELECT
  TO authenticated
  USING (public.staff_can_view_transport(auth.uid(), resort_id));

CREATE POLICY "staff_insert_buggy_trip_stops"
  ON public.buggy_trip_stops FOR INSERT
  TO authenticated
  WITH CHECK (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "staff_update_buggy_trip_stops"
  ON public.buggy_trip_stops FOR UPDATE
  TO authenticated
  USING (public.staff_can_write_transport(auth.uid(), resort_id))
  WITH CHECK (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "staff_delete_buggy_trip_stops"
  ON public.buggy_trip_stops FOR DELETE
  TO authenticated
  USING (public.staff_can_write_transport(auth.uid(), resort_id));

CREATE POLICY "guest_select_own_buggy_trip_stops"
  ON public.buggy_trip_stops FOR SELECT
  TO anon
  USING (public.guest_can_access_trip(trip_id));

CREATE POLICY "driver_select_trip_stops"
  ON public.buggy_trip_stops FOR SELECT
  TO authenticated
  USING (public.driver_can_access_trip(trip_id));

CREATE POLICY "driver_update_trip_stops"
  ON public.buggy_trip_stops FOR UPDATE
  TO authenticated
  USING (public.driver_can_access_trip(trip_id))
  WITH CHECK (public.driver_can_access_trip(trip_id));

-- ============================================================================
-- SECTION 14: SERVICE ROLE POLICIES
-- ============================================================================

CREATE POLICY "service_role_buggies" ON public.buggies FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_buggy_drivers" ON public.buggy_drivers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_buggy_stops" ON public.buggy_stops FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_buggy_routes" ON public.buggy_routes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_buggy_route_stops" ON public.buggy_route_stops FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_buggy_route_schedules" ON public.buggy_route_schedules FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_buggy_requests" ON public.buggy_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_buggy_trips" ON public.buggy_trips FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_buggy_trip_requests" ON public.buggy_trip_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_buggy_trip_stops" ON public.buggy_trip_stops FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- END PHASE 2B
-- ============================================================================