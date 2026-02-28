
-- ══════════════════════════════════════════════════════
-- Room Service / In-Villa Dining Module Tables
-- ══════════════════════════════════════════════════════

-- Menu categories
CREATE TABLE public.room_service_menu_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Menu items
CREATE TABLE public.room_service_menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.room_service_menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  dietary_tags TEXT[] DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE public.room_service_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  stay_id UUID REFERENCES public.guest_stays(id),
  room_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','preparing','delivering','delivered','cancelled')),
  special_instructions TEXT,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  estimated_delivery_minutes INT,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order line items
CREATE TABLE public.room_service_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.room_service_orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.room_service_menu_items(id),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  special_requests TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_rs_menu_cats_resort ON public.room_service_menu_categories(resort_id);
CREATE INDEX idx_rs_menu_items_resort ON public.room_service_menu_items(resort_id);
CREATE INDEX idx_rs_menu_items_category ON public.room_service_menu_items(category_id);
CREATE INDEX idx_rs_orders_resort ON public.room_service_orders(resort_id);
CREATE INDEX idx_rs_orders_guest ON public.room_service_orders(guest_id);
CREATE INDEX idx_rs_orders_status ON public.room_service_orders(resort_id, status);
CREATE INDEX idx_rs_order_items_order ON public.room_service_order_items(order_id);

-- Enable RLS
ALTER TABLE public.room_service_menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_service_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_service_order_items ENABLE ROW LEVEL SECURITY;

-- ═══ RLS: Menu categories ═══
CREATE POLICY "staff_manage_rs_menu_categories"
  ON public.room_service_menu_categories FOR ALL
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "public_view_active_rs_menu_categories"
  ON public.room_service_menu_categories FOR SELECT
  USING (is_active = true);

-- ═══ RLS: Menu items ═══
CREATE POLICY "staff_manage_rs_menu_items"
  ON public.room_service_menu_items FOR ALL
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "public_view_available_rs_menu_items"
  ON public.room_service_menu_items FOR SELECT
  USING (is_active = true AND is_available = true);

-- ═══ RLS: Orders ═══
CREATE POLICY "staff_manage_rs_orders"
  ON public.room_service_orders FOR ALL
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

-- ═══ RLS: Order items ═══
CREATE POLICY "staff_manage_rs_order_items"
  ON public.room_service_order_items FOR ALL
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "public_read_rs_order_items"
  ON public.room_service_order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_service_orders o
      WHERE o.id = order_id
    )
  );

-- ═══ Updated_at triggers ═══
CREATE TRIGGER update_rs_menu_categories_updated_at
  BEFORE UPDATE ON public.room_service_menu_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rs_menu_items_updated_at
  BEFORE UPDATE ON public.room_service_menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rs_orders_updated_at
  BEFORE UPDATE ON public.room_service_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══ Guest RPCs ═══

-- Browse menu
CREATE OR REPLACE FUNCTION public.guest_get_room_service_menu(
  p_resort_id UUID,
  p_guest_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.guests WHERE id = p_guest_id AND resort_id = p_resort_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_agg(cat ORDER BY cat->>'sort_order')
  INTO result
  FROM (
    SELECT json_build_object(
      'id', c.id,
      'name', c.name,
      'description', c.description,
      'sort_order', c.sort_order,
      'items', COALESCE((
        SELECT json_agg(
          json_build_object(
            'id', i.id,
            'name', i.name,
            'description', i.description,
            'price', i.price,
            'currency', i.currency,
            'image_url', i.image_url,
            'dietary_tags', i.dietary_tags
          ) ORDER BY i.sort_order
        )
        FROM public.room_service_menu_items i
        WHERE i.category_id = c.id AND i.is_active = true AND i.is_available = true
      ), '[]'::json)
    ) AS cat
    FROM public.room_service_menu_categories c
    WHERE c.resort_id = p_resort_id AND c.is_active = true
  ) sub;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Place order
CREATE OR REPLACE FUNCTION public.guest_place_room_service_order(
  p_resort_id UUID,
  p_guest_id UUID,
  p_room_number TEXT,
  p_items JSON,
  p_special_instructions TEXT DEFAULT NULL,
  p_stay_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_order_id UUID;
  v_total NUMERIC(10,2) := 0;
  v_item JSON;
  v_menu_item RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.guests WHERE id = p_guest_id AND resort_id = p_resort_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.room_service_orders (resort_id, guest_id, stay_id, room_number, special_instructions)
  VALUES (p_resort_id, p_guest_id, p_stay_id, p_room_number, p_special_instructions)
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM json_array_elements(p_items)
  LOOP
    SELECT id, name, price, currency INTO v_menu_item
    FROM public.room_service_menu_items
    WHERE id = (v_item->>'menu_item_id')::UUID
      AND resort_id = p_resort_id
      AND is_active = true
      AND is_available = true;

    IF v_menu_item.id IS NULL THEN
      RAISE EXCEPTION 'Menu item not found or unavailable: %', v_item->>'menu_item_id';
    END IF;

    INSERT INTO public.room_service_order_items (order_id, menu_item_id, resort_id, item_name, quantity, unit_price, special_requests)
    VALUES (
      v_order_id,
      v_menu_item.id,
      p_resort_id,
      v_menu_item.name,
      COALESCE((v_item->>'quantity')::INT, 1),
      v_menu_item.price,
      v_item->>'special_requests'
    );

    v_total := v_total + (v_menu_item.price * COALESCE((v_item->>'quantity')::INT, 1));
  END LOOP;

  UPDATE public.room_service_orders SET total_amount = v_total WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$;

-- List guest orders
CREATE OR REPLACE FUNCTION public.guest_get_room_service_orders(
  p_resort_id UUID,
  p_guest_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.guests WHERE id = p_guest_id AND resort_id = p_resort_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_agg(o ORDER BY o->>'created_at' DESC)
  INTO result
  FROM (
    SELECT json_build_object(
      'id', ord.id,
      'status', ord.status,
      'total_amount', ord.total_amount,
      'currency', ord.currency,
      'room_number', ord.room_number,
      'special_instructions', ord.special_instructions,
      'estimated_delivery_minutes', ord.estimated_delivery_minutes,
      'delivered_at', ord.delivered_at,
      'created_at', ord.created_at,
      'items', COALESCE((
        SELECT json_agg(
          json_build_object(
            'id', oi.id,
            'item_name', oi.item_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'special_requests', oi.special_requests
          )
        )
        FROM public.room_service_order_items oi WHERE oi.order_id = ord.id
      ), '[]'::json)
    ) AS o
    FROM public.room_service_orders ord
    WHERE ord.guest_id = p_guest_id AND ord.resort_id = p_resort_id
  ) sub;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_service_orders;
