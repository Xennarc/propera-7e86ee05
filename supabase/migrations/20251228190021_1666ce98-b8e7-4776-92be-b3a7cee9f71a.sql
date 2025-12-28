-- ============================================
-- VENDOR V1 MIGRATION
-- Resort-controlled sessions + Vendor fulfillment portal + settlement ledger
-- ============================================

-- 1) Create ENUMs for vendor system
CREATE TYPE public.provider_type AS ENUM ('IN_HOUSE', 'VENDOR');
CREATE TYPE public.vendor_booking_status AS ENUM ('PENDING_ACK', 'ACKED', 'DECLINED', 'COMPLETED', 'NO_SHOW');
CREATE TYPE public.payout_status AS ENUM ('UNBATCHED', 'BATCHED', 'PAID');
CREATE TYPE public.vendor_request_type AS ENUM ('REQUEST_CHANGE', 'NOTE');
CREATE TYPE public.vendor_request_status AS ENUM ('open', 'resolved');
CREATE TYPE public.vendor_resort_status AS ENUM ('approved', 'suspended');
CREATE TYPE public.account_type AS ENUM ('staff', 'guest', 'vendor');
CREATE TYPE public.vendor_role AS ENUM ('vendor_admin', 'vendor_staff');

-- 2) Create vendors table
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  default_commission_rate NUMERIC(5,4) CHECK (default_commission_rate >= 0 AND default_commission_rate <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Create vendor_resorts join table (links vendors to resorts with overrides)
CREATE TABLE public.vendor_resorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  status public.vendor_resort_status NOT NULL DEFAULT 'approved',
  commission_rate_override NUMERIC(5,4) CHECK (commission_rate_override IS NULL OR (commission_rate_override >= 0 AND commission_rate_override <= 1)),
  operational_notes TEXT,
  ack_sla_minutes INTEGER DEFAULT 120,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, resort_id)
);

-- 4) Add vendor columns to activities table
ALTER TABLE public.activities 
  ADD COLUMN provider_type public.provider_type NOT NULL DEFAULT 'IN_HOUSE',
  ADD COLUMN vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL;

-- Add constraint: if provider_type = 'VENDOR' then vendor_id must be set
ALTER TABLE public.activities 
  ADD CONSTRAINT activities_vendor_consistency 
  CHECK (
    (provider_type = 'IN_HOUSE' AND vendor_id IS NULL) OR 
    (provider_type = 'VENDOR' AND vendor_id IS NOT NULL)
  );

-- 5) Add vendor columns to activity_sessions table
ALTER TABLE public.activity_sessions 
  ADD COLUMN provider_type public.provider_type NOT NULL DEFAULT 'IN_HOUSE',
  ADD COLUMN vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL;

-- Add constraint: sessions must have consistency between provider_type and vendor_id
ALTER TABLE public.activity_sessions 
  ADD CONSTRAINT sessions_vendor_consistency 
  CHECK (
    (provider_type = 'IN_HOUSE' AND vendor_id IS NULL) OR 
    (provider_type = 'VENDOR' AND vendor_id IS NOT NULL)
  );

-- 6) Add vendor columns to activity_bookings table
ALTER TABLE public.activity_bookings 
  ADD COLUMN provider_type public.provider_type NOT NULL DEFAULT 'IN_HOUSE',
  ADD COLUMN vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  ADD COLUMN vendor_status public.vendor_booking_status,
  ADD COLUMN vendor_rate_used NUMERIC(5,4),
  ADD COLUMN vendor_amount NUMERIC(10,2),
  ADD COLUMN resort_commission_amount NUMERIC(10,2),
  ADD COLUMN payout_status public.payout_status NOT NULL DEFAULT 'UNBATCHED',
  ADD COLUMN vendor_last_notified_at TIMESTAMPTZ;

-- 7) Create vendor_booking_requests table for vendor-staff communication
CREATE TABLE public.vendor_booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.activity_bookings(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  type public.vendor_request_type NOT NULL,
  message TEXT NOT NULL,
  status public.vendor_request_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8) Add vendor identity columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN account_type public.account_type NOT NULL DEFAULT 'staff',
  ADD COLUMN vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  ADD COLUMN vendor_role public.vendor_role;

