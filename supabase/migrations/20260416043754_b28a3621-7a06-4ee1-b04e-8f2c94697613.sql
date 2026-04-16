
-- Remove overly permissive resorts SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view resorts" ON public.resorts;

-- Remove remaining unscoped room service menu policies
DROP POLICY IF EXISTS "public_view_active_rs_menu_categories" ON public.room_service_menu_categories;
DROP POLICY IF EXISTS "public_view_available_rs_menu_items" ON public.room_service_menu_items;
