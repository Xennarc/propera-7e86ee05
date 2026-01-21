-- ============================================
-- RETENTION AUTOMATION FOR GUEST REQUESTS
-- ============================================

-- 1) Function to get effective retention settings (uses override or defaults)
CREATE OR REPLACE FUNCTION public.get_effective_retention(
  _resort_id uuid,
  _dept_key text
)
RETURNS TABLE(archive_after_days int, delete_after_days int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(dro.archive_after_days, rrp.default_archive_after_days) AS archive_after_days,
    COALESCE(dro.delete_after_days, rrp.default_delete_after_days) AS delete_after_days
  FROM resort_retention_policies rrp
  LEFT JOIN department_retention_overrides dro 
    ON dro.resort_id = rrp.resort_id 
    AND dro.department_key = _dept_key
  WHERE rrp.resort_id = _resort_id;
END;
$$;

-- 2) Archive closed requests function
CREATE OR REPLACE FUNCTION public.archive_closed_requests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resort RECORD;
  v_dept RECORD;
  v_retention RECORD;
  v_cutoff timestamptz;
  v_archived_count int := 0;
  v_total_archived int := 0;
  v_results jsonb := '[]'::jsonb;
BEGIN
  -- Loop through all resorts with retention policies
  FOR v_resort IN 
    SELECT DISTINCT resort_id FROM resort_retention_policies
  LOOP
    -- Get all unique department_keys from service_requests for this resort
    FOR v_dept IN 
      SELECT DISTINCT department_key 
      FROM service_requests 
      WHERE resort_id = v_resort.resort_id
        AND status IN ('COMPLETED', 'CANCELLED')
    LOOP
      -- Get effective retention for this resort+department
      SELECT * INTO v_retention 
      FROM get_effective_retention(v_resort.resort_id, v_dept.department_key);
      
      -- Calculate cutoff date
      v_cutoff := now() - (v_retention.archive_after_days || ' days')::interval;
      
      -- Archive eligible requests in a single transaction
      WITH archived AS (
        INSERT INTO service_requests_archive (
          id, resort_id, guest_id, room_id, catalog_id, title, notes, internal_notes,
          quantity, is_asap, requested_for_at, department_key, category, priority, status,
          created_at, acknowledged_at, acknowledged_by, assigned_at, assigned_by,
          assigned_to, completed_at, completed_by, cancelled_at, cancelled_by,
          archived_at, archived_by
        )
        SELECT 
          id, resort_id, guest_id, room_id, catalog_id, title, notes, internal_notes,
          quantity, is_asap, requested_for_at, department_key, category, priority, status,
          created_at, acknowledged_at, acknowledged_by, assigned_at, assigned_by,
          assigned_to, completed_at, completed_by, cancelled_at, cancelled_by,
          now(), NULL -- archived_at, archived_by (system)
        FROM service_requests
        WHERE resort_id = v_resort.resort_id
          AND department_key = v_dept.department_key
          AND status IN ('COMPLETED', 'CANCELLED')
          AND COALESCE(completed_at, cancelled_at) < v_cutoff
        RETURNING id
      ),
      deleted AS (
        DELETE FROM service_requests
        WHERE id IN (SELECT id FROM archived)
        RETURNING id
      )
      SELECT COUNT(*) INTO v_archived_count FROM deleted;
      
      v_total_archived := v_total_archived + v_archived_count;
      
      IF v_archived_count > 0 THEN
        v_results := v_results || jsonb_build_object(
          'resort_id', v_resort.resort_id,
          'department_key', v_dept.department_key,
          'archived_count', v_archived_count,
          'cutoff_date', v_cutoff
        );
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_archived', v_total_archived,
    'details', v_results,
    'ran_at', now()
  );
END;
$$;

-- 3) Purge archived requests function
CREATE OR REPLACE FUNCTION public.purge_archived_requests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resort RECORD;
  v_dept RECORD;
  v_retention RECORD;
  v_cutoff timestamptz;
  v_purged_count int := 0;
  v_total_purged int := 0;
  v_results jsonb := '[]'::jsonb;
BEGIN
  -- Loop through all resorts with retention policies
  FOR v_resort IN 
    SELECT DISTINCT resort_id FROM resort_retention_policies
  LOOP
    -- Get all unique department_keys from archive for this resort
    FOR v_dept IN 
      SELECT DISTINCT department_key 
      FROM service_requests_archive 
      WHERE resort_id = v_resort.resort_id
    LOOP
      -- Get effective retention for this resort+department
      SELECT * INTO v_retention 
      FROM get_effective_retention(v_resort.resort_id, v_dept.department_key);
      
      -- Calculate cutoff date based on archived_at
      v_cutoff := now() - (v_retention.delete_after_days || ' days')::interval;
      
      -- Delete eligible archived requests
      WITH purged AS (
        DELETE FROM service_requests_archive
        WHERE resort_id = v_resort.resort_id
          AND department_key = v_dept.department_key
          AND archived_at < v_cutoff
        RETURNING id
      )
      SELECT COUNT(*) INTO v_purged_count FROM purged;
      
      v_total_purged := v_total_purged + v_purged_count;
      
      IF v_purged_count > 0 THEN
        v_results := v_results || jsonb_build_object(
          'resort_id', v_resort.resort_id,
          'department_key', v_dept.department_key,
          'purged_count', v_purged_count,
          'cutoff_date', v_cutoff
        );
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_purged', v_total_purged,
    'details', v_results,
    'ran_at', now()
  );
END;
$$;

-- 4) Auto-create retention policy for new resorts (trigger)
CREATE OR REPLACE FUNCTION public.ensure_resort_retention_policy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO resort_retention_policies (resort_id)
  VALUES (NEW.id)
  ON CONFLICT (resort_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_retention_policy ON resorts;
CREATE TRIGGER trg_ensure_retention_policy
  AFTER INSERT ON resorts
  FOR EACH ROW
  EXECUTE FUNCTION ensure_resort_retention_policy();

-- 5) Backfill retention policies for existing resorts
INSERT INTO resort_retention_policies (resort_id)
SELECT id FROM resorts
WHERE id NOT IN (SELECT resort_id FROM resort_retention_policies)
ON CONFLICT (resort_id) DO NOTHING;

-- 6) Performance indexes for archive operations
CREATE INDEX IF NOT EXISTS idx_service_requests_archive_scan 
  ON service_requests (resort_id, department_key, status, completed_at, cancelled_at)
  WHERE status IN ('COMPLETED', 'CANCELLED');

CREATE INDEX IF NOT EXISTS idx_service_requests_archive_purge_scan
  ON service_requests_archive (resort_id, department_key, archived_at);

-- 7) Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_effective_retention(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_closed_requests() TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_archived_requests() TO service_role;