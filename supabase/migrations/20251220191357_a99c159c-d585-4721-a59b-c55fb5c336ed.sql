-- Fix existing users with NULL token columns that cause login errors
-- Only update token columns, not phone (phone has unique constraint)
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE confirmation_token IS NULL 
   OR recovery_token IS NULL;

-- Update create_staff_account function to include all required auth.users columns
CREATE OR REPLACE FUNCTION public.create_staff_account(p_username text, p_password text, p_full_name text, p_email text DEFAULT NULL::text, p_resort_id uuid DEFAULT NULL::uuid, p_resort_role resort_role DEFAULT NULL::resort_role, p_department text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_membership_id UUID;
BEGIN
  -- Validate username
  IF p_username IS NULL OR LENGTH(TRIM(p_username)) < 3 THEN
    RETURN json_build_object('success', false, 'error', 'Username must be at least 3 characters');
  END IF;
  
  -- Check username format (letters, numbers, underscores only)
  IF NOT (TRIM(p_username) ~ '^[a-zA-Z0-9_]+$') THEN
    RETURN json_build_object('success', false, 'error', 'Username can only contain letters, numbers, and underscores');
  END IF;
  
  -- Check username uniqueness
  IF EXISTS (SELECT 1 FROM profiles WHERE LOWER(username) = LOWER(TRIM(p_username))) THEN
    RETURN json_build_object('success', false, 'error', 'Username is already taken');
  END IF;
  
  -- Validate password
  IF p_password IS NULL OR LENGTH(p_password) < 6 THEN
    RETURN json_build_object('success', false, 'error', 'Password must be at least 6 characters');
  END IF;
  
  -- Generate email if not provided (using placeholder domain)
  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    v_email := LOWER(TRIM(p_username)) || '@staff.propera.internal';
  ELSE
    v_email := LOWER(TRIM(p_email));
    -- Check email uniqueness
    IF EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = v_email) THEN
      RETURN json_build_object('success', false, 'error', 'Email is already registered');
    END IF;
  END IF;
  
  -- Create auth user
  v_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    phone_change,
    phone_change_token,
    email_change_token_current,
    reauthentication_token,
    is_sso_user,
    is_anonymous
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    v_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    jsonb_build_object('full_name', COALESCE(p_full_name, '')),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    '',
    '',
    false,
    false
  );
  
  -- Create profile with username
  INSERT INTO profiles (id, full_name, username, global_role)
  VALUES (v_user_id, COALESCE(p_full_name, ''), TRIM(p_username), 'STANDARD')
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name;
  
  -- Create resort membership if resort info provided
  IF p_resort_id IS NOT NULL AND p_resort_role IS NOT NULL THEN
    INSERT INTO resort_memberships (user_id, resort_id, resort_role, department)
    VALUES (v_user_id, p_resort_id, p_resort_role, p_department)
    RETURNING id INTO v_membership_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', v_email,
    'username', TRIM(p_username),
    'membership_id', v_membership_id
  );
END;
$function$;