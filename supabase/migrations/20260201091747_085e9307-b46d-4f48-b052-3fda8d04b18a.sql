-- Add missing feature flag: enable_requests_guest_submit
-- This flag gates the guest request submission feature in the guest portal
-- Global flag has resort_id = NULL

INSERT INTO public.feature_flags (key, label, description, category, tier, is_enabled, is_dangerous, scope, resort_id)
VALUES (
  'enable_requests_guest_submit', 
  'Guest Request Submission',
  'Allow guests to submit service requests via the guest portal.',
  'guest', 
  'starter', 
  false,
  false,
  'global',
  NULL
)
ON CONFLICT (key, resort_id) DO NOTHING;