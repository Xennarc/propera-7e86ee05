-- Add peek_guest_login_token RPC for showing guest info before consumption
CREATE OR REPLACE FUNCTION public.peek_guest_login_token(p_raw_token text)
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
  -- Hash token
  v_token_hash := encode(digest(p_raw_token, 'sha256'), 'hex');
  
  -- Find token (don't consume)
  SELECT * INTO v_token_record
  FROM public.guest_login_tokens
  WHERE token_hash = v_token_hash;
  
  IF v_token_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_INVALID');
  END IF;
  
  IF v_token_record.consumed_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_ALREADY_USED');
  END IF;
  
  IF v_token_record.expires_at <= now() THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_EXPIRED');
  END IF;
  
  -- Fetch guest for preview (minimal info only)
  SELECT id, full_name, room_number INTO v_guest 
  FROM public.guests 
  WHERE id = v_token_record.guest_id;
  
  -- Fetch resort for branding
  SELECT id, name, login_logo_url, timezone INTO v_resort 
  FROM public.resorts 
  WHERE id = v_token_record.resort_id;
  
  RETURN json_build_object(
    'success', true,
    'guest', json_build_object(
      'id', v_guest.id, 
      'full_name', v_guest.full_name, 
      'room_number', v_guest.room_number
    ),
    'resort', json_build_object(
      'id', v_resort.id, 
      'name', v_resort.name, 
      'logo_url', v_resort.login_logo_url,
      'timezone', v_resort.timezone
    ),
    'token_type', v_token_record.type,
    'expires_at', v_token_record.expires_at
  );
END;
$$;

-- Grant execution to anon role for guest-facing access
GRANT EXECUTE ON FUNCTION public.peek_guest_login_token(text) TO anon;

COMMENT ON FUNCTION public.peek_guest_login_token IS 'Preview guest login token info without consuming it. Used for confirm flow to show personalized welcome.';