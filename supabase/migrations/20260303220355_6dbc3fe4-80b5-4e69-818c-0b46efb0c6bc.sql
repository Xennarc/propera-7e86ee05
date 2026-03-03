
-- Asset type enum
CREATE TYPE public.session_asset_type AS ENUM ('guide', 'boat', 'equipment');

-- Session asset assignments table
CREATE TABLE public.session_asset_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.activity_sessions(id) ON DELETE CASCADE,
  asset_type public.session_asset_type NOT NULL,
  asset_ref_id UUID NULL,
  asset_label TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saa_session ON public.session_asset_assignments(session_id);
CREATE INDEX idx_saa_ref ON public.session_asset_assignments(resort_id, asset_type, asset_ref_id) WHERE asset_ref_id IS NOT NULL;
CREATE INDEX idx_saa_label ON public.session_asset_assignments(resort_id, asset_type, asset_label);

ALTER TABLE public.session_asset_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_session_assets"
ON public.session_asset_assignments
FOR SELECT TO authenticated
USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "staff_manage_session_assets"
ON public.session_asset_assignments
FOR ALL TO authenticated
USING (public.staff_has_resort_access(auth.uid(), resort_id))
WITH CHECK (public.staff_has_resort_access(auth.uid(), resort_id));
