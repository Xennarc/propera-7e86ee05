-- Fix existing users with NULL email_change
UPDATE auth.users
SET email_change = ''
WHERE email_change IS NULL;

-- Also fix email_change_token_new if NULL
UPDATE auth.users
SET email_change_token_new = ''
WHERE email_change_token_new IS NULL;

-- Update the create_staff_account function to include all required columns
CREATE OR REPLACE FUNCTION public.create_staff_account(
  p_username TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_email TEXT,
  p_global_role global_role DEFAULT 'STANDARD',
  p_resort_id UUID DEFAULT NULL,
  p_resort_role resort_role DEFAULT NULL,
  p_department TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Validate inputs
  IF p_username IS NULL OR LENGTH(TRIM(p_username)) < 3 THEN
    RETURN json_build_object('success', false, 'error', 'Username must be at least 3 characters');
  END IF;
  
  IF p_password IS NULL OR LENGTH(p_password) < 6 THEN
    RETURN json_build_object('success', false, 'error', 'Password must be at least 6 characters');
  END IF;
  
  IF p_email IS NULL OR p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN json_build_object('success', false, 'error', 'Valid email is required');
  END IF;
  
  -- Check username uniqueness
  IF EXISTS (SELECT 1 FROM profiles WHERE LOWER(username) = LOWER(TRIM(p_username))) THEN
    RETURN json_build_object('success', false, 'error', 'Username already taken');
  END IF;
  
  -- Check email uniqueness
  IF EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = LOWER(TRIM(p_email))) THEN
    RETURN json_build_object('success', false, 'error', 'Email already registered');
  END IF;
  
  -- Generate user ID
  v_user_id := gen_random_uuid();
  
  -- Create auth user with ALL required columns explicitly set
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    phone_change,
    phone_change_token,
    reauthentication_token,
    is_sso_user,
    is_anonymous
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    LOWER(TRIM(p_email)),
    crypt(p_password, gen_salt('bf')),
    v_now,
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('full_name', p_full_name, 'username', TRIM(p_username)),
    'authenticated',
    'authenticated',
    v_now,
    v_now,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    false,
    false
  );
  
  -- Update profile
  UPDATE profiles
  SET 
    username = TRIM(p_username),
    full_name = p_full_name,
    global_role = p_global_role,
    updated_at = v_now
  WHERE id = v_user_id;
  
  -- Create resort membership if provided
  IF p_resort_id IS NOT NULL AND p_resort_role IS NOT NULL THEN
    INSERT INTO resort_memberships (user_id, resort_id, resort_role, department)
    VALUES (v_user_id, p_resort_id, p_resort_role, p_department);
  END IF;
  
  -- Log the action
  INSERT INTO staff_audit_logs (actor_id, action, resort_id, target_user_id, metadata_json)
  VALUES (
    auth.uid(),
    'STAFF_ACCOUNT_CREATED',
    p_resort_id,
    v_user_id,
    jsonb_build_object('username', TRIM(p_username), 'email', LOWER(TRIM(p_email)), 'role', p_global_role)
  );
  
  RETURN json_build_object('success', true, 'user_id', v_user_id);
END;
$$;