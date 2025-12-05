-- Add icon field to activities table for custom icon selection
ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS icon_key text DEFAULT NULL;

COMMENT ON COLUMN public.activities.icon_key IS 'Optional custom icon key to override category default icon';