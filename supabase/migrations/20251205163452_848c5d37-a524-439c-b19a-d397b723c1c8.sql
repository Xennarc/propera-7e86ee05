-- Fix cross-resort data leakage by replacing overly permissive "Staff can view X" policies
-- with policies that check resort membership

-- ===== ACTIVITIES =====
DROP POLICY IF EXISTS "Staff can view activities" ON public.activities;
CREATE POLICY "Staff can view activities in their resort"
ON public.activities FOR SELECT
USING (
  has_resort_membership(auth.uid(), resort_id) 
  OR is_super_admin(auth.uid())
);

-- ===== ACTIVITY_BOOKINGS =====
DROP POLICY IF EXISTS "Staff can view bookings" ON public.activity_bookings;
CREATE POLICY "Staff can view bookings in their resort"
ON public.activity_bookings FOR SELECT
USING (
  has_resort_membership(auth.uid(), resort_id) 
  OR is_super_admin(auth.uid())
);

-- ===== ACTIVITY_CLOSURES =====
DROP POLICY IF EXISTS "Staff can view activity closures" ON public.activity_closures;
CREATE POLICY "Staff can view activity closures in their resort"
ON public.activity_closures FOR SELECT
USING (
  has_resort_membership(auth.uid(), resort_id) 
  OR is_super_admin(auth.uid())
);

-- ===== ACTIVITY_RECURRING_RULES =====
DROP POLICY IF EXISTS "Staff can view activity recurring rules" ON public.activity_recurring_rules;
CREATE POLICY "Staff can view activity recurring rules in their resort"
ON public.activity_recurring_rules FOR SELECT
USING (
  has_resort_membership(auth.uid(), resort_id) 
  OR is_super_admin(auth.uid())
);

-- ===== ACTIVITY_SESSIONS =====
DROP POLICY IF EXISTS "Staff can view sessions" ON public.activity_sessions;
CREATE POLICY "Staff can view sessions in their resort"
ON public.activity_sessions FOR SELECT
USING (
  has_resort_membership(auth.uid(), resort_id) 
  OR is_super_admin(auth.uid())
);

-- ===== GUEST_REQUESTS =====
DROP POLICY IF EXISTS "Staff can view guest requests" ON public.guest_requests;
CREATE POLICY "Staff can view guest requests in their resort"
ON public.guest_requests FOR SELECT
USING (
  has_resort_membership(auth.uid(), resort_id) 
  OR is_super_admin(auth.uid())
);

-- ===== GUESTS =====
DROP POLICY IF EXISTS "Staff can view guests" ON public.guests;
CREATE POLICY "Staff can view guests in their resort"
ON public.guests FOR SELECT
USING (
  has_resort_membership(auth.uid(), resort_id) 
  OR is_super_admin(auth.uid())
);

-- ===== RESOURCES =====
DROP POLICY IF EXISTS "Staff can view resources" ON public.resources;
CREATE POLICY "Staff can view resources in their resort"
ON public.resources FOR SELECT
USING (
  has_resort_membership(auth.uid(), resort_id) 
  OR is_super_admin(auth.uid())
);

-- ===== RESTAURANT_CLOSURES =====
DROP POLICY IF EXISTS "Staff can view restaurant closures" ON public.restaurant_closures;
CREATE POLICY "Staff can view restaurant closures in their resort"
ON public.restaurant_closures FOR SELECT
USING (
  has_resort_membership(auth.uid(), resort_id) 
  OR is_super_admin(auth.uid())
);

-- ===== RESTAURANT_RECURRING_RULES =====
DROP POLICY IF EXISTS "Staff can view restaurant recurring rules" ON public.restaurant_recurring_rules;
CREATE POLICY "Staff can view restaurant recurring rules in their resort"
ON public.restaurant_recurring_rules FOR SELECT
USING (
  has_resort_membership(auth.uid(), resort_id) 
  OR is_super_admin(auth.uid())
);

-- ===== RESTAURANT_RESERVATIONS =====
DROP POLICY IF EXISTS "Staff can view reservations" ON public.restaurant_reservations;
CREATE POLICY "Staff can view reservations in their resort"
ON public.restaurant_reservations FOR SELECT
USING (
  has_resort_membership(auth.uid(), resort_id) 
  OR is_super_admin(auth.uid())
);

-- ===== RESTAURANT_TIME_SLOTS =====
DROP POLICY IF EXISTS "Staff can view slots" ON public.restaurant_time_slots;
CREATE POLICY "Staff can view slots in their resort"
ON public.restaurant_time_slots FOR SELECT
USING (
  has_resort_membership(auth.uid(), resort_id) 
  OR is_super_admin(auth.uid())
);

-- ===== RESTAURANTS =====
DROP POLICY IF EXISTS "Staff can view restaurants" ON public.restaurants;
CREATE POLICY "Staff can view restaurants in their resort"
ON public.restaurants FOR SELECT
USING (
  has_resort_membership(auth.uid(), resort_id) 
  OR is_super_admin(auth.uid())
);

-- ===== STAY_FEEDBACK =====
DROP POLICY IF EXISTS "Staff can view feedback" ON public.stay_feedback;
CREATE POLICY "Staff can view feedback in their resort"
ON public.stay_feedback FOR SELECT
USING (
  has_resort_membership(auth.uid(), resort_id) 
  OR is_super_admin(auth.uid())
);