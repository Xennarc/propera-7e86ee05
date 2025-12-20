-- Create staff_audit_logs table for tracking staff management actions
CREATE TABLE public.staff_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID REFERENCES public.resorts(id) ON DELETE SET NULL,
  actor_id UUID NOT NULL,
  target_user_id UUID,
  action TEXT NOT NULL,
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create index for performance
CREATE INDEX idx_staff_audit_logs_resort ON public.staff_audit_logs(resort_id);
CREATE INDEX idx_staff_audit_logs_actor ON public.staff_audit_logs(actor_id);
CREATE INDEX idx_staff_audit_logs_created ON public.staff_audit_logs(created_at DESC);

-- Policy: SUPER_ADMIN can view all logs
CREATE POLICY "Super admins can view all staff audit logs"
ON public.staff_audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND global_role = 'SUPER_ADMIN'
  )
);

-- Policy: RESORT_ADMIN can view logs for their resort
CREATE POLICY "Resort admins can view their resort audit logs"
ON public.staff_audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.resort_memberships
    WHERE user_id = auth.uid()
    AND resort_id = staff_audit_logs.resort_id
    AND resort_role = 'RESORT_ADMIN'
  )
);

-- Policy: Authenticated users can insert (will be called via edge functions with proper auth checks)
CREATE POLICY "Authenticated users can insert audit logs"
ON public.staff_audit_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create helper function to log staff actions
CREATE OR REPLACE FUNCTION public.log_staff_action(
  p_action TEXT,
  p_resort_id UUID DEFAULT NULL,
  p_target_user_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO staff_audit_logs (actor_id, action, resort_id, target_user_id, metadata_json)
  VALUES (auth.uid(), p_action, p_resort_id, p_target_user_id, p_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;