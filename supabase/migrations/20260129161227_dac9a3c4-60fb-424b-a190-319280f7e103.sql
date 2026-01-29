-- Add new branding customization columns to resorts table
ALTER TABLE resorts
ADD COLUMN IF NOT EXISTS brand_button_style TEXT DEFAULT 'rounded' CHECK (brand_button_style IN ('rounded', 'pill', 'squared')),
ADD COLUMN IF NOT EXISTS brand_card_style TEXT DEFAULT 'elevated' CHECK (brand_card_style IN ('elevated', 'outlined', 'flat')),
ADD COLUMN IF NOT EXISTS brand_corner_radius INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS brand_font_family TEXT DEFAULT 'Plus Jakarta Sans',
ADD COLUMN IF NOT EXISTS brand_background_tint TEXT,
ADD COLUMN IF NOT EXISTS brand_success_color TEXT,
ADD COLUMN IF NOT EXISTS brand_warning_color TEXT,
ADD COLUMN IF NOT EXISTS favicon_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN resorts.brand_button_style IS 'Button style: rounded, pill, or squared';
COMMENT ON COLUMN resorts.brand_card_style IS 'Card style: elevated, outlined, or flat';
COMMENT ON COLUMN resorts.brand_corner_radius IS 'Corner radius scale in pixels (0-24)';
COMMENT ON COLUMN resorts.brand_font_family IS 'Google Font family name for guest portal';
COMMENT ON COLUMN resorts.brand_background_tint IS 'Subtle background tint color (hex)';
COMMENT ON COLUMN resorts.brand_success_color IS 'Override success state color (hex)';
COMMENT ON COLUMN resorts.brand_warning_color IS 'Override warning state color (hex)';
COMMENT ON COLUMN resorts.favicon_url IS 'URL for resort favicon';