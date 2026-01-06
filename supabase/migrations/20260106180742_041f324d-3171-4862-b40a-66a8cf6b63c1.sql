-- Fix guest_portal_login to use SHA-256 hash comparison instead of bcrypt
-- The client sends a pre-hashed PIN (SHA-256), so we compare directly

CREATE OR REPLACE FUNCTION public.guest_portal_login(
  p_resort_code TEXT,
  p_room_number TEXT,
  p_last_name TEXT,
  p_pin_hash TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest RECORD;
  v_resort RECORD;
BEGIN
  -- Find the resort by code
  SELECT id, name INTO v_resort
  FROM resorts
  WHERE code = UPPER(p_resort_code)
    AND is_active = true;

  IF v_resort.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Resort not found');
  END IF;

  -- Find matching guest with portal enabled and PIN verification using SHA-256 hash comparison
  SELECT g.id, g.full_name, g.room_number, g.check_in_date, g.check_out_date, g.email, g.is_vip, g.loyalty_tier
  INTO v_guest
  FROM guests g
  WHERE g.resort_id = v_resort.id
    AND g.room_number = p_room_number
    AND LOWER(g.full_name) LIKE '%' || LOWER(p_last_name) || '%'
    AND g.portal_enabled = true
    AND g.portal_pin_hash IS NOT NULL
    AND g.portal_pin_hash = p_pin_hash  -- Direct SHA-256 hash comparison
    AND g.check_out_date >= CURRENT_DATE
  LIMIT 1;

  IF v_guest.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid credentials');
  END IF;

  -- Update last login timestamp
  UPDATE guests SET last_login_at = NOW() WHERE id = v_guest.id;

  -- Return guest session data
  RETURN json_build_object(
    'success', true,
    'guest', json_build_object(
      'id', v_guest.id,
      'full_name', v_guest.full_name,
      'room_number', v_guest.room_number,
      'check_in_date', v_guest.check_in_date,
      'check_out_date', v_guest.check_out_date,
      'email', v_guest.email,
      'is_vip', v_guest.is_vip,
      'loyalty_tier', v_guest.loyalty_tier
    ),
    'resort', json_build_object(
      'id', v_resort.id,
      'name', v_resort.name
    )
  );
END;
$$;