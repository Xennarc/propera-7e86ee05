
-- Push subscriptions table for Web Push notifications (Phase 5)
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE (guest_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Staff can view push subscriptions for their resort
CREATE POLICY "Staff can view push subscriptions for their resort"
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING (resort_id IN (
    SELECT urr.resort_id FROM user_resort_roles urr WHERE urr.user_id = auth.uid()
  ));

-- Guests manage subscriptions via RPC only, no direct table access for guest role
-- Create index for efficient lookups
CREATE INDEX idx_push_subscriptions_guest_resort ON public.push_subscriptions(guest_id, resort_id);

-- RPC for guests to save their push subscription
CREATE OR REPLACE FUNCTION public.guest_save_push_subscription(
  p_guest_id uuid,
  p_resort_id uuid,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_id uuid;
BEGIN
  -- Validate guest exists and belongs to resort
  IF NOT EXISTS (
    SELECT 1 FROM guests WHERE id = p_guest_id AND resort_id = p_resort_id
  ) THEN
    RAISE EXCEPTION 'Invalid guest or resort';
  END IF;

  -- Upsert subscription
  INSERT INTO push_subscriptions (guest_id, resort_id, endpoint, p256dh, auth, user_agent)
  VALUES (p_guest_id, p_resort_id, p_endpoint, p_p256dh, p_auth, p_user_agent)
  ON CONFLICT (guest_id, endpoint)
  DO UPDATE SET
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth,
    user_agent = EXCLUDED.user_agent,
    created_at = now()
  RETURNING id INTO v_sub_id;

  RETURN v_sub_id;
END;
$$;

-- RPC for guests to remove their push subscription
CREATE OR REPLACE FUNCTION public.guest_remove_push_subscription(
  p_guest_id uuid,
  p_endpoint text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM push_subscriptions
  WHERE guest_id = p_guest_id AND endpoint = p_endpoint;
END;
$$;
