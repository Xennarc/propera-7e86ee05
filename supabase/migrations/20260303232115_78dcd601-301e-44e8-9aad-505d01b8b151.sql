
-- RPC: get_session_conflicts
-- Returns JSON with conflicting_boats, conflicting_equipment, conflicting_staff
CREATE OR REPLACE FUNCTION public.get_session_conflicts(
  p_resort_id uuid,
  p_session_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_date date;
  v_start text;
  v_end text;
  v_result jsonb;
BEGIN
  -- Get this session's time window
  SELECT date, start_time, end_time
  INTO v_date, v_start, v_end
  FROM activity_sessions
  WHERE id = p_session_id AND resort_id = p_resort_id;

  IF v_date IS NULL THEN
    RETURN '{"conflicting_boats":[],"conflicting_equipment":[],"conflicting_staff":[]}'::jsonb;
  END IF;

  SELECT jsonb_build_object(
    'conflicting_boats', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'asset_id', my_a.asset_id,
        'name', my_a.asset_label,
        'other_session_id', other_s.id,
        'other_activity_name', act.name,
        'other_start', other_s.start_time,
        'other_end', other_s.end_time
      ))
      FROM session_asset_assignments my_a
      JOIN session_asset_assignments other_a
        ON other_a.asset_id = my_a.asset_id
        AND other_a.session_id != p_session_id
      JOIN activity_sessions other_s
        ON other_s.id = other_a.session_id
        AND other_s.resort_id = p_resort_id
        AND other_s.date = v_date
        AND other_s.start_time < v_end
        AND other_s.end_time > v_start
        AND other_s.status NOT IN ('CANCELLED', 'COMPLETED')
      JOIN activities act ON act.id = other_s.activity_id
      WHERE my_a.session_id = p_session_id
        AND my_a.asset_type = 'boat'
        AND my_a.asset_id IS NOT NULL
    ), '[]'::jsonb),

    'conflicting_equipment', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'asset_id', my_a.asset_id,
        'name', my_a.asset_label,
        'other_session_id', other_s.id,
        'other_activity_name', act.name,
        'other_start', other_s.start_time,
        'other_end', other_s.end_time,
        'other_qty', other_a.quantity
      ))
      FROM session_asset_assignments my_a
      JOIN session_asset_assignments other_a
        ON other_a.asset_id = my_a.asset_id
        AND other_a.session_id != p_session_id
      JOIN activity_sessions other_s
        ON other_s.id = other_a.session_id
        AND other_s.resort_id = p_resort_id
        AND other_s.date = v_date
        AND other_s.start_time < v_end
        AND other_s.end_time > v_start
        AND other_s.status NOT IN ('CANCELLED', 'COMPLETED')
      JOIN activities act ON act.id = other_s.activity_id
      WHERE my_a.session_id = p_session_id
        AND my_a.asset_type = 'equipment'
        AND my_a.asset_id IS NOT NULL
    ), '[]'::jsonb),

    'conflicting_staff', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'staff_user_id', my_s.staff_user_id,
        'name', COALESCE(p.full_name, 'Unknown'),
        'role', my_s.role,
        'other_session_id', other_sess.id,
        'other_activity_name', act.name,
        'other_start', other_sess.start_time,
        'other_end', other_sess.end_time
      ))
      FROM session_staff_assignments my_s
      JOIN session_staff_assignments other_s
        ON other_s.staff_user_id = my_s.staff_user_id
        AND other_s.session_id != p_session_id
      JOIN activity_sessions other_sess
        ON other_sess.id = other_s.session_id
        AND other_sess.resort_id = p_resort_id
        AND other_sess.date = v_date
        AND other_sess.start_time < v_end
        AND other_sess.end_time > v_start
        AND other_sess.status NOT IN ('CANCELLED', 'COMPLETED')
      JOIN activities act ON act.id = other_sess.activity_id
      LEFT JOIN profiles p ON p.id = my_s.staff_user_id
      WHERE my_s.session_id = p_session_id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
