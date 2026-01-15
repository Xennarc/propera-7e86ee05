-- Create demo_leads table for tracking prospects without provisioning per-email
CREATE TABLE public.demo_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  last_seen_at timestamptz DEFAULT now() NOT NULL,
  utm_source text,
  utm_medium text,
  utm_campaign text
);

-- Add is_demo flag to resorts table to identify the shared demo resort
ALTER TABLE public.resorts ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false NOT NULL;

-- Add demo_lead_id to demo_login_tokens for linking tokens to leads
ALTER TABLE public.demo_login_tokens ADD COLUMN IF NOT EXISTS demo_lead_id uuid REFERENCES public.demo_leads(id) ON DELETE SET NULL;

-- Enable RLS on demo_leads
ALTER TABLE public.demo_leads ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for demo lead capture (edge function uses service role anyway)
CREATE POLICY "Allow service role full access to demo_leads"
ON public.demo_leads
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for email lookups
CREATE INDEX idx_demo_leads_email ON public.demo_leads(email);

-- Create index for is_demo lookups
CREATE INDEX idx_resorts_is_demo ON public.resorts(is_demo) WHERE is_demo = true;