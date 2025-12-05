-- Create rate limit tracking table
CREATE TABLE public.rate_limit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  identifier text NOT NULL,
  secondary_key text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS (deny all direct access - only edge functions with service role can access)
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Index for efficient lookups
CREATE INDEX idx_rate_limit_lookup ON public.rate_limit_logs(endpoint, identifier, created_at DESC);
CREATE INDEX idx_rate_limit_secondary ON public.rate_limit_logs(endpoint, secondary_key, created_at DESC);

-- Auto-cleanup function: delete logs older than 1 hour
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limit_logs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.rate_limit_logs WHERE created_at < NOW() - INTERVAL '1 hour';
  RETURN NEW;
END;
$$;

-- Run cleanup periodically (on ~1% of inserts)
CREATE TRIGGER rate_limit_cleanup_trigger
  AFTER INSERT ON public.rate_limit_logs
  FOR EACH ROW
  WHEN (random() < 0.01)
  EXECUTE FUNCTION public.cleanup_old_rate_limit_logs();