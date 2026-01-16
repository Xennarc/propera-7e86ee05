-- Add policy to allow guests (anon) to view bookable activities without JWT
-- This enables the guest booking page to join activities via activity_sessions
CREATE POLICY "anon_guest_can_view_bookable_activities"
  ON public.activities
  FOR SELECT
  TO anon
  USING (
    is_active = true 
    AND guest_can_book = true
  );