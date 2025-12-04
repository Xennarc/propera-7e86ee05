-- Fix generate_guest_pin function to include extensions schema for pgcrypto
CREATE OR REPLACE FUNCTION public.generate_guest_pin(p_guest_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_pin text;
  v_pin_hash text;
  v_last4 text;
BEGIN
  -- Check guest exists
  IF NOT EXISTS (SELECT 1 FROM guests WHERE id = p_guest_id) THEN
    RETURN json_build_object('success', false, 'error', 'Guest not found');
  END IF;
  
  -- Generate random 4-digit PIN
  v_pin := LPAD(floor(random() * 10000)::text, 4, '0');
  
  -- Hash the PIN using SHA-256
  v_pin_hash := encode(digest(v_pin, 'sha256'), 'hex');
  
  -- Get last 4 digits (for 4-digit PIN, this is the whole PIN masked)
  v_last4 := RIGHT(v_pin, 4);
  
  -- Update guest record
  UPDATE guests
  SET 
    portal_pin_hash = v_pin_hash,
    portal_pin_last4 = v_last4,
    portal_pin_set_at = now(),
    portal_enabled = true,
    updated_at = now()
  WHERE id = p_guest_id;
  
  -- Return the PIN (shown once to staff)
  RETURN json_build_object(
    'success', true,
    'pin', v_pin,
    'last4', v_last4
  );
END;
$function$;