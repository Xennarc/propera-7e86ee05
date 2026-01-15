-- ============================================================
-- Add origin tagging for demo cleanup + demo_reset_logs table
-- ============================================================

-- 1. Add origin column to activity_bookings (seed vs demo_user)
ALTER TABLE public.activity_bookings 
ADD COLUMN IF NOT EXISTS origin text DEFAULT NULL;

-- 2. Add origin column to restaurant_reservations
ALTER TABLE public.restaurant_reservations 
ADD COLUMN IF NOT EXISTS origin text DEFAULT NULL;

-- 3. Add origin column to guest_requests
ALTER TABLE public.guest_requests 
ADD COLUMN IF NOT EXISTS origin text DEFAULT NULL;

-- 4. Create demo_reset_logs table for tracking reset operations
CREATE TABLE IF NOT EXISTS public.demo_reset_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL DEFAULT 'run', -- 'run' or 'dry_run'
  deleted_counts_json jsonb DEFAULT '{}',
  freshness_updates_json jsonb DEFAULT '{}',
  availability_updates_json jsonb DEFAULT '{}',
  seeded_bookings_json jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'started', -- 'started', 'success', 'failed'
  error_message text DEFAULT NULL,
  duration_ms integer DEFAULT NULL
);

-- 5. Add indexes for efficient demo cleanup queries
CREATE INDEX IF NOT EXISTS idx_activity_bookings_origin_demo 
ON public.activity_bookings(origin) 
WHERE origin IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_restaurant_reservations_origin_demo 
ON public.restaurant_reservations(origin) 
WHERE origin IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guest_requests_origin_demo 
ON public.guest_requests(origin) 
WHERE origin IS NOT NULL;

-- 6. Add comment for documentation
COMMENT ON COLUMN public.activity_bookings.origin IS 'Origin of booking: seed (seeded demo data), demo_user (demo prospect action), null (real booking)';
COMMENT ON COLUMN public.restaurant_reservations.origin IS 'Origin of reservation: seed (seeded demo data), demo_user (demo prospect action), null (real booking)';
COMMENT ON COLUMN public.guest_requests.origin IS 'Origin of request: seed (seeded demo data), demo_user (demo prospect action), null (real request)';

-- 7. Enable RLS on demo_reset_logs (super admin only)
ALTER TABLE public.demo_reset_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view demo reset logs"
ON public.demo_reset_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.global_role = 'SUPER_ADMIN'
  )
);

-- Note: Insert/Update/Delete handled by edge function with service role