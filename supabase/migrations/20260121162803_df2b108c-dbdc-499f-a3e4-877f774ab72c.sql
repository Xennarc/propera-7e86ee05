
-- =============================================================================
-- GUEST REQUESTS FEATURE - DATABASE FOUNDATION
-- Additive migration - no breaking changes to existing schema
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) DEPARTMENTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (resort_id, key)
);

CREATE INDEX idx_departments_resort_active ON public.departments(resort_id, is_active);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Staff can view departments for their resort
CREATE POLICY "Staff can view resort departments"
  ON public.departments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      WHERE rm.resort_id = departments.resort_id
      AND rm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.global_role = 'SUPER_ADMIN'
    )
  );

-- Resort admins can manage departments
CREATE POLICY "Resort admins can manage departments"
  ON public.departments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      WHERE rm.resort_id = departments.resort_id
      AND rm.user_id = auth.uid()
      AND rm.resort_role IN ('RESORT_ADMIN', 'MANAGER')
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.global_role = 'SUPER_ADMIN'
    )
  );

-- -----------------------------------------------------------------------------
-- 2) DEPARTMENT MEMBERSHIPS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE public.department_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  department_key TEXT NOT NULL,
  dept_role TEXT NOT NULL CHECK (dept_role IN ('LINE', 'SUPERVISOR', 'MANAGER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (resort_id, department_key, user_id)
);

CREATE INDEX idx_dept_memberships_resort_dept_user ON public.department_memberships(resort_id, department_key, user_id);
CREATE INDEX idx_dept_memberships_user ON public.department_memberships(user_id);

ALTER TABLE public.department_memberships ENABLE ROW LEVEL SECURITY;

-- Staff can view department memberships for their resort
CREATE POLICY "Staff can view resort department memberships"
  ON public.department_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      WHERE rm.resort_id = department_memberships.resort_id
      AND rm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.global_role = 'SUPER_ADMIN'
    )
  );

-- Resort admins/managers can manage department memberships
CREATE POLICY "Resort admins can manage department memberships"
  ON public.department_memberships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      WHERE rm.resort_id = department_memberships.resort_id
      AND rm.user_id = auth.uid()
      AND rm.resort_role IN ('RESORT_ADMIN', 'MANAGER')
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.global_role = 'SUPER_ADMIN'
    )
  );

-- -----------------------------------------------------------------------------
-- 3) REQUEST CATALOG TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE public.request_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID REFERENCES public.resorts(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  department_key TEXT NOT NULL,
  icon_key TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_billable BOOLEAN NOT NULL DEFAULT false,
  default_priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (default_priority IN ('LOW', 'NORMAL', 'HIGH')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint using coalesce for global templates (resort_id = null)
CREATE UNIQUE INDEX idx_request_catalog_unique_code 
  ON public.request_catalog(COALESCE(resort_id, '00000000-0000-0000-0000-000000000000'::uuid), code);

CREATE INDEX idx_request_catalog_resort_active ON public.request_catalog(resort_id, is_active);
CREATE INDEX idx_request_catalog_dept ON public.request_catalog(resort_id, department_key);

ALTER TABLE public.request_catalog ENABLE ROW LEVEL SECURITY;

-- Anyone can view global templates (resort_id IS NULL), staff can view their resort's catalog
CREATE POLICY "View request catalog"
  ON public.request_catalog FOR SELECT
  USING (
    resort_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      WHERE rm.resort_id = request_catalog.resort_id
      AND rm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.global_role = 'SUPER_ADMIN'
    )
  );

-- Resort admins can manage their resort's catalog
CREATE POLICY "Resort admins can manage request catalog"
  ON public.request_catalog FOR ALL
  USING (
    (resort_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      WHERE rm.resort_id = request_catalog.resort_id
      AND rm.user_id = auth.uid()
      AND rm.resort_role IN ('RESORT_ADMIN', 'MANAGER')
    ))
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.global_role = 'SUPER_ADMIN'
    )
  );

-- -----------------------------------------------------------------------------
-- 4) RESORT RETENTION POLICIES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE public.resort_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL UNIQUE REFERENCES public.resorts(id) ON DELETE CASCADE,
  default_archive_after_days INTEGER NOT NULL DEFAULT 30,
  default_delete_after_days INTEGER NOT NULL DEFAULT 365,
  department_visibility_policy TEXT NOT NULL DEFAULT 'ASSIGNED_ONLY' CHECK (department_visibility_policy IN ('ASSIGNED_ONLY', 'DEPARTMENT_QUEUE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.resort_retention_policies ENABLE ROW LEVEL SECURITY;

-- Staff can view their resort's retention policies
CREATE POLICY "Staff can view resort retention policies"
  ON public.resort_retention_policies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      WHERE rm.resort_id = resort_retention_policies.resort_id
      AND rm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.global_role = 'SUPER_ADMIN'
    )
  );

