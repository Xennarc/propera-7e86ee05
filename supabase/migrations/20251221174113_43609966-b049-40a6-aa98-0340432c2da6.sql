-- ============================================
-- Phase 1: Super Admin Command Center Database Foundation
-- ============================================

-- 1. Platform Errors Table - For real error logging
CREATE TABLE public.platform_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID REFERENCES public.resorts(id) ON DELETE SET NULL,
  route TEXT NOT NULL,
  action TEXT,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  user_id UUID,
  user_type TEXT CHECK (user_type IN ('staff', 'guest', 'system')),
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('warning', 'error', 'critical')),
  metadata_json JSONB DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on platform_errors
ALTER TABLE public.platform_errors ENABLE ROW LEVEL SECURITY;

-- Only super admins can view platform errors
CREATE POLICY "Super admins can view all platform errors"
  ON public.platform_errors FOR SELECT
  USING (is_super_admin(auth.uid()));

-- System can insert errors (via edge function with service role)
CREATE POLICY "System can insert platform errors"
  ON public.platform_errors FOR INSERT
  WITH CHECK (true);

-- Super admins can update (resolve) errors
CREATE POLICY "Super admins can update platform errors"
  ON public.platform_errors FOR UPDATE
  USING (is_super_admin(auth.uid()));

-- Index for faster querying
CREATE INDEX idx_platform_errors_resort_id ON public.platform_errors(resort_id);
CREATE INDEX idx_platform_errors_created_at ON public.platform_errors(created_at DESC);
CREATE INDEX idx_platform_errors_severity ON public.platform_errors(severity);

-- 2. Platform Activity Events Table - For activity feed
CREATE TABLE public.platform_activity_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID REFERENCES public.resorts(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  actor_id UUID,
  actor_type TEXT CHECK (actor_type IN ('staff', 'guest', 'system', 'superadmin')),
  actor_name TEXT,
  target_type TEXT,
  target_id UUID,
  target_name TEXT,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on platform_activity_events
ALTER TABLE public.platform_activity_events ENABLE ROW LEVEL SECURITY;

-- Super admins can view all activity events
CREATE POLICY "Super admins can view all activity events"
  ON public.platform_activity_events FOR SELECT
  USING (is_super_admin(auth.uid()));

-- Resort staff can view events in their resort
CREATE POLICY "Staff can view activity events in their resort"
  ON public.platform_activity_events FOR SELECT
  USING (resort_id IS NOT NULL AND has_resort_membership(auth.uid(), resort_id));

-- System can insert activity events
CREATE POLICY "System can insert activity events"
  ON public.platform_activity_events FOR INSERT
  WITH CHECK (true);

-- Index for faster querying
CREATE INDEX idx_platform_activity_events_resort_id ON public.platform_activity_events(resort_id);
CREATE INDEX idx_platform_activity_events_created_at ON public.platform_activity_events(created_at DESC);
CREATE INDEX idx_platform_activity_events_event_type ON public.platform_activity_events(event_type);

-- Enable realtime for activity events
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_activity_events;

-- 3. Feature Flags Table - For database-backed feature flags
CREATE TABLE public.feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'core',
  tier TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_dangerous BOOLEAN NOT NULL DEFAULT false,
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'resort')),
  resort_id UUID REFERENCES public.resorts(id) ON DELETE CASCADE,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (key, resort_id)
);

-- Enable RLS on feature_flags
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view feature flags
CREATE POLICY "Authenticated users can view feature flags"
  ON public.feature_flags FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Super admins can manage feature flags
CREATE POLICY "Super admins can manage feature flags"
  ON public.feature_flags FOR ALL
  USING (is_super_admin(auth.uid()));

-- Resort admins can manage their resort's feature flag overrides
CREATE POLICY "Resort admins can manage their resort feature flags"
  ON public.feature_flags FOR ALL
  USING (
    resort_id IS NOT NULL AND 
    has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
  );

-- Index for faster querying
CREATE INDEX idx_feature_flags_key ON public.feature_flags(key);
CREATE INDEX idx_feature_flags_resort_id ON public.feature_flags(resort_id);

