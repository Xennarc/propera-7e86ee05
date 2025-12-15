-- ================================================
-- PRE-ARRIVAL SYSTEM TABLES
-- ================================================

-- 1. Pre-arrival settings per resort (configurable)
CREATE TABLE public.prearrival_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  open_days_before_checkin INTEGER NOT NULL DEFAULT 30,
  allow_activity_bookings BOOLEAN NOT NULL DEFAULT true,
  allow_dining_bookings BOOLEAN NOT NULL DEFAULT true,
  allow_spa_bookings BOOLEAN NOT NULL DEFAULT false,
  show_arrival_details BOOLEAN NOT NULL DEFAULT true,
  show_preferences BOOLEAN NOT NULL DEFAULT true,
  show_special_occasions BOOLEAN NOT NULL DEFAULT true,
  custom_questions_json JSONB DEFAULT '[]'::jsonb,
  welcome_message TEXT DEFAULT NULL,
  internal_guidance_notes TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(resort_id)
);

-- 2. Pre-arrival profiles per guest reservation
CREATE TYPE public.prearrival_status AS ENUM ('not_started', 'partial', 'completed');

CREATE TABLE public.prearrival_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  arrival_date DATE DEFAULT NULL,
  arrival_time TIME WITHOUT TIME ZONE DEFAULT NULL,
  arrival_flight_number TEXT DEFAULT NULL,
  transfer_preference TEXT DEFAULT NULL,
  dietary_preferences JSONB DEFAULT '[]'::jsonb,
  allergies TEXT DEFAULT NULL,
  room_preferences JSONB DEFAULT '{}'::jsonb,
  water_comfort_level TEXT DEFAULT NULL,
  special_occasions JSONB DEFAULT '[]'::jsonb,
  special_requests TEXT DEFAULT NULL,
  custom_answers_json JSONB DEFAULT '{}'::jsonb,
  prearrival_status public.prearrival_status NOT NULL DEFAULT 'not_started',
  staff_processed BOOLEAN NOT NULL DEFAULT false,
  staff_notes TEXT DEFAULT NULL,
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(guest_id)
);

-- Add indexes for efficient queries
CREATE INDEX idx_prearrival_settings_resort ON public.prearrival_settings(resort_id);
CREATE INDEX idx_prearrival_profiles_resort ON public.prearrival_profiles(resort_id);
CREATE INDEX idx_prearrival_profiles_guest ON public.prearrival_profiles(guest_id);
CREATE INDEX idx_prearrival_profiles_status ON public.prearrival_profiles(prearrival_status);

-- Enable RLS
ALTER TABLE public.prearrival_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prearrival_profiles ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS POLICIES FOR prearrival_settings
-- ================================================

-- Staff can view settings for their resort
CREATE POLICY "Staff can view prearrival settings in their resort"
ON public.prearrival_settings
FOR SELECT
USING (
  has_resort_membership(auth.uid(), resort_id) OR is_super_admin(auth.uid())
);

-- Resort admins can manage settings
CREATE POLICY "Resort admins can manage prearrival settings"
ON public.prearrival_settings
FOR ALL
USING (
  is_super_admin(auth.uid()) OR 
  has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role, 'MANAGER'::resort_role])
);

-- Anyone can view enabled settings (for guest portal)
CREATE POLICY "Anyone can view enabled prearrival settings"
ON public.prearrival_settings
FOR SELECT
USING (is_enabled = true);

-- ================================================
-- RLS POLICIES FOR prearrival_profiles
-- ================================================

-- Staff can view profiles in their resort
CREATE POLICY "Staff can view prearrival profiles in their resort"
ON public.prearrival_profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    has_resort_membership(auth.uid(), resort_id) OR is_super_admin(auth.uid())
  )
);

-- Staff can manage profiles
CREATE POLICY "Staff can manage prearrival profiles"
ON public.prearrival_profiles
FOR ALL
USING (
  is_super_admin(auth.uid()) OR
  has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'MANAGER'::app_role, 'RESERVATIONS'::app_role])
);

-- ================================================
-- TRIGGER FOR updated_at
-- ================================================

CREATE TRIGGER update_prearrival_settings_updated_at
  BEFORE UPDATE ON public.prearrival_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prearrival_profiles_updated_at
  BEFORE UPDATE ON public.prearrival_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- RPC FUNCTION: Get or create prearrival profile
-- ================================================

