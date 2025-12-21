-- Fix ambiguous create_staff_account() overloads by consolidating to the 8-arg signature and dropping the legacy 7-arg version.

-- 1) Replace the 8-arg version to (a) insert auth.identities and (b) return email.
CREATE OR REPLACE FUNCTION public.create_staff_account(
  p_username text,
  p_password text,
  p_full_name text,
  p_email text,
  p_global_role public.global_role DEFAULT 'STANDARD'::public.global_role,
  p_resort_id uuid DEFAULT NULL::uuid,
  p_resort_role public.resort_role DEFAULT NULL::public.resort_role,
  p_department text DEFAULT NULL::text
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

  v_email := LOWER(TRIM(p_email));

  -- Check username uniqueness
  IF EXISTS (SELECT 1 FROM profiles WHERE LOWER(username) = LOWER(TRIM(p_username))) THEN
    RETURN json_build_object('success', false, 'error', 'Username already taken');
  END IF;

  -- Check email uniqueness
  IF EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = v_email) THEN
    RETURN json_build_object('success', false, 'error', 'Email already registered');
  END IF;

  -- Generate user ID
  v_user_id := gen_random_uuid();

  -- Create auth user with required columns explicitly set
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
    v_email,
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

  -- Create identity record in auth.identities (CRITICAL for password sign-in)
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

  -- Create/update profile
  UPDATE profiles
  SET
    username = TRIM(p_username),
    full_name = p_full_name,
    global_role = p_global_role,
    updated_at = v_now
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    INSERT INTO profiles (id, username, full_name, global_role, created_at, updated_at)
    VALUES (v_user_id, TRIM(p_username), p_full_name, p_global_role, v_now, v_now);
  END IF;

  -- Create resort membership if provided
  IF p_resort_id IS NOT NULL AND p_resort_role IS NOT NULL THEN
    INSERT INTO resort_memberships (user_id, resort_id, resort_role, department, created_at, updated_at)
    VALUES (v_user_id, p_resort_id, p_resort_role, p_department, v_now, v_now);
  END IF;

  -- Log the action (if no auth context, attribute to the created user)
  INSERT INTO staff_audit_logs (actor_id, action, resort_id, target_user_id, metadata_json)
  VALUES (
    COALESCE(auth.uid(), v_user_id),
    'STAFF_ACCOUNT_CREATED',
    p_resort_id,
    v_user_id,
    jsonb_build_object('username', TRIM(p_username), 'email', v_email, 'role', p_global_role)
  );

  RETURN json_build_object('success', true, 'user_id', v_user_id, 'email', v_email);
END;
$function$;

-- 2) Drop the legacy 7-arg overload that caused "could not choose the best candidate".
DROP FUNCTION IF EXISTS public.create_staff_account(text, text, text, text, uuid, public.resort_role, text);