-- Add constraint: if account_type = 'vendor' then vendor_id must be set
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_vendor_consistency 
  CHECK (
    (account_type != 'vendor') OR 
    (account_type = 'vendor' AND vendor_id IS NOT NULL)
  );

-- 9) Create indexes for performance
CREATE INDEX idx_vendor_resorts_vendor_id ON public.vendor_resorts(vendor_id);
CREATE INDEX idx_vendor_resorts_resort_id ON public.vendor_resorts(resort_id);
CREATE INDEX idx_activities_vendor_id ON public.activities(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX idx_activity_sessions_vendor_id ON public.activity_sessions(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX idx_activity_bookings_vendor_id ON public.activity_bookings(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX idx_activity_bookings_vendor_status ON public.activity_bookings(vendor_status) WHERE vendor_status IS NOT NULL;
CREATE INDEX idx_vendor_booking_requests_booking_id ON public.vendor_booking_requests(booking_id);
CREATE INDEX idx_vendor_booking_requests_vendor_id ON public.vendor_booking_requests(vendor_id);
CREATE INDEX idx_profiles_vendor_id ON public.profiles(vendor_id) WHERE vendor_id IS NOT NULL;

-- 10) Enable RLS on new tables
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_resorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_booking_requests ENABLE ROW LEVEL SECURITY;

-- 11) RLS Policies for vendors table

-- Staff can view vendors linked to their resort
CREATE POLICY "Staff can view vendors linked to their resort"
ON public.vendors FOR SELECT
USING (
  is_super_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.vendor_resorts vr
    JOIN public.resort_memberships rm ON rm.resort_id = vr.resort_id
    WHERE vr.vendor_id = vendors.id AND rm.user_id = auth.uid()
  )
);

-- Vendor users can view their own vendor
CREATE POLICY "Vendor users can view their own vendor"
ON public.vendors FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.vendor_id = vendors.id
  )
);

-- Resort admins/managers can manage vendors
CREATE POLICY "Resort admins can manage vendors"
ON public.vendors FOR ALL
USING (
  is_super_admin(auth.uid()) OR
  has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'MANAGER'::app_role])
);

-- 12) RLS Policies for vendor_resorts table

-- Staff can view vendor_resorts for their resort
CREATE POLICY "Staff can view vendor_resorts for their resort"
ON public.vendor_resorts FOR SELECT
USING (
  is_super_admin(auth.uid()) OR
  has_resort_membership(auth.uid(), resort_id)
);

-- Vendor users can view their vendor_resorts
CREATE POLICY "Vendor users can view their vendor_resorts"
ON public.vendor_resorts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.vendor_id = vendor_resorts.vendor_id
  )
);

-- Resort admins can manage vendor_resorts
CREATE POLICY "Resort admins can manage vendor_resorts"
ON public.vendor_resorts FOR ALL
USING (
  is_super_admin(auth.uid()) OR
  has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role, 'MANAGER'::resort_role])
);

-- 13) RLS Policies for vendor_booking_requests table

-- Staff can view requests for their resort
CREATE POLICY "Staff can view vendor requests for their resort"
ON public.vendor_booking_requests FOR SELECT
USING (
  is_super_admin(auth.uid()) OR
  has_resort_membership(auth.uid(), resort_id)
);

-- Staff can manage requests for their resort
CREATE POLICY "Staff can manage vendor requests"
ON public.vendor_booking_requests FOR ALL
USING (
  is_super_admin(auth.uid()) OR
  has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'MANAGER'::app_role, 'FRONT_OFFICE'::app_role, 'ACTIVITIES'::app_role])
);

-- Vendor users can view and create requests for their bookings
CREATE POLICY "Vendor users can view their booking requests"
ON public.vendor_booking_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.vendor_id = vendor_booking_requests.vendor_id
  )
);

CREATE POLICY "Vendor users can create requests for their bookings"
ON public.vendor_booking_requests FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.vendor_resorts vr ON vr.vendor_id = p.vendor_id
    WHERE p.id = auth.uid() 
      AND p.vendor_id = vendor_booking_requests.vendor_id
      AND vr.resort_id = vendor_booking_requests.resort_id
      AND vr.status = 'approved'
  )
);

-- 14) Update activity_bookings RLS to allow vendor access

