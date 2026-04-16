
-- =====================================================
-- 1. STORAGE: Remove overly permissive guest-certs policies
-- =====================================================
DROP POLICY IF EXISTS "Allow cert reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow cert uploads" ON storage.objects;

-- =====================================================
-- 2. ACTIVITY SESSIONS: Remove unscoped policy
-- =====================================================
DROP POLICY IF EXISTS "Guests can view scheduled sessions" ON public.activity_sessions;

-- =====================================================
-- 3. ROOM SERVICE ORDER ITEMS: Remove unscoped public policies
-- =====================================================
DROP POLICY IF EXISTS "public_read_rs_order_items" ON public.room_service_order_items;
DROP POLICY IF EXISTS "Guests can view own order item modifiers" ON public.room_service_order_item_modifiers;
DROP POLICY IF EXISTS "Guests can view own order status events" ON public.room_service_status_events;

-- =====================================================
-- 4. BOOKING READINESS: Replace true-condition public policies
-- =====================================================
DROP POLICY IF EXISTS "Guests can view own readiness" ON public.booking_readiness;
DROP POLICY IF EXISTS "Guests can insert own readiness" ON public.booking_readiness;
DROP POLICY IF EXISTS "Guests can update own readiness" ON public.booking_readiness;

CREATE POLICY "guest_view_own_readiness" ON public.booking_readiness
  FOR SELECT TO anon
  USING (public.guest_can_access_guest(guest_id));

CREATE POLICY "guest_insert_own_readiness" ON public.booking_readiness
  FOR INSERT TO anon
  WITH CHECK (public.guest_can_access_guest(guest_id));

CREATE POLICY "guest_update_own_readiness" ON public.booking_readiness
  FOR UPDATE TO anon
  USING (public.guest_can_access_guest(guest_id))
  WITH CHECK (public.guest_can_access_guest(guest_id));

-- =====================================================
-- 5. AUDIT LOGS: Remove public INSERT, keep authenticated
-- =====================================================
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Replace authenticated policy to validate actor_user_id
DROP POLICY IF EXISTS "system_insert_audit_logs" ON public.audit_logs;
CREATE POLICY "authenticated_insert_audit_logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid() OR actor_user_id IS NULL);

-- =====================================================
-- 6. PUBLIC INSERT POLICIES: Restrict to authenticated
-- =====================================================
-- platform_errors
DROP POLICY IF EXISTS "System can insert platform errors" ON public.platform_errors;
CREATE POLICY "auth_insert_platform_errors" ON public.platform_errors
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- platform_activity_events
DROP POLICY IF EXISTS "System can insert activity events" ON public.platform_activity_events;
CREATE POLICY "auth_insert_activity_events" ON public.platform_activity_events
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- admin_notifications
DROP POLICY IF EXISTS "System can insert admin notifications" ON public.admin_notifications;
CREATE POLICY "auth_insert_admin_notifications" ON public.admin_notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- guest_profile_events
DROP POLICY IF EXISTS "System can insert profile events" ON public.guest_profile_events;
CREATE POLICY "auth_insert_profile_events" ON public.guest_profile_events
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- lead_events
DROP POLICY IF EXISTS "System can insert lead events" ON public.lead_events;
CREATE POLICY "auth_insert_lead_events" ON public.lead_events
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- demo_tenants
DROP POLICY IF EXISTS "System can insert demo tenants" ON public.demo_tenants;
CREATE POLICY "auth_insert_demo_tenants" ON public.demo_tenants
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- =====================================================
-- 7. CROSS-RESORT DATA: Remove unscoped public SELECT policies
-- =====================================================
DROP POLICY IF EXISTS "Guests can view bookable restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Anyone can view active directory entries" ON public.resort_directory;
DROP POLICY IF EXISTS "Anyone can view enabled loyalty programs" ON public.loyalty_programs;
DROP POLICY IF EXISTS "Anyone can view active rewards" ON public.loyalty_rewards;

-- =====================================================
-- 8. ROOM SERVICE MENUS: Remove unscoped public SELECT policies
-- =====================================================
DROP POLICY IF EXISTS "public_read_rs_menu_categories" ON public.room_service_menu_categories;
DROP POLICY IF EXISTS "Guests can view active menu categories" ON public.room_service_menu_categories;
DROP POLICY IF EXISTS "public_read_rs_menu_items" ON public.room_service_menu_items;
DROP POLICY IF EXISTS "Guests can view available menu items" ON public.room_service_menu_items;
DROP POLICY IF EXISTS "public_read_rs_modifier_groups" ON public.room_service_modifier_groups;
DROP POLICY IF EXISTS "Guests can view active modifier groups" ON public.room_service_modifier_groups;
DROP POLICY IF EXISTS "public_read_rs_modifier_options" ON public.room_service_modifier_options;
DROP POLICY IF EXISTS "Guests can view available modifier options" ON public.room_service_modifier_options;
DROP POLICY IF EXISTS "public_read_rs_ordering_hours" ON public.room_service_ordering_hours;
DROP POLICY IF EXISTS "Guests can view ordering hours" ON public.room_service_ordering_hours;
DROP POLICY IF EXISTS "public_read_rs_item_modifier_groups" ON public.room_service_item_modifier_groups;
DROP POLICY IF EXISTS "Guests can view item modifier groups" ON public.room_service_item_modifier_groups;

-- =====================================================
-- 9. FIX is_dept_manager_or_admin: Remove has_resort_membership branch
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_dept_manager_or_admin(_user_id uuid, _resort_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_super_admin(_user_id)
    OR public.has_resort_role(_user_id, _resort_id, ARRAY['RESORT_ADMIN'::resort_role, 'MANAGER'::resort_role])
    OR EXISTS (
      SELECT 1 FROM public.department_memberships
      WHERE user_id = _user_id
        AND resort_id = _resort_id
        AND dept_role = 'manager'
        AND is_active = true
    )
$$;

-- =====================================================
-- 10. GUEST PIN HASH: Revoke direct column access
-- =====================================================
REVOKE SELECT (portal_pin_hash) ON public.guests FROM anon;
REVOKE SELECT (portal_pin_hash) ON public.guests FROM authenticated;
