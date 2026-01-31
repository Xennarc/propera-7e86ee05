-- Allow staff to SELECT resort settings for their resort
CREATE POLICY "Staff can view resort settings"
ON public.resort_settings
FOR SELECT
TO authenticated
USING (
  staff_has_resort_access(auth.uid(), resort_id)
);

-- Allow RESORT_ADMIN to UPDATE resort settings
CREATE POLICY "Resort admins can update resort settings"
ON public.resort_settings
FOR UPDATE
TO authenticated
USING (
  staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
)
WITH CHECK (
  staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
);

-- Allow RESORT_ADMIN to INSERT resort settings (for upsert when row doesn't exist)
CREATE POLICY "Resort admins can insert resort settings"
ON public.resort_settings
FOR INSERT
TO authenticated
WITH CHECK (
  staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
);