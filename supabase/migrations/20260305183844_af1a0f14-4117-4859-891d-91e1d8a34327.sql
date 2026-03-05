
-- Add activity scoping columns to resort_departments
ALTER TABLE public.resort_departments
  ADD COLUMN IF NOT EXISTS activity_scope_key TEXT NULL,
  ADD COLUMN IF NOT EXISTS scope_type TEXT NOT NULL DEFAULT 'activities';

-- Backfill existing known department keys
UPDATE public.resort_departments SET activity_scope_key = 'DIVE' WHERE lower(key) = 'dive' AND activity_scope_key IS NULL;
UPDATE public.resort_departments SET activity_scope_key = 'WATERSPORT' WHERE lower(key) = 'watersports' AND activity_scope_key IS NULL;
UPDATE public.resort_departments SET activity_scope_key = 'EXCURSION' WHERE lower(key) = 'excursions' AND activity_scope_key IS NULL;
UPDATE public.resort_departments SET activity_scope_key = 'SPA' WHERE lower(key) = 'spa' AND activity_scope_key IS NULL;
UPDATE public.resort_departments SET activity_scope_key = 'OTHER' WHERE lower(key) = 'other' AND activity_scope_key IS NULL;
