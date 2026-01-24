-- ============================================
-- PHASE 1: BACKFILL MIGRATION
-- Safe migration from legacy pre-arrival system
-- ============================================

-- 1. Add legacy_token_id column to guest_access_links for tracking migrated tokens
ALTER TABLE public.guest_access_links 
ADD COLUMN IF NOT EXISTS legacy_token_id UUID REFERENCES prearrival_tokens(id);

-- 2. Create backfill RPC: Creates guest_stays from existing guests
CREATE OR REPLACE FUNCTION public.backfill_guest_stays_from_guests()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_count INT := 0;
  v_guest RECORD;
BEGIN
  FOR v_guest IN
    SELECT g.id, g.resort_id, g.check_in_date, g.check_out_date, g.room_number
    FROM guests g
    WHERE NOT EXISTS (
      SELECT 1 FROM guest_stays gs 
      WHERE gs.guest_id = g.id 
        AND gs.resort_id = g.resort_id
        AND gs.arrival_date = g.check_in_date
    )
    AND g.check_in_date IS NOT NULL
    AND g.check_out_date IS NOT NULL
  LOOP
    INSERT INTO guest_stays (
      resort_id, guest_id, arrival_date, departure_date, room_number, status
    ) VALUES (
      v_guest.resort_id,
      v_guest.id,
      v_guest.check_in_date,
      v_guest.check_out_date,
      v_guest.room_number,
      CASE 
        WHEN v_guest.check_out_date < CURRENT_DATE THEN 'checked_out'
        WHEN v_guest.check_in_date <= CURRENT_DATE THEN 'in_house'
        ELSE 'pre_arrival'
      END
    )
    ON CONFLICT DO NOTHING;
    
    v_inserted_count := v_inserted_count + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'inserted', v_inserted_count
  );
END;
$$;

-- 3. Create backfill RPC: Migrates prearrival_profiles to pre_arrival_submissions
CREATE OR REPLACE FUNCTION public.backfill_submissions_from_profiles()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_migrated_count INT := 0;
  v_profile RECORD;
  v_stay_id UUID;
  v_payload JSONB;
BEGIN
  FOR v_profile IN
    SELECT pp.* 
    FROM prearrival_profiles pp
    WHERE pp.prearrival_status IN ('partial', 'completed')
  LOOP
    -- Find matching stay
    SELECT gs.id INTO v_stay_id
    FROM guest_stays gs
    WHERE gs.guest_id = v_profile.guest_id
      AND gs.resort_id = v_profile.resort_id
    ORDER BY gs.arrival_date DESC
    LIMIT 1;
    
    IF v_stay_id IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Skip if submission already exists
    IF EXISTS (SELECT 1 FROM pre_arrival_submissions WHERE stay_id = v_stay_id) THEN
      CONTINUE;
    END IF;
    
    -- Build payload from profile
    v_payload := jsonb_build_object(
      'arrival_time', v_profile.arrival_time,
      'arrival_flight_number', v_profile.arrival_flight_number,
      'transfer_preference', v_profile.transfer_preference,
      'dietary_preferences', COALESCE(to_jsonb(v_profile.dietary_preferences), '[]'::jsonb),
      'allergies', v_profile.allergies,
      'water_comfort_level', v_profile.water_comfort_level,
      'special_occasions', COALESCE(to_jsonb(v_profile.special_occasions), '[]'::jsonb),
      'special_requests', v_profile.special_requests,
      'room_preferences', COALESCE(v_profile.room_preferences, '{}'::jsonb),
      'custom_answers_json', COALESCE(v_profile.custom_answers_json, '{}'::jsonb)
    );
    
    INSERT INTO pre_arrival_submissions (
      resort_id, stay_id, guest_id, payload, 
      completed_at, updated_at
    ) VALUES (
      v_profile.resort_id,
      v_stay_id,
      v_profile.guest_id,
      v_payload,
      CASE WHEN v_profile.prearrival_status = 'completed' THEN v_profile.checkin_completed_at END,
      COALESCE(v_profile.updated_at, NOW())
    );
    
    v_migrated_count := v_migrated_count + 1;
  END LOOP;
  
  RETURN json_build_object('success', true, 'migrated', v_migrated_count);
END;
$$;

-- 4. Create backfill RPC: Links legacy prearrival_tokens to guest_access_links
CREATE OR REPLACE FUNCTION public.link_legacy_tokens_to_stays()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linked_count INT := 0;
  v_token RECORD;
  v_stay_id UUID;
  v_token_hash TEXT;
