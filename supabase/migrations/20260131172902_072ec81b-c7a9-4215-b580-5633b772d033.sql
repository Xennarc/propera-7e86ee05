-- Create server-side RPC for filtered user listing with pagination
-- This function is SECURITY DEFINER and only accessible by SUPER_ADMIN

CREATE OR REPLACE FUNCTION public.superadmin_list_users_filtered(
  _q text DEFAULT '',
  _status text DEFAULT 'all',
  _resort_id uuid DEFAULT NULL,
  _resort_role text DEFAULT 'all',
  _global_role text DEFAULT 'all',
  _access text DEFAULT 'any',
  _multi_resort_only boolean DEFAULT false,
  _joined_from date DEFAULT NULL,
  _joined_to date DEFAULT NULL,
  _sort_by text DEFAULT 'name',
  _sort_dir text DEFAULT 'asc',
  _limit int DEFAULT 25,
  _offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  full_name text,
  username text,
  global_role text,
  created_at timestamptz,
  is_disabled boolean,
  deleted_at timestamptz,
  memberships jsonb,
  memberships_count int,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_total bigint;
BEGIN
  -- Verify caller is SUPER_ADMIN
  SELECT p.global_role INTO v_caller_role
  FROM profiles p
  WHERE p.id = auth.uid();
  
  IF v_caller_role IS NULL OR v_caller_role != 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'Access denied: SUPER_ADMIN role required';
  END IF;

  -- First, get total count for pagination
  WITH filtered_users AS (
    SELECT 
      p.id,
      p.full_name,
      p.username,
      p.global_role,
      p.created_at,
      p.is_disabled,
      p.deleted_at,
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', rm.id,
            'resort_id', rm.resort_id,
            'resort_name', r.name,
            'resort_role', rm.resort_role
          )
        )
        FROM resort_memberships rm
        JOIN resorts r ON r.id = rm.resort_id
        WHERE rm.user_id = p.id
      ) AS memberships,
      (
        SELECT COUNT(*)::int 
        FROM resort_memberships rm 
        WHERE rm.user_id = p.id
      ) AS memberships_count
    FROM profiles p
    WHERE 
      -- Text search
      (
        _q = '' OR 
        lower(p.full_name) LIKE '%' || lower(_q) || '%' OR
        lower(p.username) LIKE '%' || lower(_q) || '%' OR
        p.id::text LIKE '%' || lower(_q) || '%'
      )
      -- Status filter
      AND (
        _status = 'all' OR
        (_status = 'active' AND (p.is_disabled IS NULL OR p.is_disabled = false) AND p.deleted_at IS NULL) OR
        (_status = 'disabled' AND p.is_disabled = true AND p.deleted_at IS NULL) OR
        (_status = 'deleted' AND p.deleted_at IS NOT NULL)
      )
      -- Global role filter
      AND (
        _global_role = 'all' OR
        p.global_role = _global_role
      )
      -- Resort filter
      AND (
        _resort_id IS NULL OR
        EXISTS (
          SELECT 1 FROM resort_memberships rm 
          WHERE rm.user_id = p.id AND rm.resort_id = _resort_id
        )
      )
      -- Resort role filter
      AND (
        _resort_role = 'all' OR
        EXISTS (
          SELECT 1 FROM resort_memberships rm 
          WHERE rm.user_id = p.id AND rm.resort_role = _resort_role
        )
      )
      -- Access type filter
      AND (
        _access = 'any' OR
        (_access = 'has_access' AND (
          EXISTS (SELECT 1 FROM resort_memberships rm WHERE rm.user_id = p.id) OR
          p.global_role = 'SUPER_ADMIN'
        )) OR
        (_access = 'no_access' AND 
          NOT EXISTS (SELECT 1 FROM resort_memberships rm WHERE rm.user_id = p.id) AND
          p.global_role != 'SUPER_ADMIN'
        )
      )
      -- Multi-resort filter
      AND (
        _multi_resort_only = false OR
        (SELECT COUNT(*) FROM resort_memberships rm WHERE rm.user_id = p.id) >= 2
      )
      -- Date range filters
      AND (
        _joined_from IS NULL OR p.created_at >= _joined_from
      )
      AND (
        _joined_to IS NULL OR p.created_at <= (_joined_to + interval '1 day')
      )
  )
  SELECT COUNT(*) INTO v_total FROM filtered_users;

  -- Return paginated results with sorting
  RETURN QUERY
  WITH filtered_users AS (
    SELECT 
      p.id,
      p.full_name,
      p.username,
      p.global_role,
      p.created_at,
      p.is_disabled,
      p.deleted_at,
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', rm.id,
            'resort_id', rm.resort_id,
            'resort_name', r.name,
            'resort_role', rm.resort_role
          )
        )
        FROM resort_memberships rm
        JOIN resorts r ON r.id = rm.resort_id
        WHERE rm.user_id = p.id
      ) AS memberships,
      (
        SELECT COUNT(*)::int 
        FROM resort_memberships rm 
        WHERE rm.user_id = p.id
      ) AS memberships_count
    FROM profiles p
    WHERE 
      -- Text search
      (
        _q = '' OR 
        lower(p.full_name) LIKE '%' || lower(_q) || '%' OR
        lower(p.username) LIKE '%' || lower(_q) || '%' OR
        p.id::text LIKE '%' || lower(_q) || '%'
      )
      -- Status filter
      AND (
        _status = 'all' OR
        (_status = 'active' AND (p.is_disabled IS NULL OR p.is_disabled = false) AND p.deleted_at IS NULL) OR
        (_status = 'disabled' AND p.is_disabled = true AND p.deleted_at IS NULL) OR
        (_status = 'deleted' AND p.deleted_at IS NOT NULL)
      )
      -- Global role filter
      AND (
        _global_role = 'all' OR
        p.global_role = _global_role
      )
      -- Resort filter
      AND (
        _resort_id IS NULL OR
        EXISTS (
          SELECT 1 FROM resort_memberships rm 
          WHERE rm.user_id = p.id AND rm.resort_id = _resort_id
        )
      )
      -- Resort role filter
      AND (
        _resort_role = 'all' OR
        EXISTS (
          SELECT 1 FROM resort_memberships rm 
          WHERE rm.user_id = p.id AND rm.resort_role = _resort_role
        )
      )
      -- Access type filter
      AND (
        _access = 'any' OR
        (_access = 'has_access' AND (
          EXISTS (SELECT 1 FROM resort_memberships rm WHERE rm.user_id = p.id) OR
          p.global_role = 'SUPER_ADMIN'
        )) OR
        (_access = 'no_access' AND 
          NOT EXISTS (SELECT 1 FROM resort_memberships rm WHERE rm.user_id = p.id) AND
          p.global_role != 'SUPER_ADMIN'
        )
      )
      -- Multi-resort filter
      AND (
        _multi_resort_only = false OR
        (SELECT COUNT(*) FROM resort_memberships rm WHERE rm.user_id = p.id) >= 2
      )
      -- Date range filters
      AND (
        _joined_from IS NULL OR p.created_at >= _joined_from
      )
      AND (
        _joined_to IS NULL OR p.created_at <= (_joined_to + interval '1 day')
      )
  )
  SELECT 
    fu.id,
    fu.full_name,
    fu.username,
    fu.global_role,
    fu.created_at,
    fu.is_disabled,
    fu.deleted_at,
    COALESCE(fu.memberships, '[]'::jsonb) as memberships,
    fu.memberships_count,
    v_total as total_count
  FROM filtered_users fu
  ORDER BY
    CASE 
      WHEN _sort_by = 'name' AND _sort_dir = 'asc' THEN COALESCE(lower(fu.full_name), lower(fu.username), fu.id::text)
    END ASC NULLS LAST,
    CASE 
      WHEN _sort_by = 'name' AND _sort_dir = 'desc' THEN COALESCE(lower(fu.full_name), lower(fu.username), fu.id::text)
    END DESC NULLS LAST,
    CASE 
      WHEN _sort_by = 'joined' AND _sort_dir = 'asc' THEN fu.created_at
    END ASC NULLS LAST,
    CASE 
      WHEN _sort_by = 'joined' AND _sort_dir = 'desc' THEN fu.created_at
    END DESC NULLS LAST,
    CASE 
      WHEN _sort_by = 'resorts_count' AND _sort_dir = 'asc' THEN fu.memberships_count
    END ASC NULLS LAST,
    CASE 
      WHEN _sort_by = 'resorts_count' AND _sort_dir = 'desc' THEN fu.memberships_count
    END DESC NULLS LAST
  LIMIT _limit
  OFFSET _offset;
END;
$$;

-- Grant execute to authenticated users (function checks SUPER_ADMIN internally)
GRANT EXECUTE ON FUNCTION public.superadmin_list_users_filtered TO authenticated;