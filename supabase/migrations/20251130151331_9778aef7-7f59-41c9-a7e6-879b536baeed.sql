
-- Create notification audience enum
CREATE TYPE notification_audience AS ENUM ('STAFF', 'GUEST');

-- Create notification channel enum
CREATE TYPE notification_channel AS ENUM ('IN_APP', 'EMAIL', 'WHATSAPP');

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID REFERENCES public.resorts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE,
  audience notification_audience NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,
  channel notification_channel NOT NULL DEFAULT 'IN_APP',
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraint: either user_id or guest_id must be set based on audience
  CONSTRAINT check_audience_target CHECK (
    (audience = 'STAFF' AND user_id IS NOT NULL AND guest_id IS NULL) OR
    (audience = 'GUEST' AND guest_id IS NOT NULL AND user_id IS NULL)
  )
);

-- Create indexes for efficient queries
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, is_read) WHERE user_id IS NOT NULL;
CREATE INDEX idx_notifications_guest_read ON public.notifications(guest_id, is_read) WHERE guest_id IS NOT NULL;
CREATE INDEX idx_notifications_resort_created ON public.notifications(resort_id, created_at DESC);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_notifications_guest_created ON public.notifications(guest_id, created_at DESC) WHERE guest_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff notifications
CREATE POLICY "Staff can view own notifications"
ON public.notifications
FOR SELECT
USING (
  audience = 'STAFF' AND user_id = auth.uid()
);

CREATE POLICY "Staff can update own notifications"
ON public.notifications
FOR UPDATE
USING (
  audience = 'STAFF' AND user_id = auth.uid()
);

-- Note: Guest notifications will be accessed via security definer functions
-- since guests don't have auth.uid()

-- Trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create staff notifications for specific roles in a resort
CREATE OR REPLACE FUNCTION public.create_staff_notifications_for_roles(
  p_resort_id UUID,
  p_roles resort_role[],
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link_url TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_membership RECORD;
BEGIN
  -- Find all staff members with the specified roles in the resort
  FOR v_membership IN
    SELECT DISTINCT user_id
    FROM resort_memberships
    WHERE resort_id = p_resort_id
      AND resort_role = ANY(p_roles)
  LOOP
    INSERT INTO notifications (
      resort_id, user_id, audience, type, title, message, link_url, channel
    ) VALUES (
      p_resort_id, v_membership.user_id, 'STAFF', p_type, p_title, p_message, p_link_url, 'IN_APP'
    );
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- Function to create a staff notification for a specific user
CREATE OR REPLACE FUNCTION public.create_staff_notification_for_user(
  p_resort_id UUID,
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    resort_id, user_id, audience, type, title, message, link_url, channel
  ) VALUES (
    p_resort_id, p_user_id, 'STAFF', p_type, p_title, p_message, p_link_url, 'IN_APP'
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Function to create a guest notification
CREATE OR REPLACE FUNCTION public.create_guest_notification(
  p_resort_id UUID,
  p_guest_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    resort_id, guest_id, audience, type, title, message, link_url, channel
  ) VALUES (
    p_resort_id, p_guest_id, 'GUEST', p_type, p_title, p_message, p_link_url, 'IN_APP'
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Function for guests to get their notifications
CREATE OR REPLACE FUNCTION public.guest_get_notifications(p_guest_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC)
    FROM (
      SELECT 
        id, type, title, message, link_url, is_read, read_at, created_at
      FROM notifications
      WHERE guest_id = p_guest_id
        AND audience = 'GUEST'
      ORDER BY created_at DESC
      LIMIT 50
    ) t
  ), '[]'::jsonb);
END;
$$;

-- Function for guests to get unread notification count
CREATE OR REPLACE FUNCTION public.guest_get_unread_notification_count(p_guest_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE guest_id = p_guest_id
      AND audience = 'GUEST'
      AND is_read = false
  );
END;
$$;

-- Function for guests to mark notification as read
CREATE OR REPLACE FUNCTION public.guest_mark_notification_read(p_guest_id UUID, p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE id = p_notification_id
    AND guest_id = p_guest_id
    AND audience = 'GUEST';
  
  RETURN FOUND;
END;
$$;

-- Function for guests to mark all notifications as read
CREATE OR REPLACE FUNCTION public.guest_mark_all_notifications_read(p_guest_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE guest_id = p_guest_id
    AND audience = 'GUEST'
    AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_staff_notifications_for_roles TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_staff_notification_for_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_guest_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.guest_get_notifications TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_get_unread_notification_count TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_mark_notification_read TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_mark_all_notifications_read TO anon, authenticated;
