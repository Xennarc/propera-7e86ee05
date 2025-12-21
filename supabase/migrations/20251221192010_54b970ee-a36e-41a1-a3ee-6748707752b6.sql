-- Drop both function overloads to resolve the ambiguity
DROP FUNCTION IF EXISTS public.guest_update_prearrival_profile(uuid, date, time without time zone, text, text, jsonb, text, jsonb, text, jsonb, text, jsonb);
DROP FUNCTION IF EXISTS public.guest_update_prearrival_profile(uuid, date, time without time zone, text, text, jsonb, text, jsonb, text, jsonb, text, jsonb, jsonb, jsonb, integer, text, text, date, boolean, boolean, text, boolean);

-- Recreate the function with all parameters
CREATE OR REPLACE FUNCTION public.guest_update_prearrival_profile(
  p_guest_id uuid,
  p_arrival_date date DEFAULT NULL,
  p_arrival_time time without time zone DEFAULT NULL,
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
  p_complete_checkin boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resort_id uuid;
  v_profile_exists boolean;
BEGIN
  -- Get resort_id from guest
  SELECT resort_id INTO v_resort_id FROM guests WHERE id = p_guest_id;
  
  IF v_resort_id IS NULL THEN
    RAISE EXCEPTION 'Guest not found';
  END IF;

  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM prearrival_profiles WHERE guest_id = p_guest_id) INTO v_profile_exists;
  
  IF NOT v_profile_exists THEN
    -- Create new profile
    INSERT INTO prearrival_profiles (
      guest_id, resort_id, arrival_date, arrival_time, arrival_flight_number,
      transfer_preference, dietary_preferences, allergies, room_preferences,
      water_comfort_level, special_occasions, special_requests, custom_answers_json,
      guest_names, passport_details, baggage_count, pickup_notes,
      esignature_name, esignature_date, policy_acknowledged_at,
      stay_confirmed, stay_confirmation_notes, checkin_completed_at
    ) VALUES (
      p_guest_id, v_resort_id, p_arrival_date, p_arrival_time, p_arrival_flight_number,
      p_transfer_preference, p_dietary_preferences, p_allergies, p_room_preferences,
      p_water_comfort_level, p_special_occasions, p_special_requests, p_custom_answers_json,
      p_guest_names, p_passport_details, p_baggage_count, p_pickup_notes,
      p_esignature_name, p_esignature_date,
      CASE WHEN p_policy_acknowledged THEN now() ELSE NULL END,
      p_stay_confirmed, p_stay_confirmation_notes,
      CASE WHEN p_complete_checkin THEN now() ELSE NULL END
    );
  ELSE
    -- Update existing profile
    UPDATE prearrival_profiles SET
      arrival_date = COALESCE(p_arrival_date, arrival_date),
      arrival_time = COALESCE(p_arrival_time, arrival_time),
      arrival_flight_number = COALESCE(p_arrival_flight_number, arrival_flight_number),
      transfer_preference = COALESCE(p_transfer_preference, transfer_preference),
      dietary_preferences = COALESCE(p_dietary_preferences, dietary_preferences),
      allergies = COALESCE(p_allergies, allergies),
      room_preferences = COALESCE(p_room_preferences, room_preferences),
      water_comfort_level = COALESCE(p_water_comfort_level, water_comfort_level),
      special_occasions = COALESCE(p_special_occasions, special_occasions),
      special_requests = COALESCE(p_special_requests, special_requests),
      custom_answers_json = COALESCE(p_custom_answers_json, custom_answers_json),
      guest_names = COALESCE(p_guest_names, guest_names),
      passport_details = COALESCE(p_passport_details, passport_details),
      baggage_count = COALESCE(p_baggage_count, baggage_count),
      pickup_notes = COALESCE(p_pickup_notes, pickup_notes),
      esignature_name = COALESCE(p_esignature_name, esignature_name),
      esignature_date = COALESCE(p_esignature_date, esignature_date),
      policy_acknowledged_at = CASE 
        WHEN p_policy_acknowledged AND policy_acknowledged_at IS NULL THEN now()
        ELSE policy_acknowledged_at
      END,
      stay_confirmed = COALESCE(p_stay_confirmed, stay_confirmed),
      stay_confirmation_notes = COALESCE(p_stay_confirmation_notes, stay_confirmation_notes),
      checkin_completed_at = CASE 
        WHEN p_complete_checkin AND checkin_completed_at IS NULL THEN now()
        ELSE checkin_completed_at
      END,
      updated_at = now()
    WHERE guest_id = p_guest_id;
  END IF;

  RETURN true;
END;
$$;