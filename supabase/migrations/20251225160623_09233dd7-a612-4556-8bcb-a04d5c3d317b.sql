-- Create lead status enum
CREATE TYPE lead_status AS ENUM (
  'new',
  'sandbox_created',
  'live_demo_booked',
  'trial_active',
  'paid',
  'converted',
  'lost'
);

-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  resort_name TEXT NOT NULL,
  country TEXT,
  timezone TEXT,
  rooms_range TEXT,
  departments TEXT[],
  role TEXT,
  timeline TEXT,
  current_system TEXT,
  primary_pain TEXT,
  lead_score INTEGER NOT NULL DEFAULT 0,
  status lead_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all leads
CREATE POLICY "Super admins can manage leads"
ON public.leads
FOR ALL
USING (is_super_admin(auth.uid()));

-- Allow anonymous insert for lead capture (public form)
CREATE POLICY "Anyone can create leads"
ON public.leads
FOR INSERT
WITH CHECK (true);

-- Create demo_tenants table
CREATE TABLE public.demo_tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_converted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on demo_tenants
ALTER TABLE public.demo_tenants ENABLE ROW LEVEL SECURITY;

-- Super admins can manage demo tenants
CREATE POLICY "Super admins can manage demo tenants"
ON public.demo_tenants
FOR ALL
USING (is_super_admin(auth.uid()));

-- System can insert demo tenants (via edge function)
CREATE POLICY "System can insert demo tenants"
ON public.demo_tenants
FOR INSERT
WITH CHECK (true);

-- Users can view their own demo tenant
CREATE POLICY "Users can view own demo tenant"
ON public.demo_tenants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM resort_memberships rm
    WHERE rm.user_id = auth.uid()
    AND rm.resort_id = demo_tenants.tenant_id
  )
);

-- Create onboarding_progress table
CREATE TABLE public.onboarding_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, step_key)
);

-- Enable RLS on onboarding_progress
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Staff can view onboarding progress in their resort
CREATE POLICY "Staff can view onboarding progress"
ON public.onboarding_progress
FOR SELECT
USING (has_resort_membership(auth.uid(), tenant_id) OR is_super_admin(auth.uid()));

-- Staff can update onboarding progress in their resort
CREATE POLICY "Staff can update onboarding progress"
ON public.onboarding_progress
FOR UPDATE
USING (has_resort_membership(auth.uid(), tenant_id) OR is_super_admin(auth.uid()));

-- Staff can insert onboarding progress in their resort
CREATE POLICY "Staff can insert onboarding progress"
ON public.onboarding_progress
FOR INSERT
WITH CHECK (has_resort_membership(auth.uid(), tenant_id) OR is_super_admin(auth.uid()));

-- Create lead_events table
CREATE TABLE public.lead_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on lead_events
ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;

-- Super admins can manage lead events
CREATE POLICY "Super admins can manage lead events"
ON public.lead_events
FOR ALL
USING (is_super_admin(auth.uid()));

-- System can insert lead events
CREATE POLICY "System can insert lead events"
ON public.lead_events
FOR INSERT
WITH CHECK (true);

-- Create rate limit table for demo creation
CREATE TABLE public.demo_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_domain TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  last_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on rate limits
ALTER TABLE public.demo_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system can manage rate limits
CREATE POLICY "System can manage rate limits"
ON public.demo_rate_limits
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_demo_tenants_lead_id ON public.demo_tenants(lead_id);
CREATE INDEX idx_demo_tenants_tenant_id ON public.demo_tenants(tenant_id);
CREATE INDEX idx_demo_tenants_expires_at ON public.demo_tenants(expires_at);
CREATE INDEX idx_onboarding_progress_tenant_id ON public.onboarding_progress(tenant_id);
CREATE INDEX idx_lead_events_lead_id ON public.lead_events(lead_id);
CREATE INDEX idx_demo_rate_limits_domain ON public.demo_rate_limits(email_domain);

-- Add updated_at trigger for leads
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add is_demo column to resorts if not exists
ALTER TABLE public.resorts ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;