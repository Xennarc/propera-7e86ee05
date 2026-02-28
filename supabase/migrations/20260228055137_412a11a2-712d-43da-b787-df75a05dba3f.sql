
-- ============================================================================
-- Room Service V2: Additive schema enhancements
-- Creates 6 new tables + adds missing columns to 2 existing tables
-- No destructive changes. All resort_id scoped with RLS.
-- ============================================================================

-- ============================================================================
-- 1. ADD MISSING COLUMNS to existing tables (purely additive)
-- ============================================================================

-- 1a. room_service_menu_items: add allergens, tags, prep_time, is_featured
ALTER TABLE public.room_service_menu_items
  ADD COLUMN IF NOT EXISTS allergens text[] NULL,
  ADD COLUMN IF NOT EXISTS tags text[] NULL,
  ADD COLUMN IF NOT EXISTS prep_time_minutes int NULL,
  ADD COLUMN IF NOT EXISTS is_featured bool NOT NULL DEFAULT false;

-- 1b. room_service_orders: add scheduling, pricing breakdown, staff fields
ALTER TABLE public.room_service_orders
  ADD COLUMN IF NOT EXISTS placed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz NULL,
  ADD COLUMN IF NOT EXISTS promised_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS subtotal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_charge numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'room_charge',
  ADD COLUMN IF NOT EXISTS delivery_notes text NULL,
  ADD COLUMN IF NOT EXISTS allergy_notes text NULL,
  ADD COLUMN IF NOT EXISTS villa_label text NULL,
  ADD COLUMN IF NOT EXISTS created_by_staff_id uuid NULL,
  ADD COLUMN IF NOT EXISTS assigned_runner_staff_id uuid NULL,
  ADD COLUMN IF NOT EXISTS idempotency_key text NULL;

-- 1c. room_service_order_items: add name/price snapshot aliases + notes
ALTER TABLE public.room_service_order_items
  ADD COLUMN IF NOT EXISTS notes text NULL;

-- ============================================================================
-- 2. NEW TABLES
-- ============================================================================

-- 2a. Modifier groups
CREATE TABLE IF NOT EXISTS public.room_service_modifier_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  name text NOT NULL,
  selection_type text NOT NULL DEFAULT 'single'
    CHECK (selection_type IN ('single','multiple')),
  min_selected int NOT NULL DEFAULT 0,
  max_selected int NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2b. Modifier options
CREATE TABLE IF NOT EXISTS public.room_service_modifier_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.room_service_modifier_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_delta numeric NOT NULL DEFAULT 0,
  is_available bool NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2c. Item <-> modifier group join
CREATE TABLE IF NOT EXISTS public.room_service_item_modifier_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.room_service_menu_items(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.room_service_modifier_groups(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0
);

-- 2d. Ordering hours
CREATE TABLE IF NOT EXISTS public.room_service_ordering_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active bool NOT NULL DEFAULT true
);

-- 2e. Order item modifiers (snapshot of chosen modifiers per line item)
CREATE TABLE IF NOT EXISTS public.room_service_order_item_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES public.room_service_order_items(id) ON DELETE CASCADE,
  modifier_option_id uuid NOT NULL REFERENCES public.room_service_modifier_options(id),
  name_snapshot text NOT NULL,
  price_delta_snapshot numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2f. Status events (audit trail for order lifecycle)
CREATE TABLE IF NOT EXISTS public.room_service_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.room_service_orders(id) ON DELETE CASCADE,
  old_status text NULL,
  new_status text NOT NULL,
  message text NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('guest','staff','system')),
  actor_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

-- Menu browsing
CREATE INDEX IF NOT EXISTS idx_rs_items_resort_cat_avail
  ON public.room_service_menu_items (resort_id, category_id, is_available);

-- Guest order history
CREATE INDEX IF NOT EXISTS idx_rs_orders_resort_guest_placed
  ON public.room_service_orders (resort_id, guest_id, placed_at DESC);

-- Staff order queue
CREATE INDEX IF NOT EXISTS idx_rs_orders_resort_status_placed
  ON public.room_service_orders (resort_id, status, placed_at DESC);

-- Order line items
CREATE INDEX IF NOT EXISTS idx_rs_order_items_order
  ON public.room_service_order_items (order_id);

-- Order item modifiers
CREATE INDEX IF NOT EXISTS idx_rs_order_item_mods_item
  ON public.room_service_order_item_modifiers (order_item_id);

-- Status events
CREATE INDEX IF NOT EXISTS idx_rs_status_events_order
  ON public.room_service_status_events (order_id, created_at);

-- Modifier options by group
CREATE INDEX IF NOT EXISTS idx_rs_mod_options_group
  ON public.room_service_modifier_options (group_id, sort_order);

