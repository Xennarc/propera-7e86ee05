-- Phase 1: Transport History + Archiving Foundations

-- Drop conflicting functions first
DROP FUNCTION IF EXISTS public.driver_start_trip_atomic(UUID);
DROP FUNCTION IF EXISTS public.driver_complete_trip_atomic(UUID);
DROP FUNCTION IF EXISTS public.driver_update_trip_stop_status(UUID, buggy_trip_stop_status);

-- 1) Create buggy_request_events table
CREATE TABLE public.buggy_request_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.buggy_requests(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('guest', 'staff', 'driver', 'system')),
  actor_user_id UUID,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Create buggy_trip_events table
CREATE TABLE public.buggy_trip_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.buggy_trips(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('guest', 'staff', 'driver', 'system')),
  actor_user_id UUID,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on event tables
ALTER TABLE public.buggy_request_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buggy_trip_events ENABLE ROW LEVEL SECURITY;

-- RLS policies using existing functions
CREATE POLICY "Staff can view request events for their resort"
  ON public.buggy_request_events FOR SELECT
  USING (has_resort_membership(resort_id, auth.uid()));

CREATE POLICY "Staff can view trip events for their resort"
  ON public.buggy_trip_events FOR SELECT
  USING (has_resort_membership(resort_id, auth.uid()));

CREATE POLICY "Guests can view their own request events"
  ON public.buggy_request_events FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM public.buggy_requests WHERE guest_id = auth.uid()
    )
  );

-- 3) Add archiving fields to buggy_requests
ALTER TABLE public.buggy_requests
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- 4) Add archiving fields to buggy_trips
ALTER TABLE public.buggy_trips
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- 5) Create transport_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.transport_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL UNIQUE REFERENCES public.resorts(id) ON DELETE CASCADE,
  service_enabled BOOLEAN NOT NULL DEFAULT true,
  guest_booking_enabled BOOLEAN NOT NULL DEFAULT true,
  service_hours JSONB NOT NULL DEFAULT '{}',
  pooling_enabled BOOLEAN NOT NULL DEFAULT true,
  pooling_window_minutes INTEGER NOT NULL DEFAULT 10,
  max_stops_per_trip INTEGER NOT NULL DEFAULT 6,
  max_pickup_detour_meters INTEGER NOT NULL DEFAULT 500,
  max_wait_minutes INTEGER NOT NULL DEFAULT 15,
  max_party_size INTEGER NOT NULL DEFAULT 6,
  location_required BOOLEAN NOT NULL DEFAULT false,
  gps_throttle_seconds INTEGER NOT NULL DEFAULT 5,
  presence_interval_seconds INTEGER NOT NULL DEFAULT 30,
  notify_guest_on_assigned BOOLEAN NOT NULL DEFAULT true,
  notify_guest_on_driver_en_route BOOLEAN NOT NULL DEFAULT true,
  notify_guest_on_arrived BOOLEAN NOT NULL DEFAULT true,
  notify_guest_eta_minutes INTEGER NOT NULL DEFAULT 5,
  history_retention_days INTEGER NOT NULL DEFAULT 90,
  archive_after_days INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transport_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view transport settings for their resort"
  ON public.transport_settings FOR SELECT
  USING (has_resort_membership(resort_id, auth.uid()));

