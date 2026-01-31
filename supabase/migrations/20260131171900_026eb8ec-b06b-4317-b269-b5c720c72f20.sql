-- Add disable/delete columns to profiles for soft-delete and deactivation
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_disabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS disabled_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS disabled_by uuid NULL,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS deleted_by uuid NULL,
ADD COLUMN IF NOT EXISTS deletion_reason text NULL;

-- Add index for quick lookup of active users
CREATE INDEX IF NOT EXISTS idx_profiles_is_disabled ON public.profiles(is_disabled) WHERE is_disabled = true;
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at) WHERE deleted_at IS NOT NULL;

-- Create helper function to check if user is active (not disabled and not deleted)
CREATE OR REPLACE FUNCTION public.user_is_active(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND is_disabled = false
      AND deleted_at IS NULL
  )
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.user_is_active(uuid) TO authenticated;

COMMENT ON COLUMN public.profiles.is_disabled IS 'Whether the user account is disabled (blocked from access)';
COMMENT ON COLUMN public.profiles.disabled_at IS 'Timestamp when the account was disabled';
COMMENT ON COLUMN public.profiles.disabled_by IS 'User ID of the admin who disabled the account';
COMMENT ON COLUMN public.profiles.deleted_at IS 'Timestamp when the account was soft-deleted';
COMMENT ON COLUMN public.profiles.deleted_by IS 'User ID of the admin who deleted the account';
COMMENT ON COLUMN public.profiles.deletion_reason IS 'Optional reason provided for deactivation/deletion';