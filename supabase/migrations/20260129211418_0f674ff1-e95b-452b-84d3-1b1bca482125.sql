-- Step 1: Add columns to request_catalog
ALTER TABLE request_catalog ADD COLUMN IF NOT EXISTS display_label TEXT;
ALTER TABLE request_catalog ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE request_catalog ADD COLUMN IF NOT EXISTS color_class TEXT DEFAULT 'border-gray-400 text-gray-400';
ALTER TABLE request_catalog ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 100;