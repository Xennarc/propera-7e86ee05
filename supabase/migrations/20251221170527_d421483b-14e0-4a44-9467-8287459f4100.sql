-- Add bootstrap admin password reset tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS temp_password_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS password_reset_completed_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.must_reset_password IS 'True when user has a temp password and must set a new one on first login';
COMMENT ON COLUMN public.profiles.temp_password_expires_at IS 'When the temp password expires (7 days from creation for bootstrap admins)';
COMMENT ON COLUMN public.profiles.password_reset_completed_at IS 'When the user completed their forced password reset';