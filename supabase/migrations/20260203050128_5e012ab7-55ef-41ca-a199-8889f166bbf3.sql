-- Allow transport staff (TRANSPORT, MANAGER, RESORT_ADMIN) to view resort memberships
-- This enables the Add Driver dropdown to show eligible staff members
CREATE POLICY "transport_staff_view_memberships"
ON public.resort_memberships
FOR SELECT
TO authenticated
USING (
  public.staff_can_write_transport(auth.uid(), resort_id)
);