-- ═══════════════════════════════════════════════════════════════════════════
-- RPC: get_effective_feature_flags
-- Returns merged effective flags for a resort (global + resort overrides)
-- Accessible by: Super Admins, Staff with resort access, Guests of that resort
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_effective_feature_flags(
  _resort_id uuid,
  _guest_id uuid DEFAULT NULL
)
RETURNS TABLE (
  key text,
  is_enabled boolean,
  label text,
  category text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_access boolean := false;
BEGIN
  -- Access control checks
  -- 1. Super admin can access any resort
  IF public.is_super_admin(auth.uid()) THEN
    v_has_access := true;
  -- 2. Staff with resort access
  ELSIF public.staff_has_resort_access(auth.uid(), _resort_id) THEN
    v_has_access := true;
  -- 3. Guest belonging to this resort (explicit guest_id passed)
  ELSIF _guest_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.guests g
      WHERE g.id = _guest_id
        AND g.resort_id = _resort_id
    ) INTO v_has_access;
  END IF;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied: no permission to read flags for this resort';
  END IF;

  -- Return merged flags: resort overrides win over global
  RETURN QUERY
  SELECT 
    gf.key,
    COALESCE(rf.is_enabled, gf.is_enabled) AS is_enabled,
    gf.label,
    gf.category
  FROM public.feature_flags gf
  LEFT JOIN public.feature_flags rf 
    ON rf.key = gf.key 
    AND rf.resort_id = _resort_id
  WHERE gf.resort_id IS NULL  -- Only global flags as base
  ORDER BY gf.category, gf.key;
END;
$$;

-- Grant execute to authenticated and anon (for guest portal)
GRANT EXECUTE ON FUNCTION public.get_effective_feature_flags(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_feature_flags(uuid, uuid) TO anon;

COMMENT ON FUNCTION public.get_effective_feature_flags IS 
'Returns effective feature flags for a resort (global merged with resort overrides). 
Accessible by super admins, resort staff, and guests of the resort.';