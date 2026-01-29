-- Drop and recreate guest_get_request_catalog RPC with new columns
DROP FUNCTION IF EXISTS guest_get_request_catalog(UUID);

CREATE FUNCTION guest_get_request_catalog(p_resort_id UUID)
RETURNS TABLE (
  id UUID,
  code TEXT,
  title TEXT,
  category TEXT,
  department_key TEXT,
  icon_key TEXT,
  is_billable BOOLEAN,
  default_priority TEXT,
  display_label TEXT,
  description TEXT,
  color_class TEXT,
  display_order INTEGER
) AS $$
  SELECT 
    rc.id,
    rc.code,
    rc.title,
    rc.category,
    rc.department_key,
    rc.icon_key,
    rc.is_billable,
    rc.default_priority,
    COALESCE(rc.display_label, rc.category) as display_label,
    rc.description,
    COALESCE(rc.color_class, 'border-gray-400 text-gray-400') as color_class,
    COALESCE(rc.display_order, 100) as display_order
  FROM request_catalog rc
  WHERE (rc.resort_id IS NULL OR rc.resort_id = p_resort_id)
    AND rc.is_active = true
  ORDER BY rc.display_order, rc.title;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Create guest_get_request_settings RPC
CREATE OR REPLACE FUNCTION guest_get_request_settings(p_resort_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'asap_response_min', COALESCE(asap_response_min_minutes, 10),
    'asap_response_max', COALESCE(asap_response_max_minutes, 15),
    'scheduled_response_min', COALESCE(scheduled_response_min_minutes, 30),
    'scheduled_response_max', COALESCE(scheduled_response_max_minutes, 60),
    'requests_start_hour', COALESCE(requests_start_hour, 6),
    'requests_end_hour', COALESCE(requests_end_hour, 23),
    'max_bundle_items', COALESCE(max_bundle_items, 10),
    'max_total_quantity', COALESCE(max_total_quantity, 20),
    'quick_suggestions', COALESCE(quick_suggestions, '["Extra towels", "Room cleaning", "Extra pillows", "Wake-up call", "Iron & board", "Extra toiletries"]'::jsonb),
    'header_tagline', COALESCE(header_tagline, 'Tap what you need — we''ll notify the team.'),
    'empty_state_title', COALESCE(empty_state_title, 'Your personal concierge'),
    'empty_state_description', COALESCE(empty_state_description, 'We''re setting up your request options. In the meantime, our team is here to help with anything you need.'),
    'footer_response_text', COALESCE(footer_response_text, 'Our team typically responds within {min}-{max} minutes during operating hours')
  ) INTO result
  FROM resort_request_settings
  WHERE resort_id = p_resort_id;
  
  IF result IS NULL THEN
    result := json_build_object(
      'asap_response_min', 10,
      'asap_response_max', 15,
      'scheduled_response_min', 30,
      'scheduled_response_max', 60,
      'requests_start_hour', 6,
      'requests_end_hour', 23,
      'max_bundle_items', 10,
      'max_total_quantity', 20,
      'quick_suggestions', '["Extra towels", "Room cleaning", "Extra pillows", "Wake-up call", "Iron & board", "Extra toiletries"]'::jsonb,
      'header_tagline', 'Tap what you need — we''ll notify the team.',
      'empty_state_title', 'Your personal concierge',
      'empty_state_description', 'We''re setting up your request options. In the meantime, our team is here to help with anything you need.',
      'footer_response_text', 'Our team typically responds within {min}-{max} minutes during operating hours'
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Seed default category display data
UPDATE request_catalog SET 
  display_label = 'Housekeeping',
  description = 'Room cleaning & fresh towels',
  color_class = 'border-cyan-400 text-cyan-400',
  display_order = 10
WHERE category = 'HOUSEKEEPING';

UPDATE request_catalog SET 
  display_label = 'Minibar',
  description = 'Drinks & snack refill',
  color_class = 'border-red-400 text-red-400',
  display_order = 20
WHERE category = 'MINIBAR';

UPDATE request_catalog SET 
  display_label = 'Toiletries',
  description = 'Bathroom essentials',
  color_class = 'border-teal-400 text-teal-400',
  display_order = 30
WHERE category = 'TOILETRIES';

UPDATE request_catalog SET 
  display_label = 'Laundry',
  description = 'Cleaning & pressing',
  color_class = 'border-purple-400 text-purple-400',
  display_order = 40
WHERE category = 'LAUNDRY';

UPDATE request_catalog SET 
  display_label = 'Maintenance',
  description = 'Repairs & fixes',
  color_class = 'border-green-400 text-green-400',
  display_order = 50
WHERE category = 'ENGINEERING';

UPDATE request_catalog SET 
  display_label = 'In-Room Dining',
  description = 'Food & beverages',
  color_class = 'border-pink-400 text-pink-400',
  display_order = 60
WHERE category = 'ROOM_SERVICE';

UPDATE request_catalog SET 
  display_label = 'Amenities',
  description = 'Extra pillows, blankets',
  color_class = 'border-lime-400 text-lime-400',
  display_order = 70
WHERE category = 'AMENITIES';

UPDATE request_catalog SET 
  display_label = 'Other Request',
  description = 'Anything else',
  color_class = 'border-rose-400 text-rose-400',
  display_order = 80
WHERE category = 'OTHER';