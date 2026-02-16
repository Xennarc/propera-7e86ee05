-- Remove the overly permissive public SELECT policy on prearrival_settings.
-- Guest portal uses the guest_get_prearrival_data RPC (SECURITY DEFINER) instead.
-- Staff access is covered by existing staff/admin policies.
DROP POLICY "Anyone can view enabled prearrival settings" ON public.prearrival_settings;