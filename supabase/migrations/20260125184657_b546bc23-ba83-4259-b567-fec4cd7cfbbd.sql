-- Improve guest_portal_login: add rate limiting, pre-arrival support, case-insensitive room matching
CREATE OR REPLACE FUNCTION public.guest_portal_login(
  p_resort_id uuid,
  p_room_number text,
  p_last_name text,
  p_pin_hash text
)
RETURNS TABLE(
  guest_id uuid,
  full_name text,
  room_number text,
  check_in_date date,
  check_out_date date,
  resort_id uuid,
  resort_name text,
  resort_code text,
  resort_logo_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_identifier text;
  v_guest_id uuid;
BEGIN
  -- Rate limiting: 10 attempts per 15 minutes per room/resort combination
  v_identifier := LOWER(TRIM(p_room_number)) || '-' || p_resort_id::text;
  PERFORM check_rate_limit('guest_portal_login', v_identifier, 10, 15);

  -- Find matching guest and return their data
  RETURN QUERY
  SELECT 
    g.id as guest_id,
    g.full_name,
    g.room_number,
    g.check_in_date,
    g.check_out_date,
    r.id as resort_id,
    r.name as resort_name,
    r.code as resort_code,
    r.login_logo_url as resort_logo_url
  FROM guests g
  JOIN resorts r ON r.id = g.resort_id
  WHERE g.resort_id = p_resort_id
    -- Case-insensitive room number matching with trimming
    AND LOWER(TRIM(g.room_number)) = LOWER(TRIM(p_room_number))
    -- Case-insensitive last name substring match with trimming
    AND LOWER(g.full_name) LIKE '%' || LOWER(TRIM(p_last_name)) || '%'
    -- Portal must be enabled with valid PIN hash
    AND g.portal_enabled = true
    AND g.portal_pin_hash IS NOT NULL
    AND g.portal_pin_hash = p_pin_hash
    -- Allow pre-arrival guests (up to 14 days before check-in) through checkout date
    AND g.check_in_date <= CURRENT_DATE + INTERVAL '14 days'
    AND g.check_out_date >= CURRENT_DATE
  LIMIT 1;

  -- Get the guest_id if found for updating last_login_at
  SELECT g.id INTO v_guest_id
  FROM guests g
  WHERE g.resort_id = p_resort_id
    AND LOWER(TRIM(g.room_number)) = LOWER(TRIM(p_room_number))
    AND LOWER(g.full_name) LIKE '%' || LOWER(TRIM(p_last_name)) || '%'
    AND g.portal_enabled = true
    AND g.portal_pin_hash = p_pin_hash
    AND g.check_in_date <= CURRENT_DATE + INTERVAL '14 days'
    AND g.check_out_date >= CURRENT_DATE
  LIMIT 1;

  -- Update last_login_at timestamp if guest was found
  IF v_guest_id IS NOT NULL THEN
    UPDATE guests SET last_login_at = NOW() WHERE id = v_guest_id;
  END IF;
END;
$$;

-- Add index to optimize rate_limit_logs queries if not exists
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_lookup 
ON rate_limit_logs (endpoint, identifier, created_at);