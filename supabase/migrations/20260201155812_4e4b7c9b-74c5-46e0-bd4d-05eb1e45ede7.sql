-- Insert enable_guests_pin_management (enabled by default, global flag)
INSERT INTO feature_flags (key, label, description, category, tier, is_enabled, is_dangerous, scope, resort_id)
VALUES (
  'enable_guests_pin_management',
  'Guest PIN Management',
  'Allow staff to generate and manage guest login PINs for the guest portal.',
  'core',
  'starter',
  true,
  false,
  'global',
  NULL
)
ON CONFLICT (key, resort_id) DO NOTHING;

-- Insert enable_guests_prearrival_tab (enabled by default, global flag)
INSERT INTO feature_flags (key, label, description, category, tier, is_enabled, is_dangerous, scope, resort_id)
VALUES (
  'enable_guests_prearrival_tab',
  'Guest Pre-Arrival Tab',
  'Show the Pre-Arrival tab on guest detail pages.',
  'core',
  'professional',
  true,
  false,
  'global',
  NULL
)
ON CONFLICT (key, resort_id) DO NOTHING;