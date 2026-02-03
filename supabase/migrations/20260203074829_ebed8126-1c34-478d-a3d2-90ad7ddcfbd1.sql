-- Insert the missing feature flag for staff dispatch actions (global default: enabled)
-- Using simple INSERT with check to avoid conflict
INSERT INTO feature_flags (key, label, description, category, scope, tier, is_enabled, is_dangerous, resort_id)
SELECT 
  'enable_requests_staff_dispatch',
  'Staff Dispatch Actions',
  'Allow staff to create trips, assign drivers, and manage dispatch queue',
  'core',
  'global',
  'essential',
  true,
  false,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM feature_flags 
  WHERE key = 'enable_requests_staff_dispatch' 
  AND resort_id IS NULL
);