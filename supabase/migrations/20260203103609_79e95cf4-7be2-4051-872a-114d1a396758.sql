
-- =====================================================
-- Phase 1: Transport Lifecycle Metadata (PURELY ADDITIVE)
-- No removals, no renames - only additions
-- =====================================================

-- =====================================================
-- 1) Extend buggy_requests table with lifecycle timestamps
-- =====================================================

ALTER TABLE buggy_requests 
ADD COLUMN IF NOT EXISTS attached_trip_id uuid NULL REFERENCES buggy_trips(id) ON DELETE SET NULL;

ALTER TABLE buggy_requests 
ADD COLUMN IF NOT EXISTS cancelled_at timestamptz NULL;

ALTER TABLE buggy_requests 
ADD COLUMN IF NOT EXISTS assigned_at timestamptz NULL;

ALTER TABLE buggy_requests 
ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_buggy_requests_attached_trip 
ON buggy_requests(attached_trip_id) WHERE attached_trip_id IS NOT NULL;

-- =====================================================
-- 2) Extend buggy_trips table with lifecycle metadata
-- =====================================================

ALTER TABLE buggy_trips 
ADD COLUMN IF NOT EXISTS lifecycle_state text DEFAULT 'planning';

ALTER TABLE buggy_trips 
ADD COLUMN IF NOT EXISTS cancelled_at timestamptz NULL;

ALTER TABLE buggy_trips 
ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL;

ALTER TABLE buggy_trips 
ADD COLUMN IF NOT EXISTS created_by_staff_id uuid NULL;

-- =====================================================
-- 3) Create unified transport_events table
-- =====================================================

CREATE TABLE IF NOT EXISTS transport_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  trip_id uuid NULL REFERENCES buggy_trips(id) ON DELETE SET NULL,
  request_id uuid NULL REFERENCES buggy_requests(id) ON DELETE SET NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('guest', 'staff', 'driver', 'system')),
  actor_id uuid NULL,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transport_events_resort ON transport_events(resort_id);
CREATE INDEX IF NOT EXISTS idx_transport_events_trip ON transport_events(trip_id) WHERE trip_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transport_events_request ON transport_events(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transport_events_created ON transport_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transport_events_actor ON transport_events(actor_id) WHERE actor_id IS NOT NULL;

ALTER TABLE transport_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Helper function for guest event access (uses same JWT pattern as guest_can_access_trip)
-- =====================================================

CREATE OR REPLACE FUNCTION public.guest_can_access_transport_event(_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM transport_events te
    JOIN buggy_requests br ON te.request_id = br.id
    WHERE te.id = _event_id
    AND br.guest_id = (auth.jwt() ->> 'guest_id')::uuid
  );
$$;

-- =====================================================
-- RLS Policies for transport_events
-- =====================================================

CREATE POLICY "staff_select_transport_events" ON transport_events
FOR SELECT TO authenticated
USING (staff_can_view_transport(auth.uid(), resort_id));

CREATE POLICY "guest_select_own_transport_events" ON transport_events
FOR SELECT TO anon
USING (guest_can_access_transport_event(id));

CREATE POLICY "driver_select_assigned_transport_events" ON transport_events
FOR SELECT TO authenticated
USING (
  trip_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM buggy_trips bt 
    WHERE bt.id = trip_id 
    AND bt.driver_user_id = auth.uid()
  )
);

CREATE POLICY "service_role_transport_events" ON transport_events
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- 4) Helper function to record transport events
-- =====================================================

CREATE OR REPLACE FUNCTION public.record_transport_event(
  _resort_id uuid,
  _trip_id uuid,
  _request_id uuid,
  _actor_type text,
  _actor_id uuid,
  _event_type text,
  _payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO transport_events (resort_id, trip_id, request_id, actor_type, actor_id, event_type, payload)
  VALUES (_resort_id, _trip_id, _request_id, _actor_type, _actor_id, _event_type, _payload)
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$function$;

-- =====================================================
-- 5) Trigger for request lifecycle timestamps
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_request_lifecycle_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'assigned_to_trip' AND OLD.status IN ('requested', 'queued') THEN
    NEW.assigned_at := COALESCE(NEW.assigned_at, now());
  END IF;
  
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    NEW.cancelled_at := COALESCE(NEW.cancelled_at, now());
  END IF;
  
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  END IF;
  
  RETURN NEW;
END;
$function$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_request_lifecycle') THEN
    CREATE TRIGGER trg_sync_request_lifecycle
      BEFORE UPDATE OF status ON buggy_requests
      FOR EACH ROW
      EXECUTE FUNCTION sync_request_lifecycle_timestamps();
  END IF;
END $$;

