-- Update guest_get_available_slots to use resort timezone for cutoff calculations
CREATE OR REPLACE FUNCTION public.guest_get_available_slots(p_guest_id uuid, p_restaurant_id uuid DEFAULT NULL::uuid, p_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_guest guests%ROWTYPE;
  v_resort_timezone TEXT;
  v_result jsonb;
BEGIN
  SELECT * INTO v_guest FROM guests WHERE id = p_guest_id;
  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;
  
  -- Get resort timezone, default to UTC if not set
  SELECT COALESCE(timezone, 'UTC') INTO v_resort_timezone
  FROM resorts WHERE id = v_guest.resort_id;
  
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT 
      ts.id,
      ts.date,
      ts.start_time,
      ts.end_time,
      ts.meal_period,
      ts.capacity,
      r.id as restaurant_id,
      r.name as restaurant_name,
      r.description,
      r.max_pax_per_booking,
      r.requires_approval,
      r.guest_cutoff_minutes,
      ts.capacity - COALESCE((
        SELECT SUM(rr.num_adults + rr.num_children)
        FROM restaurant_reservations rr
        WHERE rr.restaurant_slot_id = ts.id AND rr.status IN ('CONFIRMED', 'COMPLETED')
      ), 0) as remaining_covers
    FROM restaurant_time_slots ts
    JOIN restaurants r ON ts.restaurant_id = r.id
    WHERE ts.resort_id = v_guest.resort_id
      AND ts.status = 'OPEN'
      AND r.guest_can_book = true
      AND r.is_active = true
      AND ts.date >= v_guest.check_in_date
      AND ts.date <= v_guest.check_out_date
      AND (p_date IS NULL OR ts.date = p_date)
      AND (p_restaurant_id IS NULL OR ts.restaurant_id = p_restaurant_id)
      -- Use resort timezone for cutoff calculation
      AND (now() AT TIME ZONE v_resort_timezone) < 
          ((ts.date || ' ' || ts.start_time)::timestamp - (r.guest_cutoff_minutes || ' minutes')::interval)
    ORDER BY ts.date, ts.start_time
  ) t
  WHERE t.remaining_covers > 0;
  
  RETURN v_result;
END;
$function$;

-- Also update guest_get_available_sessions to use resort timezone
CREATE OR REPLACE FUNCTION public.guest_get_available_sessions(p_guest_id uuid, p_date date DEFAULT NULL::date, p_category activity_category DEFAULT NULL::activity_category)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_guest guests%ROWTYPE;
  v_resort_timezone TEXT;
  v_result jsonb;
BEGIN
  SELECT * INTO v_guest FROM guests WHERE id = p_guest_id;
  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;
  
  -- Get resort timezone, default to UTC if not set
  SELECT COALESCE(timezone, 'UTC') INTO v_resort_timezone
  FROM resorts WHERE id = v_guest.resort_id;
  
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT 
      s.id,
      s.date,
      s.start_time,
      s.end_time,
      s.capacity,
      a.id as activity_id,
      a.name as activity_name,
      a.description,
      a.category,
      a.duration_minutes,
      a.default_price_per_person as price_per_person,
      a.max_pax_per_booking,
      a.requires_approval,
      a.guest_cutoff_hours,
      s.capacity - COALESCE((
        SELECT SUM(ab.num_adults + ab.num_children)
        FROM activity_bookings ab
        WHERE ab.session_id = s.id AND ab.status IN ('CONFIRMED', 'COMPLETED')
      ), 0) as remaining_spots
    FROM activity_sessions s
    JOIN activities a ON s.activity_id = a.id
    WHERE s.resort_id = v_guest.resort_id
      AND s.status = 'SCHEDULED'
      AND a.guest_can_book = true
      AND a.is_active = true
      AND s.date >= v_guest.check_in_date
      AND s.date <= v_guest.check_out_date
      AND (p_date IS NULL OR s.date = p_date)
      AND (p_category IS NULL OR a.category = p_category)
      -- Use resort timezone for cutoff calculation
      AND (now() AT TIME ZONE v_resort_timezone) < 
          ((s.date || ' ' || s.start_time)::timestamp - (a.guest_cutoff_hours || ' hours')::interval)
    ORDER BY s.date, s.start_time
  ) t
  WHERE t.remaining_spots > 0;
  
  RETURN v_result;
END;
$function$;