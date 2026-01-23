-- Add pre-arrival check to create_service_request_bundle
-- Prevents guests from submitting service requests before their check-in date

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
  v_check_in_date DATE;
  
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
  
  -- 2) Check if guest has checked in (pre-arrival restriction)
  SELECT check_in_date INTO v_check_in_date
  FROM public.guests
  WHERE id = v_guest_id;
  
  IF v_check_in_date > CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'GUEST_NOT_CHECKED_IN',
      'message', 'Service requests are available after check-in'
    );
  END IF;
  
  -- 3) Extract payload values
  v_room_number := payload->>'room_number';
  v_is_asap := COALESCE((payload->>'is_asap')::BOOLEAN, TRUE);
  v_requested_for_at := (payload->>'requested_for_at')::TIMESTAMPTZ;
  v_guest_notes := payload->>'guest_notes';
  v_items := payload->'items';
  
  -- Validate items array
  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'At least one item is required';
  END IF;
  
  -- 4) Create submission record
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
  
  -- 5) Load catalog data and group items by department_key
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
  
  -- 6) Process each department group
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
      v_title := v_categories[1] || ' (' || v_item_count || ' items)';
    ELSE
      v_title := v_item_count || ' items';
    END IF;
    
    -- Determine category
    IF array_length(ARRAY(SELECT DISTINCT unnest(v_categories)), 1) = 1 THEN
      v_category := v_categories[1];
    ELSE
      v_category := 'MIXED';
    END IF;
    
    -- 7) Create service request for this department
    INSERT INTO public.service_requests (
      resort_id,
      guest_id,
      submission_id,
      department_key,
      title,
      category,
      priority,
      is_asap,
      requested_for_at,
      notes,
      quantity,
      status
    ) VALUES (
      v_resort_id,
      v_guest_id,
      v_submission_id,
      v_dept_key,
      v_title,
      v_category,
      v_priority,
      v_is_asap,
      v_requested_for_at,
      v_guest_notes,
      v_item_count,
      'NEW'
    ) RETURNING id INTO v_request_id;
    
    v_request_ids := array_append(v_request_ids, v_request_id);
    
    -- 8) Create individual items for this request
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_dept_items)
    LOOP
      INSERT INTO public.service_request_items (
        request_id,
        catalog_id,
        title,
        quantity
      ) VALUES (
        v_request_id,
        (v_item->>'catalog_id')::UUID,
        v_item->>'title',
        COALESCE((v_item->>'quantity')::INT, 1)
      );
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'submission_id', v_submission_id,
    'request_ids', v_request_ids,
    'split_by_department', v_split_by_department
  );
END;
$function$;

-- Also add check to the legacy single-item RPC
CREATE OR REPLACE FUNCTION public.guest_create_service_request(
  p_resort_id UUID,
  p_guest_id UUID,
  p_catalog_id UUID DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_quantity INTEGER DEFAULT 1,
  p_is_asap BOOLEAN DEFAULT true,
  p_requested_for_at TIMESTAMPTZ DEFAULT NULL,
  p_department_key TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'NORMAL'
)
RETURNS UUID AS $$
DECLARE
  v_request_id UUID;
  v_title TEXT;
  v_department_key TEXT;
  v_category TEXT;
  v_priority TEXT;
  v_check_in_date DATE;
BEGIN
  -- Validate guest belongs to resort
  IF NOT EXISTS (
    SELECT 1 FROM public.guests 
    WHERE id = p_guest_id AND resort_id = p_resort_id
  ) THEN
    RAISE EXCEPTION 'Invalid guest or resort';
  END IF;
  
  -- Check if guest has checked in (pre-arrival restriction)
  SELECT check_in_date INTO v_check_in_date
  FROM public.guests
  WHERE id = p_guest_id;
  
  IF v_check_in_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'GUEST_NOT_CHECKED_IN: Service requests are available after check-in';
  END IF;
  
  -- If catalog_id provided, get defaults from catalog
  IF p_catalog_id IS NOT NULL THEN
    SELECT 
      rc.title,
      rc.department_key,
      rc.category,
      rc.default_priority
    INTO v_title, v_department_key, v_category, v_priority
    FROM public.request_catalog rc
    WHERE rc.id = p_catalog_id
    AND (rc.resort_id = p_resort_id OR rc.resort_id IS NULL)
    AND rc.is_active = true;
    
    IF v_title IS NULL THEN
      RAISE EXCEPTION 'Invalid catalog item';
    END IF;
  ELSE
    -- Use provided values
    v_title := COALESCE(p_title, 'General Request');
    v_department_key := COALESCE(p_department_key, 'FRONT_OFFICE');
    v_category := COALESCE(p_category, 'OTHER');
    v_priority := COALESCE(p_priority, 'NORMAL');
  END IF;
  
  -- Create the request
  INSERT INTO public.service_requests (
    resort_id,
    guest_id,
    catalog_id,
    title,
    notes,
    quantity,
    is_asap,
    requested_for_at,
    department_key,
    category,
    priority
  ) VALUES (
    p_resort_id,
    p_guest_id,
    p_catalog_id,
    COALESCE(p_title, v_title),
    p_notes,
    p_quantity,
    p_is_asap,
    p_requested_for_at,
    v_department_key,
    v_category,
    v_priority
  )
  RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;