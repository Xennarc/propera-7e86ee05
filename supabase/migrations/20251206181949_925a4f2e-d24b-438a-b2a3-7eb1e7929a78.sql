-- Create booking audit log table
CREATE TABLE public.booking_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_type TEXT NOT NULL CHECK (booking_type IN ('ACTIVITY', 'RESTAURANT')),
  booking_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('CREATED', 'UPDATED', 'CANCELLED', 'STATUS_CHANGED')),
  changed_by_user_id UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  old_values JSONB,
  new_values JSONB,
  change_summary TEXT
);

-- Enable RLS
ALTER TABLE public.booking_audit_logs ENABLE ROW LEVEL SECURITY;

-- Index for faster lookups
CREATE INDEX idx_booking_audit_logs_booking ON public.booking_audit_logs(booking_type, booking_id);
CREATE INDEX idx_booking_audit_logs_changed_at ON public.booking_audit_logs(changed_at DESC);

-- RLS: Manager and above can view audit logs in their resort
CREATE POLICY "Manager and above can view audit logs"
ON public.booking_audit_logs
FOR SELECT
USING (
  is_super_admin(auth.uid()) OR
  has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'MANAGER'::app_role])
);

-- Function to log activity booking changes
CREATE OR REPLACE FUNCTION public.log_activity_booking_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action TEXT;
  v_summary TEXT;
  v_old_values JSONB;
  v_new_values JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATED';
    v_summary := 'Booking created';
    v_new_values := to_jsonb(NEW);
    
    INSERT INTO booking_audit_logs (booking_type, booking_id, action, changed_by_user_id, old_values, new_values, change_summary)
    VALUES ('ACTIVITY', NEW.id, v_action, COALESCE(NEW.created_by_user_id, auth.uid()), NULL, v_new_values, v_summary);
    
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
    
    -- Determine action type
    IF OLD.status != NEW.status THEN
      IF NEW.status = 'CANCELLED' THEN
        v_action := 'CANCELLED';
        v_summary := 'Booking cancelled (was ' || OLD.status || ')';
      ELSE
        v_action := 'STATUS_CHANGED';
        v_summary := 'Status changed from ' || OLD.status || ' to ' || NEW.status;
      END IF;
    ELSE
      v_action := 'UPDATED';
      v_summary := 'Booking details updated';
    END IF;
    
    INSERT INTO booking_audit_logs (booking_type, booking_id, action, changed_by_user_id, old_values, new_values, change_summary)
    VALUES ('ACTIVITY', NEW.id, v_action, auth.uid(), v_old_values, v_new_values, v_summary);
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Function to log restaurant reservation changes
CREATE OR REPLACE FUNCTION public.log_restaurant_reservation_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action TEXT;
  v_summary TEXT;
  v_old_values JSONB;
  v_new_values JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATED';
    v_summary := 'Reservation created';
    v_new_values := to_jsonb(NEW);
    
    INSERT INTO booking_audit_logs (booking_type, booking_id, action, changed_by_user_id, old_values, new_values, change_summary)
    VALUES ('RESTAURANT', NEW.id, v_action, COALESCE(NEW.created_by_user_id, auth.uid()), NULL, v_new_values, v_summary);
    
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
    
    -- Determine action type
    IF OLD.status != NEW.status THEN
      IF NEW.status = 'CANCELLED' THEN
        v_action := 'CANCELLED';
        v_summary := 'Reservation cancelled (was ' || OLD.status || ')';
      ELSE
        v_action := 'STATUS_CHANGED';
        v_summary := 'Status changed from ' || OLD.status || ' to ' || NEW.status;
      END IF;
    ELSE
      v_action := 'UPDATED';
      v_summary := 'Reservation details updated';
    END IF;
    
    INSERT INTO booking_audit_logs (booking_type, booking_id, action, changed_by_user_id, old_values, new_values, change_summary)
    VALUES ('RESTAURANT', NEW.id, v_action, auth.uid(), v_old_values, v_new_values, v_summary);
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create triggers
CREATE TRIGGER trg_activity_booking_audit
AFTER INSERT OR UPDATE ON public.activity_bookings
FOR EACH ROW
EXECUTE FUNCTION public.log_activity_booking_changes();

CREATE TRIGGER trg_restaurant_reservation_audit
AFTER INSERT OR UPDATE ON public.restaurant_reservations
FOR EACH ROW
EXECUTE FUNCTION public.log_restaurant_reservation_changes();