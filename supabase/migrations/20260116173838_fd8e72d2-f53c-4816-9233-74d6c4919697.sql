-- Create resort_purge_jobs table for tracking purge operations
CREATE TABLE public.resort_purge_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL,
  resort_code TEXT NOT NULL,
  resort_name TEXT NOT NULL,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  requested_by UUID NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'queued' 
    CHECK (status IN ('queued', 'running', 'failed', 'completed', 'cancelled')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_step TEXT,
  reason TEXT,
  error TEXT,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Indexes for efficient queries
CREATE INDEX idx_purge_jobs_status ON resort_purge_jobs(status, requested_at DESC);
CREATE INDEX idx_purge_jobs_resort ON resort_purge_jobs(resort_id);
CREATE INDEX idx_purge_jobs_requested_at ON resort_purge_jobs(requested_at DESC);

-- Enable RLS
ALTER TABLE resort_purge_jobs ENABLE ROW LEVEL SECURITY;

-- Only super admins can view purge jobs
CREATE POLICY "Super admins can view purge jobs"
  ON resort_purge_jobs FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- No direct insert - only via RPC
CREATE POLICY "No direct insert for purge jobs"
  ON resort_purge_jobs FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- No direct update - only via service role in edge function
CREATE POLICY "No direct update for purge jobs"
  ON resort_purge_jobs FOR UPDATE
  TO authenticated
  USING (false);

-- Create the request_resort_purge RPC function
CREATE OR REPLACE FUNCTION public.request_resort_purge(
  p_resort_id UUID,
  p_resort_code TEXT,
  p_confirm_word TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resort RECORD;
  v_job_id UUID;
  v_user_id UUID := auth.uid();
  v_required_confirm TEXT;
BEGIN
  -- Verify caller is super admin
  IF NOT is_super_admin(v_user_id) THEN
    RAISE EXCEPTION 'Forbidden: Super admin access required';
  END IF;
  
  -- Fetch and validate resort
  SELECT id, code, name, is_demo INTO v_resort
  FROM resorts WHERE id = p_resort_id;
  
  IF v_resort.id IS NULL THEN
    RAISE EXCEPTION 'Resort not found';
  END IF;
  
  IF v_resort.code != p_resort_code THEN
    RAISE EXCEPTION 'Resort code does not match';
  END IF;
  
  -- Determine required confirmation based on demo status
  v_required_confirm := CASE WHEN v_resort.is_demo THEN 'DELETE DEMO' ELSE 'DELETE' END;
  
  IF p_confirm_word != v_required_confirm THEN
    RAISE EXCEPTION 'Invalid confirmation word. Expected: %', v_required_confirm;
  END IF;
  
  -- Check for existing queued/running job
  IF EXISTS (
    SELECT 1 FROM resort_purge_jobs 
    WHERE resort_id = p_resort_id AND status IN ('queued', 'running')
  ) THEN
    RAISE EXCEPTION 'A purge job is already in progress for this resort';
  END IF;
  
  -- Create purge job
  INSERT INTO resort_purge_jobs (
    resort_id, resort_code, resort_name, is_demo, requested_by, reason
  ) VALUES (
    p_resort_id, v_resort.code, v_resort.name, v_resort.is_demo, v_user_id, p_reason
  ) RETURNING id INTO v_job_id;
  
  -- Write audit log
  INSERT INTO admin_audit_logs (actor_id, action, resort_id, metadata_json)
  VALUES (
    v_user_id,
    'resort_purge_requested',
    p_resort_id,
    jsonb_build_object(
      'job_id', v_job_id,
      'resort_name', v_resort.name,
      'resort_code', v_resort.code,
      'is_demo', v_resort.is_demo,
      'reason', p_reason
    )
  );
  
  RETURN v_job_id;
END;
$$;