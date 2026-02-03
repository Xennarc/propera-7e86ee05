-- Create SECURITY DEFINER function to get eligible drivers
-- This bypasses RLS to avoid circular evaluation issues with nested joins
CREATE OR REPLACE FUNCTION public.get_eligible_drivers_for_resort(
  _resort_id uuid
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  resort_role resort_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller has transport write access
  IF NOT public.staff_can_write_transport(auth.uid(), _resort_id) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions';
  END IF;

  -- Return eligible staff (not already drivers)
  RETURN QUERY
  SELECT 
    rm.user_id,
    COALESCE(p.full_name, 'Unknown')::text as full_name,
    rm.resort_role
  FROM public.resort_memberships rm
  LEFT JOIN public.profiles p ON p.id = rm.user_id
  WHERE rm.resort_id = _resort_id
    AND rm.user_id NOT IN (
      SELECT bd.user_id 
      FROM public.buggy_drivers bd 
      WHERE bd.resort_id = _resort_id
    )
  ORDER BY rm.resort_role, p.full_name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_eligible_drivers_for_resort(uuid) TO authenticated;