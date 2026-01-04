
-- =====================================================
-- MULTI-TENANT RLS ISOLATION FOR PROPERA
-- =====================================================

-- =====================================================
-- PART 1: HELPER FUNCTIONS (SECURITY DEFINER)
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND global_role = 'SUPER_ADMIN'
  )
$$;

CREATE OR REPLACE FUNCTION public.has_resort_membership(_user_id uuid, _resort_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.resort_memberships
    WHERE user_id = _user_id
      AND resort_id = _resort_id
  )
$$;

CREATE OR REPLACE FUNCTION public.has_resort_role(_user_id uuid, _resort_id uuid, _roles resort_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.resort_memberships
    WHERE user_id = _user_id
      AND resort_id = _resort_id
      AND resort_role = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.staff_has_resort_access(_user_id uuid, _resort_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_super_admin(_user_id) 
    OR public.has_resort_membership(_user_id, _resort_id)
$$;

CREATE OR REPLACE FUNCTION public.staff_can_write_resort(_user_id uuid, _resort_id uuid, _roles resort_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_super_admin(_user_id) 
    OR public.has_resort_role(_user_id, _resort_id, _roles)
$$;

-- =====================================================
-- PART 2: GUEST SESSION MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS public.guest_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  last_used_at timestamptz,
  user_agent text,
  ip_address text
);

CREATE INDEX IF NOT EXISTS idx_guest_sessions_token ON public.guest_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_guest ON public.guest_sessions(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires ON public.guest_sessions(expires_at);

ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages guest sessions" ON public.guest_sessions;
CREATE POLICY "Service role manages guest sessions"
  ON public.guest_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.get_guest_session()
RETURNS TABLE(guest_id uuid, resort_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (auth.jwt() ->> 'guest_id')::uuid as guest_id,
    (auth.jwt() ->> 'resort_id')::uuid as resort_id
  WHERE 
    auth.jwt() ->> 'guest_id' IS NOT NULL
    AND auth.jwt() ->> 'resort_id' IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.is_guest_session()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.jwt() ->> 'guest_id' IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.guest_can_access_guest(_guest_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt() ->> 'guest_id')::uuid = _guest_id
$$;

CREATE OR REPLACE FUNCTION public.guest_in_resort(_guest_id uuid, _resort_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.guests
    WHERE id = _guest_id AND resort_id = _resort_id
  )
$$;

-- =====================================================
-- PART 3: DROP EXISTING POLICIES
-- =====================================================

-- Guests table
DROP POLICY IF EXISTS "Staff can view guests in their resort" ON public.guests;
DROP POLICY IF EXISTS "Staff can insert guests" ON public.guests;
DROP POLICY IF EXISTS "Staff can update guests" ON public.guests;
DROP POLICY IF EXISTS "Staff can delete guests" ON public.guests;
DROP POLICY IF EXISTS "Guests can view own record" ON public.guests;
DROP POLICY IF EXISTS "staff_select_guests" ON public.guests;
DROP POLICY IF EXISTS "staff_insert_guests" ON public.guests;
DROP POLICY IF EXISTS "staff_update_guests" ON public.guests;
DROP POLICY IF EXISTS "staff_delete_guests" ON public.guests;
DROP POLICY IF EXISTS "guest_select_own" ON public.guests;
DROP POLICY IF EXISTS "guest_update_own" ON public.guests;

-- Activities table
DROP POLICY IF EXISTS "Staff can view activities in their resort" ON public.activities;
DROP POLICY IF EXISTS "Guests can view bookable activities" ON public.activities;
DROP POLICY IF EXISTS "Resort admins can create activities" ON public.activities;
DROP POLICY IF EXISTS "Resort admins can update activities" ON public.activities;
DROP POLICY IF EXISTS "Resort admins can delete activities" ON public.activities;
DROP POLICY IF EXISTS "staff_select_activities" ON public.activities;
DROP POLICY IF EXISTS "guest_select_activities" ON public.activities;
DROP POLICY IF EXISTS "staff_insert_activities" ON public.activities;
DROP POLICY IF EXISTS "staff_update_activities" ON public.activities;
DROP POLICY IF EXISTS "staff_delete_activities" ON public.activities;

-- Activity sessions
DROP POLICY IF EXISTS "Staff can view sessions in their resort" ON public.activity_sessions;
DROP POLICY IF EXISTS "Guests can view available sessions" ON public.activity_sessions;
DROP POLICY IF EXISTS "Staff can manage sessions" ON public.activity_sessions;
DROP POLICY IF EXISTS "Admin can create sessions" ON public.activity_sessions;
DROP POLICY IF EXISTS "Admin can update sessions" ON public.activity_sessions;
DROP POLICY IF EXISTS "Admin can delete sessions" ON public.activity_sessions;
DROP POLICY IF EXISTS "Resort admins can create sessions" ON public.activity_sessions;
DROP POLICY IF EXISTS "Resort admins can update sessions" ON public.activity_sessions;
DROP POLICY IF EXISTS "Resort admins can delete sessions" ON public.activity_sessions;
DROP POLICY IF EXISTS "staff_select_sessions" ON public.activity_sessions;
DROP POLICY IF EXISTS "guest_select_sessions" ON public.activity_sessions;
DROP POLICY IF EXISTS "staff_insert_sessions" ON public.activity_sessions;
DROP POLICY IF EXISTS "staff_update_sessions" ON public.activity_sessions;
DROP POLICY IF EXISTS "staff_delete_sessions" ON public.activity_sessions;

-- Activity bookings
DROP POLICY IF EXISTS "Staff can view bookings in their resort" ON public.activity_bookings;
DROP POLICY IF EXISTS "Staff can manage bookings" ON public.activity_bookings;
DROP POLICY IF EXISTS "Staff can update bookings" ON public.activity_bookings;
DROP POLICY IF EXISTS "Admin can delete bookings" ON public.activity_bookings;
DROP POLICY IF EXISTS "Vendor users can view their assigned bookings" ON public.activity_bookings;
DROP POLICY IF EXISTS "Vendor users can update vendor status on their bookings" ON public.activity_bookings;
DROP POLICY IF EXISTS "Guests can view own bookings" ON public.activity_bookings;
DROP POLICY IF EXISTS "Guests can create bookings" ON public.activity_bookings;
DROP POLICY IF EXISTS "staff_select_bookings" ON public.activity_bookings;
DROP POLICY IF EXISTS "guest_select_bookings" ON public.activity_bookings;
DROP POLICY IF EXISTS "guest_insert_bookings" ON public.activity_bookings;
DROP POLICY IF EXISTS "guest_update_bookings" ON public.activity_bookings;
DROP POLICY IF EXISTS "staff_insert_bookings" ON public.activity_bookings;
DROP POLICY IF EXISTS "staff_update_bookings" ON public.activity_bookings;
DROP POLICY IF EXISTS "staff_delete_bookings" ON public.activity_bookings;
DROP POLICY IF EXISTS "vendor_select_bookings" ON public.activity_bookings;
DROP POLICY IF EXISTS "vendor_update_bookings" ON public.activity_bookings;

-- Restaurants
DROP POLICY IF EXISTS "Staff can view restaurants in their resort" ON public.restaurants;
DROP POLICY IF EXISTS "Guests can view active restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Admin can manage restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "staff_select_restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "guest_select_restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "staff_insert_restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "staff_update_restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "staff_delete_restaurants" ON public.restaurants;

-- Restaurant time slots
DROP POLICY IF EXISTS "Staff can view slots in their resort" ON public.restaurant_time_slots;
DROP POLICY IF EXISTS "Guests can view open slots" ON public.restaurant_time_slots;
DROP POLICY IF EXISTS "Staff can manage slots" ON public.restaurant_time_slots;
DROP POLICY IF EXISTS "Staff can update slots" ON public.restaurant_time_slots;
DROP POLICY IF EXISTS "Admin can delete slots" ON public.restaurant_time_slots;
DROP POLICY IF EXISTS "staff_select_slots" ON public.restaurant_time_slots;
DROP POLICY IF EXISTS "guest_select_slots" ON public.restaurant_time_slots;
DROP POLICY IF EXISTS "staff_insert_slots" ON public.restaurant_time_slots;
DROP POLICY IF EXISTS "staff_update_slots" ON public.restaurant_time_slots;
DROP POLICY IF EXISTS "staff_delete_slots" ON public.restaurant_time_slots;

-- Restaurant reservations
DROP POLICY IF EXISTS "Staff can view reservations in their resort" ON public.restaurant_reservations;
DROP POLICY IF EXISTS "Staff can manage reservations" ON public.restaurant_reservations;
DROP POLICY IF EXISTS "Staff can update reservations" ON public.restaurant_reservations;
DROP POLICY IF EXISTS "Admin can delete reservations" ON public.restaurant_reservations;
DROP POLICY IF EXISTS "Guests can view own reservations" ON public.restaurant_reservations;
DROP POLICY IF EXISTS "Guests can create reservations" ON public.restaurant_reservations;
DROP POLICY IF EXISTS "staff_select_reservations" ON public.restaurant_reservations;
DROP POLICY IF EXISTS "guest_select_reservations" ON public.restaurant_reservations;
DROP POLICY IF EXISTS "guest_insert_reservations" ON public.restaurant_reservations;
DROP POLICY IF EXISTS "guest_update_reservations" ON public.restaurant_reservations;
DROP POLICY IF EXISTS "staff_insert_reservations" ON public.restaurant_reservations;
DROP POLICY IF EXISTS "staff_update_reservations" ON public.restaurant_reservations;
DROP POLICY IF EXISTS "staff_delete_reservations" ON public.restaurant_reservations;

-- Notifications
DROP POLICY IF EXISTS "Staff can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Guests can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Guests can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "staff_select_notifications" ON public.notifications;
DROP POLICY IF EXISTS "staff_update_notifications" ON public.notifications;
DROP POLICY IF EXISTS "guest_select_notifications" ON public.notifications;
DROP POLICY IF EXISTS "guest_update_notifications" ON public.notifications;

-- Prearrival
DROP POLICY IF EXISTS "Staff can view prearrival profiles in their resort" ON public.prearrival_profiles;
DROP POLICY IF EXISTS "Staff can manage prearrival profiles" ON public.prearrival_profiles;
DROP POLICY IF EXISTS "Staff can view prearrival settings" ON public.prearrival_settings;
DROP POLICY IF EXISTS "Staff can manage prearrival settings" ON public.prearrival_settings;
DROP POLICY IF EXISTS "Guests can view own prearrival token" ON public.prearrival_tokens;
DROP POLICY IF EXISTS "Staff can manage prearrival staff reviews" ON public.prearrival_staff_reviews;
DROP POLICY IF EXISTS "Staff can view prearrival staff reviews" ON public.prearrival_staff_reviews;
DROP POLICY IF EXISTS "staff_select_prearrival_settings" ON public.prearrival_settings;
DROP POLICY IF EXISTS "staff_manage_prearrival_settings" ON public.prearrival_settings;
DROP POLICY IF EXISTS "public_validate_prearrival_tokens" ON public.prearrival_tokens;
DROP POLICY IF EXISTS "staff_manage_prearrival_tokens" ON public.prearrival_tokens;
DROP POLICY IF EXISTS "staff_select_prearrival_profiles" ON public.prearrival_profiles;
DROP POLICY IF EXISTS "staff_manage_prearrival_profiles" ON public.prearrival_profiles;
DROP POLICY IF EXISTS "guest_manage_own_prearrival" ON public.prearrival_profiles;
DROP POLICY IF EXISTS "staff_select_prearrival_reviews" ON public.prearrival_staff_reviews;
DROP POLICY IF EXISTS "staff_manage_prearrival_reviews" ON public.prearrival_staff_reviews;

-- Travel parties
DROP POLICY IF EXISTS "Staff can view travel parties" ON public.travel_parties;
DROP POLICY IF EXISTS "Staff can manage travel parties" ON public.travel_parties;
DROP POLICY IF EXISTS "Guests can view own travel party" ON public.travel_parties;
DROP POLICY IF EXISTS "Staff can view travel party members" ON public.travel_party_members;
DROP POLICY IF EXISTS "Guests can view own travel party members" ON public.travel_party_members;
DROP POLICY IF EXISTS "Staff can manage room links" ON public.travel_party_room_links;
DROP POLICY IF EXISTS "Guests can view own room links" ON public.travel_party_room_links;
DROP POLICY IF EXISTS "staff_select_travel_parties" ON public.travel_parties;
DROP POLICY IF EXISTS "staff_manage_travel_parties" ON public.travel_parties;
DROP POLICY IF EXISTS "guest_select_own_travel_party" ON public.travel_parties;
DROP POLICY IF EXISTS "guest_manage_own_travel_party" ON public.travel_parties;
DROP POLICY IF EXISTS "staff_select_travel_party_members" ON public.travel_party_members;
DROP POLICY IF EXISTS "staff_manage_travel_party_members" ON public.travel_party_members;
DROP POLICY IF EXISTS "guest_select_own_travel_party_members" ON public.travel_party_members;
DROP POLICY IF EXISTS "guest_manage_own_travel_party_members" ON public.travel_party_members;
DROP POLICY IF EXISTS "staff_select_room_links" ON public.travel_party_room_links;
DROP POLICY IF EXISTS "staff_manage_room_links" ON public.travel_party_room_links;
DROP POLICY IF EXISTS "guest_select_own_room_links" ON public.travel_party_room_links;

-- Vendors
DROP POLICY IF EXISTS "Staff can view vendors" ON public.vendors;
DROP POLICY IF EXISTS "Staff can manage vendors" ON public.vendors;
DROP POLICY IF EXISTS "Staff can view vendor resorts" ON public.vendor_resorts;
DROP POLICY IF EXISTS "Staff can manage vendor resorts" ON public.vendor_resorts;
DROP POLICY IF EXISTS "staff_select_vendors" ON public.vendors;
DROP POLICY IF EXISTS "staff_manage_vendors" ON public.vendors;
DROP POLICY IF EXISTS "vendor_select_own" ON public.vendors;
DROP POLICY IF EXISTS "staff_select_vendor_resorts" ON public.vendor_resorts;
DROP POLICY IF EXISTS "staff_manage_vendor_resorts" ON public.vendor_resorts;
DROP POLICY IF EXISTS "vendor_select_own_resorts" ON public.vendor_resorts;

-- Booking attendees
DROP POLICY IF EXISTS "Staff can view booking attendees" ON public.booking_attendees;
DROP POLICY IF EXISTS "Staff can manage booking attendees" ON public.booking_attendees;
DROP POLICY IF EXISTS "Guests can view own booking attendees" ON public.booking_attendees;
DROP POLICY IF EXISTS "staff_select_booking_attendees" ON public.booking_attendees;
DROP POLICY IF EXISTS "staff_manage_booking_attendees" ON public.booking_attendees;
DROP POLICY IF EXISTS "guest_select_own_booking_attendees" ON public.booking_attendees;
DROP POLICY IF EXISTS "guest_manage_own_booking_attendees" ON public.booking_attendees;

-- Guest outbound messages
DROP POLICY IF EXISTS "Staff can view guest messages" ON public.guest_outbound_messages;
DROP POLICY IF EXISTS "Staff can manage guest messages" ON public.guest_outbound_messages;
DROP POLICY IF EXISTS "staff_select_guest_messages" ON public.guest_outbound_messages;
DROP POLICY IF EXISTS "staff_manage_guest_messages" ON public.guest_outbound_messages;

-- Resorts and memberships
DROP POLICY IF EXISTS "Super admin full access to resorts" ON public.resorts;
DROP POLICY IF EXISTS "Staff can view their resorts" ON public.resorts;
DROP POLICY IF EXISTS "Public can view active resort codes" ON public.resorts;
DROP POLICY IF EXISTS "staff_select_resorts" ON public.resorts;
DROP POLICY IF EXISTS "public_select_resort_codes" ON public.resorts;
DROP POLICY IF EXISTS "superadmin_manage_resorts" ON public.resorts;
DROP POLICY IF EXISTS "resort_admin_update_own_resort" ON public.resorts;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.resort_memberships;
DROP POLICY IF EXISTS "Super admin manages memberships" ON public.resort_memberships;
DROP POLICY IF EXISTS "Resort admin manages memberships" ON public.resort_memberships;
DROP POLICY IF EXISTS "user_select_own_memberships" ON public.resort_memberships;
DROP POLICY IF EXISTS "admin_manage_memberships" ON public.resort_memberships;

-- Other tables
DROP POLICY IF EXISTS "Staff can view closures" ON public.activity_closures;
DROP POLICY IF EXISTS "Staff can manage closures" ON public.activity_closures;
DROP POLICY IF EXISTS "staff_select_activity_closures" ON public.activity_closures;
DROP POLICY IF EXISTS "staff_manage_activity_closures" ON public.activity_closures;
DROP POLICY IF EXISTS "Staff can view recurring rules" ON public.activity_recurring_rules;
DROP POLICY IF EXISTS "Staff can manage recurring rules" ON public.activity_recurring_rules;
DROP POLICY IF EXISTS "staff_select_activity_recurring_rules" ON public.activity_recurring_rules;
DROP POLICY IF EXISTS "staff_manage_activity_recurring_rules" ON public.activity_recurring_rules;
DROP POLICY IF EXISTS "Staff can view session templates" ON public.activity_session_templates;
DROP POLICY IF EXISTS "Staff can manage session templates" ON public.activity_session_templates;
DROP POLICY IF EXISTS "staff_select_activity_session_templates" ON public.activity_session_templates;
DROP POLICY IF EXISTS "staff_manage_activity_session_templates" ON public.activity_session_templates;
DROP POLICY IF EXISTS "Staff can view waitlist" ON public.activity_waitlist;
DROP POLICY IF EXISTS "Staff can manage waitlist" ON public.activity_waitlist;
DROP POLICY IF EXISTS "Guests can view own waitlist" ON public.activity_waitlist;
DROP POLICY IF EXISTS "staff_select_activity_waitlist" ON public.activity_waitlist;
DROP POLICY IF EXISTS "staff_manage_activity_waitlist" ON public.activity_waitlist;
DROP POLICY IF EXISTS "guest_select_own_waitlist" ON public.activity_waitlist;
DROP POLICY IF EXISTS "guest_manage_own_waitlist" ON public.activity_waitlist;
DROP POLICY IF EXISTS "Staff can view guest requests" ON public.guest_requests;
DROP POLICY IF EXISTS "Staff can manage guest requests" ON public.guest_requests;
DROP POLICY IF EXISTS "staff_select_guest_requests" ON public.guest_requests;
DROP POLICY IF EXISTS "staff_manage_guest_requests" ON public.guest_requests;
DROP POLICY IF EXISTS "guest_select_own_requests" ON public.guest_requests;
DROP POLICY IF EXISTS "guest_insert_own_requests" ON public.guest_requests;
DROP POLICY IF EXISTS "Staff can view restaurant closures" ON public.restaurant_closures;
DROP POLICY IF EXISTS "Staff can manage restaurant closures" ON public.restaurant_closures;
DROP POLICY IF EXISTS "staff_select_restaurant_closures" ON public.restaurant_closures;
DROP POLICY IF EXISTS "staff_manage_restaurant_closures" ON public.restaurant_closures;
DROP POLICY IF EXISTS "Staff can view restaurant recurring rules" ON public.restaurant_recurring_rules;
DROP POLICY IF EXISTS "Staff can manage restaurant recurring rules" ON public.restaurant_recurring_rules;
DROP POLICY IF EXISTS "staff_select_restaurant_recurring_rules" ON public.restaurant_recurring_rules;
DROP POLICY IF EXISTS "staff_manage_restaurant_recurring_rules" ON public.restaurant_recurring_rules;
DROP POLICY IF EXISTS "Staff can view resources" ON public.resources;
DROP POLICY IF EXISTS "Staff can manage resources" ON public.resources;
DROP POLICY IF EXISTS "staff_select_resources" ON public.resources;
DROP POLICY IF EXISTS "staff_manage_resources" ON public.resources;
DROP POLICY IF EXISTS "Staff can view resort directory" ON public.resort_directory;
DROP POLICY IF EXISTS "Staff can manage resort directory" ON public.resort_directory;
DROP POLICY IF EXISTS "Guests can view resort directory" ON public.resort_directory;
DROP POLICY IF EXISTS "staff_select_resort_directory" ON public.resort_directory;
DROP POLICY IF EXISTS "staff_manage_resort_directory" ON public.resort_directory;
DROP POLICY IF EXISTS "guest_select_resort_directory" ON public.resort_directory;
DROP POLICY IF EXISTS "Staff can view stay feedback" ON public.stay_feedback;
DROP POLICY IF EXISTS "Guests can submit stay feedback" ON public.stay_feedback;
DROP POLICY IF EXISTS "staff_select_stay_feedback" ON public.stay_feedback;
DROP POLICY IF EXISTS "guest_insert_stay_feedback" ON public.stay_feedback;
DROP POLICY IF EXISTS "guest_select_own_feedback" ON public.stay_feedback;
DROP POLICY IF EXISTS "Staff can view loyalty programs" ON public.loyalty_programs;
DROP POLICY IF EXISTS "Staff can manage loyalty programs" ON public.loyalty_programs;
DROP POLICY IF EXISTS "Staff can view loyalty tiers" ON public.loyalty_tiers;
DROP POLICY IF EXISTS "Staff can view loyalty members" ON public.loyalty_members;
DROP POLICY IF EXISTS "Guests can view own loyalty membership" ON public.loyalty_members;
DROP POLICY IF EXISTS "staff_select_loyalty_programs" ON public.loyalty_programs;
DROP POLICY IF EXISTS "staff_manage_loyalty_programs" ON public.loyalty_programs;
DROP POLICY IF EXISTS "guest_select_loyalty_program" ON public.loyalty_programs;
DROP POLICY IF EXISTS "staff_select_loyalty_tiers" ON public.loyalty_tiers;
DROP POLICY IF EXISTS "staff_manage_loyalty_tiers" ON public.loyalty_tiers;
DROP POLICY IF EXISTS "guest_select_loyalty_tiers" ON public.loyalty_tiers;
DROP POLICY IF EXISTS "staff_select_loyalty_members" ON public.loyalty_members;
DROP POLICY IF EXISTS "staff_manage_loyalty_members" ON public.loyalty_members;
DROP POLICY IF EXISTS "guest_select_own_loyalty_member" ON public.loyalty_members;
DROP POLICY IF EXISTS "Staff can view loyalty transactions" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "Guests can view own loyalty transactions" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "staff_select_loyalty_transactions" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "staff_manage_loyalty_transactions" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "guest_select_own_loyalty_transactions" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "Staff can view loyalty rewards" ON public.loyalty_rewards;
DROP POLICY IF EXISTS "Guests can view loyalty rewards" ON public.loyalty_rewards;
DROP POLICY IF EXISTS "staff_select_loyalty_rewards" ON public.loyalty_rewards;
DROP POLICY IF EXISTS "staff_manage_loyalty_rewards" ON public.loyalty_rewards;
DROP POLICY IF EXISTS "guest_select_loyalty_rewards" ON public.loyalty_rewards;
DROP POLICY IF EXISTS "Staff can view loyalty redemptions" ON public.loyalty_redemptions;
DROP POLICY IF EXISTS "Guests can view own loyalty redemptions" ON public.loyalty_redemptions;
DROP POLICY IF EXISTS "staff_select_loyalty_redemptions" ON public.loyalty_redemptions;
DROP POLICY IF EXISTS "staff_manage_loyalty_redemptions" ON public.loyalty_redemptions;
DROP POLICY IF EXISTS "guest_select_own_loyalty_redemptions" ON public.loyalty_redemptions;
DROP POLICY IF EXISTS "Staff can view loyalty earn rules" ON public.loyalty_earn_rules;
DROP POLICY IF EXISTS "staff_select_loyalty_earn_rules" ON public.loyalty_earn_rules;
DROP POLICY IF EXISTS "staff_manage_loyalty_earn_rules" ON public.loyalty_earn_rules;
DROP POLICY IF EXISTS "Staff can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Super admin can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "staff_select_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "system_insert_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Staff can view access audit log" ON public.access_audit_log;
DROP POLICY IF EXISTS "staff_select_access_audit_log" ON public.access_audit_log;
DROP POLICY IF EXISTS "system_insert_access_audit_log" ON public.access_audit_log;
DROP POLICY IF EXISTS "Staff can view feature flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Super admin can manage feature flags" ON public.feature_flags;
DROP POLICY IF EXISTS "staff_select_feature_flags" ON public.feature_flags;
DROP POLICY IF EXISTS "superadmin_manage_feature_flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Staff can view guest profile events" ON public.guest_profile_events;
DROP POLICY IF EXISTS "staff_select_guest_profile_events" ON public.guest_profile_events;
DROP POLICY IF EXISTS "system_insert_guest_profile_events" ON public.guest_profile_events;

-- =====================================================
-- PART 4: GUESTS TABLE POLICIES
-- =====================================================

CREATE POLICY "staff_select_guests"
  ON public.guests
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_insert_guests"
  ON public.guests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS']::resort_role[])
  );

CREATE POLICY "staff_update_guests"
  ON public.guests
  FOR UPDATE
  TO authenticated
  USING (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS']::resort_role[])
  )
  WITH CHECK (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS']::resort_role[])
  );

CREATE POLICY "staff_delete_guests"
  ON public.guests
  FOR DELETE
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[]));

CREATE POLICY "guest_select_own"
  ON public.guests
  FOR SELECT
  TO anon
  USING (public.guest_can_access_guest(id));

CREATE POLICY "guest_update_own"
  ON public.guests
  FOR UPDATE
  TO anon
  USING (public.guest_can_access_guest(id))
  WITH CHECK (public.guest_can_access_guest(id));

-- =====================================================
-- PART 5: ACTIVITIES TABLE POLICIES
-- =====================================================

CREATE POLICY "staff_select_activities"
  ON public.activities
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "guest_select_activities"
  ON public.activities
  FOR SELECT
  TO anon
  USING (
    guest_can_book = true 
    AND is_active = true
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

CREATE POLICY "staff_insert_activities"
  ON public.activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES']::resort_role[])
  );

CREATE POLICY "staff_update_activities"
  ON public.activities
  FOR UPDATE
  TO authenticated
  USING (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES']::resort_role[])
  )
  WITH CHECK (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES']::resort_role[])
  );

CREATE POLICY "staff_delete_activities"
  ON public.activities
  FOR DELETE
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[]));

