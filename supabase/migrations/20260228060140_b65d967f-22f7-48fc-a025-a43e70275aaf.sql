-- ============================================================================
-- RPC: guest_get_room_service_order_detail
-- Returns full order detail with items, modifiers, and status timeline.
-- SECURITY DEFINER with explicit guest/resort validation.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guest_get_room_service_order_detail(
  p_resort_id UUID,
  p_guest_id UUID,
  p_order_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Validate guest belongs to resort
  IF NOT EXISTS (
    SELECT 1 FROM public.guests WHERE id = p_guest_id AND resort_id = p_resort_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Validate order belongs to this guest + resort
  IF NOT EXISTS (
    SELECT 1 FROM public.room_service_orders
    WHERE id = p_order_id AND guest_id = p_guest_id AND resort_id = p_resort_id
  ) THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  SELECT json_build_object(
    'id', ord.id,
    'status', ord.status,
    'total_amount', ord.total_amount,
    'subtotal', ord.subtotal,
    'service_charge', ord.service_charge,
    'tax', ord.tax,
    'currency', ord.currency,
    'room_number', COALESCE(ord.villa_label, ord.room_number),
    'special_instructions', ord.special_instructions,
    'delivery_notes', ord.delivery_notes,
    'allergy_notes', ord.allergy_notes,
    'estimated_delivery_minutes', ord.estimated_delivery_minutes,
    'promised_at', ord.promised_at,
    'scheduled_for', ord.scheduled_for,
    'placed_at', COALESCE(ord.placed_at, ord.created_at),
    'delivered_at', ord.delivered_at,
    'cancelled_at', ord.cancelled_at,
    'cancel_reason', ord.cancel_reason,
    'created_at', ord.created_at,
    'payment_method', ord.payment_method,
    'items', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', oi.id,
          'menu_item_id', oi.menu_item_id,
          'item_name', oi.item_name,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'notes', oi.notes,
          'special_requests', oi.special_requests,
          'modifiers', COALESCE((
            SELECT json_agg(
              json_build_object(
                'id', oim.id,
                'name', oim.name_snapshot,
                'price_delta', oim.price_delta_snapshot
              )
            )
            FROM public.room_service_order_item_modifiers oim
            WHERE oim.order_item_id = oi.id
          ), '[]'::json)
        )
        ORDER BY oi.created_at
      )
      FROM public.room_service_order_items oi WHERE oi.order_id = ord.id
    ), '[]'::json),
    'status_events', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', se.id,
          'old_status', se.old_status,
          'new_status', se.new_status,
          'message', se.message,
          'actor_type', se.actor_type,
          'created_at', se.created_at
        )
        ORDER BY se.created_at
      )
      FROM public.room_service_status_events se WHERE se.order_id = ord.id
    ), '[]'::json)
  )
  INTO v_result
  FROM public.room_service_orders ord
  WHERE ord.id = p_order_id;

  RETURN v_result;
END;
$$;