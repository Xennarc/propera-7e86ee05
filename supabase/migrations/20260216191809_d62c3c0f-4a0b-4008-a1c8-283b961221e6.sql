-- Fix SECURITY DEFINER views by setting security_invoker = true
ALTER VIEW public.feature_category_entitlements_v SET (security_invoker = true);
ALTER VIEW public.resort_addons_with_details_v SET (security_invoker = true);