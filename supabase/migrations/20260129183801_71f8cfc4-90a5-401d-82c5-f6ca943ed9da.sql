-- Add new onboarding columns for branding and pre-arrival steps
ALTER TABLE resorts
ADD COLUMN IF NOT EXISTS onboarding_branding_done BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_prearrival_done BOOLEAN DEFAULT false;