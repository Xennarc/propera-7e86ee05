-- Create demo_workspaces table to persist demo state
CREATE TABLE public.demo_workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  resort_name TEXT NOT NULL,
  timezone TEXT,
  rooms_range TEXT,
  departments JSONB DEFAULT '[]'::jsonb,
  resort_id UUID REFERENCES public.resorts(id) ON DELETE CASCADE,
  resort_code TEXT,
  status TEXT NOT NULL DEFAULT 'creating' CHECK (status IN ('creating', 'ready', 'failed')),
  staff_user_id UUID,
  staff_email TEXT,
  guest_id UUID,
  guest_room TEXT,
  guest_last_name TEXT,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  seeded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '14 days'),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create demo_login_tokens table for auto-login capability
CREATE TABLE public.demo_login_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.demo_workspaces(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  token_type TEXT NOT NULL CHECK (token_type IN ('staff', 'guest')),
  user_id UUID,
  guest_id UUID,
  resort_id UUID REFERENCES public.resorts(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '15 minutes'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for token lookups
CREATE INDEX idx_demo_login_tokens_token ON public.demo_login_tokens(token);
CREATE INDEX idx_demo_workspaces_email ON public.demo_workspaces(email);
CREATE INDEX idx_demo_workspaces_resort_id ON public.demo_workspaces(resort_id);

-- Enable RLS
ALTER TABLE public.demo_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_login_tokens ENABLE ROW LEVEL SECURITY;

-- Demo workspaces policies
CREATE POLICY "System can manage demo workspaces"
ON public.demo_workspaces
FOR ALL
USING (true)
WITH CHECK (true);

-- Demo login tokens policies
CREATE POLICY "System can manage demo tokens"
ON public.demo_login_tokens
FOR ALL
USING (true)
WITH CHECK (true);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.update_demo_workspace_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_demo_workspaces_updated_at
BEFORE UPDATE ON public.demo_workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_demo_workspace_updated_at();

-- Function to validate demo login token (called from edge function or client via RPC)
CREATE OR REPLACE FUNCTION public.validate_demo_login_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record demo_login_tokens%ROWTYPE;
  v_workspace demo_workspaces%ROWTYPE;
  v_result JSONB;
BEGIN
  -- Find the token
  SELECT * INTO v_token_record
  FROM demo_login_tokens
  WHERE token = p_token;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Token not found');
  END IF;
  
  -- Check if already used
  IF v_token_record.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Token already used');
  END IF;
  
  -- Check if expired
  IF v_token_record.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Token expired');
  END IF;
  
  -- Get workspace
  SELECT * INTO v_workspace
  FROM demo_workspaces
  WHERE id = v_token_record.workspace_id;
  
  IF NOT FOUND OR v_workspace.status != 'ready' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Demo workspace not ready');
  END IF;
  
  -- Mark token as used
  UPDATE demo_login_tokens
  SET used_at = now()
  WHERE id = v_token_record.id;
  
  -- Build result
  v_result := jsonb_build_object(
    'valid', true,
    'token_type', v_token_record.token_type,
    'user_id', v_token_record.user_id,
    'guest_id', v_token_record.guest_id,
    'resort_id', v_token_record.resort_id,
    'resort_code', v_workspace.resort_code,
    'workspace_id', v_workspace.id
  );
  
  RETURN v_result;
END;
$$;

-- Function to get demo workspace by email (for resume capability)
CREATE OR REPLACE FUNCTION public.get_demo_workspace_by_email(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace demo_workspaces%ROWTYPE;
BEGIN
  SELECT * INTO v_workspace
  FROM demo_workspaces
  WHERE email = lower(p_email)
    AND status = 'ready'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  
  RETURN jsonb_build_object(
    'found', true,
    'workspace_id', v_workspace.id,
    'resort_id', v_workspace.resort_id,
    'resort_code', v_workspace.resort_code,
    'resort_name', v_workspace.resort_name,
    'status', v_workspace.status,
    'expires_at', v_workspace.expires_at,
    'created_at', v_workspace.created_at
  );
END;
$$;