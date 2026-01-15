-- Phase 1: Resort Settings Infrastructure + Rollout Jobs + Incidents

-- 1. Resort Settings table for per-resort module toggles
CREATE TABLE public.resort_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL UNIQUE REFERENCES resorts(id) ON DELETE CASCADE,
  
  -- Module toggles
  activities_enabled BOOLEAN NOT NULL DEFAULT true,
  dining_enabled BOOLEAN NOT NULL DEFAULT true,
  prearrival_enabled BOOLEAN NOT NULL DEFAULT false,
  loyalty_enabled BOOLEAN NOT NULL DEFAULT false,
  guest_booking_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Versioning for cache busting
  branding_version INTEGER NOT NULL DEFAULT 1,
  seo_version INTEGER NOT NULL DEFAULT 1,
  
  -- Metadata
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: Only Super Admins can read/write
ALTER TABLE resort_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access to resort_settings" ON resort_settings
  FOR ALL USING (is_super_admin(auth.uid()));

-- Auto-create settings row when resort is created
CREATE OR REPLACE FUNCTION create_resort_settings_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO resort_settings (resort_id)
  VALUES (NEW.id)
  ON CONFLICT (resort_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_create_resort_settings
  AFTER INSERT ON resorts
  FOR EACH ROW EXECUTE FUNCTION create_resort_settings_on_insert();

-- Backfill resort_settings for existing resorts
INSERT INTO resort_settings (resort_id)
SELECT id FROM resorts
ON CONFLICT (resort_id) DO NOTHING;

-- 2. Incidents table for error correlation
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('P0', 'P1', 'P2', 'P3')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  related_error_ids UUID[] DEFAULT '{}',
  affected_resort_ids UUID[] DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access to incidents" ON incidents
  FOR ALL USING (is_super_admin(auth.uid()));

-- 3. Rollout Jobs table for job-based execution tracking
CREATE TABLE public.rollout_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type TEXT NOT NULL,
  change_label TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('one', 'selected', 'all')),
  target_resort_ids UUID[] NOT NULL DEFAULT '{}',
  payload_json JSONB DEFAULT '{}',
  
  -- Execution state
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dry_run', 'in_progress', 'completed', 'failed', 'rolled_back')),
  dry_run_result_json JSONB,
  
  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_message TEXT,
  notes TEXT
);

ALTER TABLE rollout_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access to rollout_jobs" ON rollout_jobs
  FOR ALL USING (is_super_admin(auth.uid()));

-- 4. Rollout Job Steps for per-resort tracking with rollback values
CREATE TABLE public.rollout_job_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES rollout_jobs(id) ON DELETE CASCADE,
  resort_id UUID NOT NULL REFERENCES resorts(id),
  
  -- Before/after for rollback
  old_value_json JSONB NOT NULL DEFAULT '{}',
  new_value_json JSONB NOT NULL DEFAULT '{}',
  
  -- Execution state
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rollout_job_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access to rollout_job_steps" ON rollout_job_steps
  FOR ALL USING (is_super_admin(auth.uid()));

-- Index for faster lookups
CREATE INDEX idx_rollout_job_steps_job_id ON rollout_job_steps(job_id);
CREATE INDEX idx_rollout_jobs_status ON rollout_jobs(status);
CREATE INDEX idx_rollout_jobs_created_by ON rollout_jobs(created_by);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_resort_settings_resort_id ON resort_settings(resort_id);

-- Enable realtime for rollout tracking
ALTER PUBLICATION supabase_realtime ADD TABLE rollout_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE rollout_job_steps;