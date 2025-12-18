-- Fix: Remove overly permissive public access to resorts table
-- This migration restricts public access to only essential branding fields via RPC

-- 1. Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view resorts" ON resorts;

-- 2. Create a security definer function for safe public branding access
-- This returns only the fields needed for guest login pages
CREATE OR REPLACE FUNCTION public.get_resort_public_info(p_resort_code text)
RETURNS jsonb
LANGUAGE plpgsql
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

-- Grant execute permission to anonymous users (for guest login pages)
GRANT EXECUTE ON FUNCTION public.get_resort_public_info(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_resort_public_info(text) TO authenticated;

-- 3. Create a function to get resort by ID for authenticated guest sessions
CREATE OR REPLACE FUNCTION public.get_resort_by_id(p_resort_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
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

GRANT EXECUTE ON FUNCTION public.get_resort_by_id(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_resort_by_id(uuid) TO authenticated;