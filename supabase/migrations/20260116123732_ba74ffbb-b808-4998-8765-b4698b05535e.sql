-- One-time cleanup: deduplicate demo resort guests and refresh data
-- This runs once to fix existing data; the automated reset will maintain it going forward

-- First, identify and delete duplicate guests in DEMO resort (keep oldest per room)
WITH demo_resort AS (
  SELECT id FROM resorts WHERE code = 'DEMO' OR is_demo = true LIMIT 1
),
ranked_guests AS (
  SELECT 
    g.id,
    g.room_number,
    g.created_at,
    ROW_NUMBER() OVER (PARTITION BY g.resort_id, g.room_number ORDER BY g.created_at ASC) as rn
  FROM guests g
  JOIN demo_resort dr ON g.resort_id = dr.id
),
duplicates AS (
  SELECT id FROM ranked_guests WHERE rn > 1
)
-- Clean up related records for duplicate guests first
DELETE FROM booking_attendees 
WHERE guest_id IN (SELECT id FROM duplicates);

WITH demo_resort AS (
  SELECT id FROM resorts WHERE code = 'DEMO' OR is_demo = true LIMIT 1
),
ranked_guests AS (
  SELECT 
    g.id,
    g.room_number,
    g.created_at,
    ROW_NUMBER() OVER (PARTITION BY g.resort_id, g.room_number ORDER BY g.created_at ASC) as rn
  FROM guests g
  JOIN demo_resort dr ON g.resort_id = dr.id
),
duplicates AS (
  SELECT id FROM ranked_guests WHERE rn > 1
)
DELETE FROM activity_bookings 
WHERE guest_id IN (SELECT id FROM duplicates);

WITH demo_resort AS (
  SELECT id FROM resorts WHERE code = 'DEMO' OR is_demo = true LIMIT 1
),
ranked_guests AS (
  SELECT 
    g.id,
    g.room_number,
    g.created_at,
    ROW_NUMBER() OVER (PARTITION BY g.resort_id, g.room_number ORDER BY g.created_at ASC) as rn
  FROM guests g
  JOIN demo_resort dr ON g.resort_id = dr.id
),
duplicates AS (
  SELECT id FROM ranked_guests WHERE rn > 1
)
DELETE FROM restaurant_reservations 
WHERE guest_id IN (SELECT id FROM duplicates);

WITH demo_resort AS (
  SELECT id FROM resorts WHERE code = 'DEMO' OR is_demo = true LIMIT 1
),
ranked_guests AS (
  SELECT 
    g.id,
    g.room_number,
    g.created_at,
    ROW_NUMBER() OVER (PARTITION BY g.resort_id, g.room_number ORDER BY g.created_at ASC) as rn
  FROM guests g
  JOIN demo_resort dr ON g.resort_id = dr.id
),
duplicates AS (
  SELECT id FROM ranked_guests WHERE rn > 1
)
DELETE FROM guest_requests 
WHERE guest_id IN (SELECT id FROM duplicates);

WITH demo_resort AS (
  SELECT id FROM resorts WHERE code = 'DEMO' OR is_demo = true LIMIT 1
),
ranked_guests AS (
  SELECT 
    g.id,
    g.room_number,
    g.created_at,
    ROW_NUMBER() OVER (PARTITION BY g.resort_id, g.room_number ORDER BY g.created_at ASC) as rn
  FROM guests g
  JOIN demo_resort dr ON g.resort_id = dr.id
),
duplicates AS (
  SELECT id FROM ranked_guests WHERE rn > 1
)
DELETE FROM travel_party_members 
WHERE guest_id IN (SELECT id FROM duplicates);

WITH demo_resort AS (
  SELECT id FROM resorts WHERE code = 'DEMO' OR is_demo = true LIMIT 1
),
ranked_guests AS (
  SELECT 
    g.id,
    g.room_number,
    g.created_at,
    ROW_NUMBER() OVER (PARTITION BY g.resort_id, g.room_number ORDER BY g.created_at ASC) as rn
  FROM guests g
  JOIN demo_resort dr ON g.resort_id = dr.id
),
duplicates AS (
  SELECT id FROM ranked_guests WHERE rn > 1
)
DELETE FROM guest_sessions 
WHERE guest_id IN (SELECT id FROM duplicates);

-- Now delete the duplicate guests themselves
WITH demo_resort AS (
  SELECT id FROM resorts WHERE code = 'DEMO' OR is_demo = true LIMIT 1
),
ranked_guests AS (
  SELECT 
    g.id,
    g.room_number,
    g.created_at,
    ROW_NUMBER() OVER (PARTITION BY g.resort_id, g.room_number ORDER BY g.created_at ASC) as rn
  FROM guests g
  JOIN demo_resort dr ON g.resort_id = dr.id
)
DELETE FROM guests 
WHERE id IN (SELECT id FROM ranked_guests WHERE rn > 1);

-- Update remaining demo guests with fresh dates (relative to today)
WITH demo_resort AS (
  SELECT id FROM resorts WHERE code = 'DEMO' OR is_demo = true LIMIT 1
),
date_patterns AS (
  SELECT * FROM (VALUES 
    ('101', -2, 7),
    ('102', -1, 5),
    ('201', 0, 10),
    ('202', 1, 8),
    ('301', 2, 6),
    ('302', -4, 3)
  ) AS t(room, days_from_now, stay_length)
)
UPDATE guests g
SET 
  check_in_date = CURRENT_DATE + dp.days_from_now,
  check_out_date = CURRENT_DATE + dp.days_from_now + dp.stay_length,
  updated_at = now()
FROM demo_resort dr, date_patterns dp
WHERE g.resort_id = dr.id
  AND g.room_number = dp.room;