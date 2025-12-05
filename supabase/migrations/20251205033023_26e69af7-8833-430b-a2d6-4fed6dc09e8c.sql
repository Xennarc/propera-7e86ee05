
-- Add unique constraint for restaurant time slots to prevent duplicate slots
CREATE UNIQUE INDEX IF NOT EXISTS unique_restaurant_slot 
ON restaurant_time_slots (restaurant_id, date, start_time, end_time);

-- Add unique constraint for activity sessions to prevent duplicate sessions  
CREATE UNIQUE INDEX IF NOT EXISTS unique_activity_session
ON activity_sessions (activity_id, date, start_time, end_time);

-- For reservations, we allow multiple per guest/slot but only ONE can be in an active state
-- Create a partial unique index that only applies to non-cancelled reservations
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_restaurant_reservation
ON restaurant_reservations (guest_id, restaurant_slot_id)
WHERE status NOT IN ('CANCELLED');

-- Same for activity bookings
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_activity_booking
ON activity_bookings (guest_id, session_id)
WHERE status NOT IN ('CANCELLED');
