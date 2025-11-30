-- Add brand_theme column for theme mode selection (LIGHT/DARK/AUTO)
ALTER TABLE public.resorts
ADD COLUMN IF NOT EXISTS brand_theme text DEFAULT 'LIGHT';

-- Add brand_wordmark column for optional tagline
ALTER TABLE public.resorts
ADD COLUMN IF NOT EXISTS brand_wordmark text;