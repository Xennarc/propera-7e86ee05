-- Create function to check username availability within a resort
CREATE OR REPLACE FUNCTION public.check_username_available(p_resort_id uuid, p_username text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean := false;
  v_suggestions text[] := '{}';
  v_base_username text;
  v_test_username text;
  v_counter integer := 1;
BEGIN
  -- Normalize username to lowercase
  p_username := lower(trim(p_username));
  
  -- Check if username exists in profiles for this resort (via resort_memberships)
  SELECT EXISTS (
    SELECT 1 
    FROM profiles p
    JOIN resort_memberships rm ON rm.user_id = p.id
    WHERE rm.resort_id = p_resort_id 
    AND lower(p.username) = p_username
  ) INTO v_exists;
  
  -- Also check pending invitations if not found in profiles
  IF NOT v_exists THEN
    SELECT EXISTS (
      SELECT 1 
      FROM staff_invitations si
      WHERE si.resort_id = p_resort_id 
      AND lower(si.username) = p_username
      AND si.status = 'PENDING'
    ) INTO v_exists;
  END IF;
  
  -- If username is taken, generate suggestions
  IF v_exists THEN
    v_base_username := p_username;
    WHILE array_length(v_suggestions, 1) IS NULL OR array_length(v_suggestions, 1) < 3 LOOP
      v_test_username := v_base_username || v_counter::text;
      
      -- Check if suggestion is available
      IF NOT EXISTS (
        SELECT 1 
        FROM profiles p
        JOIN resort_memberships rm ON rm.user_id = p.id
        WHERE rm.resort_id = p_resort_id 
        AND lower(p.username) = v_test_username
      ) AND NOT EXISTS (
        SELECT 1 
        FROM staff_invitations si
        WHERE si.resort_id = p_resort_id 
        AND lower(si.username) = v_test_username
        AND si.status = 'PENDING'
      ) THEN
        v_suggestions := array_append(v_suggestions, v_test_username);
      END IF;
      
      v_counter := v_counter + 1;
      
      -- Safety limit
      IF v_counter > 100 THEN
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  RETURN jsonb_build_object(
    'available', NOT v_exists,
    'suggestions', v_suggestions
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_username_available(uuid, text) TO authenticated;