-- ============================================
-- Phase 2: Pricing Configuration Tables
-- ============================================

-- Table 1: plan_pricing (base tier prices)
CREATE TABLE public.plan_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text UNIQUE NOT NULL CHECK (tier IN ('ESSENTIAL', 'PROFESSIONAL', 'ELITE')),
  monthly_price_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  display_price_text text NULL,
  usage_included text NULL,
  overage_text text NULL,
  is_active boolean NOT NULL DEFAULT true,
  metadata_json jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Table 2: addon_pricing
CREATE TABLE public.addon_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  monthly_price_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  description text NULL,
  is_active boolean NOT NULL DEFAULT true,
  metadata_json jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Table 3: pricing_publish_log (audit trail)
CREATE TABLE public.pricing_publish_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- Enable RLS on all tables
-- ============================================

ALTER TABLE public.plan_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addon_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_publish_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies: plan_pricing
-- ============================================

-- Super admins can read plan pricing
CREATE POLICY "Super admins can read plan pricing"
ON public.plan_pricing
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Super admins can insert plan pricing
CREATE POLICY "Super admins can insert plan pricing"
ON public.plan_pricing
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

-- Super admins can update plan pricing
CREATE POLICY "Super admins can update plan pricing"
ON public.plan_pricing
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Super admins can delete plan pricing
CREATE POLICY "Super admins can delete plan pricing"
ON public.plan_pricing
FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- ============================================
-- RLS Policies: addon_pricing
-- ============================================

-- Super admins can read addon pricing
CREATE POLICY "Super admins can read addon pricing"
ON public.addon_pricing
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Super admins can insert addon pricing
CREATE POLICY "Super admins can insert addon pricing"
ON public.addon_pricing
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

-- Super admins can update addon pricing
CREATE POLICY "Super admins can update addon pricing"
ON public.addon_pricing
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Super admins can delete addon pricing
CREATE POLICY "Super admins can delete addon pricing"
ON public.addon_pricing
FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- ============================================
-- RLS Policies: pricing_publish_log
-- ============================================

-- Super admins can read pricing logs
CREATE POLICY "Super admins can read pricing logs"
ON public.pricing_publish_log
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Super admins can insert pricing logs
CREATE POLICY "Super admins can insert pricing logs"
ON public.pricing_publish_log
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

-- ============================================
-- Triggers: Auto-update updated_at
-- ============================================

CREATE TRIGGER update_plan_pricing_updated_at
  BEFORE UPDATE ON public.plan_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_addon_pricing_updated_at
  BEFORE UPDATE ON public.addon_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Seed Data: Plan Pricing (from PricingPage.tsx)
-- Essential: $499 = 49900 cents
-- Professional: $899 = 89900 cents
-- Elite: $1499 = 149900 cents
-- ============================================

INSERT INTO public.plan_pricing (tier, monthly_price_cents, currency, display_price_text, usage_included, overage_text, is_active)
VALUES 
  ('ESSENTIAL', 49900, 'USD', '$499', 'Includes up to 1,500 guest stays / month', '$0.10 per guest stay', true),
  ('PROFESSIONAL', 89900, 'USD', '$899', 'Includes up to 3,000 guest stays / month', '$0.08 per guest stay', true),
  ('ELITE', 149900, 'USD', '$1,499', 'Includes up to 6,000 guest stays / month', '$0.06 per guest stay', true);

-- ============================================
-- Seed Data: Addon Pricing (from PricingPage.tsx)
-- All standard addons: $199 = 19900 cents
-- Managed Content: $150 = 15000 cents (base price)
-- ============================================

INSERT INTO public.addon_pricing (key, name, monthly_price_cents, currency, description, is_active)
VALUES 
  ('loyalty_suite', 'Loyalty Program Suite', 19900, 'USD', 'Guest rewards, tier management, and return visit tracking.', true),
  ('analytics_plus', 'Analytics Plus', 19900, 'USD', 'Executive dashboards & deeper insights.', true),
  ('premium_support', 'Premium Support', 19900, 'USD', 'Priority channels & extended coverage.', true),
  ('managed_content', 'Managed Content', 15000, 'USD', 'We maintain your activity catalog & seasonal updates.', true);

-- ============================================
-- Add comment documentation
-- ============================================

COMMENT ON TABLE public.plan_pricing IS 'Super admin managed subscription tier pricing configuration';
COMMENT ON TABLE public.addon_pricing IS 'Super admin managed addon/feature pricing configuration';
COMMENT ON TABLE public.pricing_publish_log IS 'Audit log for pricing changes made by super admins';