-- Add username column to profiles for username-based login
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Function to lookup user by username or email and verify credentials
-- This uses auth.users internal table, so it needs SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.staff_lookup_by_identifier(p_identifier TEXT)
RETURNS TABLE(user_id UUID, email TEXT, username TEXT, full_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First try to find by username
  RETURN QUERY
  SELECT 
    p.id as user_id,
    u.email::TEXT as email,
    p.username,
    p.full_name
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE LOWER(p.username) = LOWER(p_identifier)
  LIMIT 1;
  
  -- If no result, try by email
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      p.id as user_id,
      u.email::TEXT as email,
      p.username,
      p.full_name
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE LOWER(u.email) = LOWER(p_identifier)
    LIMIT 1;
  END IF;
END;
$$;

-- Function to create staff account instantly (for admins)
-- Creates auth user + profile + resort membership in one transaction
CREATE OR REPLACE FUNCTION public.create_staff_account(
  p_username TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_resort_id UUID DEFAULT NULL,
  p_resort_role resort_role DEFAULT NULL,
  p_department TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    updated_at
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    v_email,
    crypt(p_password, gen_salt('bf')),
    NOW(), -- Auto-confirm
    jsonb_build_object('full_name', COALESCE(p_full_name, '')),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    'authenticated',
    'authenticated',
    NOW(),
    NOW()
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
$$;

-- Function to reset staff password (admin only)
CREATE OR REPLACE FUNCTION public.admin_reset_staff_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate password
  IF p_new_password IS NULL OR LENGTH(p_new_password) < 6 THEN
    RETURN json_build_object('success', false, 'error', 'Password must be at least 6 characters');
  END IF;
  
  -- Check user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Update password
  UPDATE auth.users
  SET 
    encrypted_password = crypt(p_new_password, gen_salt('bf')),
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN json_build_object('success', true);
END;
$$;

-- Function to update username
CREATE OR REPLACE FUNCTION public.update_staff_username(
  p_user_id UUID,
  p_new_username TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate username
  IF p_new_username IS NULL OR LENGTH(TRIM(p_new_username)) < 3 THEN
    RETURN json_build_object('success', false, 'error', 'Username must be at least 3 characters');
  END IF;
  
  -- Check username format
  IF NOT (TRIM(p_new_username) ~ '^[a-zA-Z0-9_]+$') THEN
    RETURN json_build_object('success', false, 'error', 'Username can only contain letters, numbers, and underscores');
  END IF;
  
  -- Check username uniqueness (excluding current user)
  IF EXISTS (SELECT 1 FROM profiles WHERE LOWER(username) = LOWER(TRIM(p_new_username)) AND id != p_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Username is already taken');
  END IF;
  
  -- Update username
  UPDATE profiles
  SET username = TRIM(p_new_username), updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN json_build_object('success', true);
END;
$$;