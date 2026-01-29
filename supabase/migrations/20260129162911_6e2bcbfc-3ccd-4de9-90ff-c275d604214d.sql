-- Add home_hero_image_url column for separate home page hero
ALTER TABLE resorts
ADD COLUMN IF NOT EXISTS home_hero_image_url TEXT;