-- =====================================================
-- PART 6: ACTIVITY SESSIONS TABLE POLICIES
-- =====================================================

CREATE POLICY "staff_select_sessions"
  ON public.activity_sessions
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "guest_select_sessions"
  ON public.activity_sessions
  FOR SELECT
  TO anon
  USING (
    status = 'SCHEDULED'
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

CREATE POLICY "staff_insert_sessions"
  ON public.activity_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES', 'FRONT_OFFICE']::resort_role[])
  );

CREATE POLICY "staff_update_sessions"
  ON public.activity_sessions
  FOR UPDATE
  TO authenticated
  USING (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES', 'FRONT_OFFICE']::resort_role[])
  )
  WITH CHECK (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES', 'FRONT_OFFICE']::resort_role[])
  );

CREATE POLICY "staff_delete_sessions"
  ON public.activity_sessions
  FOR DELETE
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER']::resort_role[]));

-- =====================================================
-- PART 7: ACTIVITY BOOKINGS TABLE POLICIES
-- =====================================================

CREATE POLICY "staff_select_bookings"
  ON public.activity_bookings
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "guest_select_bookings"
  ON public.activity_bookings
  FOR SELECT
  TO anon
  USING (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

CREATE POLICY "guest_insert_bookings"
  ON public.activity_bookings
  FOR INSERT
  TO anon
  WITH CHECK (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

CREATE POLICY "guest_update_bookings"
  ON public.activity_bookings
  FOR UPDATE
  TO anon
  USING (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  )
  WITH CHECK (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

CREATE POLICY "staff_insert_bookings"
  ON public.activity_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES', 'FRONT_OFFICE']::resort_role[])
  );

CREATE POLICY "staff_update_bookings"
  ON public.activity_bookings
  FOR UPDATE
  TO authenticated
  USING (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES', 'FRONT_OFFICE']::resort_role[])
  )
  WITH CHECK (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES', 'FRONT_OFFICE']::resort_role[])
  );

CREATE POLICY "staff_delete_bookings"
  ON public.activity_bookings
  FOR DELETE
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[]));

