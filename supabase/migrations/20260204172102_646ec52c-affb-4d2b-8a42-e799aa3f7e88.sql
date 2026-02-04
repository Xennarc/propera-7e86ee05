-- Fix: Insert into service_request_submissions FIRST before service_requests
-- This fixes the FK constraint violation on submission_id

CREATE OR REPLACE FUNCTION public.create_service_request_bundle(
  p_guest_id uuid,
  p_resort_id uuid,
  payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items jsonb;
  v_item jsonb;
  v_is_asap boolean;
  v_requested_for_at timestamptz;
  v_guest_notes text;
  v_submission_id uuid;
  v_request_id uuid;
  v_request_ids uuid[] := ARRAY[]::uuid[];
  v_departments text[] := ARRAY[]::text[];
  v_catalog_id uuid;
  v_quantity int;
  v_dept_key text;
  v_catalog_item record;
BEGIN
  -- Extract payload fields
  v_items := payload->'items';
  v_is_asap := COALESCE((payload->>'is_asap')::boolean, true);
  v_requested_for_at := (payload->>'requested_for_at')::timestamptz;
  v_guest_notes := payload->>'guest_notes';
  
  -- Validate items array
  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NO_ITEMS',
      'message', 'No items provided in the request'
    );
  END IF;
  
  -- Generate submission ID
  v_submission_id := gen_random_uuid();
  
  -- INSERT INTO service_request_submissions FIRST (fixes FK constraint)
  INSERT INTO public.service_request_submissions (
    id,
    resort_id,
    guest_id,
    is_asap,
    requested_for_at,
    guest_notes
  ) VALUES (
    v_submission_id,
    p_resort_id,
    p_guest_id,
    v_is_asap,
    v_requested_for_at,
    v_guest_notes
  );
  
  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_catalog_id := (v_item->>'catalogId')::uuid;
    v_quantity := COALESCE((v_item->>'quantity')::int, 1);
    
    -- Lookup catalog item
    SELECT * INTO v_catalog_item
    FROM public.request_catalog
    WHERE id = v_catalog_id AND resort_id = p_resort_id AND is_active = true;
    
    IF v_catalog_item IS NULL THEN
      CONTINUE; -- Skip invalid catalog items
    END IF;
    
    v_dept_key := v_catalog_item.department_key;
    
    -- Track unique departments
    IF NOT v_dept_key = ANY(v_departments) THEN
      v_departments := array_append(v_departments, v_dept_key);
    END IF;
    
    -- Insert service request
    INSERT INTO public.service_requests (
      resort_id,
      guest_id,
      department_key,
      catalog_id,
      title,
      is_asap,
      requested_for_at,
      notes,
      status,
      quantity,
      priority,
      submission_id
    ) VALUES (
      p_resort_id,
      p_guest_id,
      v_dept_key,
      v_catalog_id,
      v_catalog_item.title,
      v_is_asap,
      v_requested_for_at,
      v_guest_notes,
      'NEW',
      v_quantity,
      COALESCE(v_catalog_item.default_priority, 'NORMAL'),
      v_submission_id
    )
    RETURNING id INTO v_request_id;
    
    v_request_ids := array_append(v_request_ids, v_request_id);
    
    -- Insert service request item
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
  
  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'submissionId', v_submission_id,
    'requestIds', to_jsonb(v_request_ids),
    'departments', to_jsonb(v_departments),
    'itemCount', array_length(v_request_ids, 1)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Failed to create service request bundle'
  );
END;
$$;