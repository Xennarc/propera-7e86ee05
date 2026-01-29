-- Create resort_request_settings table
CREATE TABLE IF NOT EXISTS resort_request_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID UNIQUE NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  
  -- SLA Configuration
  asap_response_min_minutes INTEGER DEFAULT 10,
  asap_response_max_minutes INTEGER DEFAULT 15,
  scheduled_response_min_minutes INTEGER DEFAULT 30,
  scheduled_response_max_minutes INTEGER DEFAULT 60,
  
  -- Operating Hours
  requests_start_hour INTEGER DEFAULT 6,
  requests_end_hour INTEGER DEFAULT 23,
  
  -- Limits
  max_bundle_items INTEGER DEFAULT 10,
  max_total_quantity INTEGER DEFAULT 20,
  
  -- Quick Suggestions (JSONB array of strings)
  quick_suggestions JSONB DEFAULT '["Extra towels", "Room cleaning", "Extra pillows", "Wake-up call", "Iron & board", "Extra toiletries"]'::jsonb,
  
  -- UI Microcopy
  header_tagline TEXT DEFAULT 'Tap what you need — we''ll notify the team.',
  empty_state_title TEXT DEFAULT 'Your personal concierge',
  empty_state_description TEXT DEFAULT 'We''re setting up your request options. In the meantime, our team is here to help with anything you need.',
  footer_response_text TEXT DEFAULT 'Our team typically responds within {min}-{max} minutes during operating hours',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE resort_request_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff access
CREATE POLICY "staff_can_read_request_settings" ON resort_request_settings
  FOR SELECT TO authenticated
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

CREATE POLICY "admin_can_manage_request_settings" ON resort_request_settings
  FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[])
  )
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    public.has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN']::resort_role[])
  );

-- Create updated_at trigger
CREATE TRIGGER update_resort_request_settings_updated_at
  BEFORE UPDATE ON resort_request_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();