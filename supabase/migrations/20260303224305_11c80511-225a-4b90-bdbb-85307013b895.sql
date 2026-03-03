
-- ═══════════════════════════════════════════════════════════════
-- Phase G0: activity_booking_readiness table + RLS + trigger + storage
-- Additive only — does NOT touch existing tables/RPCs
-- ═══════════════════════════════════════════════════════════════

-- 1) Create table
CREATE TABLE public.activity_booking_readiness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.activity_bookings(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.activity_sessions(id) ON DELETE CASCADE,
  waiver_status TEXT NOT NULL DEFAULT 'unknown',
  medical_status TEXT NOT NULL DEFAULT 'unknown',
  cert_status TEXT NOT NULL DEFAULT 'unknown',
  gear_status TEXT NOT NULL DEFAULT 'unknown',
  gear_json JSONB NULL,
  cert_media_path TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_activity_booking_readiness_booking UNIQUE (booking_id)
);

-- Indexes
CREATE INDEX idx_abr_resort ON public.activity_booking_readiness(resort_id);
CREATE INDEX idx_abr_session ON public.activity_booking_readiness(session_id);
CREATE INDEX idx_abr_guest ON public.activity_booking_readiness(guest_id);

-- 2) RLS
ALTER TABLE public.activity_booking_readiness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_booking_readiness FORCE ROW LEVEL SECURITY;

-- Staff: full CRUD within resort
CREATE POLICY "staff_all_abr"
  ON public.activity_booking_readiness FOR ALL
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id))
  WITH CHECK (public.staff_has_resort_access(auth.uid(), resort_id));

-- Guest: SELECT own rows
CREATE POLICY "guest_select_abr"
  ON public.activity_booking_readiness FOR SELECT
  TO anon
  USING (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

-- Guest: INSERT own rows (fallback upsert from app)
CREATE POLICY "guest_insert_abr"
  ON public.activity_booking_readiness FOR INSERT
  TO anon
  WITH CHECK (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

-- Guest: UPDATE own rows (waiver, medical, cert, gear fields)
CREATE POLICY "guest_update_abr"
  ON public.activity_booking_readiness FOR UPDATE
  TO anon
  USING (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  )
  WITH CHECK (
    public.guest_can_access_guest(guest_id)
    AND (auth.jwt() ->> 'resort_id')::uuid = resort_id
  );

-- 3) Auto-create trigger on activity_bookings insert
CREATE OR REPLACE FUNCTION public.trg_create_booking_readiness()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_booking_readiness (
    resort_id, booking_id, guest_id, session_id
  ) VALUES (
    NEW.resort_id, NEW.id, NEW.guest_id, NEW.session_id
  )
  ON CONFLICT (booking_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activity_booking_readiness_auto
  AFTER INSERT ON public.activity_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_create_booking_readiness();

-- 4) Updated_at auto-touch
CREATE OR REPLACE FUNCTION public.trg_abr_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_abr_set_updated_at
  BEFORE UPDATE ON public.activity_booking_readiness
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_abr_updated_at();

-- 5) Storage bucket for cert uploads (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-certs', 'activity-certs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: guest upload to own path (resort_id/guest_id/booking_id/*)
CREATE POLICY "guest_upload_certs"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'activity-certs'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'resort_id')
    AND (storage.foldername(name))[2] = (auth.jwt() ->> 'guest_id')
  );

-- Guest can read own certs
CREATE POLICY "guest_read_own_certs"
  ON storage.objects FOR SELECT
  TO anon
  USING (
    bucket_id = 'activity-certs'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'resort_id')
    AND (storage.foldername(name))[2] = (auth.jwt() ->> 'guest_id')
  );

-- Staff can read all certs in their resort
CREATE POLICY "staff_read_resort_certs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'activity-certs'
    AND public.staff_has_resort_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_booking_readiness;
