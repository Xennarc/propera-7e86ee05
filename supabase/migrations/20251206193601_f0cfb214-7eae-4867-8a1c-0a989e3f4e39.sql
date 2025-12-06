-- Add pricing charges configuration to resorts table
ALTER TABLE public.resorts
ADD COLUMN pricing_charges jsonb NOT NULL DEFAULT '[
  {"name": "Service Charge", "percentage": 10, "apply_after_previous": false, "is_active": true},
  {"name": "Government Tax", "percentage": 17, "apply_after_previous": true, "is_active": true}
]'::jsonb;