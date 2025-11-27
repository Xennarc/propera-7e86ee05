-- Add branding fields to resorts table for per-resort guest login customization
ALTER TABLE public.resorts
ADD COLUMN IF NOT EXISTS login_logo_url text,
ADD COLUMN IF NOT EXISTS login_hero_image_url text,
ADD COLUMN IF NOT EXISTS login_primary_color text,
ADD COLUMN IF NOT EXISTS login_accent_color text,
ADD COLUMN IF NOT EXISTS guest_login_title text,
ADD COLUMN IF NOT EXISTS guest_login_subtitle text,
ADD COLUMN IF NOT EXISTS guest_login_instructions text;