CREATE POLICY "vendor_select_bookings"
  ON public.activity_bookings
  FOR SELECT
  TO authenticated
  USING (
    vendor_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.vendor_resorts vr ON vr.vendor_id = p.vendor_id
      WHERE p.id = auth.uid()
        AND p.vendor_id = activity_bookings.vendor_id
        AND vr.resort_id = activity_bookings.resort_id
        AND vr.status = 'approved'
    )
  );

CREATE POLICY "vendor_update_bookings"
  ON public.activity_bookings
  FOR UPDATE
  TO authenticated
  USING (
    vendor_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.vendor_resorts vr ON vr.vendor_id = p.vendor_id
      WHERE p.id = auth.uid()
        AND p.vendor_id = activity_bookings.vendor_id
        AND vr.resort_id = activity_bookings.resort_id
        AND vr.status = 'approved'
    )
  )
  WITH CHECK (
    vendor_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.vendor_resorts vr ON vr.vendor_id = p.vendor_id
      WHERE p.id = auth.uid()
        AND p.vendor_id = activity_bookings.vendor_id
        AND vr.resort_id = activity_bookings.resort_id
        AND vr.status = 'approved'
    )
  );

-- =====================================================
-- PART 8: RESTAURANTS TABLE POLICIES
-- =====================================================

