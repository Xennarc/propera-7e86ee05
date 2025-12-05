-- Add opening hours to restaurants table
ALTER TABLE public.restaurants
ADD COLUMN opening_time time without time zone DEFAULT '06:00',
ADD COLUMN closing_time time without time zone DEFAULT '23:00';