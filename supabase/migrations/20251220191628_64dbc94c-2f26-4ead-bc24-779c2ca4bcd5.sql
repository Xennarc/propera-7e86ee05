-- Add accepted_at and accepted_by_user_id columns to staff_invitations
ALTER TABLE public.staff_invitations 
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS accepted_by_user_id UUID REFERENCES auth.users(id);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_staff_invitations_status_resort 
ON public.staff_invitations(resort_id, status);

-- Update accept_staff_invitation function to record acceptance details
CREATE OR REPLACE FUNCTION public.accept_staff_invitation(p_token text, p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Check if already accepted
    SELECT * INTO v_invitation
    FROM staff_invitations
    WHERE token = p_token
      AND status = 'ACCEPTED';
    
    IF FOUND THEN
      RETURN json_build_object(
        'success', false,
        'error', 'INVITATION_ALREADY_ACCEPTED',
        'message', 'This invitation has already been accepted'
      );
    END IF;
    
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
    SET status = 'ACCEPTED', 
        accepted_at = NOW(),
        accepted_by_user_id = p_user_id,
        updated_at = NOW()
    WHERE id = v_invitation.id;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Already a member of this resort'
    );
  END IF;
  
  -- Create the resort membership
  INSERT INTO resort_memberships (user_id, resort_id, resort_role, department)
  VALUES (
    p_user_id,
    v_invitation.resort_id,
    v_invitation.resort_role,
    v_invitation.department
  )
  RETURNING id INTO v_membership_id;
  
  -- Update invitation status with acceptance details
  UPDATE staff_invitations
  SET status = 'ACCEPTED', 
      accepted_at = NOW(),
      accepted_by_user_id = p_user_id,
      updated_at = NOW()
  WHERE id = v_invitation.id;
  
  RETURN json_build_object(
    'success', true,
    'membership_id', v_membership_id,
    'resort_id', v_invitation.resort_id,
    'resort_role', v_invitation.resort_role
  );
END;
$function$;

-- Enable realtime for staff_invitations table for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_invitations;