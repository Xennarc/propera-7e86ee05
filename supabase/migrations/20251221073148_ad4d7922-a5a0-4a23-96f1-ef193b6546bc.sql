-- Fix create_staff_account RPC to add auth.identities and return email
CREATE OR REPLACE FUNCTION public.create_staff_account(
  p_username text,
  p_password text,
  p_full_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_resort_id uuid DEFAULT NULL,
  p_resort_role resort_role DEFAULT NULL,
  p_department text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_user_id UUID;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_email TEXT;
BEGIN
  -- Validate password
  IF p_password IS NULL OR LENGTH(p_password) < 6 THEN
    RETURN json_build_object('success', false, 'error', 'Password must be at least 6 characters');
  END IF;
  
  -- Validate username
  IF p_username IS NULL OR LENGTH(TRIM(p_username)) < 3 THEN
    RETURN json_build_object('success', false, 'error', 'Username must be at least 3 characters');
  END IF;
  
  -- Check username format
  IF NOT (TRIM(p_username) ~ '^[a-zA-Z0-9_]+$') THEN
    RETURN json_build_object('success', false, 'error', 'Username can only contain letters, numbers, and underscores');
  END IF;
  
  -- Set email (use username@propera.local if not provided)
  v_email := LOWER(TRIM(COALESCE(p_email, p_username || '@propera.local')));
  
  -- Check if username already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE LOWER(username) = LOWER(TRIM(p_username))) THEN
    RETURN json_build_object('success', false, 'error', 'Username is already taken');
  END IF;
  
  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = v_email) THEN
    RETURN json_build_object('success', false, 'error', 'Email is already registered');
  END IF;
  
  -- Generate new user ID
  v_user_id := gen_random_uuid();
  
  -- Create user in auth.users
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
    recovery_token
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    v_email,
    crypt(p_password, gen_salt('bf')),
    v_now,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('full_name', COALESCE(p_full_name, TRIM(p_username))),
    'authenticated',
    'authenticated',
    v_now,
    v_now,
    '',
    ''
  );
  
  -- Create identity record in auth.identities (CRITICAL for signInWithPassword)
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    v_email,
    'email',
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    v_now,
    v_now,
    v_now
  );
  
  -- Update profile with username and full name
  UPDATE profiles
  SET 
    username = TRIM(p_username),
    full_name = COALESCE(p_full_name, TRIM(p_username)),
    updated_at = v_now
  WHERE id = v_user_id;
  
  -- If profile wasn't created by trigger, create it manually
  IF NOT FOUND THEN
    INSERT INTO profiles (id, username, full_name, global_role, created_at, updated_at)
    VALUES (v_user_id, TRIM(p_username), COALESCE(p_full_name, TRIM(p_username)), 'STAFF', v_now, v_now);
  END IF;
  
  -- Create resort membership if resort info provided
  IF p_resort_id IS NOT NULL AND p_resort_role IS NOT NULL THEN
    INSERT INTO resort_memberships (user_id, resort_id, resort_role, department, created_at, updated_at)
    VALUES (v_user_id, p_resort_id, p_resort_role, p_department, v_now, v_now);
  END IF;
  
  -- Log the action
  INSERT INTO staff_audit_logs (actor_id, action, resort_id, target_user_id, metadata_json)
  VALUES (
    COALESCE(auth.uid(), v_user_id),
    'STAFF_ACCOUNT_CREATED',
    p_resort_id,
    v_user_id,
    jsonb_build_object('username', TRIM(p_username), 'email', v_email, 'resort_role', p_resort_role)
  );
  
  RETURN json_build_object('success', true, 'user_id', v_user_id, 'email', v_email);
END;
$function$;

-- Fix existing users without identity records
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  u.id,
  u.email,
  'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
  NOW(),
  u.created_at,
  NOW()
FROM auth.users u
LEFT JOIN auth.identities i ON i.user_id = u.id
WHERE i.id IS NULL AND u.email IS NOT NULL;