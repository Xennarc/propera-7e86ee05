-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view invitation by token for acceptance" ON public.staff_invitations;

-- Create a security definer function to safely look up invitation by token
CREATE OR REPLACE FUNCTION public.get_staff_invitation_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  resort_id uuid,
  resort_role resort_role,
  department text,
  status text,
  expires_at timestamptz,
  resort_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    si.id,
    si.email,
    si.name,
    si.resort_id,
    si.resort_role,
    si.department,
    si.status,
    si.expires_at,
    r.name as resort_name
  FROM staff_invitations si
  JOIN resorts r ON r.id = si.resort_id
  WHERE si.token = p_token
  LIMIT 1;
END;
$$;