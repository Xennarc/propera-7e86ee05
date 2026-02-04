-- Fix: Add resort_id to service_request_items INSERT in create_service_request_bundle
CREATE OR REPLACE FUNCTION public.create_service_request_bundle(
  p_guest_id uuid,
  p_resort_id uuid,
  payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_submission_id uuid := gen_random_uuid();
  v_is_asap boolean;
  v_requested_for_at timestamptz;
  v_guest_notes text;
  v_items jsonb;
  v_item jsonb;
  v_catalog_id uuid;
  v_quantity int;
  v_catalog_item record;
  v_request_id uuid;
  v_request_ids uuid[] := '{}';
  v_departments text[] := '{}';
BEGIN
  -- Extract payload fields
  v_is_asap := COALESCE((payload->>'is_asap')::boolean, true);
  v_requested_for_at := (payload->>'requested_for_at')::timestamptz;
  v_guest_notes := payload->>'guest_notes';
  v_items := payload->'items';

  -- Validate items array
  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_PAYLOAD',
      'message', 'No items provided in the request'
    );
  END IF;

  -- Insert submission record FIRST (parent row)
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

    -- Look up catalog item
    SELECT id, title, department_key, category, default_priority, is_active
    INTO v_catalog_item
    FROM public.request_catalog
    WHERE id = v_catalog_id AND resort_id = p_resort_id;

    -- Skip if catalog item not found or inactive
    IF v_catalog_item.id IS NULL OR NOT v_catalog_item.is_active THEN
      CONTINUE;
    END IF;

    -- Generate request ID
    v_request_id := gen_random_uuid();

    -- Insert service request
    INSERT INTO public.service_requests (
      id,
      resort_id,
      guest_id,
      submission_id,
      catalog_id,
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
      v_request_id,
      p_resort_id,
      p_guest_id,
      v_submission_id,
      v_catalog_id,
      v_catalog_item.title,
      v_guest_notes,
      v_quantity,
      v_is_asap,
      v_requested_for_at,
      v_catalog_item.department_key,
      v_catalog_item.category,
      COALESCE(v_catalog_item.default_priority, 'NORMAL'),
      'NEW'
    );

    -- Insert service request item (with resort_id!)
    INSERT INTO public.service_request_items (
      resort_id,
      request_id,
      catalog_id,
      title,
      quantity
    ) VALUES (
      p_resort_id,
      v_request_id,
      v_catalog_id,
      v_catalog_item.title,
      v_quantity
    );

    -- Track request IDs and departments
    v_request_ids := array_append(v_request_ids, v_request_id);
    IF NOT v_catalog_item.department_key = ANY(v_departments) THEN
      v_departments := array_append(v_departments, v_catalog_item.department_key);
    END IF;
  END LOOP;

  -- Guardrail: If no valid items were processed, clean up and return error
  IF array_length(v_request_ids, 1) IS NULL OR array_length(v_request_ids, 1) = 0 THEN
    DELETE FROM public.service_request_submissions WHERE id = v_submission_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NO_VALID_ITEMS',
      'message', 'No valid catalog items found for this request'
    );
  END IF;

  -- Return success
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
    'error', SQLSTATE,
    'message', SQLERRM,
    'context', 'create_service_request_bundle'
  );
END;
$$;