
-- Add requirements_json to activities table (additive only)
ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS requirements_json JSONB NULL;

-- Default: waiver true, gear true, cert false, medical false
COMMENT ON COLUMN public.activities.requirements_json IS 'JSON object: {requires_waiver, requires_medical, requires_gear, requires_cert}. Defaults: waiver=true, gear=true, cert=false, medical=false when null.';
