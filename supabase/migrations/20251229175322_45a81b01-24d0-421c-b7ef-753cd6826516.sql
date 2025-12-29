-- Drop the public SELECT policy that exposes tokens
DROP POLICY IF EXISTS "Anyone can view valid pre-arrival tokens" ON public.prearrival_tokens;

-- Create a secure SECURITY DEFINER function for token validation
-- This allows the pre-arrival page to validate tokens without exposing all tokens
CREATE OR REPLACE FUNCTION public.validate_prearrival_token(p_token TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record prearrival_tokens%ROWTYPE;
  v_guest guests%ROWTYPE;
BEGIN
  -- Find the token
  SELECT * INTO v_token_record
  FROM prearrival_tokens
  WHERE token = p_token;
  
  -- Token not found
  IF v_token_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'TOKEN_NOT_FOUND');
  END IF;
  
  -- Check if revoked
  IF v_token_record.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'TOKEN_REVOKED');
  END IF;
  
  -- Check if expired
  IF v_token_record.expires_at < NOW() THEN
    UPDATE prearrival_tokens SET status = 'expired' WHERE id = v_token_record.id;
    RETURN jsonb_build_object('success', false, 'error', 'TOKEN_EXPIRED');
  END IF;
  
  -- Get the guest
  SELECT * INTO v_guest
  FROM guests
  WHERE id = v_token_record.guest_id;
  
  IF v_guest.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'GUEST_NOT_FOUND');
  END IF;
  
  -- Update last opened
  UPDATE prearrival_tokens SET last_opened_at = NOW() WHERE id = v_token_record.id;
  
  -- Return token data (safe subset)
  RETURN jsonb_build_object(
    'success', true,
    'token', jsonb_build_object(
      'id', v_token_record.id,
      'token', v_token_record.token,
      'status', v_token_record.status,
      'expires_at', v_token_record.expires_at,
      'completed_at', v_token_record.completed_at,
      'revoked_at', v_token_record.revoked_at,
      'guest_id', v_token_record.guest_id,
      'resort_id', v_token_record.resort_id,
      'verification_completed_at', v_token_record.verification_completed_at
    ),
    'guest', jsonb_build_object(
      'id', v_guest.id,
      'full_name', v_guest.full_name,
      'email', v_guest.email,
      'room_number', v_guest.room_number,
      'check_in_date', v_guest.check_in_date,
      'check_out_date', v_guest.check_out_date,
      'resort_id', v_guest.resort_id
    )
  );
END;
$$;

-- Staff can still view tokens directly for their resort
CREATE POLICY "Staff can view tokens for their resort" 
ON public.prearrival_tokens 
FOR SELECT
USING (has_resort_membership(auth.uid(), resort_id) OR is_super_admin(auth.uid()));