-- Rename column to match the standard trigger function
ALTER TABLE public.prearrival_profiles 
  RENAME COLUMN last_updated_at TO updated_at;

-- Update the guest_update_prearrival_profile function to remove manual timestamp update
-- (the trigger will handle it automatically now)
CREATE OR REPLACE FUNCTION public.guest_update_prearrival_profile(
  p_guest_id uuid,
  p_arrival_date date DEFAULT NULL,
  p_arrival_time time DEFAULT NULL,
  p_arrival_flight_number text DEFAULT NULL,
  p_transfer_preference text DEFAULT NULL,
  p_dietary_preferences jsonb DEFAULT NULL,
  p_allergies text DEFAULT NULL,
  p_room_preferences jsonb DEFAULT NULL,
  p_water_comfort_level text DEFAULT NULL,
  p_special_occasions jsonb DEFAULT NULL,
  p_special_requests text DEFAULT NULL,
  p_custom_answers_json jsonb DEFAULT NULL,
  p_guest_names jsonb DEFAULT NULL,
  p_passport_details jsonb DEFAULT NULL,
  p_baggage_count integer DEFAULT NULL,
  p_pickup_notes text DEFAULT NULL,
  p_esignature_name text DEFAULT NULL,
  p_esignature_date date DEFAULT NULL,
  p_policy_acknowledged boolean DEFAULT NULL,
  p_stay_confirmed boolean DEFAULT NULL,
  p_stay_confirmation_notes text DEFAULT NULL,
  p_complete_checkin boolean DEFAULT FALSE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resort_id uuid;
  v_profile_id uuid;
  v_new_status prearrival_status;
BEGIN
  -- Get resort_id from guest
  SELECT resort_id INTO v_resort_id FROM guests WHERE id = p_guest_id;
  
  IF v_resort_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guest not found');
  END IF;

  -- Determine new status
  IF p_complete_checkin THEN
    v_new_status := 'completed';
  ELSE
    v_new_status := 'partial';
  END IF;

  -- Upsert the prearrival profile
  INSERT INTO prearrival_profiles (
    guest_id,
    resort_id,
    arrival_date,
    arrival_time,
    arrival_flight_number,
    transfer_preference,
    dietary_preferences,
    allergies,
    room_preferences,
    water_comfort_level,
    special_occasions,
    special_requests,
    custom_answers_json,
    guest_names,
    passport_details,
    baggage_count,
    pickup_notes,
    esignature_name,
    esignature_date,
    policy_acknowledged_at,
    stay_confirmed,
    stay_confirmation_notes,
    prearrival_status,
    checkin_completed_at
  )
  VALUES (
    p_guest_id,
    v_resort_id,
    p_arrival_date,
    p_arrival_time,
    p_arrival_flight_number,
    p_transfer_preference,
    p_dietary_preferences,
    p_allergies,
    p_room_preferences,
    p_water_comfort_level,
    p_special_occasions,
    p_special_requests,
    p_custom_answers_json,
    p_guest_names,
    p_passport_details,
    p_baggage_count,
    p_pickup_notes,
    p_esignature_name,
    p_esignature_date,
    CASE WHEN p_policy_acknowledged THEN now() ELSE NULL END,
    p_stay_confirmed,
    p_stay_confirmation_notes,
    v_new_status,
    CASE WHEN p_complete_checkin THEN now() ELSE NULL END
  )
  ON CONFLICT (guest_id) DO UPDATE SET
    arrival_date = COALESCE(p_arrival_date, prearrival_profiles.arrival_date),
    arrival_time = COALESCE(p_arrival_time, prearrival_profiles.arrival_time),
    arrival_flight_number = COALESCE(p_arrival_flight_number, prearrival_profiles.arrival_flight_number),
    transfer_preference = COALESCE(p_transfer_preference, prearrival_profiles.transfer_preference),
    dietary_preferences = COALESCE(p_dietary_preferences, prearrival_profiles.dietary_preferences),
    allergies = COALESCE(p_allergies, prearrival_profiles.allergies),
    room_preferences = COALESCE(p_room_preferences, prearrival_profiles.room_preferences),
    water_comfort_level = COALESCE(p_water_comfort_level, prearrival_profiles.water_comfort_level),
    special_occasions = COALESCE(p_special_occasions, prearrival_profiles.special_occasions),
    special_requests = COALESCE(p_special_requests, prearrival_profiles.special_requests),
    custom_answers_json = COALESCE(p_custom_answers_json, prearrival_profiles.custom_answers_json),
    guest_names = COALESCE(p_guest_names, prearrival_profiles.guest_names),
    passport_details = COALESCE(p_passport_details, prearrival_profiles.passport_details),
    baggage_count = COALESCE(p_baggage_count, prearrival_profiles.baggage_count),
    pickup_notes = COALESCE(p_pickup_notes, prearrival_profiles.pickup_notes),
    esignature_name = COALESCE(p_esignature_name, prearrival_profiles.esignature_name),
    esignature_date = COALESCE(p_esignature_date, prearrival_profiles.esignature_date),
    policy_acknowledged_at = CASE 
      WHEN p_policy_acknowledged THEN COALESCE(prearrival_profiles.policy_acknowledged_at, now())
      ELSE prearrival_profiles.policy_acknowledged_at
    END,
    stay_confirmed = COALESCE(p_stay_confirmed, prearrival_profiles.stay_confirmed),
    stay_confirmation_notes = COALESCE(p_stay_confirmation_notes, prearrival_profiles.stay_confirmation_notes),
    prearrival_status = v_new_status,
    checkin_completed_at = CASE 
      WHEN p_complete_checkin THEN COALESCE(prearrival_profiles.checkin_completed_at, now())
      ELSE prearrival_profiles.checkin_completed_at
    END
  RETURNING id INTO v_profile_id;

  RETURN jsonb_build_object('success', true, 'profile_id', v_profile_id);
END;
$$;