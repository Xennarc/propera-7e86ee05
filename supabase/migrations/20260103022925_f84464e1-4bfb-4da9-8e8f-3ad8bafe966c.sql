
-- =====================================================
-- AUDIT LOGS TABLE
-- Comprehensive audit trail for all sensitive operations
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resort_id UUID REFERENCES public.resorts(id) ON DELETE SET NULL,
  actor_user_id UUID,
  effective_user_id UUID,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  before JSONB,
  after JSONB,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_resort_id ON public.audit_logs(resort_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON public.audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_resort_created ON public.audit_logs(resort_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Super admins can view all audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Resort admins can view their resort audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (
    resort_id IS NOT NULL 
    AND has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role, 'MANAGER'::resort_role])
  );

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- AUDIT LOGGING FUNCTION
-- Reusable function for creating audit entries
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_audit(
  p_action TEXT,
  p_entity TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_before JSONB DEFAULT NULL,
  p_after JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_resort_id UUID DEFAULT NULL,
  p_actor_user_id UUID DEFAULT NULL,
  p_effective_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id UUID;
  v_actor UUID;
BEGIN
  -- Use provided actor or fall back to auth.uid()
  v_actor := COALESCE(p_actor_user_id, auth.uid());
  
  INSERT INTO audit_logs (
    resort_id,
    actor_user_id,
    effective_user_id,
    action,
    entity,
    entity_id,
    before,
    after,
    metadata
  ) VALUES (
    p_resort_id,
    v_actor,
    p_effective_user_id,
    p_action,
    p_entity,
    p_entity_id,
    p_before,
    p_after,
    p_metadata
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- =====================================================
-- TIMEZONE CONVERSION HELPERS
-- Store in UTC, display in resort timezone
-- =====================================================

-- Convert UTC timestamp to resort local time for display
CREATE OR REPLACE FUNCTION public.utc_to_resort_tz(
  p_timestamp TIMESTAMPTZ,
  p_resort_id UUID
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_timezone TEXT;
BEGIN
  SELECT timezone INTO v_timezone
  FROM resorts
  WHERE id = p_resort_id;
  
  IF v_timezone IS NULL THEN
    RETURN p_timestamp;
  END IF;
  
  RETURN p_timestamp AT TIME ZONE v_timezone;
END;
$$;

-- Convert local resort time to UTC for storage
CREATE OR REPLACE FUNCTION public.resort_tz_to_utc(
  p_local_timestamp TIMESTAMP,
  p_resort_id UUID
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_timezone TEXT;
BEGIN
  SELECT timezone INTO v_timezone
  FROM resorts
  WHERE id = p_resort_id;
  
  IF v_timezone IS NULL THEN
    RETURN p_local_timestamp AT TIME ZONE 'UTC';
  END IF;
  
  -- Interpret the timestamp as being in the resort's timezone, then convert to UTC
  RETURN (p_local_timestamp AT TIME ZONE v_timezone) AT TIME ZONE 'UTC';
END;
$$;

-- Get current time in resort timezone
CREATE OR REPLACE FUNCTION public.now_in_resort_tz(p_resort_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN utc_to_resort_tz(now(), p_resort_id);
END;
$$;

-- =====================================================
-- ENHANCED BOOKING AUDIT TRIGGERS
-- Auto-log sensitive booking operations
-- =====================================================

-- Activity booking audit trigger
CREATE OR REPLACE FUNCTION public.audit_activity_booking_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'BOOKING_CREATED';
    PERFORM log_audit(
      v_action,
      'activity_bookings',
      NEW.id,
      NULL,
      to_jsonb(NEW),
      jsonb_build_object('source', NEW.source, 'booking_source', NEW.booking_source),
      NEW.resort_id,
      NEW.created_by_user_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status AND NEW.status = 'CANCELLED' THEN
      v_action := 'BOOKING_CANCELLED';
    ELSIF OLD.vendor_status IS DISTINCT FROM NEW.vendor_status THEN
      v_action := 'VENDOR_STATUS_CHANGED';
    ELSE
      v_action := 'BOOKING_UPDATED';
    END IF;
    
    PERFORM log_audit(
      v_action,
      'activity_bookings',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object('status_change', OLD.status || ' -> ' || NEW.status),
      NEW.resort_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(
      'BOOKING_DELETED',
      'activity_bookings',
      OLD.id,
      to_jsonb(OLD),
      NULL,
      NULL,
      OLD.resort_id
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_activity_bookings ON public.activity_bookings;
CREATE TRIGGER trg_audit_activity_bookings
  AFTER INSERT OR UPDATE OR DELETE ON public.activity_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_activity_booking_changes();

-- Restaurant reservation audit trigger
CREATE OR REPLACE FUNCTION public.audit_restaurant_reservation_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'RESERVATION_CREATED';
    PERFORM log_audit(
      v_action,
      'restaurant_reservations',
      NEW.id,
      NULL,
      to_jsonb(NEW),
      jsonb_build_object('source', NEW.source),
      NEW.resort_id,
      NEW.created_by_user_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status AND NEW.status = 'CANCELLED' THEN
      v_action := 'RESERVATION_CANCELLED';
    ELSE
      v_action := 'RESERVATION_UPDATED';
    END IF;
    
    PERFORM log_audit(
      v_action,
      'restaurant_reservations',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object('status_change', OLD.status || ' -> ' || NEW.status),
      NEW.resort_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(
      'RESERVATION_DELETED',
      'restaurant_reservations',
      OLD.id,
      to_jsonb(OLD),
      NULL,
      NULL,
      OLD.resort_id
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_restaurant_reservations ON public.restaurant_reservations;
CREATE TRIGGER trg_audit_restaurant_reservations
  AFTER INSERT OR UPDATE OR DELETE ON public.restaurant_reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_restaurant_reservation_changes();

-- Guest audit trigger
CREATE OR REPLACE FUNCTION public.audit_guest_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_sensitive_change BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(
      'GUEST_CREATED',
      'guests',
      NEW.id,
      NULL,
      to_jsonb(NEW) - 'portal_pin_hash',
      jsonb_build_object('room_number', NEW.room_number),
      NEW.resort_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check for sensitive changes
    IF OLD.portal_pin_hash IS DISTINCT FROM NEW.portal_pin_hash THEN
      v_action := 'GUEST_PIN_RESET';
      v_sensitive_change := TRUE;
    ELSIF OLD.portal_enabled IS DISTINCT FROM NEW.portal_enabled THEN
      v_action := 'GUEST_PORTAL_ACCESS_CHANGED';
      v_sensitive_change := TRUE;
    ELSIF OLD.is_vip IS DISTINCT FROM NEW.is_vip THEN
      v_action := 'GUEST_VIP_STATUS_CHANGED';
      v_sensitive_change := TRUE;
    ELSE
      v_action := 'GUEST_UPDATED';
    END IF;
    
    -- Always log sensitive changes, conditionally log regular updates
    IF v_sensitive_change OR (OLD.* IS DISTINCT FROM NEW.*) THEN
      PERFORM log_audit(
        v_action,
        'guests',
        NEW.id,
        to_jsonb(OLD) - 'portal_pin_hash',
        to_jsonb(NEW) - 'portal_pin_hash',
        jsonb_build_object('sensitive_change', v_sensitive_change),
        NEW.resort_id
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(
      'GUEST_DELETED',
      'guests',
      OLD.id,
      to_jsonb(OLD) - 'portal_pin_hash',
      NULL,
      NULL,
      OLD.resort_id
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_guests ON public.guests;
CREATE TRIGGER trg_audit_guests
  AFTER INSERT OR UPDATE OR DELETE ON public.guests
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_guest_changes();

-- Role/Permission change audit trigger
CREATE OR REPLACE FUNCTION public.audit_resort_membership_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(
      'ROLE_ASSIGNED',
      'resort_memberships',
      NEW.id,
      NULL,
      to_jsonb(NEW),
      jsonb_build_object('role', NEW.resort_role, 'department', NEW.department),
      NEW.resort_id,
      NULL,
      NEW.user_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit(
      'ROLE_CHANGED',
      'resort_memberships',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object(
        'old_role', OLD.resort_role,
        'new_role', NEW.resort_role
      ),
      NEW.resort_id,
      NULL,
      NEW.user_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(
      'ROLE_REMOVED',
      'resort_memberships',
      OLD.id,
      to_jsonb(OLD),
      NULL,
      jsonb_build_object('role', OLD.resort_role),
      OLD.resort_id,
      NULL,
      OLD.user_id
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_resort_memberships ON public.resort_memberships;
CREATE TRIGGER trg_audit_resort_memberships
  AFTER INSERT OR UPDATE OR DELETE ON public.resort_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_resort_membership_changes();

-- Session/Slot changes audit
CREATE OR REPLACE FUNCTION public.audit_activity_session_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(
      'SESSION_CREATED',
      'activity_sessions',
      NEW.id,
      NULL,
      to_jsonb(NEW),
      jsonb_build_object('date', NEW.date, 'activity_id', NEW.activity_id),
      NEW.resort_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status AND NEW.status = 'CANCELLED' THEN
      v_action := 'SESSION_CANCELLED';
    ELSE
      v_action := 'SESSION_UPDATED';
    END IF;
    
    PERFORM log_audit(
      v_action,
      'activity_sessions',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      NULL,
      NEW.resort_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(
      'SESSION_DELETED',
      'activity_sessions',
      OLD.id,
      to_jsonb(OLD),
      NULL,
      NULL,
      OLD.resort_id
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_activity_sessions ON public.activity_sessions;
CREATE TRIGGER trg_audit_activity_sessions
  AFTER INSERT OR UPDATE OR DELETE ON public.activity_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_activity_session_changes();

-- Prearrival submission audit
CREATE OR REPLACE FUNCTION public.audit_prearrival_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(
      'PREARRIVAL_CREATED',
      'prearrival_profiles',
      NEW.id,
      NULL,
      to_jsonb(NEW),
      jsonb_build_object('guest_id', NEW.guest_id),
      NEW.resort_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.prearrival_status != NEW.prearrival_status AND NEW.prearrival_status = 'completed' THEN
      v_action := 'PREARRIVAL_COMPLETED';
    ELSIF OLD.staff_processed IS DISTINCT FROM NEW.staff_processed AND NEW.staff_processed = TRUE THEN
      v_action := 'PREARRIVAL_STAFF_REVIEWED';
    ELSE
      v_action := 'PREARRIVAL_UPDATED';
    END IF;
    
    PERFORM log_audit(
      v_action,
      'prearrival_profiles',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object('status', NEW.prearrival_status),
      NEW.resort_id
    );
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_prearrival_profiles ON public.prearrival_profiles;
CREATE TRIGGER trg_audit_prearrival_profiles
  AFTER INSERT OR UPDATE ON public.prearrival_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_prearrival_changes();

-- =====================================================
-- VIEW AS MODE LOGGING
-- Special function to log when super admin views as another user
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_view_as_session(
  p_target_user_id UUID,
  p_target_resort_id UUID,
  p_action TEXT DEFAULT 'VIEW_AS_STARTED'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN log_audit(
    p_action,
    'view_as_session',
    NULL,
    NULL,
    jsonb_build_object('target_user_id', p_target_user_id, 'target_resort_id', p_target_resort_id),
    jsonb_build_object('session_type', 'view_as'),
    p_target_resort_id,
    auth.uid(),
    p_target_user_id
  );
END;
$$;
