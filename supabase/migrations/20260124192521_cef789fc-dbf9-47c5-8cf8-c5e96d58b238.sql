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
BEGIN
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
    AND g.room_number = p_room_number
    AND LOWER(g.full_name) LIKE '%' || LOWER(p_last_name) || '%'
    AND g.portal_enabled = true
    AND g.portal_pin_hash IS NOT NULL
    AND g.portal_pin_hash = p_pin_hash
    AND g.check_out_date >= CURRENT_DATE
  LIMIT 1;

  IF FOUND THEN
    UPDATE guests SET last_login_at = NOW() 
    WHERE id = (
      SELECT g.id FROM guests g
      WHERE g.resort_id = p_resort_id
        AND g.room_number = p_room_number
        AND LOWER(g.full_name) LIKE '%' || LOWER(p_last_name) || '%'
        AND g.portal_enabled = true
        AND g.portal_pin_hash = p_pin_hash
      LIMIT 1
    );
  END IF;
END;
$$;