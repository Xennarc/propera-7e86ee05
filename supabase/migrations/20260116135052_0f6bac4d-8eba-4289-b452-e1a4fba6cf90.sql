-- Create a secure RPC function for guest activity access with proper tenant isolation
-- This replaces the insecure anon RLS policy that allowed cross-tenant data exposure

-- Drop the insecure policy first
DROP POLICY IF EXISTS "anon_guest_can_view_bookable_activities" ON public.activities;

-- Create a SECURITY DEFINER function that enforces resort_id scoping
CREATE OR REPLACE FUNCTION public.guest_get_activity_details(
  p_resort_id UUID,
  p_activity_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  short_description TEXT,
  description TEXT,
  full_description TEXT,
  category TEXT,
  duration_minutes INTEGER,
  default_price_per_person NUMERIC,
  default_max_capacity INTEGER,
  max_pax_per_booking INTEGER,
  requires_approval BOOLEAN,
  image_url TEXT,
  highlights JSONB,
  includes TEXT,
  difficulty_level TEXT,
  guest_cutoff_hours INTEGER,
  guest_can_book BOOLEAN,
  guest_can_cancel BOOLEAN,
  guest_cancel_cutoff_hours INTEGER,
  health_and_safety_notes TEXT,
  faq JSONB,
  suitable_for_non_swimmers BOOLEAN,
  is_swimming_required BOOLEAN,
  age_min INTEGER,
  max_age INTEGER,
  cancellation_policy_text TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    a.id,
    a.name,
    a.short_description,
    a.description,
    a.full_description,
    a.category::TEXT,
    a.duration_minutes,
    a.default_price_per_person,
    a.default_max_capacity,
    a.max_pax_per_booking,
    a.requires_approval,
    a.image_url,
    a.highlights,
    a.includes,
    a.difficulty_level,
    a.guest_cutoff_hours,
    a.guest_can_book,
    a.guest_can_cancel,
    a.guest_cancel_cutoff_hours,
    a.health_and_safety_notes,
    a.faq,
    a.suitable_for_non_swimmers,
    a.is_swimming_required,
    a.age_min,
    a.max_age,
    a.cancellation_policy_text
  FROM activities a
  WHERE a.resort_id = p_resort_id
    AND a.is_active = true
    AND a.guest_can_book = true
    AND (p_activity_id IS NULL OR a.id = p_activity_id);
$$;

-- Grant execute to anon role for guest portal access
GRANT EXECUTE ON FUNCTION public.guest_get_activity_details(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.guest_get_activity_details(UUID, UUID) TO authenticated;