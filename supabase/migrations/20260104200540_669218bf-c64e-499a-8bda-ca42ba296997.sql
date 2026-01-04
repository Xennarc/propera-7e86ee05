-- Drop existing function that conflicts
DROP FUNCTION IF EXISTS public.get_vendor_bookings(UUID);
DROP FUNCTION IF EXISTS public.get_vendor_bookings(UUID, TEXT);

-- Function to get vendor bookings for portal
CREATE OR REPLACE FUNCTION public.get_vendor_bookings(
  p_vendor_id UUID,
  p_status_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
  booking_id UUID,
  session_id UUID,
  resort_id UUID,
  resort_name TEXT,
  activity_name TEXT,
  session_date DATE,
  start_time TIME,
  end_time TIME,
  guest_name TEXT,
  room_number TEXT,
  num_adults INT,
  num_children INT,
  notes TEXT,
  vendor_status public.vendor_booking_status,
  total_amount DECIMAL,
  created_at TIMESTAMPTZ
) AS $$
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_vendor_bookings(UUID, TEXT) TO anon;