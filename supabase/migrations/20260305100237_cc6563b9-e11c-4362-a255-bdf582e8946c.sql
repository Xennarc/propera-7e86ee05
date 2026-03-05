-- Staff shifts: availability windows for department staff
CREATE TABLE public.staff_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES public.resorts(id),
  department_key text NOT NULL,
  user_id uuid NOT NULL,
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_shifts_lookup ON public.staff_shifts (resort_id, department_key, shift_date);
CREATE INDEX idx_staff_shifts_user ON public.staff_shifts (user_id, shift_date);

ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff shifts visible to resort staff"
  ON public.staff_shifts FOR SELECT TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "Staff shifts managed by resort staff"
  ON public.staff_shifts FOR INSERT TO authenticated
  WITH CHECK (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "Staff shifts update by resort staff"
  ON public.staff_shifts FOR UPDATE TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "Staff shifts delete by resort staff"
  ON public.staff_shifts FOR DELETE TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

-- Asset unavailability: maintenance/offline windows
CREATE TABLE public.asset_unavailability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES public.resorts(id),
  asset_id uuid NOT NULL REFERENCES public.ops_assets(id) ON DELETE CASCADE,
  unavailable_date date NOT NULL,
  start_time time,
  end_time time,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_asset_unavailability_lookup ON public.asset_unavailability (resort_id, asset_id, unavailable_date);

ALTER TABLE public.asset_unavailability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Asset unavailability visible to resort staff"
  ON public.asset_unavailability FOR SELECT TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "Asset unavailability managed by resort staff"
  ON public.asset_unavailability FOR INSERT TO authenticated
  WITH CHECK (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "Asset unavailability update by resort staff"
  ON public.asset_unavailability FOR UPDATE TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "Asset unavailability delete by resort staff"
  ON public.asset_unavailability FOR DELETE TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.asset_unavailability;