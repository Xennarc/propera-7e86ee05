-- Add resort-level override for enable_requests_guest_submit for The Residence Falhumaafushi
INSERT INTO public.feature_flags (
  key, label, description, category, tier, 
  is_enabled, is_dangerous, scope, resort_id
)
SELECT 
  'enable_requests_guest_submit',
  'Guest Request Submission',
  'Allow guests to submit service requests via the guest portal.',
  'guest',
  'starter',
  true,
  false,
  'resort',
  '91dea0e5-963a-43eb-aab0-aafe921cc8f5'
WHERE NOT EXISTS (
  SELECT 1 FROM public.feature_flags 
  WHERE key = 'enable_requests_guest_submit' 
  AND resort_id = '91dea0e5-963a-43eb-aab0-aafe921cc8f5'
);