CREATE POLICY "staff_select_restaurants"
  ON public.restaurants
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "guest_select_restaurants"
  ON public.restaurants
  FOR SELECT
  TO anon
  USING (
    is_active = true
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

CREATE POLICY "staff_insert_restaurants"
  ON public.restaurants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FNB']::resort_role[])
  );

CREATE POLICY "staff_update_restaurants"
  ON public.restaurants
  FOR UPDATE
  TO authenticated
  USING (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FNB']::resort_role[])
  )
  WITH CHECK (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FNB']::resort_role[])
  );

CREATE POLICY "staff_delete_restaurants"
  ON public.restaurants
  FOR DELETE
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[]));

-- =====================================================
-- PART 9: RESTAURANT TIME SLOTS TABLE POLICIES
-- =====================================================

CREATE POLICY "staff_select_slots"
  ON public.restaurant_time_slots
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "guest_select_slots"
  ON public.restaurant_time_slots
  FOR SELECT
  TO anon
  USING (
    status = 'OPEN'
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

CREATE POLICY "staff_insert_slots"
  ON public.restaurant_time_slots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FNB', 'FRONT_OFFICE']::resort_role[])
  );

CREATE POLICY "staff_update_slots"
  ON public.restaurant_time_slots
  FOR UPDATE
  TO authenticated
  USING (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FNB', 'FRONT_OFFICE']::resort_role[])
  )
  WITH CHECK (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FNB', 'FRONT_OFFICE']::resort_role[])
  );

