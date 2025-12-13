-- ============================================
-- LOYALTY PROGRAM FEATURE - ELITE TIER ONLY
-- Fully additive, backwards compatible
-- ============================================

-- Enum for tier calculation mode
CREATE TYPE public.loyalty_tier_mode AS ENUM ('points', 'nights', 'spend');

-- Enum for transaction types
CREATE TYPE public.loyalty_transaction_type AS ENUM ('earn', 'redeem', 'adjustment', 'expire');

-- Enum for earn source
CREATE TYPE public.loyalty_earn_source AS ENUM (
  'activity_booking', 
  'dining_booking', 
  'room_night', 
  'spa_booking',
  'manual_adjustment',
  'welcome_bonus',
  'tier_bonus',
  'referral'
);

-- Enum for reward types
CREATE TYPE public.loyalty_reward_type AS ENUM ('discount_percent', 'discount_fixed', 'free_activity', 'upgrade', 'voucher', 'perk');

-- ============================================
-- 1. LOYALTY PROGRAMS (one per resort)
-- ============================================
CREATE TABLE public.loyalty_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Loyalty Club',
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  tier_mode loyalty_tier_mode NOT NULL DEFAULT 'points',
  base_earn_rate NUMERIC NOT NULL DEFAULT 1,
  currency_name TEXT NOT NULL DEFAULT 'points',
  welcome_bonus_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(resort_id)
);

-- Enable RLS
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view loyalty program in their resort"
  ON public.loyalty_programs FOR SELECT
  USING (has_resort_membership(auth.uid(), resort_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Resort admins can manage loyalty program"
  ON public.loyalty_programs FOR ALL
  USING (is_super_admin(auth.uid()) OR has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role, 'MANAGER'::resort_role]));

-- Public read for guests (enabled programs only)
CREATE POLICY "Anyone can view enabled loyalty programs"
  ON public.loyalty_programs FOR SELECT
  USING (is_enabled = true);

-- ============================================
-- 2. LOYALTY TIERS
-- ============================================
CREATE TABLE public.loyalty_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  min_points INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  perks_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  badge_color TEXT NOT NULL DEFAULT '#6B7280',
  badge_icon TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_elite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view loyalty tiers in their resort"
  ON public.loyalty_tiers FOR SELECT
  USING (has_resort_membership(auth.uid(), resort_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Resort admins can manage loyalty tiers"
  ON public.loyalty_tiers FOR ALL
  USING (is_super_admin(auth.uid()) OR has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role, 'MANAGER'::resort_role]));

-- Public read for guests
CREATE POLICY "Anyone can view loyalty tiers"
  ON public.loyalty_tiers FOR SELECT
  USING (true);

-- ============================================
-- 3. LOYALTY MEMBERS
-- ============================================
CREATE TABLE public.loyalty_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  current_tier_id UUID REFERENCES public.loyalty_tiers(id) ON DELETE SET NULL,
  points_balance INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(program_id, guest_id)
);

-- Enable RLS
ALTER TABLE public.loyalty_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view loyalty members in their resort"
  ON public.loyalty_members FOR SELECT
  USING (has_resort_membership(auth.uid(), resort_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Staff can manage loyalty members in their resort"
  ON public.loyalty_members FOR ALL
  USING (is_super_admin(auth.uid()) OR has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role, 'MANAGER'::resort_role, 'FRONT_OFFICE'::resort_role]));

-- Index for guest lookup
CREATE INDEX idx_loyalty_members_guest ON public.loyalty_members(guest_id);
CREATE INDEX idx_loyalty_members_resort ON public.loyalty_members(resort_id);

-- ============================================
-- 4. LOYALTY TRANSACTIONS
-- ============================================
CREATE TABLE public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.loyalty_members(id) ON DELETE CASCADE,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  type loyalty_transaction_type NOT NULL,
  points_change INTEGER NOT NULL,
  points_balance_after INTEGER NOT NULL,
  source loyalty_earn_source NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  note TEXT,
  created_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view loyalty transactions in their resort"
  ON public.loyalty_transactions FOR SELECT
  USING (has_resort_membership(auth.uid(), resort_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Staff can create loyalty transactions"
  ON public.loyalty_transactions FOR INSERT
  WITH CHECK (is_super_admin(auth.uid()) OR has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role, 'MANAGER'::resort_role, 'FRONT_OFFICE'::resort_role]));

-- Index for member lookup
CREATE INDEX idx_loyalty_transactions_member ON public.loyalty_transactions(member_id);
CREATE INDEX idx_loyalty_transactions_resort ON public.loyalty_transactions(resort_id);

-- ============================================
-- 5. LOYALTY EARN RULES
-- ============================================
CREATE TABLE public.loyalty_earn_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  earn_type TEXT NOT NULL DEFAULT 'per_booking',
  earn_rate NUMERIC NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(program_id, category)
);

