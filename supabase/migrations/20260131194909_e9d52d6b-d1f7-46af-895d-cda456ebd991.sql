-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 1: Tie pricing add-ons to Feature Flag categories (Complete)
-- ═══════════════════════════════════════════════════════════════════════════

-- A) Create join table: addon_feature_categories
CREATE TABLE public.addon_feature_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_key TEXT NOT NULL REFERENCES public.addon_pricing(key) ON DELETE CASCADE,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Validate category matches allowed feature flag categories
  CONSTRAINT valid_category CHECK (
    category IN ('core', 'guest', 'premium', 'experimental', 'danger')
  ),
  
  -- Each addon can only include each category once
  CONSTRAINT unique_addon_category UNIQUE (addon_key, category)
);

-- Add helpful comment
COMMENT ON TABLE public.addon_feature_categories IS 
  'Maps pricing add-ons to feature flag categories they unlock';

-- Index for fast lookups by category
CREATE INDEX idx_addon_feature_categories_category 
  ON public.addon_feature_categories(category);

-- Index for fast lookups by addon_key
CREATE INDEX idx_addon_feature_categories_addon_key 
  ON public.addon_feature_categories(addon_key);

-- ═══════════════════════════════════════════════════════════════════════════
-- B) Create view: feature_category_entitlements_v
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.feature_category_entitlements_v AS
SELECT 
  fc.category,
  COALESCE(
    array_agg(DISTINCT afc.addon_key) FILTER (WHERE afc.addon_key IS NOT NULL),
    ARRAY[]::TEXT[]
  ) AS addon_keys,
  COUNT(DISTINCT ff.key) AS flags_count,
  COALESCE(
    array_agg(DISTINCT ff.key) FILTER (WHERE ff.key IS NOT NULL),
    ARRAY[]::TEXT[]
  ) AS flag_keys
FROM (
  -- Get all possible categories
  SELECT unnest(ARRAY['core', 'guest', 'premium', 'experimental', 'danger']) AS category
) fc
LEFT JOIN public.addon_feature_categories afc ON afc.category = fc.category
LEFT JOIN public.feature_flags ff ON ff.category = fc.category AND ff.resort_id IS NULL
GROUP BY fc.category
ORDER BY 
  CASE fc.category
    WHEN 'core' THEN 1
    WHEN 'guest' THEN 2
    WHEN 'premium' THEN 3
    WHEN 'experimental' THEN 4
    WHEN 'danger' THEN 5
  END;

COMMENT ON VIEW public.feature_category_entitlements_v IS 
  'Shows which add-ons unlock each feature flag category and the flags in each category';

-- ═══════════════════════════════════════════════════════════════════════════
-- C) RLS: SUPER_ADMIN only access (using existing is_super_admin function)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.addon_feature_categories ENABLE ROW LEVEL SECURITY;

-- SELECT policy: SUPER_ADMIN only
CREATE POLICY "Super admins can view addon feature categories"
  ON public.addon_feature_categories
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- INSERT policy: SUPER_ADMIN only
CREATE POLICY "Super admins can create addon feature categories"
  ON public.addon_feature_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

-- UPDATE policy: SUPER_ADMIN only
CREATE POLICY "Super admins can update addon feature categories"
  ON public.addon_feature_categories
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- DELETE policy: SUPER_ADMIN only
CREATE POLICY "Super admins can delete addon feature categories"
  ON public.addon_feature_categories
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));