CREATE POLICY "staff_delete_slots"
  ON public.restaurant_time_slots
  FOR DELETE
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER']::resort_role[]));

-- =====================================================
-- PART 10: RESTAURANT RESERVATIONS TABLE POLICIES
-- =====================================================

CREATE POLICY "staff_select_reservations"
  ON public.restaurant_reservations
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "guest_select_reservations"
  ON public.restaurant_reservations
  FOR SELECT
  TO anon
  USING (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

CREATE POLICY "guest_insert_reservations"
  ON public.restaurant_reservations
  FOR INSERT
  TO anon
  WITH CHECK (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

CREATE POLICY "guest_update_reservations"
  ON public.restaurant_reservations
  FOR UPDATE
  TO anon
  USING (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  )
  WITH CHECK (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

CREATE POLICY "staff_insert_reservations"
  ON public.restaurant_reservations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FNB', 'FRONT_OFFICE']::resort_role[])
  );

CREATE POLICY "staff_update_reservations"
  ON public.restaurant_reservations
  FOR UPDATE
  TO authenticated
  USING (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FNB', 'FRONT_OFFICE']::resort_role[])
  )
  WITH CHECK (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FNB', 'FRONT_OFFICE']::resort_role[])
  );

CREATE POLICY "staff_delete_reservations"
  ON public.restaurant_reservations
  FOR DELETE
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[]));

