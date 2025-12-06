-- Add image_url field to activities table for hero images
ALTER TABLE public.activities 
ADD COLUMN image_url text;

-- Add a comment for documentation
COMMENT ON COLUMN public.activities.image_url IS 'URL of the hero/cover image for the activity';