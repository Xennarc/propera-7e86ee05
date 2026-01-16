-- Drop the old overloaded function that returns jsonb and takes activity_category enum
-- This is causing PostgreSQL to select the wrong function when p_category is null
DROP FUNCTION IF EXISTS public.guest_get_available_sessions(uuid, date, activity_category);

-- Re-grant permissions to ensure guest portal works with the correct function
GRANT EXECUTE ON FUNCTION public.guest_get_available_sessions(uuid, date, text) TO anon;
GRANT EXECUTE ON FUNCTION public.guest_get_available_sessions(uuid, date, text) TO authenticated;