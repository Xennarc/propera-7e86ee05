-- Fix: Remove invalid room_number column reference from create_service_request_bundle RPC
-- The service_requests table has room_id (UUID FK) not room_number (TEXT)

CREATE OR REPLACE FUNCTION public.create_service_request_bundle(
  p_guest_id UUID,
  p_resort_id UUID,
  payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission_id UUID := gen_random_uuid();
  v_is_asap BOOLEAN;
  v_requested_for_at TIMESTAMPTZ;
  v_guest_notes TEXT;
  v_items JSONB;
  v_item JSONB;
  v_catalog_id UUID;
  v_quantity INT;
  v_catalog_item RECORD;
  v_dept_key TEXT;
  v_request_id UUID;
  v_request_ids UUID[] := ARRAY[]::UUID[];
  v_departments TEXT[] := ARRAY[]::TEXT[];
  v_item_count INT := 0;
BEGIN
  -- Validate guest belongs to resort
  IF NOT EXISTS (
    SELECT 1 FROM public.guests 
    WHERE id = p_guest_id AND resort_id = p_resort_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_GUEST',
      'message', 'Guest not found or does not belong to this resort'
    );
  END IF;

  -- Extract payload fields
  v_is_asap := COALESCE((payload->>'is_asap')::BOOLEAN, true);
  v_requested_for_at := (payload->>'requested_for_at')::TIMESTAMPTZ;
  v_guest_notes := payload->>'guest_notes';
  v_items := payload->'items';

  -- Validate items array
  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NO_ITEMS',
      'message', 'At least one item is required'
    );
  END IF;

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    v_catalog_id := (v_item->>'catalogId')::UUID;
    v_quantity := COALESCE((v_item->>'quantity')::INT, 1);

    -- Get catalog item details
    SELECT rc.id, rc.title, rc.department_key, rc.default_priority
    INTO v_catalog_item
    FROM public.request_catalog rc
    WHERE rc.id = v_catalog_id 
      AND rc.resort_id = p_resort_id 
      AND rc.is_active = true;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'INVALID_CATALOG_ITEM',
        'message', format('Catalog item %s not found or inactive', v_catalog_id)
      );
    END IF;

    v_dept_key := v_catalog_item.department_key;

    -- Create service request (removed room_number, added quantity and priority)
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

    -- Create service_request_items entry
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

    v_request_ids := array_append(v_request_ids, v_request_id);
    v_item_count := v_item_count + 1;

    -- Track unique departments
    IF NOT v_dept_key = ANY(v_departments) THEN
      v_departments := array_append(v_departments, v_dept_key);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'submissionId', v_submission_id,
    'requestIds', to_jsonb(v_request_ids),
    'departments', to_jsonb(v_departments),
    'itemCount', v_item_count
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'UNEXPECTED_ERROR',
    'message', SQLERRM
  );
END;
$$;