-- =====================================================
-- 6) Trigger for trip lifecycle timestamps
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_trip_lifecycle_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.lifecycle_state := NEW.status::text;
  
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    NEW.cancelled_at := COALESCE(NEW.cancelled_at, now());
  END IF;
  
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  END IF;
  
  RETURN NEW;
END;
$function$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_trip_lifecycle') THEN
    CREATE TRIGGER trg_sync_trip_lifecycle
      BEFORE UPDATE OF status ON buggy_trips
      FOR EACH ROW
      EXECUTE FUNCTION sync_trip_lifecycle_timestamps();
  END IF;
END $$;

-- =====================================================
-- 7) Update create_trip_from_requests to populate new fields
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_trip_from_requests(
  _resort_id uuid,
  _request_ids uuid[],
  _trip_type buggy_trip_type DEFAULT 'pooled_custom'::buggy_trip_type
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_trip_id UUID;
  req RECORD;
  stop_seq INT := 0;
  total_party INT := 0;
  actor_id UUID := auth.uid();
  matched_count INT := 0;
BEGIN
  INSERT INTO buggy_trips (resort_id, trip_type, status, lifecycle_state, created_by_staff_id)
  VALUES (_resort_id, _trip_type, 'planning', 'planning', actor_id)
  RETURNING id INTO new_trip_id;
  
  PERFORM record_trip_event(
    new_trip_id, _resort_id, 'staff', actor_id, 'trip_created',
    NULL, 'planning',
    jsonb_build_object('request_ids', _request_ids, 'trip_type', _trip_type)
  );
  
  PERFORM record_transport_event(
    _resort_id, new_trip_id, NULL, 'staff', actor_id, 'trip_created',
    jsonb_build_object('request_ids', _request_ids, 'trip_type', _trip_type)
  );

  FOR req IN 
    SELECT br.*, ps.name as pickup_name, ds.name as dropoff_name 
    FROM buggy_requests br
    LEFT JOIN buggy_stops ps ON br.pickup_stop_id = ps.id 
    LEFT JOIN buggy_stops ds ON br.dropoff_stop_id = ds.id
    WHERE br.id = ANY(_request_ids) 
      AND br.status IN ('requested', 'queued', 'assigned_to_trip')
      AND br.resort_id = _resort_id
    ORDER BY br.created_at
    FOR UPDATE OF br
  LOOP
    matched_count := matched_count + 1;
    
    INSERT INTO buggy_trip_requests (trip_id, request_id, resort_id, party_size, state)
    VALUES (new_trip_id, req.id, _resort_id, req.party_size, 'active');
    
    UPDATE buggy_requests 
    SET 
      status = 'assigned_to_trip', 
      attached_trip_id = new_trip_id,
      assigned_at = now(),
      updated_at = now() 
    WHERE id = req.id;
    
    PERFORM record_request_event(
      req.id, _resort_id, 'staff', actor_id, 'assigned_to_trip',
      req.status::TEXT, 'assigned_to_trip',
      jsonb_build_object('trip_id', new_trip_id)
    );
    
    PERFORM record_transport_event(
      _resort_id, new_trip_id, req.id, 'staff', actor_id, 'request_assigned_to_trip',
      jsonb_build_object('from_status', req.status::TEXT)
    );
    
    total_party := total_party + req.party_size;
    
    stop_seq := stop_seq + 1;
    INSERT INTO buggy_trip_stops (trip_id, resort_id, stop_id, stop_kind, related_request_id, sequence, title, location)
    VALUES (new_trip_id, _resort_id, req.pickup_stop_id, 'pickup', req.id, stop_seq,
      COALESCE(req.pickup_name, req.pickup_text), req.pickup_location);
    
    stop_seq := stop_seq + 1;
    INSERT INTO buggy_trip_stops (trip_id, resort_id, stop_id, stop_kind, related_request_id, sequence, title, location)
    VALUES (new_trip_id, _resort_id, req.dropoff_stop_id, 'dropoff', req.id, stop_seq,
      COALESCE(req.dropoff_name, req.dropoff_text), req.dropoff_location);
  END LOOP;

  IF matched_count = 0 THEN
    DELETE FROM buggy_trips WHERE id = new_trip_id;
    RETURN jsonb_build_object('ok', false, 'error', 'No valid requests found');
  END IF;

  UPDATE buggy_trips SET capacity_total = total_party WHERE id = new_trip_id;
  
  RETURN jsonb_build_object('ok', true, 'trip_id', new_trip_id, 'request_count', matched_count, 'total_party_size', total_party);
END;
$function$;

ALTER PUBLICATION supabase_realtime ADD TABLE transport_events;

COMMENT ON TABLE transport_events IS 'Unified audit/reconciliation log for all transport lifecycle events';