CREATE OR REPLACE FUNCTION public.get_or_create_prearrival_profile(p_guest_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id UUID;
  v_guest guests%ROWTYPE;
BEGIN
  -- Check if profile exists
  SELECT id INTO v_profile_id
  FROM prearrival_profiles
  WHERE guest_id = p_guest_id;
  
  IF v_profile_id IS NOT NULL THEN
    RETURN v_profile_id;
  END IF;
  
  -- Get guest for resort_id
  SELECT * INTO v_guest FROM guests WHERE id = p_guest_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Create new profile
  INSERT INTO prearrival_profiles (resort_id, guest_id, arrival_date)
  VALUES (v_guest.resort_id, p_guest_id, v_guest.check_in_date)
  RETURNING id INTO v_profile_id;
  
  RETURN v_profile_id;
END;
$function$;

-- ================================================
-- RPC FUNCTION: Update prearrival profile from guest
-- ================================================

CREATE OR REPLACE FUNCTION public.guest_update_prearrival_profile(
  p_guest_id UUID,
  p_arrival_date DATE DEFAULT NULL,
  p_arrival_time TIME DEFAULT NULL,
  p_arrival_flight_number TEXT DEFAULT NULL,
  p_transfer_preference TEXT DEFAULT NULL,
  p_dietary_preferences JSONB DEFAULT NULL,
  p_allergies TEXT DEFAULT NULL,
  p_room_preferences JSONB DEFAULT NULL,
  p_water_comfort_level TEXT DEFAULT NULL,
  p_special_occasions JSONB DEFAULT NULL,
  p_special_requests TEXT DEFAULT NULL,
  p_custom_answers_json JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id UUID;
  v_guest guests%ROWTYPE;
  v_has_arrival BOOLEAN;
  v_has_preferences BOOLEAN;
  v_has_occasions BOOLEAN;
  v_new_status prearrival_status;
BEGIN
  -- Get guest
  SELECT * INTO v_guest FROM guests WHERE id = p_guest_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guest not found');
  END IF;
  
  -- Get or create profile
  v_profile_id := get_or_create_prearrival_profile(p_guest_id);
  
  -- Update profile
  UPDATE prearrival_profiles
  SET
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
    last_updated_at = now()
  WHERE id = v_profile_id;
  
  -- Determine status based on completion
  SELECT 
    (arrival_time IS NOT NULL OR arrival_flight_number IS NOT NULL),
    (dietary_preferences != '[]'::jsonb OR allergies IS NOT NULL),
    (special_occasions != '[]'::jsonb)
  INTO v_has_arrival, v_has_preferences, v_has_occasions
  FROM prearrival_profiles WHERE id = v_profile_id;
  
  IF v_has_arrival AND v_has_preferences THEN
    v_new_status := 'completed';
  ELSIF v_has_arrival OR v_has_preferences OR v_has_occasions THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'not_started';
  END IF;
  
  UPDATE prearrival_profiles
  SET prearrival_status = v_new_status
  WHERE id = v_profile_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'profile_id', v_profile_id,
    'status', v_new_status
  );
END;
$function$;

-- ================================================
-- RPC FUNCTION: Get guest prearrival data
-- ================================================

CREATE OR REPLACE FUNCTION public.guest_get_prearrival_data(p_guest_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_guest guests%ROWTYPE;
  v_profile prearrival_profiles%ROWTYPE;
  v_settings prearrival_settings%ROWTYPE;
  v_result JSONB;
BEGIN
  -- Get guest
  SELECT * INTO v_guest FROM guests WHERE id = p_guest_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guest not found');
  END IF;
  
  -- Get settings
  SELECT * INTO v_settings FROM prearrival_settings WHERE resort_id = v_guest.resort_id;
  
  -- Get or create profile
  PERFORM get_or_create_prearrival_profile(p_guest_id);
  SELECT * INTO v_profile FROM prearrival_profiles WHERE guest_id = p_guest_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'guest', jsonb_build_object(
      'id', v_guest.id,
      'full_name', v_guest.full_name,
      'room_number', v_guest.room_number,
      'check_in_date', v_guest.check_in_date,
      'check_out_date', v_guest.check_out_date
    ),
    'profile', CASE WHEN v_profile.id IS NOT NULL THEN jsonb_build_object(
      'id', v_profile.id,
      'arrival_date', v_profile.arrival_date,
      'arrival_time', v_profile.arrival_time,
      'arrival_flight_number', v_profile.arrival_flight_number,
      'transfer_preference', v_profile.transfer_preference,
      'dietary_preferences', v_profile.dietary_preferences,
      'allergies', v_profile.allergies,
      'room_preferences', v_profile.room_preferences,
      'water_comfort_level', v_profile.water_comfort_level,
      'special_occasions', v_profile.special_occasions,
      'special_requests', v_profile.special_requests,
      'custom_answers_json', v_profile.custom_answers_json,
      'prearrival_status', v_profile.prearrival_status
    ) ELSE NULL END,
    'settings', CASE WHEN v_settings.id IS NOT NULL THEN jsonb_build_object(
      'is_enabled', v_settings.is_enabled,
      'allow_activity_bookings', v_settings.allow_activity_bookings,
      'allow_dining_bookings', v_settings.allow_dining_bookings,
      'allow_spa_bookings', v_settings.allow_spa_bookings,
      'show_arrival_details', v_settings.show_arrival_details,
      'show_preferences', v_settings.show_preferences,
      'show_special_occasions', v_settings.show_special_occasions,
      'custom_questions_json', v_settings.custom_questions_json,
      'welcome_message', v_settings.welcome_message
    ) ELSE jsonb_build_object('is_enabled', false) END
  );
END;
$function$;