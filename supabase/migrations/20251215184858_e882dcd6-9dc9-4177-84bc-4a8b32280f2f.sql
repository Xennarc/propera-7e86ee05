-- Admin audit logs table for tracking super admin actions
CREATE TABLE public.admin_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  resort_id UUID,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for efficient querying
CREATE INDEX idx_admin_audit_logs_actor ON public.admin_audit_logs(actor_id);
CREATE INDEX idx_admin_audit_logs_resort ON public.admin_audit_logs(resort_id);
CREATE INDEX idx_admin_audit_logs_created ON public.admin_audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can view audit logs
CREATE POLICY "Super admins can view admin audit logs"
ON public.admin_audit_logs
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Only super admins can insert audit logs
CREATE POLICY "Super admins can insert admin audit logs"
ON public.admin_audit_logs
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

-- Create helper function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action TEXT,
  p_resort_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can log admin actions';
  END IF;
  
  INSERT INTO admin_audit_logs (actor_id, action, resort_id, metadata_json)
  VALUES (auth.uid(), p_action, p_resort_id, p_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;