-- Resort admins can manage retention policies
CREATE POLICY "Resort admins can manage retention policies"
  ON public.resort_retention_policies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      WHERE rm.resort_id = resort_retention_policies.resort_id
      AND rm.user_id = auth.uid()
      AND rm.resort_role = 'RESORT_ADMIN'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.global_role = 'SUPER_ADMIN'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_resort_retention_policies_updated_at
  BEFORE UPDATE ON public.resort_retention_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 5) DEPARTMENT RETENTION OVERRIDES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE public.department_retention_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  department_key TEXT NOT NULL,
  archive_after_days INTEGER,
  delete_after_days INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (resort_id, department_key)
);

ALTER TABLE public.department_retention_overrides ENABLE ROW LEVEL SECURITY;

-- Staff can view department retention overrides
CREATE POLICY "Staff can view department retention overrides"
  ON public.department_retention_overrides FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      WHERE rm.resort_id = department_retention_overrides.resort_id
      AND rm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.global_role = 'SUPER_ADMIN'
    )
  );

-- Resort admins can manage department retention overrides
CREATE POLICY "Resort admins can manage department retention overrides"
  ON public.department_retention_overrides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      WHERE rm.resort_id = department_retention_overrides.resort_id
      AND rm.user_id = auth.uid()
      AND rm.resort_role = 'RESORT_ADMIN'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.global_role = 'SUPER_ADMIN'
    )
  );

-- -----------------------------------------------------------------------------
-- 6) SERVICE REQUESTS TABLE (ACTIVE/HOT)
-- -----------------------------------------------------------------------------
CREATE TABLE public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  room_id UUID,
  catalog_id UUID REFERENCES public.request_catalog(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  notes TEXT,
  internal_notes TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_asap BOOLEAN NOT NULL DEFAULT true,
  requested_for_at TIMESTAMPTZ,
  department_key TEXT NOT NULL,
  category TEXT,
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH')),
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  assigned_at TIMESTAMPTZ,
  assigned_by UUID,
  assigned_to UUID,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID
);

-- Performance indexes for common query patterns
CREATE INDEX idx_service_requests_resort_status_created 
  ON public.service_requests(resort_id, status, created_at DESC);

CREATE INDEX idx_service_requests_resort_dept_status_created 
  ON public.service_requests(resort_id, department_key, status, created_at DESC);

CREATE INDEX idx_service_requests_resort_assigned_status_created 
  ON public.service_requests(resort_id, assigned_to, status, created_at DESC);

CREATE INDEX idx_service_requests_resort_requested_for 
  ON public.service_requests(resort_id, requested_for_at);

CREATE INDEX idx_service_requests_guest 
  ON public.service_requests(guest_id);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- Staff can view requests for their resort
CREATE POLICY "Staff can view resort service requests"
  ON public.service_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      WHERE rm.resort_id = service_requests.resort_id
      AND rm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.global_role = 'SUPER_ADMIN'
    )
  );

-- Staff can insert requests (on behalf of guests)
CREATE POLICY "Staff can create service requests"
  ON public.service_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      WHERE rm.resort_id = service_requests.resort_id
      AND rm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.global_role = 'SUPER_ADMIN'
    )
  );

-- Staff can update requests for their resort
CREATE POLICY "Staff can update service requests"
  ON public.service_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      WHERE rm.resort_id = service_requests.resort_id
      AND rm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.global_role = 'SUPER_ADMIN'
    )
  );

-- Only admins can delete (soft delete via status preferred)
CREATE POLICY "Admins can delete service requests"
  ON public.service_requests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      WHERE rm.resort_id = service_requests.resort_id
      AND rm.user_id = auth.uid()
      AND rm.resort_role = 'RESORT_ADMIN'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.global_role = 'SUPER_ADMIN'
    )
  );

-- Enable realtime for service_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;

