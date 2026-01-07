-- Add last_email_sent_at column for resend throttling
ALTER TABLE public.demo_workspaces 
ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMP WITH TIME ZONE;