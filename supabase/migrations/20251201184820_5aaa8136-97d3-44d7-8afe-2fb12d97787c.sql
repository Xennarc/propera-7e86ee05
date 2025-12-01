-- Add booking source context tracking for pre-arrival and in-stay upsell analytics

-- Create enum for booking source context (separate from the existing 'source' field which tracks staff vs guest)
CREATE TYPE booking_source_context AS ENUM ('NORMAL', 'PRE_STAY', 'IN_STAY_SUGGESTION');

-- Add booking_source column to activity_bookings
ALTER TABLE activity_bookings 
ADD COLUMN booking_source booking_source_context DEFAULT NULL;

-- Add booking_source column to restaurant_reservations
ALTER TABLE restaurant_reservations 
ADD COLUMN booking_source booking_source_context DEFAULT NULL;

-- Add indexes for reporting queries
CREATE INDEX idx_activity_bookings_booking_source ON activity_bookings(booking_source) WHERE booking_source IS NOT NULL;
CREATE INDEX idx_restaurant_reservations_booking_source ON restaurant_reservations(booking_source) WHERE booking_source IS NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN activity_bookings.booking_source IS 'Tracks sales channel context: NULL=legacy/unspecified, NORMAL=standard flow, PRE_STAY=pre-arrival booking, IN_STAY_SUGGESTION=in-stay upsell';
COMMENT ON COLUMN restaurant_reservations.booking_source IS 'Tracks sales channel context: NULL=legacy/unspecified, NORMAL=standard flow, PRE_STAY=pre-arrival booking, IN_STAY_SUGGESTION=in-stay upsell';