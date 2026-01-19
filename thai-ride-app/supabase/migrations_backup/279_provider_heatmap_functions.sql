-- Migration: Provider Heatmap Functions
-- Description: RPC functions for admin to view provider location heatmap
-- Created: 2026-01-15

-- ============================================================================
-- Function: get_provider_heatmap_data
-- Description: Get aggregated provider location data for heatmap visualization
-- Security: Admin only
-- Parameters:
--   - p_provider_type: Filter by provider type (optional)
--   - p_is_online: Filter by online status (optional)
--   - p_start_time: Start of time range for historical data (optional)
--   - p_end_time: End of time range for historical data (optional)
-- Returns: Aggregated location points with intensity
-- ============================================================================

CREATE OR REPLACE FUNCTION get_provider_heatmap_data(
  p_provider_type text DEFAULT NULL,
  p_is_online boolean DEFAULT NULL,
  p_start_time timestamptz DEFAULT NULL,
  p_end_time timestamptz DEFAULT NULL
)
RETURNS TABLE (
  lat double precision,
  lng double precision,
  provider_count bigint,
  intensity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- If time range specified, use location history
  IF p_start_time IS NOT NULL AND p_end_time IS NOT NULL THEN
    RETURN QUERY
    SELECT
      ROUND(h.latitude::numeric, 3)::double precision as lat,
      ROUND(h.longitude::numeric, 3)::double precision as lng,
      COUNT(DISTINCT h.provider_id) as provider_count,
      LEAST(COUNT(DISTINCT h.provider_id)::double precision / 10.0, 1.0) as intensity
    FROM public.provider_location_history h
    INNER JOIN public.providers_v2 p ON p.id = h.provider_id
    WHERE h.recorded_at BETWEEN p_start_time AND p_end_time
      AND (p_provider_type IS NULL OR p.provider_type = p_provider_type)
      AND p.status = 'approved'
    GROUP BY ROUND(h.latitude::numeric, 3), ROUND(h.longitude::numeric, 3)
    HAVING COUNT(DISTINCT h.provider_id) > 0;
  ELSE
    -- Use current locations
    RETURN QUERY
    SELECT
      ROUND(p.current_lat::numeric, 3)::double precision as lat,
      ROUND(p.current_lng::numeric, 3)::double precision as lng,
      COUNT(*)::bigint as provider_count,
      LEAST(COUNT(*)::double precision / 10.0, 1.0) as intensity
    FROM public.providers_v2 p
    WHERE p.current_lat IS NOT NULL
      AND p.current_lng IS NOT NULL
      AND p.status = 'approved'
      AND (p_provider_type IS NULL OR p.provider_type = p_provider_type)
      AND (p_is_online IS NULL OR p.is_online = p_is_online)
    GROUP BY ROUND(p.current_lat::numeric, 3), ROUND(p.current_lng::numeric, 3)
    HAVING COUNT(*) > 0;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_provider_heatmap_data IS 'Get aggregated provider location data for heatmap visualization (Admin only)';

-- ============================================================================
-- Function: get_provider_density_areas
-- Description: Get high and low density areas for provider coverage analysis
-- Security: Admin only
-- Parameters:
--   - p_limit: Number of areas to return for each category (default: 5)
-- Returns: Top high-density and low-density areas
-- ============================================================================

CREATE OR REPLACE FUNCTION get_provider_density_areas(
  p_limit integer DEFAULT 5
)
RETURNS TABLE (
  area_name text,
  center_lat double precision,
  center_lng double precision,
  provider_count bigint,
  coverage_level text,
  is_high_density boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  WITH area_stats AS (
    SELECT
      ROUND(p.current_lat::numeric, 2)::double precision as lat,
      ROUND(p.current_lng::numeric, 2)::double precision as lng,
      COUNT(*) as cnt
    FROM public.providers_v2 p
    WHERE p.current_lat IS NOT NULL
      AND p.current_lng IS NOT NULL
      AND p.status = 'approved'
      AND p.is_online = true
    GROUP BY ROUND(p.current_lat::numeric, 2), ROUND(p.current_lng::numeric, 2)
  ),
  ranked AS (
    SELECT
      lat,
      lng,
      cnt,
      CASE
        WHEN cnt >= 5 THEN 'high'
        WHEN cnt >= 2 THEN 'medium'
        ELSE 'low'
      END as level,
      ROW_NUMBER() OVER (ORDER BY cnt DESC) as high_rank,
      ROW_NUMBER() OVER (ORDER BY cnt ASC) as low_rank
    FROM area_stats
  )
  SELECT
    CONCAT('Area ', lat::text, ',', lng::text) as area_name,
    lat as center_lat,
    lng as center_lng,
    cnt as provider_count,
    level as coverage_level,
    high_rank <= p_limit as is_high_density
  FROM ranked
  WHERE high_rank <= p_limit OR low_rank <= p_limit
  ORDER BY cnt DESC;
END;
$$;

COMMENT ON FUNCTION get_provider_density_areas IS 'Get high and low density areas for provider coverage analysis (Admin only)';

-- ============================================================================
-- Function: get_provider_location_timelapse
-- Description: Get location snapshots for time-lapse visualization
-- Security: Admin only
-- Parameters:
--   - p_duration: Duration to look back ('1h', '6h', '24h')
--   - p_interval_minutes: Interval between snapshots (default: 15)
--   - p_provider_type: Filter by provider type (optional)
-- Returns: Location snapshots with timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION get_provider_location_timelapse(
  p_duration text DEFAULT '24h',
  p_interval_minutes integer DEFAULT 15,
  p_provider_type text DEFAULT NULL
)
RETURNS TABLE (
  snapshot_time timestamptz,
  lat double precision,
  lng double precision,
  provider_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_start_time timestamptz;
  v_interval interval;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Parse duration
  v_start_time := CASE p_duration
    WHEN '1h' THEN NOW() - INTERVAL '1 hour'
    WHEN '6h' THEN NOW() - INTERVAL '6 hours'
    WHEN '24h' THEN NOW() - INTERVAL '24 hours'
    ELSE NOW() - INTERVAL '24 hours'
  END;

  v_interval := (p_interval_minutes || ' minutes')::interval;

  RETURN QUERY
  WITH time_buckets AS (
    SELECT generate_series(
      v_start_time,
      NOW(),
      v_interval
    ) as bucket_time
  ),
  location_snapshots AS (
    SELECT
      time_bucket('15 minutes', h.recorded_at) as snapshot_time,
      ROUND(h.latitude::numeric, 3)::double precision as lat,
      ROUND(h.longitude::numeric, 3)::double precision as lng,
      COUNT(DISTINCT h.provider_id) as provider_count
    FROM public.provider_location_history h
    INNER JOIN public.providers_v2 p ON p.id = h.provider_id
    WHERE h.recorded_at >= v_start_time
      AND h.recorded_at <= NOW()
      AND (p_provider_type IS NULL OR p.provider_type = p_provider_type)
      AND p.status = 'approved'
    GROUP BY 
      time_bucket('15 minutes', h.recorded_at),
      ROUND(h.latitude::numeric, 3),
      ROUND(h.longitude::numeric, 3)
  )
  SELECT
    ls.snapshot_time,
    ls.lat,
    ls.lng,
    ls.provider_count
  FROM location_snapshots ls
  ORDER BY ls.snapshot_time ASC, ls.provider_count DESC;
END;
$$;

COMMENT ON FUNCTION get_provider_location_timelapse IS 'Get location snapshots for time-lapse visualization (Admin only)';

-- ============================================================================
-- Function: get_provider_heatmap_stats
-- Description: Get summary statistics for provider heatmap
-- Security: Admin only
-- Returns: Total, online, and available provider counts
-- ============================================================================

CREATE OR REPLACE FUNCTION get_provider_heatmap_stats()
RETURNS TABLE (
  total_providers bigint,
  online_providers bigint,
  available_providers bigint,
  avg_providers_per_area double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  WITH area_counts AS (
    SELECT
      ROUND(current_lat::numeric, 2) as lat,
      ROUND(current_lng::numeric, 2) as lng,
      COUNT(*) as cnt
    FROM public.providers_v2
    WHERE current_lat IS NOT NULL
      AND current_lng IS NOT NULL
      AND status = 'approved'
      AND is_online = true
    GROUP BY ROUND(current_lat::numeric, 2), ROUND(current_lng::numeric, 2)
  )
  SELECT
    (SELECT COUNT(*) FROM public.providers_v2 WHERE status = 'approved')::bigint as total_providers,
    (SELECT COUNT(*) FROM public.providers_v2 WHERE status = 'approved' AND is_online = true)::bigint as online_providers,
    (SELECT COUNT(*) FROM public.providers_v2 WHERE status = 'approved' AND is_online = true AND is_available = true)::bigint as available_providers,
    COALESCE(AVG(cnt), 0)::double precision as avg_providers_per_area
  FROM area_counts;
END;
$$;

COMMENT ON FUNCTION get_provider_heatmap_stats IS 'Get summary statistics for provider heatmap (Admin only)';
