-- =============================================
-- QR-Based Guest Login Tokens - Backend Support
-- =============================================

-- 1. Create enum type for token types
CREATE TYPE public.guest_login_token_type AS ENUM ('instant', 'confirm', 'pairing');

-- 2. Create guest_login_tokens table
CREATE TABLE public.guest_login_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  type public.guest_login_token_type NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_by_staff_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create indexes for performance
CREATE INDEX idx_guest_login_tokens_guest_expires ON public.guest_login_tokens(guest_id, expires_at);
CREATE INDEX idx_guest_login_tokens_resort ON public.guest_login_tokens(resort_id);

-- 4. Enable RLS
ALTER TABLE public.guest_login_tokens ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies - Staff can view tokens they created (audit trail)
CREATE POLICY "staff_view_own_tokens"
  ON public.guest_login_tokens
  FOR SELECT
  TO authenticated
  USING (created_by_staff_id = auth.uid());

-- Super admins can view all tokens (platform debugging)
CREATE POLICY "super_admin_view_all_tokens"
  ON public.guest_login_tokens
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- 6. Create create_guest_login_token RPC
CREATE OR REPLACE FUNCTION public.create_guest_login_token(
  p_guest_id uuid,
  p_token_type text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_guest record;
  v_caller_id uuid;
  v_raw_token text;
  v_token_hash text;
  v_expires_at timestamptz;
  v_token_type public.guest_login_token_type;
  v_inserted_id uuid;
BEGIN
  -- Validate token type
  IF p_token_type NOT IN ('instant', 'confirm', 'pairing') THEN
    RETURN json_build_object('success', false, 'error', 'INVALID_TOKEN_TYPE');
  END IF;
  v_token_type := p_token_type::public.guest_login_token_type;

  -- Get caller ID
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  -- Fetch guest record
  SELECT id, resort_id, full_name, room_number, check_in_date, check_out_date
  INTO v_guest
  FROM public.guests
  WHERE id = p_guest_id;

  IF v_guest.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'GUEST_NOT_FOUND');
  END IF;

  -- Verify caller has write access to guest's resort
  IF NOT public.staff_can_write_resort(
    v_caller_id,
    v_guest.resort_id,
    ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::public.resort_role[]
  ) THEN
    RETURN json_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  -- Generate cryptographically secure random token (URL-safe base64)
  v_raw_token := encode(gen_random_bytes(32), 'base64');
  v_raw_token := replace(v_raw_token, '/', '_');
  v_raw_token := replace(v_raw_token, '+', '-');
  v_raw_token := replace(v_raw_token, '=', '');

  -- Hash token before storage
  v_token_hash := encode(digest(v_raw_token, 'sha256'), 'hex');

  -- Set expiry based on type
  CASE p_token_type
    WHEN 'instant' THEN v_expires_at := now() + interval '15 minutes';
    WHEN 'confirm' THEN v_expires_at := now() + interval '1 hour';
    WHEN 'pairing' THEN v_expires_at := now() + interval '5 minutes';
  END CASE;

  -- Insert token record
  INSERT INTO public.guest_login_tokens (
    resort_id, guest_id, token_hash, type, expires_at, created_by_staff_id
  ) VALUES (
    v_guest.resort_id, p_guest_id, v_token_hash, v_token_type, v_expires_at, v_caller_id
  )
  RETURNING id INTO v_inserted_id;

  -- Return raw token (only time it's exposed)
  RETURN json_build_object(
    'success', true,
    'token', v_raw_token,
    'expires_at', v_expires_at,
    'guest_id', p_guest_id,
    'type', p_token_type
  );
END;
$$;

-- 7. Create consume_guest_login_token RPC
CREATE OR REPLACE FUNCTION public.consume_guest_login_token(
  p_raw_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_token_hash text;
  v_token_record record;
  v_guest record;
  v_resort record;
BEGIN
  -- Input validation
  IF p_raw_token IS NULL OR length(p_raw_token) < 10 THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_INVALID');
  END IF;

  -- Hash incoming token
  v_token_hash := encode(digest(p_raw_token, 'sha256'), 'hex');

  -- Find matching token record (check all conditions)
  SELECT * INTO v_token_record
  FROM public.guest_login_tokens
  WHERE token_hash = v_token_hash;

  -- Token not found
  IF v_token_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_INVALID');
  END IF;

  -- Token already consumed
  IF v_token_record.consumed_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_ALREADY_USED');
  END IF;

  -- Token expired
  IF v_token_record.expires_at <= now() THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_EXPIRED');
  END IF;

  -- Mark token as consumed
  UPDATE public.guest_login_tokens
  SET consumed_at = now()
  WHERE id = v_token_record.id;

  -- Fetch guest data
  SELECT id, full_name, room_number, check_in_date, check_out_date, resort_id
  INTO v_guest
  FROM public.guests
  WHERE id = v_token_record.guest_id;

  IF v_guest.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'GUEST_NOT_FOUND');
  END IF;

  -- Fetch resort data
  SELECT id, name, login_logo_url, timezone
  INTO v_resort
  FROM public.resorts
  WHERE id = v_token_record.resort_id;

  -- Return session data (same structure as PIN login)
  RETURN json_build_object(
    'success', true,
    'guest', json_build_object(
      'id', v_guest.id,
      'full_name', v_guest.full_name,
      'room_number', v_guest.room_number,
      'check_in_date', v_guest.check_in_date,
      'check_out_date', v_guest.check_out_date
    ),
    'resort', json_build_object(
      'id', v_resort.id,
      'name', v_resort.name,
      'logo_url', v_resort.login_logo_url,
      'timezone', v_resort.timezone
    ),
    'token_type', v_token_record.type
  );
END;
$$;