-- -----------------------------------------------------------------------------
-- 7) SERVICE REQUESTS ARCHIVE TABLE (COLD)
-- -----------------------------------------------------------------------------
CREATE TABLE public.service_requests_archive (
  id UUID PRIMARY KEY,
  resort_id UUID NOT NULL,
  guest_id UUID NOT NULL,
  room_id UUID,
  catalog_id UUID,
  title TEXT NOT NULL,
  notes TEXT,
  internal_notes TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_asap BOOLEAN NOT NULL DEFAULT true,
  requested_for_at TIMESTAMPTZ,
  department_key TEXT NOT NULL,
  category TEXT,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  assigned_at TIMESTAMPTZ,
  assigned_by UUID,
  assigned_to UUID,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_by UUID
);

CREATE INDEX idx_service_requests_archive_resort_archived 
  ON public.service_requests_archive(resort_id, archived_at DESC);

CREATE INDEX idx_service_requests_archive_resort_dept_archived 
  ON public.service_requests_archive(resort_id, department_key, archived_at DESC);

ALTER TABLE public.service_requests_archive ENABLE ROW LEVEL SECURITY;

-- Only admins/managers can view archived requests
CREATE POLICY "Admins can view archived service requests"
  ON public.service_requests_archive FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      WHERE rm.resort_id = service_requests_archive.resort_id
      AND rm.user_id = auth.uid()
      AND rm.resort_role IN ('RESORT_ADMIN', 'MANAGER')
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.global_role = 'SUPER_ADMIN'
    )
  );

-- Only system/admins can insert into archive
CREATE POLICY "System can archive service requests"
  ON public.service_requests_archive FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.global_role = 'SUPER_ADMIN'
    )
  );

-- -----------------------------------------------------------------------------
-- 8) SERVICE REQUEST EVENTS TABLE (AUDIT TRAIL)
-- -----------------------------------------------------------------------------
CREATE TABLE public.service_request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  actor_user_id UUID,
  actor_guest_id UUID,
  event_type TEXT NOT NULL,
  event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_service_request_events_request_event_at 
  ON public.service_request_events(resort_id, request_id, event_at DESC);

CREATE INDEX idx_service_request_events_resort_event_at 
  ON public.service_request_events(resort_id, event_at DESC);

ALTER TABLE public.service_request_events ENABLE ROW LEVEL SECURITY;

-- Staff can view events for their resort
CREATE POLICY "Staff can view service request events"
  ON public.service_request_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      WHERE rm.resort_id = service_request_events.resort_id
      AND rm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.global_role = 'SUPER_ADMIN'
    )
  );

-- Staff can create events
CREATE POLICY "Staff can create service request events"
  ON public.service_request_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      WHERE rm.resort_id = service_request_events.resort_id
      AND rm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.global_role = 'SUPER_ADMIN'
    )
  );