-- 4. Rollout History Table - For tracking rollout executions
CREATE TABLE public.rollout_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  change_type TEXT NOT NULL,
  change_label TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('one', 'selected', 'all')),
  affected_resort_ids UUID[] DEFAULT '{}',
  executed_by UUID NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  rollback_by UUID,
  rollback_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'executed' CHECK (status IN ('executed', 'rolled_back', 'failed')),
  metadata_json JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

-- Enable RLS on rollout_history
ALTER TABLE public.rollout_history ENABLE ROW LEVEL SECURITY;

-- Super admins can view and manage rollout history
CREATE POLICY "Super admins can view rollout history"
  ON public.rollout_history FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage rollout history"
  ON public.rollout_history FOR ALL
  USING (is_super_admin(auth.uid()));

-- Index for faster querying
CREATE INDEX idx_rollout_history_executed_at ON public.rollout_history(executed_at DESC);
CREATE INDEX idx_rollout_history_change_type ON public.rollout_history(change_type);

-- 5. Admin Notifications Table - For super admin alerts
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,
  resort_id UUID REFERENCES public.resorts(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_notifications
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own admin notifications"
  ON public.admin_notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own admin notifications"
  ON public.admin_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "System can insert admin notifications"
  ON public.admin_notifications FOR INSERT
  WITH CHECK (true);

-- Index for faster querying
CREATE INDEX idx_admin_notifications_user_id ON public.admin_notifications(user_id);
CREATE INDEX idx_admin_notifications_is_read ON public.admin_notifications(is_read);
CREATE INDEX idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);

-- 6. Support Sessions Table - For tracking View As mode
CREATE TABLE public.support_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('staff', 'guest')),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  target_user_id UUID,
  read_only BOOLEAN NOT NULL DEFAULT true,
  reason TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  actions_taken JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS on support_sessions
ALTER TABLE public.support_sessions ENABLE ROW LEVEL SECURITY;

-- Super admins can view and manage support sessions
CREATE POLICY "Super admins can manage support sessions"
  ON public.support_sessions FOR ALL
  USING (is_super_admin(auth.uid()));

-- Index for faster querying
CREATE INDEX idx_support_sessions_admin_user_id ON public.support_sessions(admin_user_id);
CREATE INDEX idx_support_sessions_resort_id ON public.support_sessions(resort_id);
CREATE INDEX idx_support_sessions_started_at ON public.support_sessions(started_at DESC);

-- 7. Seed initial global feature flags
INSERT INTO public.feature_flags (key, label, description, category, tier, is_enabled, is_dangerous, scope) VALUES
  -- Core Features
  ('enable_activities', 'Activities Module', 'Enable activity management and bookings', 'core', 'essential', true, false, 'global'),
  ('enable_dining', 'Dining Module', 'Enable restaurant management and reservations', 'core', 'essential', true, false, 'global'),
  ('enable_spa', 'Spa Module', 'Enable spa and wellness bookings', 'core', 'professional', false, false, 'global'),
  -- Guest Portal
  ('enable_guest_portal', 'Guest Portal', 'Enable guest self-service portal', 'guest', 'essential', true, false, 'global'),
  ('enable_prearrival', 'Pre-Arrival', 'Enable pre-arrival check-in flow', 'guest', 'professional', true, false, 'global'),
  ('enable_guest_bookings', 'Guest Self-Booking', 'Allow guests to book activities/dining', 'guest', 'essential', true, false, 'global'),
  -- Premium Features
  ('enable_loyalty', 'Loyalty Program', 'Enable loyalty points and rewards', 'premium', 'elite', false, true, 'global'),
  ('enable_ai_insights', 'AI Insights', 'Enable AI-powered analytics and suggestions', 'premium', 'elite', false, false, 'global'),
  ('enable_multi_language', 'Multi-Language', 'Enable guest portal translations', 'premium', 'professional', true, false, 'global'),
  -- Experimental
  ('enable_waitlist', 'Waitlist System', 'Enable waitlist for full sessions', 'experimental', 'essential', true, false, 'global'),
  ('enable_travel_party', 'Travel Party', 'Enable travel party management', 'experimental', 'professional', true, false, 'global'),
  ('enable_smart_suggestions', 'Smart Suggestions', 'AI-powered activity suggestions', 'experimental', 'elite', false, false, 'global'),
  -- Danger Zone
  ('maintenance_mode', 'Maintenance Mode', 'Put platform in maintenance mode', 'danger', null, false, true, 'global'),
  ('disable_guest_access', 'Disable Guest Access', 'Prevent all guest portal access', 'danger', null, false, true, 'global'),
  ('emergency_readonly', 'Emergency Read-Only', 'Disable all write operations', 'danger', null, false, true, 'global');

