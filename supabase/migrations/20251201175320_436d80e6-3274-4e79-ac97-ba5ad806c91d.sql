-- Add total_amount field to restaurant_reservations for revenue tracking
ALTER TABLE restaurant_reservations 
ADD COLUMN IF NOT EXISTS total_amount numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN restaurant_reservations.total_amount IS 'Total price/revenue for this reservation (for reporting only)';

-- Add index for performance on revenue queries
CREATE INDEX IF NOT EXISTS idx_restaurant_reservations_resort_status_date 
ON restaurant_reservations(resort_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_activity_bookings_resort_status_date 
ON activity_bookings(resort_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_guests_resort_dates 
ON guests(resort_id, check_in_date, check_out_date);