-- =============================================================================
-- PHASE 1: DATABASE HARDENING MIGRATION (FULLY IDEMPOTENT)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1.1 Enable FORCE RLS on all protected tables
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  tbl RECORD;
  public_tables TEXT[] := ARRAY['demo_leads', 'demo_rate_limits', 'leads', 'lead_events'];
BEGIN
  FOR tbl IN 
    SELECT c.relname as tablename
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true
      AND c.relname::text NOT IN (SELECT unnest(public_tables))
  LOOP
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl.tablename);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 1.2 Create prevent_resort_id_change() trigger function
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_resort_id_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.resort_id IS DISTINCT FROM NEW.resort_id THEN
    RAISE EXCEPTION 'Cannot change resort_id on existing rows';
  END IF;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 1.3 Attach immutability triggers to all tables with resort_id column
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT c.relname as tablename
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_attribute a ON c.oid = a.attrelid
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND a.attname = 'resort_id' AND a.attnum > 0 AND NOT a.attisdropped
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_prevent_resort_id_change ON public.%I', tbl.tablename);
    EXECUTE format(
      'CREATE TRIGGER trg_prevent_resort_id_change
         BEFORE UPDATE ON public.%I
         FOR EACH ROW
         EXECUTE FUNCTION public.prevent_resort_id_change()',
      tbl.tablename
    );
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 1.4 Fix UPDATE policies - fully idempotent with dynamic SQL
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  policy_configs TEXT[][] := ARRAY[
    -- [table_name, policy_name, roles_array]
    ARRAY['activity_closures', 'staff_update_activity_closures', 'RESORT_ADMIN,MANAGER,ACTIVITIES'],
    ARRAY['activity_recurring_rules', 'staff_update_activity_recurring_rules', 'RESORT_ADMIN,MANAGER,ACTIVITIES'],
    ARRAY['activity_session_templates', 'staff_update_activity_session_templates', 'RESORT_ADMIN,MANAGER,ACTIVITIES'],
    ARRAY['activity_waitlist', 'staff_update_activity_waitlist', 'RESORT_ADMIN,MANAGER,ACTIVITIES,FRONT_OFFICE'],
    ARRAY['guest_outbound_messages', 'staff_update_guest_outbound_messages', 'RESORT_ADMIN,MANAGER,FRONT_OFFICE'],
    ARRAY['guest_requests', 'staff_update_guest_requests', 'RESORT_ADMIN,MANAGER,FRONT_OFFICE,ACTIVITIES,FNB'],
    ARRAY['prearrival_staff_reviews', 'staff_update_prearrival_staff_reviews', 'RESORT_ADMIN,MANAGER,FRONT_OFFICE'],
    ARRAY['restaurant_closures', 'staff_update_restaurant_closures', 'RESORT_ADMIN,MANAGER,FNB'],
    ARRAY['restaurant_recurring_rules', 'staff_update_restaurant_recurring_rules', 'RESORT_ADMIN,MANAGER,FNB']
  ];
  cfg TEXT[];
  tbl_name TEXT;
  policy_name TEXT;
  roles_str TEXT;
  roles_array TEXT;
BEGIN
  FOREACH cfg SLICE 1 IN ARRAY policy_configs LOOP
    tbl_name := cfg[1];
    policy_name := cfg[2];
    roles_str := cfg[3];
    
    -- Convert comma-separated roles to ARRAY literal
    roles_array := 'ARRAY[' || (SELECT string_agg('''' || r || '''', ',' ORDER BY r) 
                                 FROM unnest(string_to_array(roles_str, ',')) AS r) || ']::public.resort_role[]';
    
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl_name) THEN
      -- Drop any existing policies with similar names
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, tbl_name);
      EXECUTE format('DROP POLICY IF EXISTS "Staff can update %s" ON public.%I', 
                     regexp_replace(tbl_name, '_', ' ', 'g'), tbl_name);
      
      -- Create new policy with WITH CHECK
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated
         USING (public.staff_can_write_resort(auth.uid(), resort_id, %s))
         WITH CHECK (public.staff_can_write_resort(auth.uid(), resort_id, %s))',
        policy_name, tbl_name, roles_array, roles_array
      );
    END IF;
  END LOOP;
END $$;

-- admin_notifications - user-scoped
DROP POLICY IF EXISTS "users_update_own_admin_notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.admin_notifications;
CREATE POLICY "users_update_own_admin_notifications"
  ON public.admin_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- resorts - super admin and resort admin policies
DROP POLICY IF EXISTS "superadmin_update_resorts" ON public.resorts;
DROP POLICY IF EXISTS "Super admins can update resorts" ON public.resorts;
CREATE POLICY "superadmin_update_resorts"
  ON public.resorts FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "resort_admin_update_own_resort" ON public.resorts;
DROP POLICY IF EXISTS "Resort admins can update own resort" ON public.resorts;
CREATE POLICY "resort_admin_update_own_resort"
  ON public.resorts FOR UPDATE TO authenticated
  USING (public.has_resort_role(auth.uid(), id, ARRAY['RESORT_ADMIN']::public.resort_role[]))
  WITH CHECK (public.has_resort_role(auth.uid(), id, ARRAY['RESORT_ADMIN']::public.resort_role[]));

-- notifications table (if exists with user_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'notifications' AND a.attname = 'user_id'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications';
    EXECUTE 'CREATE POLICY "users_update_own_notifications" ON public.notifications
      FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- guest_notifications table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'guest_notifications') THEN
    EXECUTE 'DROP POLICY IF EXISTS "guests_update_own_notifications" ON public.guest_notifications';
    EXECUTE 'DROP POLICY IF EXISTS "Guests can update own notifications" ON public.guest_notifications';
    EXECUTE 'CREATE POLICY "guests_update_own_notifications" ON public.guest_notifications
      FOR UPDATE TO authenticated 
      USING (public.guest_can_access_guest(auth.uid(), guest_id)) 
      WITH CHECK (public.guest_can_access_guest(auth.uid(), guest_id))';
  END IF;
END $$;

-- platform_errors table (super admin only, if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'platform_errors') THEN
    EXECUTE 'DROP POLICY IF EXISTS "superadmin_update_platform_errors" ON public.platform_errors';
    EXECUTE 'DROP POLICY IF EXISTS "Super admins can update errors" ON public.platform_errors';
    EXECUTE 'CREATE POLICY "superadmin_update_platform_errors" ON public.platform_errors
      FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()))';
  END IF;
END $$;

-- onboarding_progress table (check which column to use)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'onboarding_progress' AND a.attname = 'resort_id'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "staff_update_onboarding_progress" ON public.onboarding_progress';
    EXECUTE 'CREATE POLICY "staff_update_onboarding_progress" ON public.onboarding_progress
      FOR UPDATE TO authenticated
      USING (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY[''RESORT_ADMIN'', ''MANAGER'']::public.resort_role[]))
      WITH CHECK (public.staff_can_write_resort(auth.uid(), resort_id, ARRAY[''RESORT_ADMIN'', ''MANAGER'']::public.resort_role[]))';
  ELSIF EXISTS (
    SELECT 1 FROM pg_attribute a JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'onboarding_progress' AND a.attname = 'user_id'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "users_update_own_onboarding" ON public.onboarding_progress';
    EXECUTE 'CREATE POLICY "users_update_own_onboarding" ON public.onboarding_progress
      FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;