-- =====================================================
-- PART 11: NOTIFICATIONS TABLE POLICIES
-- =====================================================

CREATE POLICY "staff_select_notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    audience = 'STAFF' 
    AND user_id = auth.uid()
    AND (resort_id IS NULL OR public.staff_has_resort_access(auth.uid(), resort_id))
  );

CREATE POLICY "staff_update_notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (audience = 'STAFF' AND user_id = auth.uid())
  WITH CHECK (audience = 'STAFF' AND user_id = auth.uid());

CREATE POLICY "guest_select_notifications"
  ON public.notifications
  FOR SELECT
  TO anon
  USING (
    audience = 'GUEST'
    AND public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

CREATE POLICY "guest_update_notifications"
  ON public.notifications
  FOR UPDATE
  TO anon
  USING (audience = 'GUEST' AND public.guest_can_access_guest(guest_id))
  WITH CHECK (audience = 'GUEST' AND public.guest_can_access_guest(guest_id));

-- =====================================================
-- PART 12: PREARRIVAL TABLES POLICIES
-- =====================================================

-- Prearrival settings
CREATE POLICY "staff_select_prearrival_settings"
  ON public.prearrival_settings
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_prearrival_settings"
  ON public.prearrival_settings
  FOR ALL
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER']::resort_role[]))
  WITH CHECK (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER']::resort_role[]));

-- Prearrival tokens
CREATE POLICY "public_validate_prearrival_tokens"
  ON public.prearrival_tokens
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "staff_manage_prearrival_tokens"
  ON public.prearrival_tokens
  FOR ALL
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id))
  WITH CHECK (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS']::resort_role[])
  );

-- Prearrival profiles
CREATE POLICY "staff_select_prearrival_profiles"
  ON public.prearrival_profiles
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_prearrival_profiles"
  ON public.prearrival_profiles
  FOR ALL
  TO authenticated
  USING (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS']::resort_role[])
  )
  WITH CHECK (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS']::resort_role[])
  );

CREATE POLICY "guest_manage_own_prearrival"
  ON public.prearrival_profiles
  FOR ALL
  TO anon
  USING (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  )
  WITH CHECK (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

-- Prearrival staff reviews
CREATE POLICY "staff_select_prearrival_reviews"
  ON public.prearrival_staff_reviews
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_prearrival_reviews"
  ON public.prearrival_staff_reviews
  FOR ALL
  TO authenticated
  USING (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS']::resort_role[])
  )
  WITH CHECK (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS']::resort_role[])
  );

-- =====================================================
-- PART 13: TRAVEL PARTY TABLES POLICIES (FIXED COLUMN NAMES)
-- =====================================================

-- Travel parties
CREATE POLICY "staff_select_travel_parties"
  ON public.travel_parties
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_travel_parties"
  ON public.travel_parties
  FOR ALL
  TO authenticated
  USING (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS']::resort_role[])
  )
  WITH CHECK (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS']::resort_role[])
  );

CREATE POLICY "guest_select_own_travel_party"
  ON public.travel_parties
  FOR SELECT
  TO anon
  USING (
    public.guest_can_access_guest(lead_guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

CREATE POLICY "guest_manage_own_travel_party"
  ON public.travel_parties
  FOR ALL
  TO anon
  USING (
    public.guest_can_access_guest(lead_guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  )
  WITH CHECK (
    public.guest_can_access_guest(lead_guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

-- Travel party members (using correct column: travel_party_id)
CREATE POLICY "staff_select_travel_party_members"
  ON public.travel_party_members
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_travel_party_members"
  ON public.travel_party_members
  FOR ALL
  TO authenticated
  USING (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS']::resort_role[])
  )
  WITH CHECK (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS']::resort_role[])
  );

CREATE POLICY "guest_select_own_travel_party_members"
  ON public.travel_party_members
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.travel_parties tp
      WHERE tp.id = travel_party_members.travel_party_id
        AND public.guest_can_access_guest(tp.lead_guest_id)
    )
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

CREATE POLICY "guest_manage_own_travel_party_members"
  ON public.travel_party_members
  FOR ALL
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.travel_parties tp
      WHERE tp.id = travel_party_members.travel_party_id
        AND public.guest_can_access_guest(tp.lead_guest_id)
    )
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.travel_parties tp
      WHERE tp.id = travel_party_members.travel_party_id
        AND public.guest_can_access_guest(tp.lead_guest_id)
    )
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

-- Travel party room links (using correct column: travel_party_id)
CREATE POLICY "staff_select_room_links"
  ON public.travel_party_room_links
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_room_links"
  ON public.travel_party_room_links
  FOR ALL
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]))
  WITH CHECK (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]));

