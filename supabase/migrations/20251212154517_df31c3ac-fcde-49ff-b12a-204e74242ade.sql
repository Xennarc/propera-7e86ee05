-- Create subscription tier enum
CREATE TYPE public.subscription_tier AS ENUM ('ESSENTIAL', 'PROFESSIONAL', 'ELITE');

-- Add subscription_tier column to resorts table
ALTER TABLE public.resorts 
ADD COLUMN subscription_tier public.subscription_tier NOT NULL DEFAULT 'ESSENTIAL';

-- Add optional subscription tracking fields
ALTER TABLE public.resorts 
ADD COLUMN subscription_started_at timestamp with time zone,
ADD COLUMN subscription_expires_at timestamp with time zone;