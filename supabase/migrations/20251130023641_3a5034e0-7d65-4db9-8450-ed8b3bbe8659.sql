-- Add demo-related fields to resorts table
ALTER TABLE public.resorts 
ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS demo_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS demo_note text;