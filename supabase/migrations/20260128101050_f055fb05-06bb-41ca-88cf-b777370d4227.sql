-- Drop old function signature if exists (payload-only version)
DROP FUNCTION IF EXISTS public.create_service_request_bundle(jsonb);

-- Create new function with explicit guest/resort parameters
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
  v_catalog_id UUID;
  v_quantity INT;
  v_catalog_item RECORD;
  v_request_id UUID;
  v_dept_items JSONB;
  v_dept_key TEXT;
  v_result_request_ids UUID[] := ARRAY[]::UUID[];
  v_split_by_department BOOLEAN := false;
  v_departments_seen TEXT[] := ARRAY[]::TEXT[];
  v_item JSONB;
BEGIN
  -- 1) Validate guest belongs to resort
  IF NOT EXISTS (
    SELECT 1 FROM public.guests 
    WHERE id = p_guest_id AND resort_id = p_resort_id
  ) THEN
    RAISE EXCEPTION 'Invalid guest or resort';
  END IF;
  
  -- 2) Check if guest has checked in (pre-arrival restriction)
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
  v_is_asap := COALESCE((payload->>'is_asap')::boolean, true);
  v_requested_for_at := (payload->>'requested_for_at')::timestamptz;
  v_guest_notes := payload->>'guest_notes';
  v_items := payload->'items';
  
  -- Override room_number from payload if provided
  IF payload->>'room_number' IS NOT NULL THEN
    v_room_number := payload->>'room_number';
  END IF;
  
  -- Validate items array
  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'No items provided in request bundle';
  END IF;
  
  -- 4) Create submission record
  INSERT INTO public.service_request_submissions (
    guest_id,
    resort_id,
    is_asap,
    requested_for_at,
    guest_notes,
    item_count
  ) VALUES (
    p_guest_id,
    p_resort_id,
    v_is_asap,
    v_requested_for_at,
    v_guest_notes,
    jsonb_array_length(v_items)
  )
  RETURNING id INTO v_submission_id;
  
  -- 5) Group items by department and create requests
  -- First pass: identify all departments
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_catalog_id := (v_item->>'catalog_id')::uuid;
    
    SELECT department_key INTO v_dept_key
    FROM public.request_catalog
    WHERE id = v_catalog_id AND resort_id = p_resort_id;
    
    IF v_dept_key IS NOT NULL AND NOT (v_dept_key = ANY(v_departments_seen)) THEN
      v_departments_seen := array_append(v_departments_seen, v_dept_key);
    END IF;
  END LOOP;
  
  -- Check if multiple departments
  IF array_length(v_departments_seen, 1) > 1 THEN
    v_split_by_department := true;
  END IF;
  
  -- Second pass: create requests per department
  FOR v_dept_key IN SELECT UNNEST(v_departments_seen)
  LOOP
    -- Get items for this department
    v_dept_items := '[]'::jsonb;
    
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
      v_catalog_id := (v_item->>'catalog_id')::uuid;
      
      SELECT * INTO v_catalog_item
      FROM public.request_catalog
      WHERE id = v_catalog_id AND resort_id = p_resort_id;
      
      IF v_catalog_item.department_key = v_dept_key THEN
        v_dept_items := v_dept_items || v_item;
      END IF;
    END LOOP;
    
    -- Skip if no items for this department
    IF jsonb_array_length(v_dept_items) = 0 THEN
      CONTINUE;
    END IF;
    
    -- Create the service request for this department
    INSERT INTO public.service_requests (
      guest_id,
      resort_id,
      room_number,
      submission_id,
      department_key,
      category,
      title,
      notes,
      quantity,
      is_asap,
      requested_for_at,
      priority,
      status
    ) VALUES (
      p_guest_id,
      p_resort_id,
      v_room_number,
      v_submission_id,
      v_dept_key,
      v_catalog_item.category,
      CASE 
        WHEN jsonb_array_length(v_dept_items) = 1 THEN v_catalog_item.title
        ELSE jsonb_array_length(v_dept_items) || ' items'
      END,
      v_guest_notes,
      jsonb_array_length(v_dept_items),
      v_is_asap,
      v_requested_for_at,
      COALESCE(v_catalog_item.default_priority, 'NORMAL'),
      'NEW'
    )
    RETURNING id INTO v_request_id;
    
    v_result_request_ids := array_append(v_result_request_ids, v_request_id);
    
    -- Create line items for this request
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_dept_items)
    LOOP
      v_catalog_id := (v_item->>'catalog_id')::uuid;
      v_quantity := COALESCE((v_item->>'quantity')::int, 1);
      
      SELECT * INTO v_catalog_item
      FROM public.request_catalog
      WHERE id = v_catalog_id;
      
      INSERT INTO public.service_request_items (
        request_id,
        catalog_id,
        title,
        quantity
      ) VALUES (
        v_request_id,
        v_catalog_id,
        v_catalog_item.title,
        v_quantity
      );
    END LOOP;
  END LOOP;
  
  -- 6) Return result
  RETURN jsonb_build_object(
    'success', true,
    'submission_id', v_submission_id,
    'request_ids', to_jsonb(v_result_request_ids),
    'split_by_department', v_split_by_department
  );
END;
$function$;

-- Grant permissions to both anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.create_service_request_bundle(uuid, uuid, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.create_service_request_bundle(uuid, uuid, jsonb) TO authenticated;