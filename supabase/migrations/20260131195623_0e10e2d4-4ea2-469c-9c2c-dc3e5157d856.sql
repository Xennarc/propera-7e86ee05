-- ============================================================================
-- Resort Add-ons Table
-- Tracks which add-ons are active for each resort
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.resort_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  addon_key TEXT NOT NULL REFERENCES public.addon_pricing(key) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint: one addon per resort
  CONSTRAINT resort_addons_unique_addon UNIQUE (resort_id, addon_key)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_resort_addons_resort ON public.resort_addons(resort_id);
CREATE INDEX IF NOT EXISTS idx_resort_addons_active ON public.resort_addons(resort_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_resort_addons_addon_key ON public.resort_addons(addon_key);

-- Updated_at trigger
CREATE TRIGGER update_resort_addons_updated_at
  BEFORE UPDATE ON public.resort_addons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE public.resort_addons ENABLE ROW LEVEL SECURITY;

-- SUPER_ADMIN can do everything
CREATE POLICY "super_admin_full_access_resort_addons"
  ON public.resort_addons
  FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Resort admins can view their own resort's add-ons
CREATE POLICY "resort_admin_read_own_addons"
  ON public.resort_addons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      WHERE rm.user_id = auth.uid()
        AND rm.resort_id = resort_addons.resort_id
        AND rm.resort_role = 'RESORT_ADMIN'
    )
  );

-- ============================================================================
-- Helper Function: Get entitled categories for a resort
-- Returns an array of categories unlocked via active add-ons
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_resort_entitled_categories(p_resort_id UUID)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(DISTINCT afc.category),
    ARRAY[]::TEXT[]
  )
  FROM public.resort_addons ra
  INNER JOIN public.addon_feature_categories afc ON afc.addon_key = ra.addon_key
  WHERE ra.resort_id = p_resort_id
    AND ra.is_active = true
    AND (ra.ends_at IS NULL OR ra.ends_at > now());
$$;

-- ============================================================================
-- Helper View: Resort add-ons with addon details
-- ============================================================================

CREATE OR REPLACE VIEW public.resort_addons_with_details_v AS
SELECT 
  ra.id,
  ra.resort_id,
  ra.addon_key,
  ra.is_active,
  ra.started_at,
  ra.ends_at,
  ra.metadata_json,
  ra.created_at,
  ra.updated_at,
  ap.name AS addon_name,
  ap.description AS addon_description,
  ap.monthly_price_cents,
  ap.currency,
  COALESCE(
    (SELECT array_agg(afc.category) FROM public.addon_feature_categories afc WHERE afc.addon_key = ra.addon_key),
    ARRAY[]::TEXT[]
  ) AS unlocked_categories
FROM public.resort_addons ra
LEFT JOIN public.addon_pricing ap ON ap.key = ra.addon_key;

COMMENT ON TABLE public.resort_addons IS 'Tracks which add-ons are active for each resort';
COMMENT ON FUNCTION public.get_resort_entitled_categories IS 'Returns categories unlocked by active add-ons for a resort';