-- Create enum for recommendation response
CREATE TYPE public.recommendation_response AS ENUM ('YES', 'NO', 'MAYBE');

-- Create enum for feedback source
CREATE TYPE public.feedback_source AS ENUM ('GUEST_PORTAL', 'STAFF_FILLED');

-- Create stay_feedback table
CREATE TABLE public.stay_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  rating_activities INTEGER CHECK (rating_activities >= 1 AND rating_activities <= 5),
  rating_diving INTEGER CHECK (rating_diving >= 1 AND rating_diving <= 5),
  rating_fnb INTEGER CHECK (rating_fnb >= 1 AND rating_fnb <= 5),
  rating_room INTEGER CHECK (rating_room >= 1 AND rating_room <= 5),
  rating_service INTEGER CHECK (rating_service >= 1 AND rating_service <= 5),
  would_recommend recommendation_response NOT NULL,
  highlight_comment TEXT,
  improvement_comment TEXT,
  source feedback_source NOT NULL DEFAULT 'GUEST_PORTAL',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure one feedback per guest stay
  UNIQUE(guest_id, check_in_date, check_out_date)
);

-- Enable RLS
ALTER TABLE public.stay_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Staff can view feedback for their resort
CREATE POLICY "Staff can view feedback"
ON public.stay_feedback
FOR SELECT
TO authenticated
USING (true);

-- Staff can insert feedback (for staff-filled entries)
CREATE POLICY "Staff can insert feedback"
ON public.stay_feedback
FOR INSERT
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'MANAGER'::app_role]));

-- Create trigger for updated_at
CREATE TRIGGER update_stay_feedback_updated_at
BEFORE UPDATE ON public.stay_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function for guest to submit feedback
CREATE OR REPLACE FUNCTION public.guest_submit_stay_feedback(
  p_guest_id UUID,
  p_overall_rating INTEGER,
  p_would_recommend TEXT,
  p_rating_activities INTEGER DEFAULT NULL,
  p_rating_diving INTEGER DEFAULT NULL,
  p_rating_fnb INTEGER DEFAULT NULL,
  p_rating_room INTEGER DEFAULT NULL,
  p_rating_service INTEGER DEFAULT NULL,
  p_highlight_comment TEXT DEFAULT NULL,
  p_improvement_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest guests%ROWTYPE;
  v_existing_feedback UUID;
  v_feedback_id UUID;
BEGIN
  -- Get guest record
  SELECT * INTO v_guest FROM guests WHERE id = p_guest_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guest not found');
  END IF;
  
  -- Check if feedback already exists for this stay
  SELECT id INTO v_existing_feedback 
  FROM stay_feedback 
  WHERE guest_id = p_guest_id 
    AND check_in_date = v_guest.check_in_date 
    AND check_out_date = v_guest.check_out_date;
  
  IF v_existing_feedback IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Feedback already submitted for this stay');
  END IF;
  
  -- Insert feedback
  INSERT INTO stay_feedback (
    resort_id,
    guest_id,
    room_number,
    check_in_date,
    check_out_date,
    overall_rating,
    rating_activities,
    rating_diving,
    rating_fnb,
    rating_room,
    rating_service,
    would_recommend,
    highlight_comment,
    improvement_comment,
    source
  ) VALUES (
    v_guest.resort_id,
    p_guest_id,
    v_guest.room_number,
    v_guest.check_in_date,
    v_guest.check_out_date,
    p_overall_rating,
    p_rating_activities,
    p_rating_diving,
    p_rating_fnb,
    p_rating_room,
    p_rating_service,
    p_would_recommend::recommendation_response,
    p_highlight_comment,
    p_improvement_comment,
    'GUEST_PORTAL'
  ) RETURNING id INTO v_feedback_id;
  
  RETURN jsonb_build_object('success', true, 'feedback_id', v_feedback_id);
END;
$$;

-- Create function to check if guest can submit feedback
CREATE OR REPLACE FUNCTION public.guest_can_submit_feedback(p_guest_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest guests%ROWTYPE;
  v_existing_feedback UUID;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get guest record
  SELECT * INTO v_guest FROM guests WHERE id = p_guest_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('can_submit', false, 'reason', 'Guest not found');
  END IF;
  
  -- Check if within feedback window (checkout - 1 day to checkout + 1 day)
  IF v_today < (v_guest.check_out_date - INTERVAL '1 day')::DATE OR v_today > (v_guest.check_out_date + INTERVAL '1 day')::DATE THEN
    RETURN jsonb_build_object('can_submit', false, 'reason', 'Outside feedback window');
  END IF;
  
  -- Check if feedback already exists
  SELECT id INTO v_existing_feedback 
  FROM stay_feedback 
  WHERE guest_id = p_guest_id 
    AND check_in_date = v_guest.check_in_date 
    AND check_out_date = v_guest.check_out_date;
  
  IF v_existing_feedback IS NOT NULL THEN
    RETURN jsonb_build_object('can_submit', false, 'reason', 'Already submitted', 'feedback_id', v_existing_feedback);
  END IF;
  
  RETURN jsonb_build_object('can_submit', true);
END;
$$;