BEGIN
  FOR v_token IN
    SELECT pt.* FROM prearrival_tokens pt
    WHERE pt.revoked_at IS NULL
      AND pt.expires_at > NOW()
  LOOP
    -- Find matching stay
    SELECT gs.id INTO v_stay_id
    FROM guest_stays gs
    WHERE gs.guest_id = v_token.guest_id
      AND gs.resort_id = v_token.resort_id
    ORDER BY gs.arrival_date DESC
    LIMIT 1;
    
    IF v_stay_id IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Generate token hash
    v_token_hash := encode(extensions.digest(v_token.token::bytea, 'sha256'), 'hex');
    
    -- Skip if already linked
    IF EXISTS (SELECT 1 FROM guest_access_links WHERE legacy_token_id = v_token.id) THEN
      CONTINUE;
    END IF;
    
    -- Create guest_access_link pointing to the stay
    INSERT INTO guest_access_links (
      resort_id, stay_id, guest_id, token_hash, expires_at, purpose, legacy_token_id
    ) VALUES (
      v_token.resort_id,
      v_stay_id,
      v_token.guest_id,
      v_token_hash,
      v_token.expires_at,
      'legacy_migration',
      v_token.id
    )
    ON CONFLICT (token_hash) DO NOTHING;
    
    v_linked_count := v_linked_count + 1;
  END LOOP;
  
  RETURN json_build_object('success', true, 'linked', v_linked_count);
END;
$$;

-- 5. Create unified RPC for reading prearrival data with fallback
CREATE OR REPLACE FUNCTION public.get_prearrival_data_unified(p_guest_id uuid, p_resort_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stay guest_stays%ROWTYPE;
  v_submission pre_arrival_submissions%ROWTYPE;
  v_profile prearrival_profiles%ROWTYPE;
BEGIN
  -- Try to find active stay (priority: in_house > pre_arrival > most recent)
  SELECT * INTO v_stay
  FROM guest_stays
  WHERE guest_id = p_guest_id AND resort_id = p_resort_id
  ORDER BY 
    CASE status 
      WHEN 'in_house' THEN 1 
      WHEN 'pre_arrival' THEN 2 
      ELSE 3 
    END, 
    arrival_date DESC
  LIMIT 1;
  
  IF v_stay.id IS NOT NULL THEN
    -- Try new submission system
    SELECT * INTO v_submission
    FROM pre_arrival_submissions
    WHERE stay_id = v_stay.id;
    
    IF v_submission.id IS NOT NULL THEN
      RETURN json_build_object(
        'source', 'new_system',
        'stay_id', v_stay.id,
        'stay', json_build_object(
          'id', v_stay.id,
          'status', v_stay.status,
          'arrival_date', v_stay.arrival_date,
          'departure_date', v_stay.departure_date,
          'room_number', v_stay.room_number
        ),
        'data', v_submission.payload,
        'completed_at', v_submission.completed_at,
        'updated_at', v_submission.updated_at
      );
    END IF;
  END IF;
  
  -- Fallback to legacy profile
  SELECT * INTO v_profile
  FROM prearrival_profiles
  WHERE guest_id = p_guest_id AND resort_id = p_resort_id;
  
  IF v_profile.id IS NOT NULL THEN
    RETURN json_build_object(
      'source', 'legacy_system',
      'stay_id', v_stay.id,
      'stay', CASE WHEN v_stay.id IS NOT NULL THEN json_build_object(
        'id', v_stay.id,
        'status', v_stay.status,
        'arrival_date', v_stay.arrival_date,
        'departure_date', v_stay.departure_date,
        'room_number', v_stay.room_number
      ) ELSE NULL END,
      'data', json_build_object(
        'arrival_time', v_profile.arrival_time,
        'arrival_flight_number', v_profile.arrival_flight_number,
        'transfer_preference', v_profile.transfer_preference,
        'dietary_preferences', v_profile.dietary_preferences,
        'allergies', v_profile.allergies,
        'water_comfort_level', v_profile.water_comfort_level,
        'special_occasions', v_profile.special_occasions,
        'special_requests', v_profile.special_requests,
        'room_preferences', v_profile.room_preferences,
        'custom_answers_json', v_profile.custom_answers_json
      ),
      'completed_at', v_profile.checkin_completed_at,
      'updated_at', v_profile.updated_at
    );
  END IF;
  
  RETURN json_build_object(
    'source', 'none', 
    'stay_id', v_stay.id,
    'stay', CASE WHEN v_stay.id IS NOT NULL THEN json_build_object(
      'id', v_stay.id,
      'status', v_stay.status,
      'arrival_date', v_stay.arrival_date,
      'departure_date', v_stay.departure_date,
      'room_number', v_stay.room_number
    ) ELSE NULL END,
    'data', NULL
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.backfill_guest_stays_from_guests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_submissions_from_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_legacy_tokens_to_stays() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_prearrival_data_unified(uuid, uuid) TO anon, authenticated;