-- -----------------------------------------------------------------------------
-- TRIGGER: Auto-create event on service_request status change
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.service_request_status_change_event()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.service_request_events (
      request_id,
      resort_id,
      actor_user_id,
      event_type,
      meta
    ) VALUES (
      NEW.id,
      NEW.resort_id,
      auth.uid(),
      'STATUS_CHANGE',
      jsonb_build_object(
        'from_status', OLD.status,
        'to_status', NEW.status
      )
    );
  END IF;
  
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.service_request_events (
      request_id,
      resort_id,
      actor_user_id,
      event_type,
      meta
    ) VALUES (
      NEW.id,
      NEW.resort_id,
      auth.uid(),
      'ASSIGNMENT',
      jsonb_build_object(
        'from_user_id', OLD.assigned_to,
        'to_user_id', NEW.assigned_to
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER service_request_status_change_trigger
  AFTER UPDATE ON public.service_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.service_request_status_change_event();

-- Trigger for new request creation event
CREATE OR REPLACE FUNCTION public.service_request_created_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.service_request_events (
    request_id,
    resort_id,
    actor_user_id,
    actor_guest_id,
    event_type,
    meta
  ) VALUES (
    NEW.id,
    NEW.resort_id,
    auth.uid(),
    NEW.guest_id,
    'CREATED',
    jsonb_build_object(
      'title', NEW.title,
      'department_key', NEW.department_key,
      'priority', NEW.priority,
      'is_asap', NEW.is_asap
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER service_request_created_trigger
  AFTER INSERT ON public.service_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.service_request_created_event();

-- -----------------------------------------------------------------------------
-- SEED FUNCTION: Initialize departments for a resort
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_resort_departments(p_resort_id UUID)
RETURNS void AS $$
BEGIN
  -- Only insert if no departments exist for this resort
  IF NOT EXISTS (SELECT 1 FROM public.departments WHERE resort_id = p_resort_id) THEN
    INSERT INTO public.departments (resort_id, key, name) VALUES
      (p_resort_id, 'HOUSEKEEPING', 'Housekeeping'),
      (p_resort_id, 'MINIBAR', 'Minibar'),
      (p_resort_id, 'ENGINEERING', 'Engineering'),
      (p_resort_id, 'FRONT_OFFICE', 'Front Office'),
      (p_resort_id, 'FNB', 'Food & Beverage'),
      (p_resort_id, 'SPA', 'Spa & Wellness'),
      (p_resort_id, 'CONCIERGE', 'Concierge');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- -----------------------------------------------------------------------------
-- SEED FUNCTION: Initialize request catalog for a resort (copies from global)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_resort_request_catalog(p_resort_id UUID)
RETURNS void AS $$
BEGIN
  -- Only insert if no catalog items exist for this resort
  IF NOT EXISTS (SELECT 1 FROM public.request_catalog WHERE resort_id = p_resort_id) THEN
    INSERT INTO public.request_catalog (resort_id, code, title, category, department_key, icon_key, is_billable, default_priority) VALUES
      -- Minibar items
      (p_resort_id, 'MINIBAR_REFILL', 'Minibar Refill', 'MINIBAR', 'MINIBAR', 'wine', false, 'NORMAL'),
      (p_resort_id, 'WATER_BOTTLES', 'Water Bottles', 'MINIBAR', 'MINIBAR', 'droplet', false, 'NORMAL'),
      (p_resort_id, 'SNACKS', 'Snack Basket', 'MINIBAR', 'MINIBAR', 'cookie', false, 'NORMAL'),
      
      -- Amenities
      (p_resort_id, 'DENTAL_KIT', 'Dental Kit', 'AMENITIES', 'HOUSEKEEPING', 'sparkles', false, 'NORMAL'),
      (p_resort_id, 'RAZOR', 'Razor', 'AMENITIES', 'HOUSEKEEPING', 'scissors', false, 'NORMAL'),
      (p_resort_id, 'COMB', 'Comb', 'AMENITIES', 'HOUSEKEEPING', 'brush', false, 'NORMAL'),
      (p_resort_id, 'SEWING_KIT', 'Sewing Kit', 'AMENITIES', 'HOUSEKEEPING', 'needle', false, 'NORMAL'),
      (p_resort_id, 'SHAMPOO', 'Extra Shampoo', 'AMENITIES', 'HOUSEKEEPING', 'droplet', false, 'NORMAL'),
      (p_resort_id, 'SLIPPERS', 'Extra Slippers', 'AMENITIES', 'HOUSEKEEPING', 'footprints', false, 'NORMAL'),
      (p_resort_id, 'BATHROBE', 'Extra Bathrobe', 'AMENITIES', 'HOUSEKEEPING', 'shirt', false, 'NORMAL'),
      
      -- Room services
      (p_resort_id, 'ROOM_CLEANING', 'Room Cleaning', 'ROOM', 'HOUSEKEEPING', 'sparkles', false, 'NORMAL'),
      (p_resort_id, 'TOWEL_REPLACEMENT', 'Towel Replacement', 'ROOM', 'HOUSEKEEPING', 'bath', false, 'NORMAL'),
      (p_resort_id, 'LINEN_CHANGE', 'Linen Change', 'ROOM', 'HOUSEKEEPING', 'bed', false, 'NORMAL'),
      (p_resort_id, 'TURNDOWN_SERVICE', 'Turndown Service', 'ROOM', 'HOUSEKEEPING', 'moon', false, 'NORMAL'),
      (p_resort_id, 'EXTRA_PILLOWS', 'Extra Pillows', 'ROOM', 'HOUSEKEEPING', 'cloud', false, 'NORMAL'),
      (p_resort_id, 'EXTRA_BLANKET', 'Extra Blanket', 'ROOM', 'HOUSEKEEPING', 'layers', false, 'NORMAL'),
      
      -- Maintenance
      (p_resort_id, 'MAINTENANCE_ISSUE', 'Report Maintenance Issue', 'MAINTENANCE', 'ENGINEERING', 'wrench', false, 'HIGH'),
      (p_resort_id, 'AC_ISSUE', 'Air Conditioning Issue', 'MAINTENANCE', 'ENGINEERING', 'thermometer', false, 'HIGH'),
      (p_resort_id, 'LIGHTING_ISSUE', 'Lighting Issue', 'MAINTENANCE', 'ENGINEERING', 'lightbulb', false, 'NORMAL'),
      (p_resort_id, 'PLUMBING_ISSUE', 'Plumbing Issue', 'MAINTENANCE', 'ENGINEERING', 'droplet', false, 'HIGH'),
      
      -- Other
      (p_resort_id, 'OTHER', 'Other Request', 'OTHER', 'FRONT_OFFICE', 'message-circle', false, 'NORMAL');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- -----------------------------------------------------------------------------
-- SEED FUNCTION: Initialize retention policy for a resort
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_resort_retention_policy(p_resort_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.resort_retention_policies (resort_id)
  VALUES (p_resort_id)
  ON CONFLICT (resort_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- -----------------------------------------------------------------------------
-- COMBINED SEED FUNCTION: Initialize all guest request data for a resort
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.initialize_guest_requests_for_resort(p_resort_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM public.seed_resort_departments(p_resort_id);
  PERFORM public.seed_resort_request_catalog(p_resort_id);
  PERFORM public.seed_resort_retention_policy(p_resort_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- -----------------------------------------------------------------------------
-- RPC: Guest creates a service request (anonymous-safe)
-- -----------------------------------------------------------------------------
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
BEGIN
  -- Validate guest belongs to resort
  IF NOT EXISTS (
    SELECT 1 FROM public.guests 
    WHERE id = p_guest_id AND resort_id = p_resort_id
  ) THEN
    RAISE EXCEPTION 'Invalid guest or resort';
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

-- -----------------------------------------------------------------------------
-- RPC: Guest gets their service requests
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guest_get_service_requests(
  p_resort_id UUID,
  p_guest_id UUID
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  notes TEXT,
  quantity INTEGER,
  is_asap BOOLEAN,
  requested_for_at TIMESTAMPTZ,
  department_key TEXT,
  category TEXT,
  priority TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  catalog_icon_key TEXT
) AS $$
BEGIN
  -- Validate guest belongs to resort
  IF NOT EXISTS (
    SELECT 1 FROM public.guests g
    WHERE g.id = p_guest_id AND g.resort_id = p_resort_id
  ) THEN
    RAISE EXCEPTION 'Invalid guest or resort';
  END IF;
  
  RETURN QUERY
  SELECT 
    sr.id,
    sr.title,
    sr.notes,
    sr.quantity,
    sr.is_asap,
    sr.requested_for_at,
    sr.department_key,
    sr.category,
    sr.priority,
    sr.status,
    sr.created_at,
    sr.acknowledged_at,
    sr.completed_at,
    sr.cancelled_at,
    rc.icon_key AS catalog_icon_key
  FROM public.service_requests sr
  LEFT JOIN public.request_catalog rc ON rc.id = sr.catalog_id
  WHERE sr.resort_id = p_resort_id
  AND sr.guest_id = p_guest_id
  ORDER BY sr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- -----------------------------------------------------------------------------
-- RPC: Guest gets available request catalog items
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guest_get_request_catalog(
  p_resort_id UUID
)
RETURNS TABLE (
  id UUID,
  code TEXT,
  title TEXT,
  category TEXT,
  department_key TEXT,
  icon_key TEXT,
  is_billable BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rc.id,
    rc.code,
    rc.title,
    rc.category,
    rc.department_key,
    rc.icon_key,
    rc.is_billable
  FROM public.request_catalog rc
  WHERE (rc.resort_id = p_resort_id OR rc.resort_id IS NULL)
  AND rc.is_active = true
  ORDER BY rc.category, rc.title;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- -----------------------------------------------------------------------------
-- RPC: Guest cancels their own request (only if NEW or ACKNOWLEDGED)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guest_cancel_service_request(
  p_resort_id UUID,
  p_guest_id UUID,
  p_request_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  -- Get current status and verify ownership
  SELECT sr.status INTO v_current_status
  FROM public.service_requests sr
  WHERE sr.id = p_request_id
  AND sr.resort_id = p_resort_id
  AND sr.guest_id = p_guest_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  IF v_current_status NOT IN ('NEW', 'ACKNOWLEDGED') THEN
    RAISE EXCEPTION 'Cannot cancel request in % status', v_current_status;
  END IF;
  
  UPDATE public.service_requests
  SET 
    status = 'CANCELLED',
    cancelled_at = now(),
    cancelled_by = NULL -- Guest cancelled
  WHERE id = p_request_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- -----------------------------------------------------------------------------
-- GRANT EXECUTE on RPC functions
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.guest_create_service_request TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_get_service_requests TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_get_request_catalog TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_cancel_service_request TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_guest_requests_for_resort TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_resort_departments TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_resort_request_catalog TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_resort_retention_policy TO authenticated;
