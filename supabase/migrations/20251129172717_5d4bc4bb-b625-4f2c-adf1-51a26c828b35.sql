-- Add content fields to activities table for guest-facing information and staff cheat sheet

-- Short description for cards/previews
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS short_description text;

-- Full description for detail page
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS full_description text;

-- Difficulty level enum-like text
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS difficulty_level text CHECK (difficulty_level IS NULL OR difficulty_level IN ('EASY', 'MODERATE', 'ADVANCED'));

-- Max age (min_age already exists as age_min)
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS max_age integer;

-- Swimming requirements
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS is_swimming_required boolean NOT NULL DEFAULT false;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS suitable_for_non_swimmers boolean NOT NULL DEFAULT false;

-- Content sections
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS highlights jsonb;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS includes text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS health_and_safety_notes text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS cancellation_policy_text text;

-- FAQ as JSON array of {question, answer}
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS faq jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.activities.difficulty_level IS 'Activity difficulty: EASY, MODERATE, or ADVANCED';
COMMENT ON COLUMN public.activities.highlights IS 'JSON array of highlight strings for bullet points';
COMMENT ON COLUMN public.activities.faq IS 'JSON array of {question: string, answer: string} objects';