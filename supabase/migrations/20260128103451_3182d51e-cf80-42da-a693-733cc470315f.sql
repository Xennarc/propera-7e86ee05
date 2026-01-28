-- Fix: Remove item_count reference from create_service_request_bundle function
-- The service_request_submissions table doesn't have an item_count column

CREATE OR REPLACE FUNCTION public.create_service_request_bundle(
  p_guest_id uuid,
  p_resort_id uuid,
  payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_check_in_date DATE;
  v_room_number TEXT;
  v_is_asap BOOLEAN;
  v_requested_for_at TIMESTAMPTZ;
  v_guest_notes TEXT;
  v_items JSONB;
  v_submission_id UUID;
  v_item JSONB;
  v_catalog_id UUID;
  v_quantity INT;
  v_catalog_item RECORD;
  v_dept_key TEXT;
  v_request_id UUID;
  v_created_request_ids UUID[] := ARRAY[]::UUID[];
  v_departments_used TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- 1) Validate guest belongs to resort
  IF NOT EXISTS (
    SELECT 1 FROM public.guests 
    WHERE id = p_guest_id AND resort_id = p_resort_id
  ) THEN
    RAISE EXCEPTION 'Invalid guest or resort';
  END IF;
  
  -- 2) Get guest info and check if checked in
  SELECT check_in_date, room_number INTO v_check_in_date, v_room_number
  FROM public.guests
  WHERE id = p_guest_id;
  
  IF v_check_in_date > CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'GUEST_NOT_CHECKED_IN',
      'message', 'Service requests are available after check-in'
    );
  END IF;
  
  -- 3) Extract payload fields
  v_is_asap := COALESCE((payload->>'isAsap')::boolean, true);
  v_requested_for_at := CASE 
    WHEN payload->>'requestedForAt' IS NOT NULL 
    THEN (payload->>'requestedForAt')::timestamptz 
    ELSE NULL 
  END;
  v_guest_notes := payload->>'guestNotes';
  v_items := payload->'items';
  
  -- 4) Validate items array
  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NO_ITEMS',
      'message', 'At least one item is required'
    );
  END IF;
  
  -- 5) Create submission record (removed item_count column reference)
  INSERT INTO public.service_request_submissions (
    guest_id,
    resort_id,
    is_asap,
    requested_for_at,
    guest_notes
  ) VALUES (
    p_guest_id,
    p_resort_id,
    v_is_asap,
    v_requested_for_at,
    v_guest_notes
  )
  RETURNING id INTO v_submission_id;
  
  -- 6) Process each item - group by department
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_catalog_id := (v_item->>'catalogId')::uuid;
    v_quantity := COALESCE((v_item->>'quantity')::int, 1);
    
    -- Get catalog item details
    SELECT * INTO v_catalog_item
    FROM public.service_request_catalog
    WHERE id = v_catalog_id AND resort_id = p_resort_id AND is_active = true;
    
    IF v_catalog_item IS NULL THEN
      CONTINUE; -- Skip invalid items
    END IF;
    
    v_dept_key := v_catalog_item.department_key;
    
    -- Check if we already have a request for this department in this submission
    SELECT id INTO v_request_id
    FROM public.service_requests
    WHERE submission_id = v_submission_id AND department_key = v_dept_key
    LIMIT 1;
    
    -- If no request for this department yet, create one
    IF v_request_id IS NULL THEN
      INSERT INTO public.service_requests (
        resort_id,
        guest_id,
        room_number,
        department_key,
        catalog_id,
        title,
        is_asap,
        requested_for_at,
        guest_notes,
        status,
        submission_id
      ) VALUES (
        p_resort_id,
        p_guest_id,
        v_room_number,
        v_dept_key,
        v_catalog_id,
        v_catalog_item.title,
        v_is_asap,
        v_requested_for_at,
        v_guest_notes,
        'pending',
        v_submission_id
      )
      RETURNING id INTO v_request_id;
      
      v_created_request_ids := array_append(v_created_request_ids, v_request_id);
      v_departments_used := array_append(v_departments_used, v_dept_key);
    END IF;
    
    -- Create line item for this request
    INSERT INTO public.service_request_items (
      request_id,
      catalog_id,
      title,
      quantity,
      resort_id
    ) VALUES (
      v_request_id,
      v_catalog_id,
      v_catalog_item.title,
      v_quantity,
      p_resort_id
    );
  END LOOP;
  
  -- 7) Return success response
  RETURN jsonb_build_object(
    'success', true,
    'submissionId', v_submission_id,
    'requestIds', to_jsonb(v_created_request_ids),
    'departments', to_jsonb(v_departments_used),
    'itemCount', jsonb_array_length(v_items)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'INTERNAL_ERROR',
    'message', SQLERRM
  );
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_service_request_bundle(uuid, uuid, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.create_service_request_bundle(uuid, uuid, jsonb) TO authenticated;