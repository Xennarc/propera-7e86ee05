-- ============================================================================
-- PHASE 1: Transport/Buggy Module - Database Schema
-- Creates all tables, enums, indexes, and triggers for pooled transport
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENUMS
-- ============================================================================

-- Buggy fleet status
CREATE TYPE public.buggy_status AS ENUM (
  'available',
  'en_route',
  'out_of_service',
  'charging'
);

-- Driver availability status
CREATE TYPE public.driver_status AS ENUM (
  'offline',
  'online',
  'on_trip',
  'break'
);

-- Request source (who created it)
CREATE TYPE public.buggy_request_source AS ENUM (
  'guest',
  'staff'
);

-- Request type (how the request was made)
CREATE TYPE public.buggy_request_type AS ENUM (
  'on_demand',
  'scheduled',
  'fixed_route'
);

-- Request lifecycle status
CREATE TYPE public.buggy_request_status AS ENUM (
  'requested',
  'queued',
  'assigned_to_trip',
  'driver_en_route',
  'arrived',
  'picked_up',
  'completed',
  'cancelled',
  'failed',
  'no_show'
);

-- Request priority level
CREATE TYPE public.buggy_priority AS ENUM (
  'normal',
  'high',
  'vip'
);

-- Trip lifecycle status
CREATE TYPE public.buggy_trip_status AS ENUM (
  'planning',
  'assigned',
  'en_route',
  'active',
  'completed',
  'cancelled'
);

-- Trip type (pooling strategy)
CREATE TYPE public.buggy_trip_type AS ENUM (
  'pooled_custom',
  'scheduled_pool',
  'fixed_route_run'
);

-- Request state within a trip
CREATE TYPE public.buggy_trip_request_state AS ENUM (
  'queued',
  'picked_up',
  'dropped_off',
  'cancelled',
  'no_show'
);

-- Stop kind for trip execution
CREATE TYPE public.buggy_trip_stop_kind AS ENUM (
  'pickup',
  'dropoff',
  'waypoint'
);

-- Stop execution status
CREATE TYPE public.buggy_trip_stop_status AS ENUM (
  'pending',
  'arrived',
  'completed',
  'skipped'
);

-- ============================================================================
-- SECTION 2: CORE TABLES
-- ============================================================================

-- A) buggies - Fleet registry
CREATE TABLE public.buggies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INT NOT NULL DEFAULT 2,
  is_accessible BOOLEAN NOT NULL DEFAULT false,
  status public.buggy_status NOT NULL DEFAULT 'available',
  current_stop_id UUID NULL, -- FK added after buggy_stops created
  last_location JSONB NULL,
  last_location_at TIMESTAMPTZ NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT buggies_capacity_check CHECK (capacity >= 1)
);

-- B) buggy_drivers - Driver registry
CREATE TABLE public.buggy_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status public.driver_status NOT NULL DEFAULT 'offline',
  assigned_buggy_id UUID NULL REFERENCES public.buggies(id) ON DELETE SET NULL,
  last_seen_at TIMESTAMPTZ NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT buggy_drivers_resort_user_unique UNIQUE (resort_id, user_id)
);

-- C) buggy_stops - Named locations/stops
CREATE TABLE public.buggy_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  zone TEXT NULL,
  lat NUMERIC NULL,
  lng NUMERIC NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK from buggies to buggy_stops now that buggy_stops exists
ALTER TABLE public.buggies 
  ADD CONSTRAINT buggies_current_stop_id_fkey 
  FOREIGN KEY (current_stop_id) REFERENCES public.buggy_stops(id) ON DELETE SET NULL;

-- D) buggy_routes - Route definitions
CREATE TABLE public.buggy_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  color_tag TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- E) buggy_route_stops - Junction table for route stops
CREATE TABLE public.buggy_route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.buggy_routes(id) ON DELETE CASCADE,
  stop_id UUID NOT NULL REFERENCES public.buggy_stops(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  dwell_minutes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT buggy_route_stops_unique UNIQUE (route_id, stop_id)
);

-- F) buggy_route_schedules - Schedule definitions for routes
CREATE TABLE public.buggy_route_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.buggy_routes(id) ON DELETE CASCADE,
  days_of_week INT[] NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  interval_minutes INT NULL,
  departure_times TIME[] NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- G) buggy_requests - Party-level transport requests
CREATE TABLE public.buggy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  guest_id UUID NULL REFERENCES public.guests(id) ON DELETE SET NULL,
  created_by_staff_user_id UUID NULL,
  request_source public.buggy_request_source NOT NULL,
  request_type public.buggy_request_type NOT NULL,
  party_size INT NOT NULL DEFAULT 1,
  needs_accessible BOOLEAN NOT NULL DEFAULT false,
  pickup_stop_id UUID NULL REFERENCES public.buggy_stops(id) ON DELETE SET NULL,
  pickup_text TEXT NULL,
  pickup_location JSONB NULL,
  dropoff_stop_id UUID NULL REFERENCES public.buggy_stops(id) ON DELETE SET NULL,
  dropoff_text TEXT NULL,
  dropoff_location JSONB NULL,
  scheduled_for TIMESTAMPTZ NULL,
  route_id UUID NULL REFERENCES public.buggy_routes(id) ON DELETE SET NULL,
  priority public.buggy_priority NOT NULL DEFAULT 'normal',
  status public.buggy_request_status NOT NULL DEFAULT 'requested',
  status_reason TEXT NULL,
  eta_minutes INT NULL,
  idempotency_key TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Constraints
  CONSTRAINT buggy_requests_party_size_check CHECK (party_size >= 1),
  CONSTRAINT buggy_requests_pickup_exists CHECK (
    pickup_stop_id IS NOT NULL OR pickup_text IS NOT NULL OR pickup_location IS NOT NULL
  ),
  CONSTRAINT buggy_requests_dropoff_exists CHECK (
    dropoff_stop_id IS NOT NULL OR dropoff_text IS NOT NULL OR dropoff_location IS NOT NULL
  )
);

