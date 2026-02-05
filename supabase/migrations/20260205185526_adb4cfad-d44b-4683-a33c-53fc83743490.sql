-- Backfill buggy_trip_stops for active trips that have requests but no stops.
-- This handles pre-migration trips that were created before stop generation was added to the RPC.

-- 1. Insert PICKUP stops
INSERT INTO buggy_trip_stops (trip_id, resort_id, stop_id, stop_kind, title, sequence, status, related_request_id)
SELECT 
  btr.trip_id,
  bt.resort_id,
  br.pickup_stop_id,
  'pickup'::buggy_trip_stop_kind,
  COALESCE(
    (SELECT name FROM buggy_stops WHERE id = br.pickup_stop_id),
    br.pickup_text,
    'Pickup'
  ),
  (ROW_NUMBER() OVER (PARTITION BY btr.trip_id ORDER BY btr.created_at)) * 2 - 1,
  'pending'::buggy_trip_stop_status,
  br.id
FROM buggy_trip_requests btr
JOIN buggy_trips bt ON bt.id = btr.trip_id
JOIN buggy_requests br ON br.id = btr.request_id
WHERE bt.status NOT IN ('completed', 'cancelled')
  AND NOT EXISTS (SELECT 1 FROM buggy_trip_stops WHERE trip_id = btr.trip_id);

-- 2. Insert DROPOFF stops
INSERT INTO buggy_trip_stops (trip_id, resort_id, stop_id, stop_kind, title, sequence, status, related_request_id)
SELECT 
  btr.trip_id,
  bt.resort_id,
  br.dropoff_stop_id,
  'dropoff'::buggy_trip_stop_kind,
  COALESCE(
    (SELECT name FROM buggy_stops WHERE id = br.dropoff_stop_id),
    br.dropoff_text,
    'Dropoff'
  ),
  (ROW_NUMBER() OVER (PARTITION BY btr.trip_id ORDER BY btr.created_at)) * 2,
  'pending'::buggy_trip_stop_status,
  br.id
FROM buggy_trip_requests btr
JOIN buggy_trips bt ON bt.id = btr.trip_id
JOIN buggy_requests br ON br.id = btr.request_id
WHERE bt.status NOT IN ('completed', 'cancelled')
  AND NOT EXISTS (
    SELECT 1 FROM buggy_trip_stops 
    WHERE trip_id = btr.trip_id 
    AND stop_kind = 'dropoff'
    AND related_request_id = br.id
  );