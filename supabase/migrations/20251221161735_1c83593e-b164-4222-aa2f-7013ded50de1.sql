-- Update validate_prearrival_link to skip verification when p_last_name is empty
CREATE OR REPLACE FUNCTION public.validate_prearrival_link(p_token TEXT, p_last_name TEXT DEFAULT '')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link prearrival_tokens%ROWTYPE;
  v_guest guests%ROWTYPE;
  v_resort resorts%ROWTYPE;
  v_settings prearrival_settings%ROWTYPE;
  v_profile prearrival_profiles%ROWTYPE;
BEGIN
  -- Find the link
  SELECT * INTO v_link
  FROM prearrival_tokens
  WHERE token = p_token;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'LINK_NOT_FOUND');
  END IF;
  
  -- Check if expired
  IF v_link.expires_at < NOW() THEN
    UPDATE prearrival_tokens SET status = 'expired' WHERE id = v_link.id;
    RETURN jsonb_build_object('success', false, 'error', 'LINK_EXPIRED');
  END IF;
  
  -- Check if revoked
  IF v_link.status = 'revoked' THEN
    RETURN jsonb_build_object('success', false, 'error', 'LINK_REVOKED');
  END IF;
  
  -- Get guest
  SELECT * INTO v_guest FROM guests WHERE id = v_link.guest_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'GUEST_NOT_FOUND');
  END IF;
  
  -- Get resort
  SELECT * INTO v_resort FROM resorts WHERE id = v_link.resort_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'RESORT_NOT_FOUND');
  END IF;
  
  -- Get settings
  SELECT * INTO v_settings FROM prearrival_settings WHERE resort_id = v_link.resort_id;
  
  -- Update last opened
  UPDATE prearrival_tokens SET last_opened_at = NOW() WHERE id = v_link.id;
  
  -- Get or create profile
  PERFORM get_or_create_prearrival_profile(v_link.guest_id);
  SELECT * INTO v_profile FROM prearrival_profiles WHERE guest_id = v_link.guest_id;
  
  -- Skip verification entirely - return full access
  RETURN jsonb_build_object(
    'success', true,
    'requires_verification', false,
    'data', jsonb_build_object(
      'link', jsonb_build_object(
        'id', v_link.id,
        'status', v_link.status,
        'expires_at', v_link.expires_at,
        'completed_at', v_link.completed_at
      ),
      'guest', jsonb_build_object(
        'id', v_guest.id,
        'full_name', v_guest.full_name,
        'room_number', v_guest.room_number,
        'check_in_date', v_guest.check_in_date,
        'check_out_date', v_guest.check_out_date,
        'is_vip', v_guest.is_vip,
        'loyalty_tier', v_guest.loyalty_tier
      ),
      'resort', jsonb_build_object(
        'id', v_resort.id,
        'name', v_resort.name,
        'code', v_resort.code,
        'login_logo_url', v_resort.login_logo_url,
        'login_primary_color', v_resort.login_primary_color,
        'login_accent_color', v_resort.login_accent_color
      ),
      'settings', jsonb_build_object(
        'is_enabled', COALESCE(v_settings.is_enabled, false),
        'verification_mode', COALESCE(v_settings.verification_mode, 'none'),
        'allow_activity_bookings', COALESCE(v_settings.allow_activity_bookings, true),
        'allow_dining_bookings', COALESCE(v_settings.allow_dining_bookings, true),
        'show_arrival_details', COALESCE(v_settings.show_arrival_details, true),
        'show_preferences', COALESCE(v_settings.show_preferences, true),
        'show_special_occasions', COALESCE(v_settings.show_special_occasions, true),
        'welcome_message', v_settings.welcome_message
      ),
      'profile', jsonb_build_object(
        'prearrival_status', COALESCE(v_profile.prearrival_status, 'not_started'),
        'checkin_completed_at', v_profile.checkin_completed_at,
        'arrival_time', v_profile.arrival_time,
        'arrival_flight_number', v_profile.arrival_flight_number,
        'transfer_preference', v_profile.transfer_preference,
        'dietary_preferences', v_profile.dietary_preferences,
        'special_occasions', v_profile.special_occasions,
        'water_comfort_level', v_profile.water_comfort_level,
        'special_requests', v_profile.special_requests
      )
    )
  );
END;
$$;