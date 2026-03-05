-- Extend staff_has_resort_access to also check department_memberships
-- This allows department-only users to read data for their resort
CREATE OR REPLACE FUNCTION public.staff_has_resort_access(_user_id uuid, _resort_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_super_admin(_user_id) 
    OR public.has_resort_membership(_user_id, _resort_id)
    OR EXISTS (
      SELECT 1 FROM public.department_memberships
      WHERE user_id = _user_id
        AND resort_id = _resort_id
        AND is_active = true
    )
$$;