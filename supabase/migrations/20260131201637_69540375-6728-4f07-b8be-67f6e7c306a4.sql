-- Create subscription_alerts table for tracking expiring/expired subscriptions
CREATE TABLE public.subscription_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('EXPIRING_SOON', 'EXPIRED')),
  threshold_days INTEGER,
  expires_at TIMESTAMPTZ,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(resort_id, alert_type)
);

-- Enable RLS
ALTER TABLE public.subscription_alerts ENABLE ROW LEVEL SECURITY;

-- Super admin can manage all alerts
CREATE POLICY "Super admins can manage subscription alerts"
ON public.subscription_alerts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.global_role = 'SUPER_ADMIN'
  )
);

-- Create the generate_subscription_alerts function
CREATE OR REPLACE FUNCTION public.generate_subscription_alerts(threshold_days_param INTEGER DEFAULT 14)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_count INTEGER := 0;
  v_resolved_count INTEGER := 0;
  v_temp_count INTEGER := 0;
BEGIN
  -- Upsert EXPIRING_SOON alerts for resorts expiring within threshold
  WITH upserted AS (
    INSERT INTO subscription_alerts (resort_id, alert_type, threshold_days, expires_at, last_seen_at)
    SELECT 
      r.id,
      'EXPIRING_SOON',
      threshold_days_param,
      r.subscription_expires_at,
      now()
    FROM resorts r
    WHERE r.subscription_expires_at IS NOT NULL
      AND r.subscription_expires_at > now()
      AND r.subscription_expires_at <= now() + (threshold_days_param || ' days')::interval
    ON CONFLICT (resort_id, alert_type)
    DO UPDATE SET
      expires_at = EXCLUDED.expires_at,
      last_seen_at = now(),
      threshold_days = EXCLUDED.threshold_days
    RETURNING 1
  )
  SELECT count(*) INTO v_created_count FROM upserted;

  -- Upsert EXPIRED alerts for resorts past expiration
  WITH upserted AS (
    INSERT INTO subscription_alerts (resort_id, alert_type, expires_at, last_seen_at)
    SELECT 
      r.id,
      'EXPIRED',
      r.subscription_expires_at,
      now()
    FROM resorts r
    WHERE r.subscription_expires_at IS NOT NULL
      AND r.subscription_expires_at <= now()
    ON CONFLICT (resort_id, alert_type)
    DO UPDATE SET
      expires_at = EXCLUDED.expires_at,
      last_seen_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_temp_count FROM upserted;
  
  v_created_count := v_created_count + v_temp_count;

  -- Auto-resolve alerts where subscription was extended/renewed
  WITH resolved AS (
    UPDATE subscription_alerts
    SET is_resolved = true, resolved_at = now()
    WHERE is_resolved = false
      AND alert_type = 'EXPIRING_SOON'
      AND resort_id IN (
        SELECT r.id FROM resorts r
        WHERE r.subscription_expires_at > now() + (threshold_days_param || ' days')::interval
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_resolved_count FROM resolved;

  -- Auto-resolve EXPIRED alerts if subscription is now valid
  WITH resolved AS (
    UPDATE subscription_alerts
    SET is_resolved = true, resolved_at = now()
    WHERE is_resolved = false
      AND alert_type = 'EXPIRED'
      AND resort_id IN (
        SELECT r.id FROM resorts r
        WHERE r.subscription_expires_at > now()
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_temp_count FROM resolved;
  
  v_resolved_count := v_resolved_count + v_temp_count;

  RETURN jsonb_build_object(
    'success', true,
    'created_count', v_created_count,
    'resolved_count', v_resolved_count,
    'threshold_days', threshold_days_param,
    'run_at', now()
  );
END;
$$;