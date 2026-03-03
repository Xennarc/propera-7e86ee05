-- Add 'activity_pickup' to buggy_trip_type enum
ALTER TYPE public.buggy_trip_type ADD VALUE IF NOT EXISTS 'activity_pickup';