CREATE POLICY "guest_select_own_room_links"
  ON public.travel_party_room_links
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.travel_parties tp
      WHERE tp.id = travel_party_room_links.travel_party_id
        AND public.guest_can_access_guest(tp.lead_guest_id)
    )
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

-- =====================================================
-- PART 14: VENDOR TABLES POLICIES
-- =====================================================

CREATE POLICY "staff_select_vendors"
  ON public.vendors
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.vendor_resorts vr
      WHERE vr.vendor_id = vendors.id
        AND public.staff_has_resort_access(auth.uid(), vr.resort_id)
    )
  );

CREATE POLICY "staff_manage_vendors"
  ON public.vendors
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "vendor_select_own"
  ON public.vendors
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.vendor_id = vendors.id
    )
  );

-- Vendor resorts
CREATE POLICY "staff_select_vendor_resorts"
  ON public.vendor_resorts
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_vendor_resorts"
  ON public.vendor_resorts
  FOR ALL
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[]))
  WITH CHECK (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[]));

CREATE POLICY "vendor_select_own_resorts"
  ON public.vendor_resorts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.vendor_id = vendor_resorts.vendor_id
    )
  );

-- =====================================================
-- PART 15: BOOKING ATTENDEES POLICIES
-- =====================================================

CREATE POLICY "staff_select_booking_attendees"
  ON public.booking_attendees
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_booking_attendees"
  ON public.booking_attendees
  FOR ALL
  TO authenticated
  USING (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES', 'FNB', 'FRONT_OFFICE']::resort_role[])
  )
  WITH CHECK (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES', 'FNB', 'FRONT_OFFICE']::resort_role[])
  );

CREATE POLICY "guest_select_own_booking_attendees"
  ON public.booking_attendees
  FOR SELECT
  TO anon
  USING (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

CREATE POLICY "guest_manage_own_booking_attendees"
  ON public.booking_attendees
  FOR ALL
  TO anon
  USING (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  )
  WITH CHECK (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

-- =====================================================
-- PART 16: GUEST OUTBOUND MESSAGES POLICIES
-- =====================================================

CREATE POLICY "staff_select_guest_messages"
  ON public.guest_outbound_messages
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_guest_messages"
  ON public.guest_outbound_messages
  FOR ALL
  TO authenticated
  USING (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS']::resort_role[])
  )
  WITH CHECK (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS']::resort_role[])
  );

-- =====================================================
-- PART 17: RESORTS AND MEMBERSHIPS POLICIES
-- =====================================================

CREATE POLICY "staff_select_resorts"
  ON public.resorts
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_resort_membership(auth.uid(), id)
  );

CREATE POLICY "public_select_resort_codes"
  ON public.resorts
  FOR SELECT
  TO anon
  USING (status = 'ACTIVE');

CREATE POLICY "superadmin_manage_resorts"
  ON public.resorts
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "resort_admin_update_own_resort"
  ON public.resorts
  FOR UPDATE
  TO authenticated
  USING (public.has_resort_role(auth.uid(), id, ARRAY['RESORT_ADMIN']::resort_role[]))
  WITH CHECK (public.has_resort_role(auth.uid(), id, ARRAY['RESORT_ADMIN']::resort_role[]));

-- Resort memberships
CREATE POLICY "user_select_own_memberships"
  ON public.resort_memberships
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[])
  );

CREATE POLICY "admin_manage_memberships"
  ON public.resort_memberships
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

-- =====================================================
-- PART 18: ADDITIONAL RESORT-OWNED TABLES
-- =====================================================

