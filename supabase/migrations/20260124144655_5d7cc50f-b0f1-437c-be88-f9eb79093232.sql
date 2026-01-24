-- Enhance consume_guest_access_link to return full guest/resort data for session creation
CREATE OR REPLACE FUNCTION public.consume_guest_access_link(p_raw_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_hash TEXT;
  v_link guest_access_links%ROWTYPE;
  v_guest RECORD;
  v_resort RECORD;
BEGIN
  -- Hash the incoming token
  v_token_hash := encode(extensions.digest(p_raw_token::bytea, 'sha256'), 'hex');
  
  -- Find matching link
  SELECT * INTO v_link
  FROM guest_access_links
  WHERE token_hash = v_token_hash;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_NOT_FOUND');
  END IF;
  
  -- Check if already consumed
  IF v_link.consumed_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_ALREADY_USED');
  END IF;
  
  -- Check if expired
  IF v_link.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_EXPIRED');
  END IF;
  
  -- Fetch guest data
  SELECT id, full_name, room_number, check_in_date, check_out_date
  INTO v_guest
  FROM guests
  WHERE id = v_link.guest_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'GUEST_NOT_FOUND');
  END IF;
  
  -- Fetch resort data
  SELECT id, name, login_logo_url, timezone
  INTO v_resort
  FROM resorts
  WHERE id = v_link.resort_id;
  
  -- Mark as consumed
  UPDATE guest_access_links
  SET consumed_at = NOW()
  WHERE id = v_link.id;
  
  -- Return full session data matching existing login flow format
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
    'stay_id', v_link.stay_id
  );
END;
$$;