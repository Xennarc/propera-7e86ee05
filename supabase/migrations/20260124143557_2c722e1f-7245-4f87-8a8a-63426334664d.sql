-- ============================================================================
-- UNIFIED STAY-BASED PRE-ARRIVAL ARCHITECTURE
-- Phase 1: Tables, Indexes, RLS, and RPC Functions
-- ============================================================================

-- 1. Create guest_stays table
CREATE TABLE public.guest_stays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  arrival_date DATE NOT NULL,
  departure_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pre_arrival' CHECK (status IN ('pre_arrival', 'in_house', 'checked_out')),
  room_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for guest_stays
CREATE INDEX idx_guest_stays_resort_guest ON public.guest_stays(resort_id, guest_id);
CREATE INDEX idx_guest_stays_resort_status ON public.guest_stays(resort_id, status);

-- Enable RLS
ALTER TABLE public.guest_stays ENABLE ROW LEVEL SECURITY;

-- 2. Create pre_arrival_submissions table
CREATE TABLE public.pre_arrival_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  stay_id UUID NOT NULL REFERENCES public.guest_stays(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for pre_arrival_submissions
CREATE INDEX idx_pre_arrival_submissions_stay ON public.pre_arrival_submissions(stay_id);
CREATE INDEX idx_pre_arrival_submissions_guest_stay ON public.pre_arrival_submissions(guest_id, stay_id);

-- Enable RLS
ALTER TABLE public.pre_arrival_submissions ENABLE ROW LEVEL SECURITY;

-- 3. Create guest_access_links table
CREATE TABLE public.guest_access_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  stay_id UUID NOT NULL REFERENCES public.guest_stays(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  purpose TEXT NOT NULL DEFAULT 'pre_arrival_login',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for guest_access_links
CREATE INDEX idx_guest_access_links_token_hash ON public.guest_access_links(token_hash);
CREATE INDEX idx_guest_access_links_stay ON public.guest_access_links(stay_id);

-- Enable RLS
ALTER TABLE public.guest_access_links ENABLE ROW LEVEL SECURITY;

-- 4. Updated_at triggers
CREATE TRIGGER update_guest_stays_updated_at
  BEFORE UPDATE ON public.guest_stays
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pre_arrival_submissions_updated_at
  BEFORE UPDATE ON public.pre_arrival_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- guest_stays policies
CREATE POLICY "staff_select_guest_stays" ON public.guest_stays
  FOR SELECT
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_insert_guest_stays" ON public.guest_stays
  FOR INSERT
  WITH CHECK (public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]));

CREATE POLICY "staff_update_guest_stays" ON public.guest_stays
  FOR UPDATE
  USING (public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]));

CREATE POLICY "staff_delete_guest_stays" ON public.guest_stays
  FOR DELETE
  USING (public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]));

-- pre_arrival_submissions policies
CREATE POLICY "staff_select_submissions" ON public.pre_arrival_submissions
  FOR SELECT
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_insert_submissions" ON public.pre_arrival_submissions
  FOR INSERT
  WITH CHECK (public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]));

CREATE POLICY "staff_update_submissions" ON public.pre_arrival_submissions
  FOR UPDATE
  USING (public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]));

CREATE POLICY "staff_delete_submissions" ON public.pre_arrival_submissions
  FOR DELETE
  USING (public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]));

-- guest_access_links policies (staff read-only, no guest SELECT)
CREATE POLICY "staff_select_access_links" ON public.guest_access_links
  FOR SELECT
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_insert_access_links" ON public.guest_access_links
  FOR INSERT
  WITH CHECK (public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]));

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- create_guest_access_link: Staff generates a secure one-time token for a guest's stay
CREATE OR REPLACE FUNCTION public.create_guest_access_link(p_stay_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stay guest_stays%ROWTYPE;
  v_raw_token TEXT;
  v_token_hash TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get the stay
  SELECT * INTO v_stay FROM guest_stays WHERE id = p_stay_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'STAY_NOT_FOUND');
  END IF;
  
  -- Validate staff has resort access for this stay
  IF NOT public.has_resort_role(
    auth.uid(), 
    v_stay.resort_id, 
    ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]
  ) THEN
    RETURN json_build_object('success', false, 'error', 'ACCESS_DENIED');
  END IF;
  
  -- Generate secure random token (URL-safe base64)
  v_raw_token := encode(extensions.gen_random_bytes(32), 'base64');
  v_raw_token := replace(replace(replace(v_raw_token, '/', '_'), '+', '-'), '=', '');
  
  -- Hash for storage
  v_token_hash := encode(extensions.digest(v_raw_token::bytea, 'sha256'), 'hex');
  
  -- Set expiry (7 days or departure + 1 day, whichever is earlier)
  v_expires_at := LEAST(
    NOW() + INTERVAL '7 days',
    (v_stay.departure_date + INTERVAL '1 day')::TIMESTAMPTZ
  );
  
  -- Insert the link
  INSERT INTO guest_access_links (
    resort_id, stay_id, guest_id, token_hash, expires_at, purpose
  ) VALUES (
    v_stay.resort_id, p_stay_id, v_stay.guest_id, v_token_hash, v_expires_at, 'pre_arrival_login'
  );
  
  RETURN json_build_object(
    'success', true,
    'raw_token', v_raw_token,
    'expires_at', v_expires_at
  );
END;
$$;

-- consume_guest_access_link: Guest uses their token to authenticate (one-time use)
CREATE OR REPLACE FUNCTION public.consume_guest_access_link(p_raw_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_hash TEXT;
  v_link guest_access_links%ROWTYPE;
BEGIN
  -- Hash the incoming token
  v_token_hash := encode(extensions.digest(p_raw_token::bytea, 'sha256'), 'hex');
  
  -- Find matching link
  SELECT * INTO v_link
  FROM guest_access_links
  WHERE token_hash = v_token_hash;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_NOT_FOUND');
  END IF;
  
  -- Check if already consumed
  IF v_link.consumed_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_ALREADY_USED');
  END IF;
  
  -- Check if expired
  IF v_link.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_EXPIRED');
  END IF;
  
  -- Mark as consumed
  UPDATE guest_access_links
  SET consumed_at = NOW()
  WHERE id = v_link.id;
  
  -- Return guest context
  RETURN json_build_object(
    'success', true,
    'guest_id', v_link.guest_id,
    'resort_id', v_link.resort_id,
    'stay_id', v_link.stay_id
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_guest_access_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_guest_access_link(text) TO authenticated, anon;