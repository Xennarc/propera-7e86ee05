-- =============================================
-- Function to generate/update subscription alerts (simplified)
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_subscription_alerts(threshold_days_param INT DEFAULT 14)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  v_created INT := 0;
  v_resolved INT := 0;
  v_temp INT := 0;
BEGIN
  -- 1. Create EXPIRED alerts for resorts where expires_at < now()
  INSERT INTO public.subscription_alerts (resort_id, alert_type, threshold_days, expires_at, metadata_json)
  SELECT 
    r.id,
    'EXPIRED',
    NULL,
    r.subscription_expires_at,
    jsonb_build_object('generated_at', now(), 'tier', r.subscription_tier)
  FROM public.resorts r
  WHERE r.subscription_expires_at IS NOT NULL
    AND r.subscription_expires_at < now()
    AND NOT EXISTS (
      SELECT 1 FROM public.subscription_alerts a
      WHERE a.resort_id = r.id 
        AND a.alert_type = 'EXPIRED' 
        AND a.is_resolved = false
    )
  ON CONFLICT DO NOTHING;
  
  GET DIAGNOSTICS v_temp = ROW_COUNT;
  v_created := v_created + v_temp;

  -- 2. Create EXPIRING_SOON alerts for resorts expiring within threshold
  INSERT INTO public.subscription_alerts (resort_id, alert_type, threshold_days, expires_at, metadata_json)
  SELECT 
    r.id,
    'EXPIRING_SOON',
    threshold_days_param,
    r.subscription_expires_at,
    jsonb_build_object('generated_at', now(), 'tier', r.subscription_tier)
  FROM public.resorts r
  WHERE r.subscription_expires_at IS NOT NULL
    AND r.subscription_expires_at >= now()
    AND r.subscription_expires_at <= (now() + (threshold_days_param || ' days')::INTERVAL)
    AND NOT EXISTS (
      SELECT 1 FROM public.subscription_alerts a
      WHERE a.resort_id = r.id 
        AND a.alert_type = 'EXPIRING_SOON' 
        AND a.is_resolved = false
    )
  ON CONFLICT DO NOTHING;
  
  GET DIAGNOSTICS v_temp = ROW_COUNT;
  v_created := v_created + v_temp;

  -- 3. Auto-resolve EXPIRING_SOON if subscription was extended beyond threshold
  UPDATE public.subscription_alerts a
  SET 
    is_resolved = true,
    resolved_at = now(),
    metadata_json = a.metadata_json || jsonb_build_object('auto_resolved', true, 'reason', 'subscription_extended')
  FROM public.resorts r
  WHERE a.resort_id = r.id
    AND a.alert_type = 'EXPIRING_SOON'
    AND a.is_resolved = false
    AND (
      r.subscription_expires_at IS NULL 
      OR r.subscription_expires_at > (now() + (threshold_days_param || ' days')::INTERVAL)
    );
  
  GET DIAGNOSTICS v_temp = ROW_COUNT;
  v_resolved := v_resolved + v_temp;

  -- 4. Auto-resolve EXPIRED if subscription was renewed
  UPDATE public.subscription_alerts a
  SET 
    is_resolved = true,
    resolved_at = now(),
    metadata_json = a.metadata_json || jsonb_build_object('auto_resolved', true, 'reason', 'subscription_renewed')
  FROM public.resorts r
  WHERE a.resort_id = r.id
    AND a.alert_type = 'EXPIRED'
    AND a.is_resolved = false
    AND (
      r.subscription_expires_at IS NULL 
      OR r.subscription_expires_at >= now()
    );
  
  GET DIAGNOSTICS v_temp = ROW_COUNT;
  v_resolved := v_resolved + v_temp;

  -- 5. Update last_seen_at for all unresolved alerts
  UPDATE public.subscription_alerts
  SET last_seen_at = now()
  WHERE is_resolved = false;

  -- Return summary
  result := jsonb_build_object(
    'success', true,
    'created_count', v_created,
    'resolved_count', v_resolved,
    'threshold_days', threshold_days_param,
    'run_at', now()
  );

  RETURN result;
END;
$$;

-- Grant execute to service role (for edge function)
GRANT EXECUTE ON FUNCTION public.generate_subscription_alerts(INT) TO service_role;