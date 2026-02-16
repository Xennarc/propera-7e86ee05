-- Fix get_vendor_bookings (2-param overload) - add search_path
CREATE OR REPLACE FUNCTION public.get_vendor_bookings(p_vendor_id uuid, p_status_filter text DEFAULT NULL::text)
 RETURNS TABLE(booking_id uuid, session_id uuid, resort_id uuid, resort_name text, activity_name text, session_date date, start_time time without time zone, end_time time without time zone, guest_name text, room_number text, num_adults integer, num_children integer, notes text, vendor_status vendor_booking_status, total_amount numeric, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ab.id AS booking_id,
    ab.session_id,
    ab.resort_id,
    r.name AS resort_name,
    a.name AS activity_name,
    s.date AS session_date,
    s.start_time::TIME,
    s.end_time::TIME,
    g.full_name AS guest_name,
    ab.room_number,
    ab.num_adults,
    ab.num_children,
    ab.notes,
    ab.vendor_status,
    ab.total_amount,
    ab.created_at
  FROM public.activity_bookings ab
  JOIN public.activity_sessions s ON s.id = ab.session_id
  JOIN public.activities a ON a.id = s.activity_id
  JOIN public.guests g ON g.id = ab.guest_id
  JOIN public.resorts r ON r.id = ab.resort_id
  JOIN public.vendor_resorts vr ON vr.vendor_id = ab.vendor_id AND vr.resort_id = ab.resort_id
  WHERE ab.vendor_id = p_vendor_id
    AND ab.provider_type = 'VENDOR'
    AND ab.status != 'CANCELLED'
    AND vr.status = 'approved'
    AND (p_status_filter IS NULL OR ab.vendor_status::TEXT = p_status_filter)
  ORDER BY s.date ASC, s.start_time ASC;
END;
$function$;

-- Fix guest_get_request_catalog - add search_path
CREATE OR REPLACE FUNCTION public.guest_get_request_catalog(p_resort_id uuid)
 RETURNS TABLE(id uuid, code text, title text, category text, department_key text, icon_key text, is_billable boolean, default_priority text, display_label text, description text, color_class text, display_order integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    rc.id,
    rc.code,
    rc.title,
    rc.category,
    rc.department_key,
    rc.icon_key,
    rc.is_billable,
    rc.default_priority,
    COALESCE(rc.display_label, rc.category) as display_label,
    rc.description,
    COALESCE(rc.color_class, 'border-gray-400 text-gray-400') as color_class,
    COALESCE(rc.display_order, 100) as display_order
  FROM request_catalog rc
  WHERE (rc.resort_id IS NULL OR rc.resort_id = p_resort_id)
    AND rc.is_active = true
  ORDER BY rc.display_order, rc.title;
$function$;

-- Fix guest_get_request_settings - add search_path
CREATE OR REPLACE FUNCTION public.guest_get_request_settings(p_resort_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'asap_response_min', COALESCE(asap_response_min_minutes, 10),
    'asap_response_max', COALESCE(asap_response_max_minutes, 15),
    'scheduled_response_min', COALESCE(scheduled_response_min_minutes, 30),
    'scheduled_response_max', COALESCE(scheduled_response_max_minutes, 60),
    'requests_start_hour', COALESCE(requests_start_hour, 6),
    'requests_end_hour', COALESCE(requests_end_hour, 23),
    'max_bundle_items', COALESCE(max_bundle_items, 10),
    'max_total_quantity', COALESCE(max_total_quantity, 20),
    'quick_suggestions', COALESCE(quick_suggestions, '["Extra towels", "Room cleaning", "Extra pillows", "Wake-up call", "Iron & board", "Extra toiletries"]'::jsonb),
    'header_tagline', COALESCE(header_tagline, 'Tap what you need — we''ll notify the team.'),
    'empty_state_title', COALESCE(empty_state_title, 'Your personal concierge'),
    'empty_state_description', COALESCE(empty_state_description, 'We''re setting up your request options. In the meantime, our team is here to help with anything you need.'),
    'footer_response_text', COALESCE(footer_response_text, 'Our team typically responds within {min}-{max} minutes during operating hours')
  ) INTO result
  FROM resort_request_settings
  WHERE resort_id = p_resort_id;
  
  IF result IS NULL THEN
    result := json_build_object(
      'asap_response_min', 10,
      'asap_response_max', 15,
      'scheduled_response_min', 30,
      'scheduled_response_max', 60,
      'requests_start_hour', 6,
      'requests_end_hour', 23,
      'max_bundle_items', 10,
      'max_total_quantity', 20,
      'quick_suggestions', '["Extra towels", "Room cleaning", "Extra pillows", "Wake-up call", "Iron & board", "Extra toiletries"]'::jsonb,
      'header_tagline', 'Tap what you need — we''ll notify the team.',
      'empty_state_title', 'Your personal concierge',
      'empty_state_description', 'We''re setting up your request options. In the meantime, our team is here to help with anything you need.',
      'footer_response_text', 'Our team typically responds within {min}-{max} minutes during operating hours'
    );
  END IF;
  
  RETURN result;
END;
$function$;