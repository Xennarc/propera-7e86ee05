-- Add unique constraint for upsert capability on stay_id
ALTER TABLE public.pre_arrival_submissions 
ADD CONSTRAINT pre_arrival_submissions_stay_id_unique UNIQUE (stay_id);

-- RPC for guest portal dual-write to pre_arrival_submissions
CREATE OR REPLACE FUNCTION public.guest_upsert_prearrival_submission(
  p_stay_id uuid,
  p_payload jsonb,
  p_mark_completed boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stay guest_stays%ROWTYPE;
  v_submission_id uuid;
BEGIN
  -- Get the stay
  SELECT * INTO v_stay FROM guest_stays WHERE id = p_stay_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'STAY_NOT_FOUND');
  END IF;

  -- Upsert the submission
  INSERT INTO pre_arrival_submissions (resort_id, stay_id, guest_id, payload, completed_at, updated_at)
  VALUES (
    v_stay.resort_id,
    p_stay_id,
    v_stay.guest_id,
    p_payload,
    CASE WHEN p_mark_completed THEN NOW() ELSE NULL END,
    NOW()
  )
  ON CONFLICT (stay_id) 
  DO UPDATE SET
    payload = EXCLUDED.payload,
    completed_at = CASE WHEN p_mark_completed THEN NOW() ELSE pre_arrival_submissions.completed_at END,
    updated_at = NOW()
  RETURNING id INTO v_submission_id;

  RETURN json_build_object('success', true, 'submission_id', v_submission_id);
END;
$$;

-- Grant execute to anon and authenticated for guest portal access
GRANT EXECUTE ON FUNCTION public.guest_upsert_prearrival_submission(uuid, jsonb, boolean) TO anon, authenticated;