-- 8. Function to log platform activity
CREATE OR REPLACE FUNCTION public.log_platform_activity(
  p_event_type TEXT,
  p_resort_id UUID DEFAULT NULL,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_target_name TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_id UUID;
  v_actor_id UUID := auth.uid();
  v_actor_type TEXT := 'staff';
  v_actor_name TEXT;
  v_profile profiles%ROWTYPE;
BEGIN
  -- Get actor info
  IF v_actor_id IS NOT NULL THEN
    SELECT * INTO v_profile FROM profiles WHERE id = v_actor_id;
    v_actor_name := v_profile.full_name;
    IF v_profile.global_role = 'SUPER_ADMIN' THEN
      v_actor_type := 'superadmin';
    END IF;
  ELSE
    v_actor_type := 'system';
    v_actor_name := 'System';
  END IF;

  INSERT INTO platform_activity_events (
    event_type, resort_id, actor_id, actor_type, actor_name,
    target_type, target_id, target_name, metadata_json
  ) VALUES (
    p_event_type, p_resort_id, v_actor_id, v_actor_type, v_actor_name,
    p_target_type, p_target_id, p_target_name, p_metadata
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- 9. Function to log platform error
CREATE OR REPLACE FUNCTION public.log_platform_error(
  p_route TEXT,
  p_error_message TEXT,
  p_resort_id UUID DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_error_stack TEXT DEFAULT NULL,
  p_user_type TEXT DEFAULT 'staff',
  p_severity TEXT DEFAULT 'error',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_error_id UUID;
BEGIN
  INSERT INTO platform_errors (
    resort_id, route, action, error_message, error_stack,
    user_id, user_type, severity, metadata_json
  ) VALUES (
    p_resort_id, p_route, p_action, p_error_message, p_error_stack,
    auth.uid(), p_user_type, p_severity, p_metadata
  )
  RETURNING id INTO v_error_id;

  RETURN v_error_id;
END;
$$;

-- 10. Function to create admin notification
CREATE OR REPLACE FUNCTION public.create_admin_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_severity TEXT DEFAULT 'info',
  p_link_url TEXT DEFAULT NULL,
  p_resort_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO admin_notifications (
    user_id, type, title, message, severity, link_url, resort_id
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_severity, p_link_url, p_resort_id
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- 11. Trigger to auto-log activity on key tables
CREATE OR REPLACE FUNCTION public.trigger_log_booking_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_type TEXT;
  v_guest guests%ROWTYPE;
BEGIN
  SELECT * INTO v_guest FROM guests WHERE id = NEW.guest_id;
  
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'booking_created';
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NEW.status = 'CANCELLED' THEN
      v_event_type := 'booking_cancelled';
    ELSIF NEW.status = 'CONFIRMED' THEN
      v_event_type := 'booking_confirmed';
    ELSIF NEW.status = 'COMPLETED' THEN
      v_event_type := 'booking_completed';
    ELSE
      v_event_type := 'booking_updated';
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  PERFORM log_platform_activity(
    v_event_type,
    NEW.resort_id,
    'booking',
    NEW.id,
    v_guest.full_name,
    jsonb_build_object('status', NEW.status, 'source', NEW.source)
  );

  RETURN NEW;
END;
$$;

-- Apply trigger to activity_bookings
DROP TRIGGER IF EXISTS trigger_activity_booking_activity ON activity_bookings;
CREATE TRIGGER trigger_activity_booking_activity
  AFTER INSERT OR UPDATE ON activity_bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_booking_activity();

-- Apply trigger to restaurant_reservations
DROP TRIGGER IF EXISTS trigger_restaurant_reservation_activity ON restaurant_reservations;
CREATE TRIGGER trigger_restaurant_reservation_activity
  AFTER INSERT OR UPDATE ON restaurant_reservations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_booking_activity();