-- Vendor users can view bookings assigned to them
CREATE POLICY "Vendor users can view their assigned bookings"
ON public.activity_bookings FOR SELECT
USING (
  vendor_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.vendor_resorts vr ON vr.vendor_id = p.vendor_id
    WHERE p.id = auth.uid() 
      AND p.vendor_id = activity_bookings.vendor_id
      AND vr.resort_id = activity_bookings.resort_id
      AND vr.status = 'approved'
  )
);

-- Vendor users can update vendor_status on their bookings
CREATE POLICY "Vendor users can update vendor status on their bookings"
ON public.activity_bookings FOR UPDATE
USING (
  vendor_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.vendor_resorts vr ON vr.vendor_id = p.vendor_id
    WHERE p.id = auth.uid() 
      AND p.vendor_id = activity_bookings.vendor_id
      AND vr.resort_id = activity_bookings.resort_id
      AND vr.status = 'approved'
  )
)
WITH CHECK (
  vendor_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.vendor_resorts vr ON vr.vendor_id = p.vendor_id
    WHERE p.id = auth.uid() 
      AND p.vendor_id = activity_bookings.vendor_id
      AND vr.resort_id = activity_bookings.resort_id
      AND vr.status = 'approved'
  )
);

-- 15) Create function to inherit vendor fields from activity to session
CREATE OR REPLACE FUNCTION public.inherit_vendor_to_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity activities%ROWTYPE;
BEGIN
  SELECT * INTO v_activity FROM activities WHERE id = NEW.activity_id;
  
  IF FOUND THEN
    NEW.provider_type := v_activity.provider_type;
    NEW.vendor_id := v_activity.vendor_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-inherit vendor fields on session creation
CREATE TRIGGER trigger_inherit_vendor_to_session
  BEFORE INSERT ON public.activity_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.inherit_vendor_to_session();

-- 16) Create function to inherit vendor fields from session to booking
CREATE OR REPLACE FUNCTION public.inherit_vendor_to_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session activity_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_session FROM activity_sessions WHERE id = NEW.session_id;
  
  IF FOUND THEN
    NEW.provider_type := v_session.provider_type;
    NEW.vendor_id := v_session.vendor_id;
    
    -- Set vendor_status to PENDING_ACK for vendor bookings
    IF v_session.provider_type = 'VENDOR' THEN
      NEW.vendor_status := 'PENDING_ACK';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-inherit vendor fields on booking creation
CREATE TRIGGER trigger_inherit_vendor_to_booking
  BEFORE INSERT ON public.activity_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.inherit_vendor_to_booking();

-- 17) Create function to compute vendor settlement on booking completion
CREATE OR REPLACE FUNCTION public.compute_vendor_settlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission_rate NUMERIC(5,4);
  v_vendor_resort vendor_resorts%ROWTYPE;
  v_vendor vendors%ROWTYPE;
BEGIN
  -- Only process if vendor booking is being completed
  IF NEW.provider_type = 'VENDOR' AND NEW.vendor_id IS NOT NULL THEN
    IF (OLD.vendor_status IS DISTINCT FROM 'COMPLETED' AND NEW.vendor_status = 'COMPLETED') OR
       (OLD.vendor_status IS DISTINCT FROM 'NO_SHOW' AND NEW.vendor_status = 'NO_SHOW') THEN
      
      -- Get commission rate (priority: vendor_resorts override > vendor default > fallback 0.15)
      SELECT * INTO v_vendor_resort 
      FROM vendor_resorts 
      WHERE vendor_id = NEW.vendor_id AND resort_id = NEW.resort_id;
      
      SELECT * INTO v_vendor 
      FROM vendors 
      WHERE id = NEW.vendor_id;
      
      v_commission_rate := COALESCE(
        v_vendor_resort.commission_rate_override,
        v_vendor.default_commission_rate,
        0.15
      );
      
      -- Compute amounts
      NEW.vendor_rate_used := v_commission_rate;
      NEW.resort_commission_amount := NEW.total_amount * v_commission_rate;
      NEW.vendor_amount := NEW.total_amount - NEW.resort_commission_amount;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to compute settlement on vendor status change
CREATE TRIGGER trigger_compute_vendor_settlement
  BEFORE UPDATE ON public.activity_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_vendor_settlement();

