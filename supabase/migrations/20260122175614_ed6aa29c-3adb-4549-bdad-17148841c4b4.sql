-- Add rate limiting to guest creation RPCs
-- This migration adds check_rate_limit calls to prevent abuse

-- Drop existing function with wrong parameter order and recreate
DROP FUNCTION IF EXISTS public.guest_cancel_service_request(UUID, UUID, UUID);

-- Update guest_cancel_service_request with rate limiting
CREATE FUNCTION public.guest_cancel_service_request(
  p_resort_id UUID,
  p_guest_id UUID,
  p_request_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  -- Rate limit: 10 cancellations per hour per guest
  PERFORM check_rate_limit(
    'guest_cancel_service_request',
    p_guest_id::TEXT,
    10,
    60
  );

  -- Get current status
  SELECT status INTO v_current_status
  FROM service_requests
  WHERE id = p_request_id 
    AND guest_id = p_guest_id 
    AND resort_id = p_resort_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  -- Only allow cancelling NEW or ACKNOWLEDGED requests
  IF v_current_status NOT IN ('NEW', 'ACKNOWLEDGED') THEN
    RAISE EXCEPTION 'Cannot cancel request with status: %', v_current_status;
  END IF;

  UPDATE service_requests
  SET 
    status = 'CANCELLED',
    cancelled_at = NOW()
  WHERE id = p_request_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.guest_cancel_service_request(UUID, UUID, UUID) TO authenticated, anon;