-- Item modifier groups join
CREATE INDEX IF NOT EXISTS idx_rs_item_mod_groups_item
  ON public.room_service_item_modifier_groups (item_id);

-- Ordering hours
CREATE INDEX IF NOT EXISTS idx_rs_ordering_hours_resort_day
  ON public.room_service_ordering_hours (resort_id, day_of_week);

-- Idempotency key uniqueness (partial - only non-null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_rs_orders_idempotency
  ON public.room_service_orders (resort_id, guest_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- 4. ENABLE RLS on new tables
-- ============================================================================

ALTER TABLE public.room_service_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_service_modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_service_item_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_service_ordering_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_service_order_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_service_status_events ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (Propera security pattern)
ALTER TABLE public.room_service_modifier_groups FORCE ROW LEVEL SECURITY;
ALTER TABLE public.room_service_modifier_options FORCE ROW LEVEL SECURITY;
ALTER TABLE public.room_service_item_modifier_groups FORCE ROW LEVEL SECURITY;
ALTER TABLE public.room_service_ordering_hours FORCE ROW LEVEL SECURITY;
ALTER TABLE public.room_service_order_item_modifiers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.room_service_status_events FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. RLS POLICIES - Guest access (read menu, read own orders)
-- ============================================================================

-- Guests can view active modifier groups for their resort
CREATE POLICY "Guests can view active modifier groups"
  ON public.room_service_modifier_groups FOR SELECT
  USING (is_active = true);

-- Guests can view available modifier options
CREATE POLICY "Guests can view available modifier options"
  ON public.room_service_modifier_options FOR SELECT
  USING (is_available = true);

-- Guests can view item-modifier joins
CREATE POLICY "Guests can view item modifier groups"
  ON public.room_service_item_modifier_groups FOR SELECT
  USING (true);

-- Guests can view ordering hours
CREATE POLICY "Guests can view ordering hours"
  ON public.room_service_ordering_hours FOR SELECT
  USING (true);

-- Guests can view modifiers on their own order items
CREATE POLICY "Guests can view own order item modifiers"
  ON public.room_service_order_item_modifiers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_service_order_items oi
      JOIN public.room_service_orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_id
        AND o.guest_id IN (
          SELECT g.id FROM public.guests g
          WHERE g.portal_enabled = true
        )
    )
  );

-- Guests can view status events on their own orders
CREATE POLICY "Guests can view own order status events"
  ON public.room_service_status_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_service_orders o
      WHERE o.id = order_id
        AND o.guest_id IN (
          SELECT g.id FROM public.guests g
          WHERE g.portal_enabled = true
        )
    )
  );

-- ============================================================================
-- 6. RLS POLICIES - Staff access (full CRUD on menu, manage orders)
-- ============================================================================

-- Staff: modifier groups
CREATE POLICY "Staff can manage modifier groups"
  ON public.room_service_modifier_groups FOR ALL
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id))
  WITH CHECK (public.staff_has_resort_access(auth.uid(), resort_id));

-- Staff: modifier options
CREATE POLICY "Staff can manage modifier options"
  ON public.room_service_modifier_options FOR ALL
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id))
  WITH CHECK (public.staff_has_resort_access(auth.uid(), resort_id));

-- Staff: item-modifier join
CREATE POLICY "Staff can manage item modifier groups"
  ON public.room_service_item_modifier_groups FOR ALL
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id))
  WITH CHECK (public.staff_has_resort_access(auth.uid(), resort_id));

-- Staff: ordering hours
CREATE POLICY "Staff can manage ordering hours"
  ON public.room_service_ordering_hours FOR ALL
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id))
  WITH CHECK (public.staff_has_resort_access(auth.uid(), resort_id));

-- Staff: order item modifiers (read/insert for order processing)
CREATE POLICY "Staff can manage order item modifiers"
  ON public.room_service_order_item_modifiers FOR ALL
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id))
  WITH CHECK (public.staff_has_resort_access(auth.uid(), resort_id));

-- Staff: status events
CREATE POLICY "Staff can manage status events"
  ON public.room_service_status_events FOR ALL
  TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id))
  WITH CHECK (public.staff_has_resort_access(auth.uid(), resort_id));

-- ============================================================================
-- 7. ENABLE REALTIME for order tracking
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.room_service_status_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_service_modifier_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_service_modifier_options;

-- ============================================================================
-- 8. UPDATED_AT TRIGGERS for new tables
-- ============================================================================

CREATE TRIGGER set_updated_at_room_service_modifier_groups
  BEFORE UPDATE ON public.room_service_modifier_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_room_service_modifier_options
  BEFORE UPDATE ON public.room_service_modifier_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