-- 18) Create helper function to check if user is vendor for a booking
CREATE OR REPLACE FUNCTION public.is_vendor_for_booking(p_user_id UUID, p_booking_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM activity_bookings ab
    JOIN profiles p ON p.vendor_id = ab.vendor_id
    JOIN vendor_resorts vr ON vr.vendor_id = p.vendor_id AND vr.resort_id = ab.resort_id
    WHERE ab.id = p_booking_id 
      AND p.id = p_user_id 
      AND p.account_type = 'vendor'
      AND vr.status = 'approved'
  );
END;
$$;

-- 19) Create function for vendors to get their bookings
CREATE OR REPLACE FUNCTION public.get_vendor_bookings(
  p_vendor_id UUID,
  p_date_from DATE DEFAULT CURRENT_DATE,
  p_date_to DATE DEFAULT CURRENT_DATE + INTERVAL '7 days'
)
RETURNS TABLE (
  booking_id UUID,
  session_id UUID,
  resort_id UUID,
  resort_name TEXT,
  activity_name TEXT,
  session_date DATE,
  start_time TIME,
  end_time TIME,
  guest_name TEXT,
  room_number TEXT,
  num_adults INTEGER,
  num_children INTEGER,
  notes TEXT,
  vendor_status vendor_booking_status,
  total_amount NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is authorized for this vendor
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND vendor_id = p_vendor_id 
      AND account_type = 'vendor'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT 
    ab.id AS booking_id,
    ab.session_id,
    ab.resort_id,
    r.name AS resort_name,
    a.name AS activity_name,
    s.date AS session_date,
    s.start_time::TIME,
    s.end_time::TIME,
    g.full_name AS guest_name,
    ab.room_number,
    ab.num_adults,
    ab.num_children,
    ab.notes,
    ab.vendor_status,
    ab.total_amount,
    ab.created_at
  FROM activity_bookings ab
  JOIN activity_sessions s ON s.id = ab.session_id
  JOIN activities a ON a.id = s.activity_id
  JOIN resorts r ON r.id = ab.resort_id
  JOIN guests g ON g.id = ab.guest_id
  JOIN vendor_resorts vr ON vr.vendor_id = ab.vendor_id AND vr.resort_id = ab.resort_id
  WHERE ab.vendor_id = p_vendor_id
    AND ab.status NOT IN ('CANCELLED')
    AND vr.status = 'approved'
    AND s.date BETWEEN p_date_from AND p_date_to
  ORDER BY s.date, s.start_time;
END;
$$;

-- 20) Create function for vendor to update booking status
CREATE OR REPLACE FUNCTION public.vendor_update_booking_status(
  p_booking_id UUID,
  p_new_status vendor_booking_status,
  p_decline_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking activity_bookings%ROWTYPE;
  v_profile profiles%ROWTYPE;
BEGIN
  -- Get current user profile
  SELECT * INTO v_profile FROM profiles WHERE id = auth.uid();
  
  IF v_profile.account_type != 'vendor' OR v_profile.vendor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized as vendor');
  END IF;
  
  -- Get booking
  SELECT * INTO v_booking FROM activity_bookings WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;
  
  -- Verify vendor owns this booking
  IF v_booking.vendor_id != v_profile.vendor_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized for this booking');
  END IF;
  
  -- Verify vendor is approved for this resort
  IF NOT EXISTS (
    SELECT 1 FROM vendor_resorts 
    WHERE vendor_id = v_profile.vendor_id 
      AND resort_id = v_booking.resort_id 
      AND status = 'approved'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vendor not approved for this resort');
  END IF;
  
  -- Update booking status
  UPDATE activity_bookings 
  SET vendor_status = p_new_status,
      updated_at = now()
  WHERE id = p_booking_id;
  
  -- If declining, create a request note
  IF p_new_status = 'DECLINED' AND p_decline_reason IS NOT NULL THEN
    INSERT INTO vendor_booking_requests (booking_id, vendor_id, resort_id, type, message)
    VALUES (p_booking_id, v_profile.vendor_id, v_booking.resort_id, 'NOTE', 'Declined: ' || p_decline_reason);
  END IF;
  
  RETURN jsonb_build_object('success', true, 'new_status', p_new_status);
END;
$$;

-- 21) Enable realtime for vendor tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_resorts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_booking_requests;