-- 6) Create indexes
CREATE INDEX IF NOT EXISTS idx_buggy_request_events_resort_created 
  ON public.buggy_request_events (resort_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_buggy_trip_events_resort_created 
  ON public.buggy_trip_events (resort_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_buggy_request_events_request 
  ON public.buggy_request_events (request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_buggy_trip_events_trip 
  ON public.buggy_trip_events (trip_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_buggy_requests_active 
  ON public.buggy_requests (resort_id, status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_buggy_requests_archived 
  ON public.buggy_requests (resort_id, archived_at)
  WHERE archived_at IS NOT NULL;

-- 7) Helper functions to record events
CREATE OR REPLACE FUNCTION public.record_request_event(
  _request_id UUID,
  _resort_id UUID,
  _actor_type TEXT,
  _actor_user_id UUID,
  _event_type TEXT,
  _from_status TEXT DEFAULT NULL,
  _to_status TEXT DEFAULT NULL,
  _payload JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE event_id UUID;
BEGIN
  INSERT INTO buggy_request_events (request_id, resort_id, actor_type, actor_user_id, event_type, from_status, to_status, payload)
  VALUES (_request_id, _resort_id, _actor_type, _actor_user_id, _event_type, _from_status, _to_status, _payload)
  RETURNING id INTO event_id;
  RETURN event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_trip_event(
  _trip_id UUID,
  _resort_id UUID,
  _actor_type TEXT,
  _actor_user_id UUID,
  _event_type TEXT,
  _from_status TEXT DEFAULT NULL,
  _to_status TEXT DEFAULT NULL,
  _payload JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE event_id UUID;
BEGIN
  INSERT INTO buggy_trip_events (trip_id, resort_id, actor_type, actor_user_id, event_type, from_status, to_status, payload)
  VALUES (_trip_id, _resort_id, _actor_type, _actor_user_id, _event_type, _from_status, _to_status, _payload)
  RETURNING id INTO event_id;
  RETURN event_id;
END;
$$;

-- 8) Update create_trip_from_requests
CREATE OR REPLACE FUNCTION public.create_trip_from_requests(
  _resort_id UUID, _request_ids UUID[], _trip_type buggy_trip_type DEFAULT 'pooled_custom'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_trip_id UUID; req RECORD; stop_seq INT := 0; total_party INT := 0; actor_id UUID := auth.uid();
BEGIN
  INSERT INTO buggy_trips (resort_id, trip_type, status) VALUES (_resort_id, _trip_type, 'planning') RETURNING id INTO new_trip_id;
  PERFORM record_trip_event(new_trip_id, _resort_id, 'staff', actor_id, 'trip_created', NULL, 'planning', jsonb_build_object('request_ids', _request_ids, 'trip_type', _trip_type));

  FOR req IN SELECT br.*, ps.name as pickup_name, ds.name as dropoff_name FROM buggy_requests br
    LEFT JOIN buggy_stops ps ON br.pickup_stop_id = ps.id LEFT JOIN buggy_stops ds ON br.dropoff_stop_id = ds.id
    WHERE br.id = ANY(_request_ids) AND br.status IN ('pending', 'assigned_to_trip') ORDER BY br.created_at
  LOOP
    INSERT INTO buggy_trip_requests (trip_id, request_id, resort_id, party_size, state) VALUES (new_trip_id, req.id, _resort_id, req.party_size, 'active');
    UPDATE buggy_requests SET status = 'assigned_to_trip', updated_at = now() WHERE id = req.id;
    PERFORM record_request_event(req.id, _resort_id, 'staff', actor_id, 'assigned_to_trip', req.status::TEXT, 'assigned_to_trip', jsonb_build_object('trip_id', new_trip_id));
    total_party := total_party + req.party_size;
    stop_seq := stop_seq + 1;
    INSERT INTO buggy_trip_stops (trip_id, resort_id, stop_id, stop_kind, related_request_id, sequence, title, location)
    VALUES (new_trip_id, _resort_id, req.pickup_stop_id, 'pickup', req.id, stop_seq, COALESCE(req.pickup_name, req.pickup_text), req.pickup_location);
    stop_seq := stop_seq + 1;
    INSERT INTO buggy_trip_stops (trip_id, resort_id, stop_id, stop_kind, related_request_id, sequence, title, location)
    VALUES (new_trip_id, _resort_id, req.dropoff_stop_id, 'dropoff', req.id, stop_seq, COALESCE(req.dropoff_name, req.dropoff_text), req.dropoff_location);
  END LOOP;

  UPDATE buggy_trips SET capacity_total = total_party WHERE id = new_trip_id;
  RETURN jsonb_build_object('ok', true, 'trip_id', new_trip_id, 'request_count', array_length(_request_ids, 1), 'total_party_size', total_party);
END;
$$;

-- 9) Update add_request_to_trip
CREATE OR REPLACE FUNCTION public.add_request_to_trip(_trip_id UUID, _request_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE trip_record RECORD; req RECORD; max_seq INT; actor_id UUID := auth.uid();
BEGIN
  SELECT * INTO trip_record FROM buggy_trips WHERE id = _trip_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Trip not found'); END IF;
  IF trip_record.status NOT IN ('planning', 'assigned') THEN RETURN jsonb_build_object('ok', false, 'error', 'Trip is not in planning/assigned status'); END IF;

  SELECT br.*, ps.name as pickup_name, ds.name as dropoff_name INTO req FROM buggy_requests br
    LEFT JOIN buggy_stops ps ON br.pickup_stop_id = ps.id LEFT JOIN buggy_stops ds ON br.dropoff_stop_id = ds.id
    WHERE br.id = _request_id AND br.status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Request not found or not pending'); END IF;

  SELECT COALESCE(MAX(sequence), 0) INTO max_seq FROM buggy_trip_stops WHERE trip_id = _trip_id;
  INSERT INTO buggy_trip_requests (trip_id, request_id, resort_id, party_size, state) VALUES (_trip_id, _request_id, trip_record.resort_id, req.party_size, 'active');
  UPDATE buggy_requests SET status = 'assigned_to_trip', updated_at = now() WHERE id = _request_id;
  PERFORM record_request_event(_request_id, trip_record.resort_id, 'staff', actor_id, 'added_to_trip', 'pending', 'assigned_to_trip', jsonb_build_object('trip_id', _trip_id));
  PERFORM record_trip_event(_trip_id, trip_record.resort_id, 'staff', actor_id, 'request_added', NULL, NULL, jsonb_build_object('request_id', _request_id, 'party_size', req.party_size));

  INSERT INTO buggy_trip_stops (trip_id, resort_id, stop_id, stop_kind, related_request_id, sequence, title, location) VALUES 
    (_trip_id, trip_record.resort_id, req.pickup_stop_id, 'pickup', _request_id, max_seq + 1, COALESCE(req.pickup_name, req.pickup_text), req.pickup_location),
    (_trip_id, trip_record.resort_id, req.dropoff_stop_id, 'dropoff', _request_id, max_seq + 2, COALESCE(req.dropoff_name, req.dropoff_text), req.dropoff_location);
  UPDATE buggy_trips SET capacity_total = COALESCE(capacity_total, 0) + req.party_size WHERE id = _trip_id;
  RETURN jsonb_build_object('ok', true, 'added_party_size', req.party_size);
END;
$$;

-- 10) Update remove_request_from_trip
CREATE OR REPLACE FUNCTION public.remove_request_from_trip(_trip_id UUID, _request_id UUID, _reason TEXT DEFAULT 'Removed by staff')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE trip_record RECORD; link_record RECORD; actor_id UUID := auth.uid();
BEGIN
  SELECT * INTO trip_record FROM buggy_trips WHERE id = _trip_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Trip not found'); END IF;
  SELECT * INTO link_record FROM buggy_trip_requests WHERE trip_id = _trip_id AND request_id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Request not in this trip'); END IF;

  DELETE FROM buggy_trip_stops WHERE trip_id = _trip_id AND related_request_id = _request_id;
  DELETE FROM buggy_trip_requests WHERE trip_id = _trip_id AND request_id = _request_id;
  UPDATE buggy_requests SET status = 'pending', status_reason = _reason, updated_at = now() WHERE id = _request_id;
  PERFORM record_request_event(_request_id, trip_record.resort_id, 'staff', actor_id, 'removed_from_trip', 'assigned_to_trip', 'pending', jsonb_build_object('trip_id', _trip_id, 'reason', _reason));
  PERFORM record_trip_event(_trip_id, trip_record.resort_id, 'staff', actor_id, 'request_removed', NULL, NULL, jsonb_build_object('request_id', _request_id, 'reason', _reason));
  UPDATE buggy_trips SET capacity_total = GREATEST(0, COALESCE(capacity_total, 0) - link_record.party_size) WHERE id = _trip_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 11) Update cancel_buggy_request
CREATE OR REPLACE FUNCTION public.cancel_buggy_request(_request_id UUID, _reason TEXT DEFAULT 'Cancelled')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req RECORD; actor_id UUID := auth.uid();
BEGIN
  SELECT * INTO req FROM buggy_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Request not found'); END IF;
  IF req.status IN ('completed', 'cancelled', 'no_show') THEN RETURN jsonb_build_object('ok', false, 'error', 'Request already in terminal state'); END IF;
  IF req.status = 'assigned_to_trip' THEN
    DELETE FROM buggy_trip_stops WHERE related_request_id = _request_id;
    DELETE FROM buggy_trip_requests WHERE request_id = _request_id;
  END IF;
  UPDATE buggy_requests SET status = 'cancelled', status_reason = _reason, updated_at = now() WHERE id = _request_id;
  PERFORM record_request_event(_request_id, req.resort_id, 'staff', actor_id, 'cancelled', req.status::TEXT, 'cancelled', jsonb_build_object('reason', _reason));
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 12) Update assign_trip_atomic
CREATE OR REPLACE FUNCTION public.assign_trip_atomic(_trip_id UUID, _buggy_id UUID, _driver_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE trip_record RECORD; old_status TEXT; actor_id UUID := auth.uid();
BEGIN
  SELECT * INTO trip_record FROM buggy_trips WHERE id = _trip_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Trip not found'); END IF;
  IF trip_record.status NOT IN ('planning', 'assigned') THEN RETURN jsonb_build_object('ok', false, 'error', 'Trip must be in planning or assigned status'); END IF;
  old_status := trip_record.status;
  UPDATE buggy_trips SET buggy_id = _buggy_id, driver_user_id = _driver_user_id, status = 'assigned', updated_at = now() WHERE id = _trip_id;
  UPDATE buggy_drivers SET assigned_buggy_id = _buggy_id, status = 'on_trip', updated_at = now() WHERE user_id = _driver_user_id;
  UPDATE buggies SET status = 'in_use', updated_at = now() WHERE id = _buggy_id;
  PERFORM record_trip_event(_trip_id, trip_record.resort_id, 'staff', actor_id, 'assigned', old_status, 'assigned', jsonb_build_object('buggy_id', _buggy_id, 'driver_user_id', _driver_user_id));
  UPDATE buggy_requests SET status = 'driver_assigned', updated_at = now() WHERE id IN (SELECT request_id FROM buggy_trip_requests WHERE trip_id = _trip_id);
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 13) Recreate driver_start_trip_atomic
CREATE FUNCTION public.driver_start_trip_atomic(_trip_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE trip_record RECORD; actor_id UUID := auth.uid();
BEGIN
  SELECT * INTO trip_record FROM buggy_trips WHERE id = _trip_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Trip not found'); END IF;
  IF trip_record.driver_user_id != actor_id THEN RETURN jsonb_build_object('ok', false, 'error', 'Not assigned to this trip'); END IF;
  IF trip_record.status != 'assigned' THEN RETURN jsonb_build_object('ok', false, 'error', 'Trip must be assigned to start'); END IF;
  UPDATE buggy_trips SET status = 'in_progress', start_at = now(), updated_at = now() WHERE id = _trip_id;
  PERFORM record_trip_event(_trip_id, trip_record.resort_id, 'driver', actor_id, 'started', 'assigned', 'in_progress', '{}');
  UPDATE buggy_requests SET status = 'driver_en_route', updated_at = now() WHERE id IN (SELECT request_id FROM buggy_trip_requests WHERE trip_id = _trip_id);
  RETURN jsonb_build_object('ok', true, 'started_at', now());
END;
$$;

-- 14) Recreate driver_complete_trip_atomic
CREATE FUNCTION public.driver_complete_trip_atomic(_trip_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE trip_record RECORD; actor_id UUID := auth.uid();
BEGIN
  SELECT * INTO trip_record FROM buggy_trips WHERE id = _trip_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Trip not found'); END IF;
  IF trip_record.driver_user_id != actor_id THEN RETURN jsonb_build_object('ok', false, 'error', 'Not assigned to this trip'); END IF;
  IF trip_record.status != 'in_progress' THEN RETURN jsonb_build_object('ok', false, 'error', 'Trip must be in progress to complete'); END IF;
  UPDATE buggy_trips SET status = 'completed', end_at = now(), updated_at = now() WHERE id = _trip_id;
  PERFORM record_trip_event(_trip_id, trip_record.resort_id, 'driver', actor_id, 'completed', 'in_progress', 'completed', '{}');
  UPDATE buggy_requests SET status = 'completed', updated_at = now() WHERE id IN (SELECT request_id FROM buggy_trip_requests WHERE trip_id = _trip_id AND state = 'active');
  UPDATE buggy_drivers SET status = 'available', assigned_buggy_id = NULL, updated_at = now() WHERE user_id = actor_id;
  IF trip_record.buggy_id IS NOT NULL THEN UPDATE buggies SET status = 'available', updated_at = now() WHERE id = trip_record.buggy_id; END IF;
  RETURN jsonb_build_object('ok', true, 'completed_at', now());
END;
$$;

-- 15) Recreate driver_update_trip_stop_status
CREATE FUNCTION public.driver_update_trip_stop_status(_stop_id UUID, _new_status buggy_trip_stop_status)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE stop_record RECORD; old_status TEXT; actor_id UUID := auth.uid();
BEGIN
  SELECT s.*, t.driver_user_id, t.resort_id as trip_resort_id, t.id as trip_id INTO stop_record
  FROM buggy_trip_stops s JOIN buggy_trips t ON s.trip_id = t.id WHERE s.id = _stop_id FOR UPDATE OF s;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Stop not found'); END IF;
  IF stop_record.driver_user_id != actor_id THEN RETURN jsonb_build_object('ok', false, 'error', 'Not assigned to this trip'); END IF;
  old_status := stop_record.status;
  UPDATE buggy_trip_stops SET status = _new_status,
    arrived_at = CASE WHEN _new_status = 'arrived' AND arrived_at IS NULL THEN now() ELSE arrived_at END,
    completed_at = CASE WHEN _new_status IN ('completed', 'skipped') AND completed_at IS NULL THEN now() ELSE completed_at END,
    updated_at = now() WHERE id = _stop_id;
  PERFORM record_trip_event(stop_record.trip_id, stop_record.trip_resort_id, 'driver', actor_id, 'stop_' || _new_status::TEXT, old_status, _new_status::TEXT,
    jsonb_build_object('stop_id', _stop_id, 'stop_kind', stop_record.stop_kind, 'related_request_id', stop_record.related_request_id));

  IF stop_record.related_request_id IS NOT NULL THEN
    IF stop_record.stop_kind = 'pickup' AND _new_status = 'arrived' THEN
      UPDATE buggy_requests SET status = 'arrived', updated_at = now() WHERE id = stop_record.related_request_id;
      PERFORM record_request_event(stop_record.related_request_id, stop_record.trip_resort_id, 'driver', actor_id, 'arrived', 'driver_en_route', 'arrived', '{}');
    ELSIF stop_record.stop_kind = 'pickup' AND _new_status = 'completed' THEN
      UPDATE buggy_requests SET status = 'picked_up', updated_at = now() WHERE id = stop_record.related_request_id;
      PERFORM record_request_event(stop_record.related_request_id, stop_record.trip_resort_id, 'driver', actor_id, 'picked_up', 'arrived', 'picked_up', '{}');
    ELSIF stop_record.stop_kind = 'dropoff' AND _new_status = 'completed' THEN
      UPDATE buggy_requests SET status = 'completed', updated_at = now() WHERE id = stop_record.related_request_id;
      PERFORM record_request_event(stop_record.related_request_id, stop_record.trip_resort_id, 'driver', actor_id, 'completed', 'picked_up', 'completed', '{}');
    ELSIF _new_status = 'skipped' THEN
      UPDATE buggy_requests SET status = 'no_show', status_reason = 'Skipped by driver', updated_at = now() WHERE id = stop_record.related_request_id;
      PERFORM record_request_event(stop_record.related_request_id, stop_record.trip_resort_id, 'driver', actor_id, 'no_show', NULL, 'no_show', jsonb_build_object('stop_kind', stop_record.stop_kind));
    END IF;
  END IF;
  RETURN jsonb_build_object('ok', true, 'new_status', _new_status);
END;
$$;

-- 16) Update reorder_trip_stops
CREATE OR REPLACE FUNCTION public.reorder_trip_stops(_trip_id UUID, _ordered_stop_ids UUID[])
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE trip_record RECORD; stop_id UUID; seq INT := 0; actor_id UUID := auth.uid();
BEGIN
  SELECT * INTO trip_record FROM buggy_trips WHERE id = _trip_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Trip not found'); END IF;
  IF trip_record.status NOT IN ('planning', 'assigned', 'in_progress') THEN RETURN jsonb_build_object('ok', false, 'error', 'Cannot reorder stops for this trip status'); END IF;
  FOREACH stop_id IN ARRAY _ordered_stop_ids LOOP
    seq := seq + 1;
    UPDATE buggy_trip_stops SET sequence = seq, updated_at = now() WHERE id = stop_id AND trip_id = _trip_id;
  END LOOP;
  PERFORM record_trip_event(_trip_id, trip_record.resort_id, 'staff', actor_id, 'stops_reordered', NULL, NULL, jsonb_build_object('new_order', _ordered_stop_ids));
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 17) Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.buggy_request_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.buggy_trip_events;

-- 18) Create upsert_transport_settings_atomic
CREATE OR REPLACE FUNCTION public.upsert_transport_settings_atomic(p_resort_id UUID, p_settings JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result_settings RECORD;
BEGIN
  INSERT INTO transport_settings (resort_id, service_enabled, guest_booking_enabled, service_hours, pooling_enabled, pooling_window_minutes, max_stops_per_trip, max_pickup_detour_meters, max_wait_minutes, max_party_size, location_required, gps_throttle_seconds, presence_interval_seconds, notify_guest_on_assigned, notify_guest_on_driver_en_route, notify_guest_on_arrived, notify_guest_eta_minutes, history_retention_days, archive_after_days)
  VALUES (p_resort_id, COALESCE((p_settings->>'service_enabled')::boolean, true), COALESCE((p_settings->>'guest_booking_enabled')::boolean, true), COALESCE(p_settings->'service_hours', '{}'), COALESCE((p_settings->>'pooling_enabled')::boolean, true), COALESCE((p_settings->>'pooling_window_minutes')::int, 10), COALESCE((p_settings->>'max_stops_per_trip')::int, 6), COALESCE((p_settings->>'max_pickup_detour_meters')::int, 500), COALESCE((p_settings->>'max_wait_minutes')::int, 15), COALESCE((p_settings->>'max_party_size')::int, 6), COALESCE((p_settings->>'location_required')::boolean, false), COALESCE((p_settings->>'gps_throttle_seconds')::int, 5), COALESCE((p_settings->>'presence_interval_seconds')::int, 30), COALESCE((p_settings->>'notify_guest_on_assigned')::boolean, true), COALESCE((p_settings->>'notify_guest_on_driver_en_route')::boolean, true), COALESCE((p_settings->>'notify_guest_on_arrived')::boolean, true), COALESCE((p_settings->>'notify_guest_eta_minutes')::int, 5), COALESCE((p_settings->>'history_retention_days')::int, 90), COALESCE((p_settings->>'archive_after_days')::int, 30))
  ON CONFLICT (resort_id) DO UPDATE SET
    service_enabled = COALESCE((p_settings->>'service_enabled')::boolean, transport_settings.service_enabled),
    guest_booking_enabled = COALESCE((p_settings->>'guest_booking_enabled')::boolean, transport_settings.guest_booking_enabled),
    service_hours = COALESCE(p_settings->'service_hours', transport_settings.service_hours),
    pooling_enabled = COALESCE((p_settings->>'pooling_enabled')::boolean, transport_settings.pooling_enabled),
    pooling_window_minutes = COALESCE((p_settings->>'pooling_window_minutes')::int, transport_settings.pooling_window_minutes),
    max_stops_per_trip = COALESCE((p_settings->>'max_stops_per_trip')::int, transport_settings.max_stops_per_trip),
    max_pickup_detour_meters = COALESCE((p_settings->>'max_pickup_detour_meters')::int, transport_settings.max_pickup_detour_meters),
    max_wait_minutes = COALESCE((p_settings->>'max_wait_minutes')::int, transport_settings.max_wait_minutes),
    max_party_size = COALESCE((p_settings->>'max_party_size')::int, transport_settings.max_party_size),
    location_required = COALESCE((p_settings->>'location_required')::boolean, transport_settings.location_required),
    gps_throttle_seconds = COALESCE((p_settings->>'gps_throttle_seconds')::int, transport_settings.gps_throttle_seconds),
    presence_interval_seconds = COALESCE((p_settings->>'presence_interval_seconds')::int, transport_settings.presence_interval_seconds),
    notify_guest_on_assigned = COALESCE((p_settings->>'notify_guest_on_assigned')::boolean, transport_settings.notify_guest_on_assigned),
    notify_guest_on_driver_en_route = COALESCE((p_settings->>'notify_guest_on_driver_en_route')::boolean, transport_settings.notify_guest_on_driver_en_route),
    notify_guest_on_arrived = COALESCE((p_settings->>'notify_guest_on_arrived')::boolean, transport_settings.notify_guest_on_arrived),
    notify_guest_eta_minutes = COALESCE((p_settings->>'notify_guest_eta_minutes')::int, transport_settings.notify_guest_eta_minutes),
    history_retention_days = COALESCE((p_settings->>'history_retention_days')::int, transport_settings.history_retention_days),
    archive_after_days = COALESCE((p_settings->>'archive_after_days')::int, transport_settings.archive_after_days),
    updated_at = now()
  RETURNING * INTO result_settings;
  RETURN jsonb_build_object('ok', true, 'settings', row_to_json(result_settings));
END;
$$;