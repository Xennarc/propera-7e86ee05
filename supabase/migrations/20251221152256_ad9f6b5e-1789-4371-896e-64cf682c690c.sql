-- Fix generate_prearrival_token function with correct schema reference and column name
CREATE OR REPLACE FUNCTION public.generate_prearrival_token(p_guest_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_guest guests%ROWTYPE;
  v_token TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_existing_token prearrival_tokens%ROWTYPE;
BEGIN
  -- Get guest
  SELECT * INTO v_guest FROM guests WHERE id = p_guest_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Guest not found');
  END IF;
  
  -- Check for existing valid token
  SELECT * INTO v_existing_token 
  FROM prearrival_tokens 
  WHERE guest_id = p_guest_id 
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_existing_token.id IS NOT NULL THEN
    -- Return existing token
    RETURN json_build_object(
      'success', true,
      'token', v_existing_token.token,
      'expires_at', v_existing_token.expires_at
    );
  END IF;
  
  -- Generate new token (secure random) - use extensions schema for gen_random_bytes
  v_token := encode(extensions.gen_random_bytes(32), 'base64');
  v_token := replace(v_token, '/', '_');
  v_token := replace(v_token, '+', '-');
  v_token := replace(v_token, '=', '');
  
  -- Set expiry to 3 days after checkout - use correct column name check_out_date
  v_expires_at := (v_guest.check_out_date + INTERVAL '3 days')::TIMESTAMP WITH TIME ZONE;
  
  -- Insert new token
  INSERT INTO prearrival_tokens (resort_id, guest_id, token, expires_at)
  VALUES (v_guest.resort_id, p_guest_id, v_token, v_expires_at);
  
  RETURN json_build_object(
    'success', true,
    'token', v_token,
    'expires_at', v_expires_at
  );
END;
$function$;