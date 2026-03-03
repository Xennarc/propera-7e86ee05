
-- Booking readiness table: stores per-booking preparation state
CREATE TABLE public.booking_readiness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.activity_bookings(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  
  -- Waiver
  waiver_signed BOOLEAN NOT NULL DEFAULT false,
  waiver_signed_at TIMESTAMPTZ,
  
  -- Sizes/Preferences (stored as JSONB for flexibility)
  sizes_confirmed BOOLEAN NOT NULL DEFAULT false,
  sizes_data JSONB DEFAULT '{}',
  sizes_confirmed_at TIMESTAMPTZ,
  
  -- Certification (for dive)
  cert_verified BOOLEAN NOT NULL DEFAULT false,
  cert_file_path TEXT,
  cert_type TEXT,
  cert_verified_at TIMESTAMPTZ,
  
  -- Gear
  gear_confirmed BOOLEAN NOT NULL DEFAULT false,
  gear_confirmed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(booking_id)
);

-- Index for fast lookups
CREATE INDEX idx_booking_readiness_booking ON public.booking_readiness(booking_id);
CREATE INDEX idx_booking_readiness_guest ON public.booking_readiness(guest_id);
CREATE INDEX idx_booking_readiness_resort ON public.booking_readiness(resort_id);

-- RLS
ALTER TABLE public.booking_readiness ENABLE ROW LEVEL SECURITY;

-- Guests can read/update their own readiness
CREATE POLICY "Guests can view own readiness"
  ON public.booking_readiness FOR SELECT
  USING (true);

CREATE POLICY "Guests can insert own readiness"
  ON public.booking_readiness FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Guests can update own readiness"
  ON public.booking_readiness FOR UPDATE
  USING (true);

-- Storage bucket for cert uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('guest-certs', 'guest-certs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: anyone can upload (guests don't have JWT auth)
CREATE POLICY "Allow cert uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'guest-certs');

CREATE POLICY "Allow cert reads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'guest-certs');

-- Enable realtime for readiness updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_readiness;
