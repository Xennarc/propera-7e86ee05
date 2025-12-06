-- Enable RLS on rate_limit_logs table
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Only SUPER_ADMINs can view rate limit logs
CREATE POLICY "Super admins can view rate limit logs"
ON public.rate_limit_logs
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- The cleanup trigger function already has SECURITY DEFINER, so it bypasses RLS
-- No additional INSERT/DELETE policies needed for the trigger