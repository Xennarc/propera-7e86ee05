-- Drop and recreate get_staff_invitation_by_token with new fields
DROP FUNCTION IF EXISTS public.get_staff_invitation_by_token(text);

CREATE FUNCTION public.get_staff_invitation_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  username text,
  resort_id uuid,
  resort_role text,
  department text,
  status text,
  expires_at timestamptz,
  resort_name text,
  invited_by_name text,
  invite_message text
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
    si.username,
    si.resort_id,
    si.resort_role::text,
    si.department,
    si.status,
    si.expires_at,
    r.name as resort_name,
    si.invited_by_name,
    si.invite_message
  FROM staff_invitations si
  JOIN resorts r ON r.id = si.resort_id
  WHERE si.token = p_token;
END;
$$;