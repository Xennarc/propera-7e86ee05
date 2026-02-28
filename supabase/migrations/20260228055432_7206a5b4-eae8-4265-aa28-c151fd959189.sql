
-- ============================================================================
-- Room Service RPCs: Idempotent order creation, status transitions, guest cancel
-- Additive only. No existing functions modified.
-- ============================================================================

-- ============================================================================
-- RPC 1: room_service_create_order_idempotent
-- Called by guest portal (SECURITY DEFINER, explicit guest/resort params)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.room_service_create_order_idempotent(
  p_resort_id uuid,
  p_guest_id uuid,
  p_idempotency_key text,
  p_items jsonb,
  p_delivery_notes text DEFAULT NULL,
  p_allergy_notes text DEFAULT NULL,
  p_scheduled_for timestamptz DEFAULT NULL,
  p_villa_label text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_order_id uuid;
  v_existing_order_id uuid;
  v_guest record;
  v_subtotal numeric(10,2) := 0;
  v_service_charge numeric(10,2) := 0;
  v_tax numeric(10,2) := 0;
  v_total numeric(10,2) := 0;
  v_item jsonb;
  v_menu_item record;
  v_order_item_id uuid;
  v_mod_option record;
  v_mod_id jsonb;
  v_item_line_total numeric(10,2);
  v_now timestamptz := now();
  v_day_of_week int;
  v_current_time time;
  v_hours_configured bool;
BEGIN
  -- 1. Validate guest belongs to resort
  SELECT id, room_number, full_name
  INTO v_guest
  FROM public.guests
  WHERE id = p_guest_id AND resort_id = p_resort_id;

  IF v_guest.id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: guest does not belong to resort';
  END IF;

  -- 2. Idempotency check
  SELECT id INTO v_existing_order_id
  FROM public.room_service_orders
  WHERE resort_id = p_resort_id
    AND guest_id = p_guest_id
    AND idempotency_key = p_idempotency_key;

  IF v_existing_order_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'order_id', v_existing_order_id,
      'idempotent_hit', true
    );
  END IF;

  -- 3. Validate ordering hours (skip if none configured)
  SELECT EXISTS (
    SELECT 1 FROM public.room_service_ordering_hours
    WHERE resort_id = p_resort_id AND is_active = true
  ) INTO v_hours_configured;

  IF v_hours_configured THEN
    v_day_of_week := EXTRACT(DOW FROM v_now)::int;
    v_current_time := v_now::time;

    IF NOT EXISTS (
      SELECT 1 FROM public.room_service_ordering_hours
      WHERE resort_id = p_resort_id
        AND is_active = true
        AND day_of_week = v_day_of_week
        AND v_current_time BETWEEN start_time AND end_time
    ) THEN
      RAISE EXCEPTION 'Room service is not available at this time';
    END IF;
  END IF;

  -- 4. Validate items array
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one item is required';
  END IF;

  -- 5. Create order
  INSERT INTO public.room_service_orders (
    resort_id, guest_id, status, room_number, villa_label,
    delivery_notes, allergy_notes, scheduled_for,
    idempotency_key, placed_at, payment_method,
    subtotal, service_charge, tax, total_amount
  ) VALUES (
    p_resort_id, p_guest_id, 'placed', v_guest.room_number, p_villa_label,
    p_delivery_notes, p_allergy_notes, p_scheduled_for,
    p_idempotency_key, v_now, 'room_charge',
    0, 0, 0, 0
  )
  RETURNING id INTO v_order_id;

  -- 6. Process each line item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Fetch and validate menu item
    SELECT id, name, price, currency
    INTO v_menu_item
    FROM public.room_service_menu_items
    WHERE id = (v_item->>'item_id')::uuid
      AND resort_id = p_resort_id
      AND is_active = true
      AND is_available = true;

    IF v_menu_item.id IS NULL THEN
      RAISE EXCEPTION 'Menu item not found or unavailable: %', v_item->>'item_id';
    END IF;

    v_item_line_total := v_menu_item.price * COALESCE((v_item->>'qty')::int, 1);

    -- Insert order item with snapshots
    INSERT INTO public.room_service_order_items (
      order_id, menu_item_id, resort_id,
      item_name, unit_price, quantity,
      special_requests, notes
    ) VALUES (
      v_order_id, v_menu_item.id, p_resort_id,
      v_menu_item.name, v_menu_item.price,
      COALESCE((v_item->>'qty')::int, 1),
      v_item->>'notes', v_item->>'notes'
    )
    RETURNING id INTO v_order_item_id;

    -- Process modifiers for this item
    IF v_item ? 'modifiers' AND jsonb_array_length(v_item->'modifiers') > 0 THEN
      FOR v_mod_id IN SELECT * FROM jsonb_array_elements(v_item->'modifiers')
      LOOP
        SELECT mo.id, mo.name, mo.price_delta
        INTO v_mod_option
        FROM public.room_service_modifier_options mo
        JOIN public.room_service_item_modifier_groups img ON img.group_id = mo.group_id
        WHERE mo.id = (v_mod_id #>> '{}')::uuid
          AND mo.resort_id = p_resort_id
          AND mo.is_available = true
          AND img.item_id = v_menu_item.id;

        IF v_mod_option.id IS NULL THEN
          RAISE EXCEPTION 'Modifier option not valid for item: %', v_mod_id #>> '{}';
        END IF;

        INSERT INTO public.room_service_order_item_modifiers (
          resort_id, order_item_id, modifier_option_id,
          name_snapshot, price_delta_snapshot
        ) VALUES (
          p_resort_id, v_order_item_id, v_mod_option.id,
          v_mod_option.name, v_mod_option.price_delta
        );

        -- Add modifier price delta per quantity
        v_item_line_total := v_item_line_total + (v_mod_option.price_delta * COALESCE((v_item->>'qty')::int, 1));
      END LOOP;
    END IF;

    v_subtotal := v_subtotal + v_item_line_total;
  END LOOP;

  -- 7. Compute totals (v1: service_charge and tax = 0)
  v_total := v_subtotal + v_service_charge + v_tax;

  UPDATE public.room_service_orders
  SET subtotal = v_subtotal,
      service_charge = v_service_charge,
      tax = v_tax,
      total_amount = v_total
  WHERE id = v_order_id;

  -- 8. Insert initial status event
  INSERT INTO public.room_service_status_events (
    resort_id, order_id, old_status, new_status,
    message, actor_type, actor_id
  ) VALUES (
    p_resort_id, v_order_id, NULL, 'placed',
    'Order placed', 'guest', p_guest_id
  );

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'idempotent_hit', false,
    'subtotal', v_subtotal,
    'service_charge', v_service_charge,
    'tax', v_tax,
    'total', v_total
  );
