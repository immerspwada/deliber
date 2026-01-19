-- Migration: Reorder Analytics Functions for Admin
-- Feature: F254 - Admin Reorder Analytics
-- Description: RPC functions สำหรับ Admin ดูสถิติการสั่งซ้ำ

-- =====================================================
-- 1. Get Overall Reorder Stats
-- =====================================================

CREATE OR REPLACE FUNCTION get_reorder_stats(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  total_reorders BIGINT,
  total_users BIGINT,
  avg_time_to_reorder TEXT,
  most_reordered_service TEXT,
  reorder_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prev_period_count BIGINT;
BEGIN
  -- Get stats for current period
  SELECT 
    COUNT(*) as total_reorders,
    COUNT(DISTINCT user_id) as total_users,
    TO_CHAR(AVG(time_since_original), 'DD"d" HH24"h"') as avg_time_to_reorder,
    MODE() WITHIN GROUP (ORDER BY service_type) as most_reordered_service
  INTO 
    total_reorders,
    total_users,
    avg_time_to_reorder,
    most_reordered_service
  FROM reorder_analytics
  WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL;
  
  -- Get previous period count for rate calculation
  SELECT COUNT(*)
  INTO v_prev_period_count
  FROM reorder_analytics
  WHERE created_at >= NOW() - (p_days * 2 || ' days')::INTERVAL
  AND created_at < NOW() - (p_days || ' days')::INTERVAL;
  
  -- Calculate reorder rate
  IF v_prev_period_count > 0 THEN
    reorder_rate := ROUND(((total_reorders::NUMERIC - v_prev_period_count) / v_prev_period_count * 100), 1);
  ELSE
    reorder_rate := 0;
  END IF;
  
  RETURN NEXT;
END;
$$;

-- =====================================================
-- 2. Get Reorders by Service Type
-- =====================================================

CREATE OR REPLACE FUNCTION get_reorders_by_service(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  service_type TEXT,
  reorder_count BIGINT,
  unique_users BIGINT,
  avg_time_since_original TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ra.service_type,
    COUNT(*) as reorder_count,
    COUNT(DISTINCT ra.user_id) as unique_users,
    TO_CHAR(AVG(ra.time_since_original), 'DD"d" HH24"h"') as avg_time_since_original
  FROM reorder_analytics ra
  WHERE ra.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY ra.service_type
  ORDER BY reorder_count DESC;
END;
$$;

-- =====================================================
-- 3. Get Reorders by Method
-- =====================================================

CREATE OR REPLACE FUNCTION get_reorders_by_method(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  reorder_method TEXT,
  count BIGINT,
  percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total BIGINT;
BEGIN
  -- Get total count
  SELECT COUNT(*) INTO v_total
  FROM reorder_analytics
  WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL;
  
  RETURN QUERY
  SELECT 
    ra.reorder_method,
    COUNT(*) as count,
    ROUND((COUNT(*)::NUMERIC / NULLIF(v_total, 0) * 100), 1) as percentage
  FROM reorder_analytics ra
  WHERE ra.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY ra.reorder_method
  ORDER BY count DESC;
END;
$$;

-- =====================================================
-- 4. Get Top Reordered Routes
-- =====================================================

CREATE OR REPLACE FUNCTION get_top_reordered_routes(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  from_location TEXT,
  to_location TEXT,
  reorder_count BIGINT,
  service_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- Rides
  SELECT 
    r.pickup_address as from_location,
    r.destination_address as to_location,
    COUNT(*) as reorder_count,
    'ride'::TEXT as service_type
  FROM reorder_analytics ra
  JOIN ride_requests r ON r.id = ra.reorder_request_id
  WHERE ra.service_type = 'ride'
  AND ra.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY r.pickup_address, r.destination_address
  
  UNION ALL
  
  -- Deliveries
  SELECT 
    d.sender_address,
    d.recipient_address,
    COUNT(*),
    'delivery'::TEXT
  FROM reorder_analytics ra
  JOIN delivery_requests d ON d.id = ra.reorder_request_id
  WHERE ra.service_type = 'delivery'
  AND ra.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY d.sender_address, d.recipient_address
  
  ORDER BY reorder_count DESC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- 5. Get Reorder Trends
-- =====================================================

CREATE OR REPLACE FUNCTION get_reorder_trends(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  reorder_count BIGINT,
  service_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(ra.created_at) as date,
    COUNT(*) as reorder_count,
    ra.service_type
  FROM reorder_analytics ra
  WHERE ra.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(ra.created_at), ra.service_type
  ORDER BY date DESC, service_type;
END;
$$;

-- =====================================================
-- 6. Grant Permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION get_reorder_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_reorders_by_service TO authenticated;
GRANT EXECUTE ON FUNCTION get_reorders_by_method TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_reordered_routes TO authenticated;
GRANT EXECUTE ON FUNCTION get_reorder_trends TO authenticated;

-- =====================================================
-- 7. Comments
-- =====================================================

COMMENT ON FUNCTION get_reorder_stats IS 'F254: Get overall reorder statistics for admin dashboard';
COMMENT ON FUNCTION get_reorders_by_service IS 'F254: Get reorder breakdown by service type';
COMMENT ON FUNCTION get_reorders_by_method IS 'F254: Get reorder breakdown by method (quick_button, history, suggestion)';
COMMENT ON FUNCTION get_top_reordered_routes IS 'F254: Get most frequently reordered routes';
COMMENT ON FUNCTION get_reorder_trends IS 'F254: Get daily reorder trends for charts';
