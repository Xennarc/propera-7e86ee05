-- Table for logging all outbound guest communications (emails, SMS, etc.)
CREATE TABLE public.guest_outbound_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'whatsapp')),
  template_key text NOT NULL,
  to_address text NOT NULL,
  subject text,
  body_preview text,
  provider_message_id text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('draft', 'queued', 'sent', 'failed')),
  error_message text,
  sent_at timestamp with time zone,
  created_by_staff_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for common queries
CREATE INDEX idx_guest_outbound_messages_resort_id ON public.guest_outbound_messages(resort_id);
CREATE INDEX idx_guest_outbound_messages_guest_id ON public.guest_outbound_messages(guest_id);
CREATE INDEX idx_guest_outbound_messages_status ON public.guest_outbound_messages(status);
CREATE INDEX idx_guest_outbound_messages_template_key ON public.guest_outbound_messages(template_key);

-- Enable RLS
ALTER TABLE public.guest_outbound_messages ENABLE ROW LEVEL SECURITY;

-- Staff can view messages in their resort
CREATE POLICY "Staff can view outbound messages in their resort"
  ON public.guest_outbound_messages
  FOR SELECT
  USING (has_resort_membership(auth.uid(), resort_id) OR is_super_admin(auth.uid()));

-- Staff can insert messages
CREATE POLICY "Staff can create outbound messages"
  ON public.guest_outbound_messages
  FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'MANAGER'::app_role]));

-- Staff can update messages
CREATE POLICY "Staff can update outbound messages"
  ON public.guest_outbound_messages
  FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'MANAGER'::app_role]));

-- Add updated_at trigger
CREATE TRIGGER update_guest_outbound_messages_updated_at
  BEFORE UPDATE ON public.guest_outbound_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();