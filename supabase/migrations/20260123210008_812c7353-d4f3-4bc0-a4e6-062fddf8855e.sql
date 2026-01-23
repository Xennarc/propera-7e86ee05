-- =============================================
-- Guest Session Management - Add missing columns and functions
-- =============================================

-- 1. Add missing columns to guest_sessions
ALTER TABLE public.guest_sessions 
  ADD COLUMN IF NOT EXISTS device_fingerprint text,
  ADD COLUMN IF NOT EXISTS device_name text,
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS browser_name text,
  ADD COLUMN IF NOT EXISTS os_name text,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_reason text;

-- Rename token_hash to session_token_hash if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guest_sessions' AND column_name = 'token_hash') THEN
    ALTER TABLE public.guest_sessions RENAME COLUMN token_hash TO session_token_hash;
  END IF;
END $$;

-- Rename last_used_at to last_active_at if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guest_sessions' AND column_name = 'last_used_at') THEN
    ALTER TABLE public.guest_sessions RENAME COLUMN last_used_at TO last_active_at;
  END IF;
END $$;

-- 2. Create additional indexes
CREATE INDEX IF NOT EXISTS idx_guest_sessions_active ON public.guest_sessions(guest_id, revoked_at) WHERE revoked_at IS NULL;

-- 3. Create function to register a new guest session
CREATE OR REPLACE FUNCTION public.register_guest_session(
  p_guest_id uuid,
  p_resort_id uuid,
  p_device_fingerprint text DEFAULT NULL,
  p_device_name text DEFAULT NULL,
  p_device_type text DEFAULT NULL,
  p_browser_name text DEFAULT NULL,
  p_os_name text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_session_token text;
  v_token_hash text;
  v_session_id uuid;
  v_guest record;
BEGIN
  -- Verify guest exists and is in the specified resort
  SELECT id, resort_id, check_out_date INTO v_guest
  FROM public.guests
  WHERE id = p_guest_id AND resort_id = p_resort_id;

  IF v_guest.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'GUEST_NOT_FOUND');
  END IF;

  -- Check guest hasn't checked out
  IF v_guest.check_out_date < CURRENT_DATE THEN
    RETURN json_build_object('success', false, 'error', 'GUEST_CHECKED_OUT');
  END IF;

  -- Generate a secure session token
  v_session_token := encode(gen_random_bytes(32), 'base64');
  v_session_token := replace(v_session_token, '/', '_');
  v_session_token := replace(v_session_token, '+', '-');
  v_session_token := replace(v_session_token, '=', '');

  -- Hash the token for storage
  v_token_hash := encode(digest(v_session_token, 'sha256'), 'hex');

  -- Insert session record
  INSERT INTO public.guest_sessions (
    guest_id, resort_id, session_token_hash,
    device_fingerprint, device_name, device_type,
    browser_name, os_name, last_active_at
  ) VALUES (
    p_guest_id, p_resort_id, v_token_hash,
    p_device_fingerprint, p_device_name, p_device_type,
    p_browser_name, p_os_name, now()
  )
  RETURNING id INTO v_session_id;

  RETURN json_build_object(
    'success', true,
    'session_id', v_session_id,
    'session_token', v_session_token
  );
END;
$$;