END;
$$;

-- ============================================================================
-- RPC 2: room_service_set_status
-- Called by staff (uses auth.uid() for authorization)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.room_service_set_status(
  p_order_id uuid,
  p_new_status text,
  p_message text DEFAULT NULL,
  p_promised_at timestamptz DEFAULT NULL,
  p_assigned_runner_staff_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_order record;
  v_staff_id uuid := auth.uid();
  v_allowed_transitions jsonb := '{
    "placed": ["confirmed", "cancelled"],
    "confirmed": ["preparing", "cancelled"],
    "preparing": ["ready", "cancelled"],
    "ready": ["out_for_delivery"],
    "out_for_delivery": ["delivered"],
    "delivered": [],
    "cancelled": []
  }'::jsonb;
  v_allowed_next jsonb;
BEGIN
  -- 1. Fetch order and verify staff access
  SELECT id, resort_id, status, guest_id
  INTO v_order
  FROM public.room_service_orders
  WHERE id = p_order_id;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF NOT public.staff_has_resort_access(v_staff_id, v_order.resort_id) THEN
    RAISE EXCEPTION 'Unauthorized: no resort access';
  END IF;

  -- 2. Validate transition
  v_allowed_next := v_allowed_transitions->v_order.status;

  IF v_allowed_next IS NULL OR NOT (v_allowed_next ? p_new_status) THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %', v_order.status, p_new_status;
  END IF;

  -- 3. Update order
  UPDATE public.room_service_orders
  SET status = p_new_status,
      promised_at = COALESCE(p_promised_at, promised_at),
      assigned_runner_staff_id = COALESCE(p_assigned_runner_staff_id, assigned_runner_staff_id),
      delivered_at = CASE WHEN p_new_status = 'delivered' THEN now() ELSE delivered_at END,
      cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN now() ELSE cancelled_at END,
      updated_at = now()
  WHERE id = p_order_id;

  -- 4. Insert status event
  INSERT INTO public.room_service_status_events (
    resort_id, order_id, old_status, new_status,
    message, actor_type, actor_id
  ) VALUES (
    v_order.resort_id, p_order_id, v_order.status, p_new_status,
    p_message, 'staff', v_staff_id
  );

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'old_status', v_order.status,
    'new_status', p_new_status,
    'transitioned_at', now()
  );
END;
$$;

-- ============================================================================
-- RPC 3: room_service_guest_cancel
-- Called by guest portal (SECURITY DEFINER, explicit guest/resort params)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.room_service_guest_cancel(
  p_resort_id uuid,
  p_guest_id uuid,
  p_order_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_order record;
BEGIN
  -- 1. Validate guest belongs to resort
  IF NOT EXISTS (
    SELECT 1 FROM public.guests
    WHERE id = p_guest_id AND resort_id = p_resort_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: guest does not belong to resort';
  END IF;

  -- 2. Fetch order and verify ownership
  SELECT id, status, guest_id, resort_id
  INTO v_order
  FROM public.room_service_orders
  WHERE id = p_order_id
    AND guest_id = p_guest_id
    AND resort_id = p_resort_id;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- 3. Only allow cancel from 'placed' status
  IF v_order.status <> 'placed' THEN
    RAISE EXCEPTION 'Cannot cancel order in status: %', v_order.status;
  END IF;

  -- 4. Update order
  UPDATE public.room_service_orders
  SET status = 'cancelled',
      cancel_reason = p_reason,
      cancelled_at = now(),
      updated_at = now()
  WHERE id = p_order_id;

  -- 5. Insert status event
  INSERT INTO public.room_service_status_events (
    resort_id, order_id, old_status, new_status,
    message, actor_type, actor_id
  ) VALUES (
    p_resort_id, p_order_id, 'placed', 'cancelled',
    COALESCE(p_reason, 'Cancelled by guest'), 'guest', p_guest_id
  );

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'old_status', 'placed',
    'new_status', 'cancelled'
  );
END;
$$;
