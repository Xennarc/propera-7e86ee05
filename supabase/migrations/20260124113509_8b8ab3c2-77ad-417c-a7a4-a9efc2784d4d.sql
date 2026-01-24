-- Fix the guest_login_with_pin function to use correct column name
CREATE OR REPLACE FUNCTION public.guest_login_with_pin(
  p_resort_id uuid,
  p_room_number text,
  p_last_name text,
  p_pin text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest record;
  v_resort record;
  v_result jsonb;
BEGIN
  -- Find matching guest
  SELECT 
    g.id,
    g.full_name,
    g.room_number,
    g.check_in_date,
    g.check_out_date,
    g.portal_pin_hash,
    g.portal_enabled,
    r.id as resort_id,
    r.name as resort_name,
    r.code as resort_code,
    r.login_logo_url as resort_logo_url,
    r.timezone as resort_timezone
  INTO v_guest
  FROM guests g
  JOIN resorts r ON r.id = g.resort_id
  WHERE g.resort_id = p_resort_id
    AND g.room_number = p_room_number
    AND LOWER(g.full_name) LIKE '%' || LOWER(p_last_name) || '%'
    AND g.portal_enabled = true
    AND g.check_in_date <= CURRENT_DATE
    AND g.check_out_date >= CURRENT_DATE
  LIMIT 1;

  -- Check if guest found
  IF v_guest IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'GUEST_NOT_FOUND');
  END IF;

  -- Check if PIN is set
  IF v_guest.portal_pin_hash IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PIN_NOT_SET');
  END IF;

  -- Verify PIN
  IF v_guest.portal_pin_hash != crypt(p_pin, v_guest.portal_pin_hash) THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_PIN');
  END IF;

  -- Update last login
  UPDATE guests SET last_login_at = now() WHERE id = v_guest.id;

  -- Return success with guest info
  RETURN jsonb_build_object(
    'success', true,
    'guest', jsonb_build_object(
      'id', v_guest.id,
      'full_name', v_guest.full_name,
      'room_number', v_guest.room_number,
      'check_in_date', v_guest.check_in_date,
      'check_out_date', v_guest.check_out_date
    ),
    'resort', jsonb_build_object(
      'id', v_guest.resort_id,
      'name', v_guest.resort_name,
      'code', v_guest.resort_code,
      'logo_url', v_guest.resort_logo_url,
      'timezone', v_guest.resort_timezone
    )
  );
END;
$$;