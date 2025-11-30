-- Drop and recreate the function with proper permissions
DROP FUNCTION IF EXISTS public.accept_staff_invitation(text, uuid);

CREATE OR REPLACE FUNCTION public.accept_staff_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_membership_id UUID;
BEGIN
  -- Get and validate the invitation
  SELECT * INTO v_invitation
  FROM staff_invitations
  WHERE token = p_token
    AND status = 'PENDING'
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'INVITATION_INVALID',
      'message', 'Invitation not found, expired, or already used'
    );
  END IF;
  
  -- Check if user already has membership to this resort
  IF EXISTS (
    SELECT 1 FROM resort_memberships
    WHERE user_id = p_user_id
      AND resort_id = v_invitation.resort_id
  ) THEN
    -- Update invitation status anyway
    UPDATE staff_invitations
    SET status = 'ACCEPTED', updated_at = NOW()
    WHERE id = v_invitation.id;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Already a member of this resort'
    );
  END IF;
  
  -- Create the resort membership (bypass RLS by using direct insert)
  INSERT INTO resort_memberships (user_id, resort_id, resort_role, department)
  VALUES (
    p_user_id,
    v_invitation.resort_id,
    v_invitation.resort_role,
    v_invitation.department
  )
  RETURNING id INTO v_membership_id;
  
  -- Update invitation status
  UPDATE staff_invitations
  SET status = 'ACCEPTED', updated_at = NOW()
  WHERE id = v_invitation.id;
  
  RETURN json_build_object(
    'success', true,
    'membership_id', v_membership_id,
    'resort_id', v_invitation.resort_id,
    'resort_role', v_invitation.resort_role
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_staff_invitation(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_staff_invitation(text, uuid) TO anon;