-- Enable RLS
ALTER TABLE public.loyalty_earn_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view earn rules in their resort"
  ON public.loyalty_earn_rules FOR SELECT
  USING (has_resort_membership(auth.uid(), resort_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Resort admins can manage earn rules"
  ON public.loyalty_earn_rules FOR ALL
  USING (is_super_admin(auth.uid()) OR has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role, 'MANAGER'::resort_role]));

-- ============================================
-- 6. LOYALTY REWARDS
-- ============================================
CREATE TABLE public.loyalty_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cost_points INTEGER NOT NULL,
  reward_type loyalty_reward_type NOT NULL DEFAULT 'voucher',
  reward_value NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  available_quantity INTEGER,
  min_tier_id UUID REFERENCES public.loyalty_tiers(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active rewards"
  ON public.loyalty_rewards FOR SELECT
  USING (is_active = true);

CREATE POLICY "Staff can view all rewards in their resort"
  ON public.loyalty_rewards FOR SELECT
  USING (has_resort_membership(auth.uid(), resort_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Resort admins can manage rewards"
  ON public.loyalty_rewards FOR ALL
  USING (is_super_admin(auth.uid()) OR has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role, 'MANAGER'::resort_role]));

-- ============================================
-- 7. REWARD REDEMPTIONS
-- ============================================
CREATE TABLE public.loyalty_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.loyalty_members(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.loyalty_rewards(id) ON DELETE CASCADE,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.loyalty_transactions(id),
  points_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  voucher_code TEXT,
  note TEXT
);

-- Enable RLS
ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view redemptions in their resort"
  ON public.loyalty_redemptions FOR SELECT
  USING (has_resort_membership(auth.uid(), resort_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Staff can manage redemptions"
  ON public.loyalty_redemptions FOR ALL
  USING (is_super_admin(auth.uid()) OR has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role, 'MANAGER'::resort_role, 'FRONT_OFFICE'::resort_role]));

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get or create loyalty member
CREATE OR REPLACE FUNCTION public.get_or_create_loyalty_member(
  p_guest_id UUID,
  p_resort_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program_id UUID;
  v_member_id UUID;
  v_default_tier_id UUID;
  v_welcome_bonus INTEGER;
BEGIN
  -- Check if loyalty program exists and is enabled
  SELECT id, welcome_bonus_points INTO v_program_id, v_welcome_bonus
  FROM loyalty_programs
  WHERE resort_id = p_resort_id AND is_enabled = true;
  
  IF v_program_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Check if member already exists
  SELECT id INTO v_member_id
  FROM loyalty_members
  WHERE guest_id = p_guest_id AND program_id = v_program_id;
  
  IF v_member_id IS NOT NULL THEN
    RETURN v_member_id;
  END IF;
  
  -- Get default tier
  SELECT id INTO v_default_tier_id
  FROM loyalty_tiers
  WHERE program_id = v_program_id AND is_default = true
  LIMIT 1;
  
  -- Create new member
  INSERT INTO loyalty_members (resort_id, program_id, guest_id, current_tier_id, points_balance, lifetime_points)
  VALUES (p_resort_id, v_program_id, p_guest_id, v_default_tier_id, v_welcome_bonus, v_welcome_bonus)
  RETURNING id INTO v_member_id;
  
  -- Record welcome bonus transaction if applicable
  IF v_welcome_bonus > 0 THEN
    INSERT INTO loyalty_transactions (member_id, resort_id, type, points_change, points_balance_after, source, note)
    VALUES (v_member_id, p_resort_id, 'earn', v_welcome_bonus, v_welcome_bonus, 'welcome_bonus', 'Welcome bonus');
  END IF;
  
  RETURN v_member_id;
END;
$$;

-- Function to award points
CREATE OR REPLACE FUNCTION public.award_loyalty_points(
  p_guest_id UUID,
  p_resort_id UUID,
  p_source loyalty_earn_source,
  p_points INTEGER,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_new_balance INTEGER;
  v_new_lifetime INTEGER;
  v_new_tier_id UUID;
  v_old_tier_id UUID;
BEGIN
  -- Get or create member
  v_member_id := get_or_create_loyalty_member(p_guest_id, p_resort_id);
  
  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Loyalty not enabled');
  END IF;
  
  -- Get current balances and tier
  SELECT points_balance + p_points, lifetime_points + p_points, current_tier_id
  INTO v_new_balance, v_new_lifetime, v_old_tier_id
  FROM loyalty_members
  WHERE id = v_member_id;
  
  -- Update member
  UPDATE loyalty_members
  SET points_balance = v_new_balance,
      lifetime_points = v_new_lifetime,
      updated_at = now()
  WHERE id = v_member_id;
  
  -- Record transaction
  INSERT INTO loyalty_transactions (member_id, resort_id, type, points_change, points_balance_after, source, reference_id, reference_type, note)
  VALUES (v_member_id, p_resort_id, 'earn', p_points, v_new_balance, p_source, p_reference_id, p_reference_type, p_note);
  
  -- Check for tier upgrade
  SELECT id INTO v_new_tier_id
  FROM loyalty_tiers lt
  JOIN loyalty_members lm ON lm.id = v_member_id
  WHERE lt.program_id = lm.program_id
    AND lt.min_points <= v_new_lifetime
  ORDER BY lt.min_points DESC
  LIMIT 1;
  
  IF v_new_tier_id IS DISTINCT FROM v_old_tier_id THEN
    UPDATE loyalty_members
    SET current_tier_id = v_new_tier_id
    WHERE id = v_member_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'member_id', v_member_id,
    'points_awarded', p_points,
    'new_balance', v_new_balance,
    'tier_upgraded', v_new_tier_id IS DISTINCT FROM v_old_tier_id
  );
END;
$$;

-- Function to adjust points (for staff)
CREATE OR REPLACE FUNCTION public.adjust_loyalty_points(
  p_member_id UUID,
  p_points INTEGER,
  p_note TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resort_id UUID;
  v_new_balance INTEGER;
  v_new_lifetime INTEGER;
BEGIN
  -- Get member resort
  SELECT resort_id, points_balance + p_points, 
         CASE WHEN p_points > 0 THEN lifetime_points + p_points ELSE lifetime_points END
  INTO v_resort_id, v_new_balance, v_new_lifetime
  FROM loyalty_members
  WHERE id = p_member_id;
  
  IF v_resort_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Member not found');
  END IF;
  
  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points');
  END IF;
  
  -- Update member
  UPDATE loyalty_members
  SET points_balance = v_new_balance,
      lifetime_points = v_new_lifetime,
      updated_at = now()
  WHERE id = p_member_id;
  
  -- Record transaction
  INSERT INTO loyalty_transactions (member_id, resort_id, type, points_change, points_balance_after, source, note, created_by_user_id)
  VALUES (p_member_id, v_resort_id, 'adjustment', p_points, v_new_balance, 'manual_adjustment', p_note, p_user_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance
  );
END;
$$;

-- Function to get guest loyalty info (for guest portal)
CREATE OR REPLACE FUNCTION public.guest_get_loyalty_info(p_guest_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'member_id', lm.id,
    'points_balance', lm.points_balance,
    'lifetime_points', lm.lifetime_points,
    'joined_at', lm.joined_at,
    'status', lm.status,
    'program', jsonb_build_object(
      'id', lp.id,
      'name', lp.name,
      'description', lp.description,
      'currency_name', lp.currency_name
    ),
    'current_tier', CASE WHEN lt.id IS NOT NULL THEN jsonb_build_object(
      'id', lt.id,
      'name', lt.name,
      'description', lt.description,
      'badge_color', lt.badge_color,
      'badge_icon', lt.badge_icon,
      'perks', lt.perks_json,
      'is_elite', lt.is_elite
    ) ELSE NULL END,
    'next_tier', (
      SELECT jsonb_build_object(
        'id', nt.id,
        'name', nt.name,
        'min_points', nt.min_points,
        'points_needed', nt.min_points - lm.lifetime_points
      )
      FROM loyalty_tiers nt
      WHERE nt.program_id = lp.id
        AND nt.min_points > lm.lifetime_points
      ORDER BY nt.min_points ASC
      LIMIT 1
    ),
    'all_tiers', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', at.id,
        'name', at.name,
        'min_points', at.min_points,
        'perks', at.perks_json,
        'badge_color', at.badge_color,
        'is_current', at.id = lm.current_tier_id
      ) ORDER BY at.min_points)
      FROM loyalty_tiers at
      WHERE at.program_id = lp.id
    ),
    'recent_transactions', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', lt.id,
        'type', lt.type,
        'points_change', lt.points_change,
        'source', lt.source,
        'note', lt.note,
        'created_at', lt.created_at
      ) ORDER BY lt.created_at DESC)
      FROM (
        SELECT * FROM loyalty_transactions
        WHERE member_id = lm.id
        ORDER BY created_at DESC
        LIMIT 10
      ) lt
    )
  )
  INTO v_result
  FROM loyalty_members lm
  JOIN loyalty_programs lp ON lp.id = lm.program_id
  LEFT JOIN loyalty_tiers lt ON lt.id = lm.current_tier_id
  WHERE lm.guest_id = p_guest_id
    AND lp.is_enabled = true
  LIMIT 1;
  
  RETURN COALESCE(v_result, jsonb_build_object('enrolled', false));
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_loyalty_programs_updated_at
  BEFORE UPDATE ON public.loyalty_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loyalty_tiers_updated_at
  BEFORE UPDATE ON public.loyalty_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loyalty_members_updated_at
  BEFORE UPDATE ON public.loyalty_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loyalty_earn_rules_updated_at
  BEFORE UPDATE ON public.loyalty_earn_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();