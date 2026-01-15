-- Update RPC to include image_url from activities
CREATE OR REPLACE FUNCTION public.guest_get_available_sessions(
  p_guest_id uuid,
  p_date date,
  p_category text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  activity_id uuid,
  activity_name text,
  description text,
  category text,
  start_time time,
  end_time time,
  duration_minutes integer,
  capacity integer,
  remaining_spots bigint,
  requires_approval boolean,
  difficulty_level text,
  image_url text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resort_id uuid;
BEGIN
  -- Get resort from guest
  SELECT g.resort_id INTO v_resort_id
  FROM guests g
  WHERE g.id = p_guest_id;

  IF v_resort_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    s.id,
    s.activity_id,
    a.name::text AS activity_name,
    a.description::text,
    a.category::text,
    s.start_time,
    s.end_time,
    a.duration_minutes,
    s.capacity,
    (s.capacity - COALESCE(
      (SELECT SUM(ab.num_adults + ab.num_children) 
       FROM activity_bookings ab 
       WHERE ab.session_id = s.id 
       AND ab.status IN ('CONFIRMED', 'PENDING')),
      0
    ))::bigint AS remaining_spots,
    a.requires_approval,
    a.difficulty_level::text,
    a.image_url::text
  FROM activity_sessions s
  JOIN activities a ON a.id = s.activity_id
  WHERE s.resort_id = v_resort_id
    AND s.date = p_date
    AND s.status = 'SCHEDULED'
    AND a.is_active = true
    AND a.guest_can_book = true
    AND (p_category IS NULL OR a.category::text = p_category)
    AND (s.capacity - COALESCE(
      (SELECT SUM(ab.num_adults + ab.num_children) 
       FROM activity_bookings ab 
       WHERE ab.session_id = s.id 
       AND ab.status IN ('CONFIRMED', 'PENDING')),
      0
    )) > 0
  ORDER BY s.start_time;
END;
$$;