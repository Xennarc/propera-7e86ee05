
-- Add department_key to activities (nullable, additive)
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS department_key text;

-- Backfill based on existing category mapping
UPDATE public.activities SET department_key = 'dive' WHERE category = 'DIVE' AND department_key IS NULL;
UPDATE public.activities SET department_key = 'watersports' WHERE category = 'WATERSPORT' AND department_key IS NULL;
UPDATE public.activities SET department_key = 'excursions' WHERE category = 'EXCURSION' AND department_key IS NULL;
UPDATE public.activities SET department_key = 'spa' WHERE category = 'SPA' AND department_key IS NULL;
UPDATE public.activities SET department_key = 'other' WHERE category = 'OTHER' AND department_key IS NULL;

-- Index for efficient department filtering
CREATE INDEX IF NOT EXISTS idx_activities_department_key ON public.activities(department_key);
