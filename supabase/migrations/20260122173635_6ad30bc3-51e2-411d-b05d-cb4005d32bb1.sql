-- =====================================================
-- Update archive_closed_requests to include service_request_items
-- =====================================================

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
  v_items_archived_count int := 0;
  v_total_archived int := 0;
  v_total_items_archived int := 0;
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
      
      -- Archive eligible requests and their items in a single transaction
      WITH archived_requests AS (
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
      -- Archive the items for these requests
      archived_items AS (
        INSERT INTO service_request_items_archive (
          resort_id, request_archive_id, catalog_id, title, quantity, created_at
        )
        SELECT 
          sri.resort_id,
          sri.request_id, -- This becomes request_archive_id (same UUID)
          sri.catalog_id,
          sri.title,
          sri.quantity,
          sri.created_at
        FROM service_request_items sri
        WHERE sri.request_id IN (SELECT id FROM archived_requests)
        RETURNING id
      ),
      -- Delete items from active table (must happen before request deletion due to FK)
      deleted_items AS (
        DELETE FROM service_request_items
        WHERE request_id IN (SELECT id FROM archived_requests)
        RETURNING id
      ),
      -- Delete requests from active table
      deleted_requests AS (
        DELETE FROM service_requests
        WHERE id IN (SELECT id FROM archived_requests)
        RETURNING id
      )
      SELECT 
        (SELECT COUNT(*) FROM deleted_requests),
        (SELECT COUNT(*) FROM deleted_items)
      INTO v_archived_count, v_items_archived_count;
      
      v_total_archived := v_total_archived + v_archived_count;
      v_total_items_archived := v_total_items_archived + v_items_archived_count;
      
      IF v_archived_count > 0 THEN
        v_results := v_results || jsonb_build_object(
          'resort_id', v_resort.resort_id,
          'department_key', v_dept.department_key,
          'archived_count', v_archived_count,
          'items_archived_count', v_items_archived_count,
          'cutoff_date', v_cutoff
        );
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_archived', v_total_archived,
    'total_items_archived', v_total_items_archived,
    'details', v_results,
    'ran_at', now()
  );
END;
$$;

-- Add comment explaining the cascade behavior for purging
COMMENT ON FUNCTION public.archive_closed_requests() IS 
'Archives COMPLETED/CANCELLED service requests and their line items based on retention policies. 
Items are moved to service_request_items_archive before requests are deleted.
Purging is handled automatically via ON DELETE CASCADE on service_request_items_archive.request_archive_id.';