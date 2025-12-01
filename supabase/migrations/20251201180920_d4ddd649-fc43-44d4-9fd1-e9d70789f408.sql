-- Create pre-arrival tokens table for guest pre-stay access
CREATE TABLE public.prearrival_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for fast token lookup
CREATE INDEX idx_prearrival_tokens_token ON public.prearrival_tokens(token);
CREATE INDEX idx_prearrival_tokens_guest_id ON public.prearrival_tokens(guest_id);
CREATE INDEX idx_prearrival_tokens_resort_id ON public.prearrival_tokens(resort_id);

-- Enable RLS
ALTER TABLE public.prearrival_tokens ENABLE ROW LEVEL SECURITY;

-- Staff can manage tokens for their resort's guests
CREATE POLICY "Staff can manage pre-arrival tokens" 
ON public.prearrival_tokens 
FOR ALL
USING (
  has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'MANAGER'::app_role])
);

-- Anyone can view valid tokens (for the pre-arrival route to work)
CREATE POLICY "Anyone can view valid pre-arrival tokens" 
ON public.prearrival_tokens 
FOR SELECT
USING (expires_at > now());

-- Add trigger for updated_at
CREATE TRIGGER update_prearrival_tokens_updated_at
BEFORE UPDATE ON public.prearrival_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate or retrieve pre-arrival token
CREATE OR REPLACE FUNCTION public.generate_prearrival_token(
  p_guest_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_guest guests%ROWTYPE;
  v_token TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_existing_token prearrival_tokens%ROWTYPE;
BEGIN
  -- Get guest
  SELECT * INTO v_guest FROM guests WHERE id = p_guest_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Guest not found');
  END IF;
  
  -- Check for existing valid token
  SELECT * INTO v_existing_token 
  FROM prearrival_tokens 
  WHERE guest_id = p_guest_id 
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_existing_token.id IS NOT NULL THEN
    -- Return existing token
    RETURN json_build_object(
      'success', true,
      'token', v_existing_token.token,
      'expires_at', v_existing_token.expires_at
    );
  END IF;
  
  -- Generate new token (secure random)
  v_token := encode(gen_random_bytes(32), 'base64');
  v_token := replace(v_token, '/', '_');
  v_token := replace(v_token, '+', '-');
  v_token := replace(v_token, '=', '');
  
  -- Set expiry to 3 days after checkout
  v_expires_at := (v_guest.check_out + INTERVAL '3 days')::TIMESTAMP WITH TIME ZONE;
  
  -- Insert new token
  INSERT INTO prearrival_tokens (resort_id, guest_id, token, expires_at)
  VALUES (v_guest.resort_id, p_guest_id, v_token, v_expires_at);
  
  RETURN json_build_object(
    'success', true,
    'token', v_token,
    'expires_at', v_expires_at
  );
END;
$function$;