-- Idempotency constraint (partial unique index)
CREATE UNIQUE INDEX buggy_requests_idempotency_idx 
  ON public.buggy_requests (resort_id, idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- H) buggy_trips - Pooled transport runs
CREATE TABLE public.buggy_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  trip_type public.buggy_trip_type NOT NULL DEFAULT 'pooled_custom',
  status public.buggy_trip_status NOT NULL DEFAULT 'planning',
  buggy_id UUID NULL REFERENCES public.buggies(id) ON DELETE SET NULL,
  driver_user_id UUID NULL,
  capacity_total INT NULL,
  start_at TIMESTAMPTZ NULL,
  end_at TIMESTAMPTZ NULL,
  notes TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- I) buggy_trip_requests - Membership join (requests in a trip)
CREATE TABLE public.buggy_trip_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.buggy_trips(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.buggy_requests(id) ON DELETE CASCADE,
  party_size INT NOT NULL,
  state public.buggy_trip_request_state NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT buggy_trip_requests_unique UNIQUE (trip_id, request_id)
);

-- J) buggy_trip_stops - Ordered execution stops for a trip
CREATE TABLE public.buggy_trip_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.buggy_trips(id) ON DELETE CASCADE,
  stop_kind public.buggy_trip_stop_kind NOT NULL,
  stop_id UUID NULL REFERENCES public.buggy_stops(id) ON DELETE SET NULL,
  title TEXT NULL,
  location JSONB NULL,
  sequence INT NOT NULL DEFAULT 0,
  related_request_id UUID NULL REFERENCES public.buggy_requests(id) ON DELETE SET NULL,
  status public.buggy_trip_stop_status NOT NULL DEFAULT 'pending',
  arrived_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- SECTION 3: FEATURE FLAG
-- ============================================================================

-- Add transport_enabled to existing resort_settings table
ALTER TABLE public.resort_settings 
  ADD COLUMN IF NOT EXISTS transport_enabled BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- SECTION 4: INDEXES
-- ============================================================================

-- buggy_requests indexes
CREATE INDEX idx_buggy_requests_resort_status_created 
  ON public.buggy_requests (resort_id, status, created_at);
CREATE INDEX idx_buggy_requests_resort_scheduled 
  ON public.buggy_requests (resort_id, scheduled_for) 
  WHERE scheduled_for IS NOT NULL;
CREATE INDEX idx_buggy_requests_guest_created 
  ON public.buggy_requests (guest_id, created_at DESC) 
  WHERE guest_id IS NOT NULL;

-- buggy_trips indexes
CREATE INDEX idx_buggy_trips_resort_status_created 
  ON public.buggy_trips (resort_id, status, created_at);
CREATE INDEX idx_buggy_trips_resort_buggy 
  ON public.buggy_trips (resort_id, buggy_id) 
  WHERE buggy_id IS NOT NULL;
CREATE INDEX idx_buggy_trips_resort_driver 
  ON public.buggy_trips (resort_id, driver_user_id) 
  WHERE driver_user_id IS NOT NULL;

-- buggy_trip_requests indexes
CREATE INDEX idx_buggy_trip_requests_trip 
  ON public.buggy_trip_requests (trip_id);
CREATE INDEX idx_buggy_trip_requests_request 
  ON public.buggy_trip_requests (request_id);

-- buggy_trip_stops index
CREATE INDEX idx_buggy_trip_stops_trip_sequence 
  ON public.buggy_trip_stops (trip_id, sequence);

-- buggies index
CREATE INDEX idx_buggies_resort_status 
  ON public.buggies (resort_id, status);

-- buggy_drivers index
CREATE INDEX idx_buggy_drivers_resort_status 
  ON public.buggy_drivers (resort_id, status);

-- buggy_stops index
CREATE INDEX idx_buggy_stops_resort_active 
  ON public.buggy_stops (resort_id, is_active);

-- buggy_routes index
CREATE INDEX idx_buggy_routes_resort_active 
  ON public.buggy_routes (resort_id, is_active);

-- ============================================================================
-- SECTION 5: UPDATED_AT TRIGGERS
-- ============================================================================

CREATE TRIGGER update_buggies_updated_at
  BEFORE UPDATE ON public.buggies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_buggy_drivers_updated_at
  BEFORE UPDATE ON public.buggy_drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_buggy_stops_updated_at
  BEFORE UPDATE ON public.buggy_stops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_buggy_routes_updated_at
  BEFORE UPDATE ON public.buggy_routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_buggy_route_stops_updated_at
  BEFORE UPDATE ON public.buggy_route_stops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_buggy_route_schedules_updated_at
  BEFORE UPDATE ON public.buggy_route_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_buggy_requests_updated_at
  BEFORE UPDATE ON public.buggy_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_buggy_trips_updated_at
  BEFORE UPDATE ON public.buggy_trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_buggy_trip_requests_updated_at
  BEFORE UPDATE ON public.buggy_trip_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_buggy_trip_stops_updated_at
  BEFORE UPDATE ON public.buggy_trip_stops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SECTION 6: ENABLE REALTIME FOR KEY TABLES
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.buggy_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.buggy_trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.buggy_trip_stops;
ALTER PUBLICATION supabase_realtime ADD TABLE public.buggies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.buggy_drivers;

-- ============================================================================
-- END PHASE 1
-- ============================================================================