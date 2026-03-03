
-- RPC: get_daily_ops_sheet
-- Aggregates all session data for a resort/date/department into one JSON response.
-- Department maps to activity_category enum: 'DIVE','WATERSPORT','EXCURSION','SPA','OTHER'
-- Pass p_department as NULL to get all departments.

CREATE OR REPLACE FUNCTION public.get_daily_ops_sheet(
  p_resort_id uuid,
  p_date date,
  p_department text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_rows jsonb;
  v_summary jsonb;
  v_cat text;
BEGIN
  -- Normalize department to category enum value
  v_cat := CASE UPPER(COALESCE(p_department, ''))
    WHEN 'DIVE' THEN 'DIVE'
    WHEN 'WATERSPORT' THEN 'WATERSPORT'
    WHEN 'WATERSPORTS' THEN 'WATERSPORT'
    WHEN 'EXCURSION' THEN 'EXCURSION'
    WHEN 'EXCURSIONS' THEN 'EXCURSION'
    WHEN 'SPA' THEN 'SPA'
    WHEN 'OTHER' THEN 'OTHER'
    ELSE NULL
  END;

  -- Build per-session rows
  WITH sessions AS (
    SELECT
      s.id AS session_id,
      s.start_time,
      s.end_time,
      s.status,
      s.capacity,
      s.lead_staff_id,
      s.notes AS session_notes,
      a.name AS activity_name,
      a.category,
      a.requirements_json,
      r.name AS resource_name
    FROM activity_sessions s
    JOIN activities a ON a.id = s.activity_id
    LEFT JOIN resources r ON r.id = s.resource_id
    WHERE s.resort_id = p_resort_id
      AND s.date = p_date
      AND (v_cat IS NULL OR a.category::text = v_cat)
    ORDER BY s.start_time, a.name
  ),
  -- Booking counts per session
  booking_counts AS (
    SELECT
      ab.session_id,
      COUNT(*) FILTER (WHERE ab.status IN ('CONFIRMED','PENDING','COMPLETED')) AS booked,
      SUM(ab.num_adults + ab.num_children) FILTER (WHERE ab.status IN ('CONFIRMED','PENDING','COMPLETED')) AS total_pax
    FROM activity_bookings ab
    WHERE ab.resort_id = p_resort_id
      AND ab.session_id IN (SELECT session_id FROM sessions)
    GROUP BY ab.session_id
  ),
  -- Readiness aggregates per session
  readiness_agg AS (
    SELECT
      abr.session_id,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE abr.waiver_status IN ('complete','not_required')
                        AND abr.medical_status IN ('complete','not_required')
                        AND abr.cert_status IN ('complete','uploaded','not_required')
                        AND abr.gear_status IN ('complete','not_required')) AS ready,
      COUNT(*) FILTER (WHERE abr.medical_review_status = 'pending') AS pending_medical,
      COUNT(*) FILTER (WHERE abr.cert_verification_status = 'unverified'
                        AND abr.cert_status IN ('uploaded','complete')) AS unverified_certs
    FROM activity_booking_readiness abr
    WHERE abr.resort_id = p_resort_id
      AND abr.session_id IN (SELECT session_id FROM sessions)
    GROUP BY abr.session_id
  ),
  -- Asset assignments per session (boat + equipment)
  asset_agg AS (
    SELECT
      sa.session_id,
      jsonb_agg(
        jsonb_build_object(
          'asset_type', sa.asset_type,
          'name', sa.asset_label,
          'asset_id', sa.asset_id,
          'qty', sa.quantity
        )
      ) AS assets
    FROM session_asset_assignments sa
    WHERE sa.resort_id = p_resort_id
      AND sa.session_id IN (SELECT session_id FROM sessions)
    GROUP BY sa.session_id
  ),
  -- Staff assignments per session
  staff_agg AS (
    SELECT
      ssa.session_id,
      jsonb_agg(
        jsonb_build_object(
          'staff_user_id', ssa.staff_user_id,
          'role', ssa.role,
          'name', COALESCE(p.full_name, 'Unknown')
        )
      ) AS crew
    FROM session_staff_assignments ssa
    LEFT JOIN profiles p ON p.id = ssa.staff_user_id
    WHERE ssa.resort_id = p_resort_id
      AND ssa.session_id IN (SELECT session_id FROM sessions)
    GROUP BY ssa.session_id
  ),
  -- Pickup links per session
  pickup_agg AS (
    SELECT
      stl.session_id,
      bt.id AS trip_id,
      bt.status AS trip_status,
      bt.driver_user_id
    FROM session_transport_links stl
    JOIN buggy_trips bt ON bt.id = stl.trip_id
    WHERE stl.resort_id = p_resort_id
      AND stl.link_type = 'pickup'
      AND stl.session_id IN (SELECT session_id FROM sessions)
  ),
  -- Conflict counts per session (lightweight: just count via the existing RPC data pattern)
  conflict_counts AS (
    SELECT
      s.session_id,
      -- Boat conflicts: same asset_id assigned to overlapping session
      (
        SELECT COUNT(DISTINCT sa2.session_id)
        FROM session_asset_assignments sa1
        JOIN session_asset_assignments sa2 ON sa1.asset_id = sa2.asset_id
          AND sa1.session_id <> sa2.session_id
        JOIN activity_sessions os ON os.id = sa2.session_id
          AND os.date = p_date
          AND os.resort_id = p_resort_id
          AND os.status NOT IN ('CANCELLED','COMPLETED')
          AND os.start_time < s.end_time
          AND os.end_time > s.start_time
        WHERE sa1.session_id = s.session_id
          AND sa1.asset_type = 'boat'
      ) +
      -- Staff conflicts: same staff in overlapping session
      (
        SELECT COUNT(DISTINCT ssa2.session_id)
        FROM session_staff_assignments ssa1
        JOIN session_staff_assignments ssa2 ON ssa1.staff_user_id = ssa2.staff_user_id
          AND ssa1.session_id <> ssa2.session_id
        JOIN activity_sessions os ON os.id = ssa2.session_id
          AND os.date = p_date
          AND os.resort_id = p_resort_id
          AND os.status NOT IN ('CANCELLED','COMPLETED')
          AND os.start_time < s.end_time
          AND os.end_time > s.start_time
        WHERE ssa1.session_id = s.session_id
      ) AS conflicts_count
    FROM sessions s
  ),
  -- Assemble rows
  assembled AS (
    SELECT
      s.session_id,
      jsonb_build_object(
        'session_id', s.session_id,
        'start_time', s.start_time,
        'end_time', s.end_time,
        'activity_name', s.activity_name,
        'category', s.category,
        'location', s.resource_name,
        'status', s.status,
        'capacity', s.capacity,
        'booked', COALESCE(bc.booked, 0),
        'total_pax', COALESCE(bc.total_pax, 0),
        'readiness', jsonb_build_object(
          'ready', COALESCE(ra.ready, 0),
          'missing', COALESCE(ra.total, 0) - COALESCE(ra.ready, 0),
          'pending_medical', COALESCE(ra.pending_medical, 0),
          'unverified_certs', COALESCE(ra.unverified_certs, 0)
        ),
        'assignments', jsonb_build_object(
          'boat', (
            SELECT jsonb_build_object('name', x->>'name', 'asset_id', x->>'asset_id')
            FROM jsonb_array_elements(aa.assets) x
            WHERE x->>'asset_type' = 'boat'
            LIMIT 1
          ),
          'crew', COALESCE(sta.crew, '[]'::jsonb),
          'equipment', (
            SELECT COALESCE(jsonb_agg(
              jsonb_build_object('name', x->>'name', 'qty', (x->>'qty')::int)
            ), '[]'::jsonb)
            FROM jsonb_array_elements(aa.assets) x
            WHERE x->>'asset_type' = 'equipment'
          )
        ),
        'pickup', CASE WHEN pa.trip_id IS NOT NULL THEN
          jsonb_build_object('trip_id', pa.trip_id, 'status', pa.trip_status, 'has_driver', pa.driver_user_id IS NOT NULL)
        ELSE NULL END,
        'conflicts_count', COALESCE(cc.conflicts_count, 0),
        'blockers', (
          SELECT COALESCE(jsonb_agg(b), '[]'::jsonb)
          FROM (
            SELECT jsonb_build_object('type', 'unverified_cert', 'count', ra.unverified_certs) AS b
            WHERE COALESCE(ra.unverified_certs, 0) > 0
            UNION ALL
            SELECT jsonb_build_object('type', 'pending_medical', 'count', ra.pending_medical)
            WHERE COALESCE(ra.pending_medical, 0) > 0
          ) blockers_sub
        ),
        'session_notes', s.session_notes,
        'requirements_json', s.requirements_json
      ) AS row_data
    FROM sessions s
    LEFT JOIN booking_counts bc ON bc.session_id = s.session_id
    LEFT JOIN readiness_agg ra ON ra.session_id = s.session_id
    LEFT JOIN asset_agg aa ON aa.session_id = s.session_id
    LEFT JOIN staff_agg sta ON sta.session_id = s.session_id
    LEFT JOIN pickup_agg pa ON pa.session_id = s.session_id
    LEFT JOIN conflict_counts cc ON cc.session_id = s.session_id
  )
  SELECT COALESCE(jsonb_agg(a.row_data), '[]'::jsonb) INTO v_rows FROM assembled a;

  -- Build summary
  SELECT jsonb_build_object(
    'sessions', COALESCE(jsonb_array_length(v_rows), 0),
    'total_guests', COALESCE((SELECT SUM((r->>'total_pax')::int) FROM jsonb_array_elements(v_rows) r), 0),
    'pickups_required', COALESCE((SELECT COUNT(*) FROM jsonb_array_elements(v_rows) r WHERE r->'pickup' IS NOT NULL AND r->>'pickup' <> 'null'), 0),
    'missing_readiness', COALESCE((SELECT SUM((r->'readiness'->>'missing')::int) FROM jsonb_array_elements(v_rows) r), 0),
    'pending_medical', COALESCE((SELECT SUM((r->'readiness'->>'pending_medical')::int) FROM jsonb_array_elements(v_rows) r), 0),
    'unverified_certs', COALESCE((SELECT SUM((r->'readiness'->>'unverified_certs')::int) FROM jsonb_array_elements(v_rows) r), 0),
    'conflicts', COALESCE((SELECT SUM((r->>'conflicts_count')::int) FROM jsonb_array_elements(v_rows) r WHERE (r->>'conflicts_count')::int > 0), 0)
  ) INTO v_summary;

  v_result := jsonb_build_object(
    'date', p_date,
    'department', COALESCE(v_cat, 'all'),
    'summary', v_summary,
    'rows', v_rows
  );

  RETURN v_result;
END;
$$;