-- Activity closures
CREATE POLICY "staff_select_activity_closures"
  ON public.activity_closures
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_activity_closures"
  ON public.activity_closures
  FOR ALL
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES']::resort_role[]))
  WITH CHECK (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES']::resort_role[]));

-- Activity recurring rules
CREATE POLICY "staff_select_activity_recurring_rules"
  ON public.activity_recurring_rules
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_activity_recurring_rules"
  ON public.activity_recurring_rules
  FOR ALL
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES']::resort_role[]))
  WITH CHECK (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES']::resort_role[]));

-- Activity session templates
CREATE POLICY "staff_select_activity_session_templates"
  ON public.activity_session_templates
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_activity_session_templates"
  ON public.activity_session_templates
  FOR ALL
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES']::resort_role[]))
  WITH CHECK (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES']::resort_role[]));

-- Activity waitlist
CREATE POLICY "staff_select_activity_waitlist"
  ON public.activity_waitlist
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_activity_waitlist"
  ON public.activity_waitlist
  FOR ALL
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES', 'FRONT_OFFICE']::resort_role[]))
  WITH CHECK (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES', 'FRONT_OFFICE']::resort_role[]));

CREATE POLICY "guest_select_own_waitlist"
  ON public.activity_waitlist
  FOR SELECT
  TO anon
  USING (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

CREATE POLICY "guest_manage_own_waitlist"
  ON public.activity_waitlist
  FOR ALL
  TO anon
  USING (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  )
  WITH CHECK (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

-- Guest requests
CREATE POLICY "staff_select_guest_requests"
  ON public.guest_requests
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_guest_requests"
  ON public.guest_requests
  FOR ALL
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'FNB']::resort_role[]))
  WITH CHECK (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'FNB']::resort_role[]));

CREATE POLICY "guest_select_own_requests"
  ON public.guest_requests
  FOR SELECT
  TO anon
  USING (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

CREATE POLICY "guest_insert_own_requests"
  ON public.guest_requests
  FOR INSERT
  TO anon
  WITH CHECK (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

-- Restaurant closures
CREATE POLICY "staff_select_restaurant_closures"
  ON public.restaurant_closures
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_restaurant_closures"
  ON public.restaurant_closures
  FOR ALL
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FNB']::resort_role[]))
  WITH CHECK (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FNB']::resort_role[]));

-- Restaurant recurring rules
CREATE POLICY "staff_select_restaurant_recurring_rules"
  ON public.restaurant_recurring_rules
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_restaurant_recurring_rules"
  ON public.restaurant_recurring_rules
  FOR ALL
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FNB']::resort_role[]))
  WITH CHECK (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FNB']::resort_role[]));

-- Resources
CREATE POLICY "staff_select_resources"
  ON public.resources
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_resources"
  ON public.resources
  FOR ALL
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER']::resort_role[]))
  WITH CHECK (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER']::resort_role[]));

-- Resort directory
CREATE POLICY "staff_select_resort_directory"
  ON public.resort_directory
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_resort_directory"
  ON public.resort_directory
  FOR ALL
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER']::resort_role[]))
  WITH CHECK (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER']::resort_role[]));

CREATE POLICY "guest_select_resort_directory"
  ON public.resort_directory
  FOR SELECT
  TO anon
  USING (
    is_active = true
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

-- Stay feedback
CREATE POLICY "staff_select_stay_feedback"
  ON public.stay_feedback
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "guest_insert_stay_feedback"
  ON public.stay_feedback
  FOR INSERT
  TO anon
  WITH CHECK (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

CREATE POLICY "guest_select_own_feedback"
  ON public.stay_feedback
  FOR SELECT
  TO anon
  USING (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

-- =====================================================
-- PART 19: LOYALTY TABLES POLICIES
-- =====================================================

CREATE POLICY "staff_select_loyalty_programs"
  ON public.loyalty_programs
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_loyalty_programs"
  ON public.loyalty_programs
  FOR ALL
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[]))
  WITH CHECK (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[]));

CREATE POLICY "guest_select_loyalty_program"
  ON public.loyalty_programs
  FOR SELECT
  TO anon
  USING (
    is_enabled = true
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

CREATE POLICY "staff_select_loyalty_tiers"
  ON public.loyalty_tiers
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_loyalty_tiers"
  ON public.loyalty_tiers
  FOR ALL
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[]))
  WITH CHECK (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[]));

CREATE POLICY "guest_select_loyalty_tiers"
  ON public.loyalty_tiers
  FOR SELECT
  TO anon
  USING ((auth.jwt() ->> 'resort_id')::uuid = resort_id);

CREATE POLICY "staff_select_loyalty_members"
  ON public.loyalty_members
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_loyalty_members"
  ON public.loyalty_members
  FOR ALL
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]))
  WITH CHECK (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]));

CREATE POLICY "guest_select_own_loyalty_member"
  ON public.loyalty_members
  FOR SELECT
  TO anon
  USING (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

CREATE POLICY "staff_select_loyalty_transactions"
  ON public.loyalty_transactions
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_loyalty_transactions"
  ON public.loyalty_transactions
  FOR ALL
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]))
  WITH CHECK (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]));

CREATE POLICY "guest_select_own_loyalty_transactions"
  ON public.loyalty_transactions
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.loyalty_members lm
      WHERE lm.id = loyalty_transactions.member_id
        AND public.guest_can_access_guest(lm.guest_id)
    )
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

CREATE POLICY "staff_select_loyalty_rewards"
  ON public.loyalty_rewards
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_loyalty_rewards"
  ON public.loyalty_rewards
  FOR ALL
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[]))
  WITH CHECK (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[]));

CREATE POLICY "guest_select_loyalty_rewards"
  ON public.loyalty_rewards
  FOR SELECT
  TO anon
  USING (
    is_active = true
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

CREATE POLICY "staff_select_loyalty_redemptions"
  ON public.loyalty_redemptions
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_loyalty_redemptions"
  ON public.loyalty_redemptions
  FOR ALL
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]))
  WITH CHECK (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]));

CREATE POLICY "guest_select_own_loyalty_redemptions"
  ON public.loyalty_redemptions
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.loyalty_members lm
      WHERE lm.id = loyalty_redemptions.member_id
        AND public.guest_can_access_guest(lm.guest_id)
    )
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

CREATE POLICY "staff_select_loyalty_earn_rules"
  ON public.loyalty_earn_rules
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_loyalty_earn_rules"
  ON public.loyalty_earn_rules
  FOR ALL
  TO authenticated
  USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[]))
  WITH CHECK (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[]));

-- =====================================================
-- PART 20: AUDIT LOGS POLICIES
-- =====================================================

CREATE POLICY "staff_select_audit_logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (resort_id IS NOT NULL AND public.staff_has_resort_access(auth.uid(), resort_id))
  );

CREATE POLICY "system_insert_audit_logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "staff_select_access_audit_log"
  ON public.access_audit_log
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (resort_id IS NOT NULL AND public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[]))
  );

CREATE POLICY "system_insert_access_audit_log"
  ON public.access_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- PART 21: FEATURE FLAGS POLICIES
-- =====================================================

CREATE POLICY "staff_select_feature_flags"
  ON public.feature_flags
  FOR SELECT
  TO authenticated
  USING (
    scope = 'global'
    OR (resort_id IS NOT NULL AND public.staff_has_resort_access(auth.uid(), resort_id))
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "superadmin_manage_feature_flags"
  ON public.feature_flags
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- =====================================================
-- PART 22: GUEST PROFILE EVENTS POLICIES
-- =====================================================

CREATE POLICY "staff_select_guest_profile_events"
  ON public.guest_profile_events
  FOR SELECT
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "system_insert_guest_profile_events"
  ON public.guest_profile_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.staff_can_write_resort(auth.uid(), resort_id, 
      ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS']::resort_role[])
  );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.staff_has_resort_access IS 'Check if user has access to resort (super admin or membership)';
COMMENT ON FUNCTION public.staff_can_write_resort IS 'Check if user can write to resort (super admin or specific roles)';
COMMENT ON FUNCTION public.guest_can_access_guest IS 'Check if guest session can access guest record';
COMMENT ON TABLE public.guest_sessions IS 'Tracks guest portal sessions for RLS enforcement';
