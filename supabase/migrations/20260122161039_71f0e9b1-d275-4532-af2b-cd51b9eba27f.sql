-- =====================================================
-- NEW RPC: create_service_request_bundle
-- Multi-item request creation with department grouping
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_service_request_bundle(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- Auth context
  v_guest_session RECORD;
  v_resort_id UUID;
  v_guest_id UUID;
  
  -- Payload values
  v_room_number TEXT;
  v_is_asap BOOLEAN;
  v_requested_for_at TIMESTAMPTZ;
  v_guest_notes TEXT;
  v_items JSONB;
  
  -- Processing
  v_submission_id UUID;
  v_request_ids UUID[] := ARRAY[]::UUID[];
  v_split_by_department BOOLEAN := FALSE;
  v_dept_groups JSONB;
  v_dept_key TEXT;
  v_dept_items JSONB;
  v_request_id UUID;
  v_item JSONB;
  v_catalog RECORD;
  v_title TEXT;
  v_category TEXT;
  v_priority TEXT;
  v_item_count INT;
  v_categories TEXT[];
  v_item_titles TEXT[];
BEGIN
  -- 1) Validate guest auth via guest session context
  SELECT * INTO v_guest_session
  FROM public.get_guest_session();
  
  IF v_guest_session IS NULL OR v_guest_session.guest_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: No valid guest session';
  END IF;
  
  v_resort_id := v_guest_session.resort_id;
  v_guest_id := v_guest_session.guest_id;
  
  -- 2) Extract payload values
  v_room_number := payload->>'room_number';
  v_is_asap := COALESCE((payload->>'is_asap')::BOOLEAN, TRUE);
  v_requested_for_at := (payload->>'requested_for_at')::TIMESTAMPTZ;
  v_guest_notes := payload->>'guest_notes';
  v_items := payload->'items';
  
  -- Validate items array
  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'At least one item is required';
  END IF;
  
  -- 3) Create submission record
  INSERT INTO public.service_request_submissions (
    resort_id,
    guest_id,
    room_number,
    is_asap,
    requested_for_at,
    guest_notes
  ) VALUES (
    v_resort_id,
    v_guest_id,
    v_room_number,
    v_is_asap,
    v_requested_for_at,
    v_guest_notes
  ) RETURNING id INTO v_submission_id;
  
  -- 4) Load catalog data and group items by department_key
  WITH item_data AS (
    SELECT 
      i.value->>'catalog_id' AS catalog_id,
      COALESCE((i.value->>'quantity')::INT, 1) AS quantity,
      rc.department_key,
      rc.category,
      rc.default_priority,
      rc.title
    FROM jsonb_array_elements(v_items) AS i(value)
    LEFT JOIN public.request_catalog rc 
      ON rc.id = (i.value->>'catalog_id')::UUID
      AND rc.is_active = true
      AND (rc.resort_id = v_resort_id OR rc.resort_id IS NULL)
  ),
  grouped AS (
    SELECT 
      COALESCE(department_key, 'FRONT_OFFICE') AS dept_key,
      jsonb_agg(
        jsonb_build_object(
          'catalog_id', catalog_id,
          'quantity', quantity,
          'category', COALESCE(category, 'OTHER'),
          'priority', COALESCE(default_priority, 'NORMAL'),
          'title', COALESCE(title, 'Custom Request')
        )
      ) AS items
    FROM item_data
    GROUP BY COALESCE(department_key, 'FRONT_OFFICE')
  )
  SELECT jsonb_object_agg(dept_key, items) INTO v_dept_groups FROM grouped;
  
  -- Check if split across departments
  IF (SELECT COUNT(*) FROM jsonb_object_keys(v_dept_groups) AS k) > 1 THEN
    v_split_by_department := TRUE;
  END IF;
  
  -- 5) Process each department group
  FOR v_dept_key, v_dept_items IN SELECT * FROM jsonb_each(v_dept_groups)
  LOOP
    v_item_count := jsonb_array_length(v_dept_items);
    v_categories := ARRAY[]::TEXT[];
    v_item_titles := ARRAY[]::TEXT[];
    v_priority := 'NORMAL';
    
    -- Collect categories and titles for summary
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_dept_items)
    LOOP
      v_categories := array_append(v_categories, v_item->>'category');
      v_item_titles := array_append(v_item_titles, v_item->>'title');
      -- Use highest priority (LOW < NORMAL < HIGH < URGENT)
      IF v_item->>'priority' = 'URGENT' OR v_priority = 'URGENT' THEN
        v_priority := 'URGENT';
      ELSIF v_item->>'priority' = 'HIGH' AND v_priority NOT IN ('URGENT') THEN
        v_priority := 'HIGH';
      ELSIF v_item->>'priority' = 'NORMAL' AND v_priority = 'LOW' THEN
        v_priority := 'NORMAL';
      END IF;
    END LOOP;
    
    -- Determine title
    IF v_item_count = 1 THEN
      v_title := v_item_titles[1];
    ELSIF array_length(ARRAY(SELECT DISTINCT unnest(v_categories)), 1) = 1 THEN
      -- All same category - use category name with count
      v_category := v_categories[1];
      v_title := INITCAP(REPLACE(v_category, '_', ' ')) || ' (' || v_item_count || ' items)';
    ELSE
      v_title := 'Request (' || v_item_count || ' items)';
    END IF;
    
    -- Use first item's category for the request
    v_category := v_categories[1];
    
    -- 5a) Insert service_request for this department
    INSERT INTO public.service_requests (
      resort_id,
      guest_id,
      submission_id,
      title,
      notes,
      quantity,
      is_asap,
      requested_for_at,
      department_key,
      category,
      priority,
      status
    ) VALUES (
      v_resort_id,
      v_guest_id,
      v_submission_id,
      v_title,
      v_guest_notes,
      v_item_count,
      v_is_asap,
      v_requested_for_at,
      v_dept_key,
      v_category,
      v_priority::service_request_priority,
      'NEW'
    ) RETURNING id INTO v_request_id;
    
    v_request_ids := array_append(v_request_ids, v_request_id);
    
    -- 5b) Insert line items into service_request_items
    INSERT INTO public.service_request_items (
      resort_id,
      request_id,
      catalog_id,
      title,
      quantity
    )
    SELECT 
      v_resort_id,
      v_request_id,
      (item.value->>'catalog_id')::UUID,
      item.value->>'title',
      (item.value->>'quantity')::INT
    FROM jsonb_array_elements(v_dept_items) AS item(value);
    
    -- 5c) Insert CREATED event
    INSERT INTO public.service_request_events (
      resort_id,
      request_id,
      event_type,
      actor,
      metadata
    ) VALUES (
      v_resort_id,
      v_request_id,
      'CREATED',
      'guest',
      jsonb_build_object(
        'submission_id', v_submission_id,
        'item_count', v_item_count,
        'item_titles', v_item_titles,
        'is_multi_item', v_item_count > 1,
        'split_by_department', v_split_by_department
      )
    );
  END LOOP;
  
  -- 6) Return result
  RETURN jsonb_build_object(
    'submission_id', v_submission_id,
    'request_ids', to_jsonb(v_request_ids),
    'split_by_department', v_split_by_department
  );
END;
$function$;