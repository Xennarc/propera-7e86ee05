-- Fix: Ensure RPC functions are properly accessible via PostgREST
-- This recreates the functions with explicit settings for API access

-- 1. Re-add a minimal RLS policy to allow reading active resorts for guest login
-- Drop any existing policy first
DROP POLICY IF EXISTS "Anyone can view active resort basic info" ON resorts;

CREATE POLICY "Anyone can view active resort basic info" 
ON resorts 
FOR SELECT 
USING (status = 'ACTIVE');

-- 2. Recreate get_resort_public_info with explicit volatility settings
DROP FUNCTION IF EXISTS public.get_resort_public_info(text);

CREATE FUNCTION public.get_resort_public_info(p_resort_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'code', code,
    'status', status,
    'timezone', timezone,
    'login_logo_url', login_logo_url,
    'login_hero_image_url', login_hero_image_url,
    'login_primary_color', login_primary_color,
    'login_accent_color', login_accent_color,
    'guest_login_title', guest_login_title,
    'guest_login_subtitle', guest_login_subtitle,
    'guest_login_instructions', guest_login_instructions,
    'brand_theme', brand_theme,
    'brand_wordmark', brand_wordmark
  ) INTO result
  FROM resorts
  WHERE LOWER(code) = LOWER(p_resort_code);
  
  RETURN result;
END;
$$;

-- 3. Grant execute permissions explicitly
GRANT EXECUTE ON FUNCTION public.get_resort_public_info(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_resort_public_info(text) TO authenticated;

-- 4. Recreate get_resort_by_id with explicit volatility
DROP FUNCTION IF EXISTS public.get_resort_by_id(uuid);

CREATE FUNCTION public.get_resort_by_id(p_resort_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'code', code,
    'status', status,
    'timezone', timezone,
    'currency', currency,
    'login_logo_url', login_logo_url,
    'login_hero_image_url', login_hero_image_url,
    'login_primary_color', login_primary_color,
    'login_accent_color', login_accent_color,
    'guest_login_title', guest_login_title,
    'guest_login_subtitle', guest_login_subtitle,
    'guest_login_instructions', guest_login_instructions,
    'brand_theme', brand_theme,
    'brand_wordmark', brand_wordmark,
    'pricing_charges', pricing_charges
  ) INTO result
  FROM resorts
  WHERE id = p_resort_id;
  
  RETURN result;
END;
$$;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_resort_by_id(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_resort_by_id(uuid) TO authenticated;