-- 4. Create function to validate and refresh a session
CREATE OR REPLACE FUNCTION public.validate_guest_session(
  p_session_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_token_hash text;
  v_session record;
  v_guest record;
BEGIN
  IF p_session_token IS NULL OR length(p_session_token) < 10 THEN
    RETURN json_build_object('success', false, 'error', 'INVALID_TOKEN');
  END IF;

  v_token_hash := encode(digest(p_session_token, 'sha256'), 'hex');

  -- Find the session
  SELECT * INTO v_session
  FROM public.guest_sessions
  WHERE session_token_hash = v_token_hash;

  IF v_session.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'SESSION_NOT_FOUND');
  END IF;

  -- Check if session is revoked
  IF v_session.revoked_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'SESSION_REVOKED', 'reason', v_session.revoked_reason);
  END IF;

  -- Get guest info and check checkout
  SELECT id, full_name, room_number, check_in_date, check_out_date, resort_id
  INTO v_guest
  FROM public.guests
  WHERE id = v_session.guest_id;

  IF v_guest.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'GUEST_NOT_FOUND');
  END IF;

  -- Auto-revoke if guest has checked out
  IF v_guest.check_out_date < CURRENT_DATE THEN
    UPDATE public.guest_sessions
    SET revoked_at = now(), revoked_reason = 'checkout'
    WHERE id = v_session.id;
    RETURN json_build_object('success', false, 'error', 'SESSION_EXPIRED', 'reason', 'checkout');
  END IF;

  -- Update last active timestamp
  UPDATE public.guest_sessions
  SET last_active_at = now()
  WHERE id = v_session.id;

  RETURN json_build_object(
    'success', true,
    'session_id', v_session.id,
    'guest_id', v_guest.id,
    'resort_id', v_guest.resort_id
  );
END;
$$;

-- 5. Create function to get guest's active sessions
CREATE OR REPLACE FUNCTION public.get_guest_sessions(
  p_guest_id uuid,
  p_resort_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_sessions json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', s.id,
      'device_name', COALESCE(s.device_name, 'Unknown Device'),
      'device_type', COALESCE(s.device_type, 'unknown'),
      'browser_name', s.browser_name,
      'os_name', s.os_name,
      'last_active_at', s.last_active_at,
      'created_at', s.created_at
    )
    ORDER BY s.last_active_at DESC
  ) INTO v_sessions
  FROM public.guest_sessions s
  WHERE s.guest_id = p_guest_id
    AND s.resort_id = p_resort_id
    AND s.revoked_at IS NULL;

  RETURN json_build_object(
    'success', true,
    'sessions', COALESCE(v_sessions, '[]'::json)
  );
END;
$$;

-- 6. Create function to revoke a session
CREATE OR REPLACE FUNCTION public.revoke_guest_session(
  p_session_id uuid,
  p_guest_id uuid,
  p_reason text DEFAULT 'user_revoked'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_session record;
BEGIN
  -- Find the session and verify ownership
  SELECT * INTO v_session
  FROM public.guest_sessions
  WHERE id = p_session_id
    AND guest_id = p_guest_id
    AND revoked_at IS NULL;

  IF v_session.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'SESSION_NOT_FOUND');
  END IF;

  -- Revoke the session
  UPDATE public.guest_sessions
  SET revoked_at = now(), revoked_reason = p_reason
  WHERE id = p_session_id;

  RETURN json_build_object('success', true);
END;
$$;

-- 7. Create function to revoke all sessions for a guest
CREATE OR REPLACE FUNCTION public.revoke_all_guest_sessions(
  p_guest_id uuid,
  p_reason text DEFAULT 'checkout'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.guest_sessions
  SET revoked_at = now(), revoked_reason = p_reason
  WHERE guest_id = p_guest_id
    AND revoked_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN json_build_object('success', true, 'revoked_count', v_count);
END;
$$;

-- 8. Create trigger to auto-revoke sessions when guest checks out
CREATE OR REPLACE FUNCTION public.trigger_revoke_sessions_on_checkout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If check_out_date is being set to a past date (checkout happened)
  IF NEW.check_out_date < CURRENT_DATE AND (OLD.check_out_date IS NULL OR OLD.check_out_date >= CURRENT_DATE) THEN
    PERFORM public.revoke_all_guest_sessions(NEW.id, 'checkout');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guest_checkout_revoke_sessions ON public.guests;
CREATE TRIGGER trg_guest_checkout_revoke_sessions
  AFTER UPDATE OF check_out_date ON public.guests
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_revoke_sessions_on_checkout();