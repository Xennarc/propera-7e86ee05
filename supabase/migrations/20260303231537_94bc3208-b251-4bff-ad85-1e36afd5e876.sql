
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Immutable resort_id trigger function
CREATE OR REPLACE FUNCTION public.prevent_resort_id_change()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO public
AS $$
BEGIN
  IF OLD.resort_id IS DISTINCT FROM NEW.resort_id THEN
    RAISE EXCEPTION 'resort_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

-- A) ops_assets
CREATE TABLE IF NOT EXISTS public.ops_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('boat', 'equipment')),
  name text NOT NULL,
  capacity_int int NULL,
  meta_json jsonb NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(resort_id, type, name)
);

ALTER TABLE public.ops_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_assets FORCE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read ops_assets"
  ON public.ops_assets FOR SELECT TO authenticated
  USING (public.staff_has_resort_access(resort_id, auth.uid()));

CREATE POLICY "Staff can insert ops_assets"
  ON public.ops_assets FOR INSERT TO authenticated
  WITH CHECK (public.staff_has_resort_access(resort_id, auth.uid()));

CREATE POLICY "Staff can update ops_assets"
  ON public.ops_assets FOR UPDATE TO authenticated
  USING (public.staff_has_resort_access(resort_id, auth.uid()))
  WITH CHECK (public.staff_has_resort_access(resort_id, auth.uid()));

CREATE POLICY "Super admin full ops_assets"
  ON public.ops_assets FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER set_ops_assets_updated_at
  BEFORE UPDATE ON public.ops_assets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_ops_assets_immutable_resort
  BEFORE UPDATE ON public.ops_assets
  FOR EACH ROW EXECUTE FUNCTION public.prevent_resort_id_change();

-- Extend session_asset_assignments (additive columns)
ALTER TABLE public.session_asset_assignments
  ADD COLUMN IF NOT EXISTS asset_id uuid NULL REFERENCES public.ops_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_by uuid NULL;

-- B) session_staff_assignments
CREATE TABLE IF NOT EXISTS public.session_staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.activity_sessions(id) ON DELETE CASCADE,
  staff_user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('guide', 'instructor', 'captain', 'crew')),
  assigned_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, staff_user_id, role)
);

ALTER TABLE public.session_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_staff_assignments FORCE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read session_staff_assignments"
  ON public.session_staff_assignments FOR SELECT TO authenticated
  USING (public.staff_has_resort_access(resort_id, auth.uid()));

CREATE POLICY "Staff can insert session_staff_assignments"
  ON public.session_staff_assignments FOR INSERT TO authenticated
  WITH CHECK (public.staff_has_resort_access(resort_id, auth.uid()));

CREATE POLICY "Staff can delete session_staff_assignments"
  ON public.session_staff_assignments FOR DELETE TO authenticated
  USING (public.staff_has_resort_access(resort_id, auth.uid()));

CREATE POLICY "Super admin full session_staff_assignments"
  ON public.session_staff_assignments FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_session_staff_immutable_resort
  BEFORE UPDATE ON public.session_staff_assignments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_resort_id_change();

-- C) Extend activity_booking_readiness
ALTER TABLE public.activity_booking_readiness
  ADD COLUMN IF NOT EXISTS cert_verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS cert_verified_by uuid NULL,
  ADD COLUMN IF NOT EXISTS cert_verified_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS cert_notes text NULL,
  ADD COLUMN IF NOT EXISTS medical_review_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS medical_reviewed_by uuid NULL,
  ADD COLUMN IF NOT EXISTS medical_reviewed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS medical_notes text NULL,
  ADD COLUMN IF NOT EXISTS medical_answers_json jsonb NULL;

-- D) session_transport_links
CREATE TABLE IF NOT EXISTS public.session_transport_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.activity_sessions(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES public.buggy_trips(id) ON DELETE CASCADE,
  link_type text NOT NULL CHECK (link_type IN ('pickup', 'dropoff')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, link_type)
);

ALTER TABLE public.session_transport_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_transport_links FORCE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read session_transport_links"
  ON public.session_transport_links FOR SELECT TO authenticated
  USING (public.staff_has_resort_access(resort_id, auth.uid()));

CREATE POLICY "Staff can insert session_transport_links"
  ON public.session_transport_links FOR INSERT TO authenticated
  WITH CHECK (public.staff_has_resort_access(resort_id, auth.uid()));

CREATE POLICY "Staff can delete session_transport_links"
  ON public.session_transport_links FOR DELETE TO authenticated
  USING (public.staff_has_resort_access(resort_id, auth.uid()));

CREATE POLICY "Super admin full session_transport_links"
  ON public.session_transport_links FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_session_transport_links_immutable_resort
  BEFORE UPDATE ON public.session_transport_links
  FOR EACH ROW EXECUTE FUNCTION public.prevent_resort_id_change();
