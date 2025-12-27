-- =====================================================
-- Migration: 185_fix_admin_orders_functions.sql
-- Description: Fix admin orders RPC functions
-- Applied via MCP on: 2025-12-27
-- =====================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS get_admin_dashboard_stats() CASCADE;
DROP FUNCTION IF EXISTS get_realtime_order_stats() CASCADE;
DROP FUNCTION IF EXISTS get_realtime_service_breakdown() CASCADE;
DROP FUNCTION IF EXISTS get_live_provider_stats() CASCADE;
DROP FUNCTION IF EXISTS get_revenue_trends() CASCADE;
DROP FUNCTION IF EXISTS get_all_orders_for_admin(TEXT, TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_all_orders_for_admin(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_all_providers_for_admin(TEXT, TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_providers_for_admin(TEXT, TEXT) CASCADE;

-- Create get_admin_dashboard_stats
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_users BIGINT := 0;
  v_total_providers BIGINT := 0;
  v_active_providers BIGINT := 0;
  v_pending_providers BIGINT := 0;
  v_total_orders BIGINT := 0;
  v_today_orders BIGINT := 0;
  v_today_revenue NUMERIC := 0;
BEGIN
  SELECT COALESCE(COUNT(*), 0) INTO v_total_users FROM users;
  SELECT COALESCE(COUNT(*), 0) INTO v_total_providers FROM service_providers;
  SELECT COALESCE(COUNT(*), 0) INTO v_active_providers FROM service_providers WHERE COALESCE(is_available, false) = true;
  SELECT COALESCE(COUNT(*), 0) INTO v_pending_providers FROM service_providers WHERE status = 'pending';
  SELECT COALESCE(COUNT(*), 0) INTO v_total_orders FROM ride_requests;
  SELECT COALESCE(COUNT(*), 0) INTO v_today_orders FROM ride_requests WHERE created_at >= CURRENT_DATE;
  SELECT COALESCE(SUM(COALESCE(final_fare, estimated_fare, 0)), 0) INTO v_today_revenue FROM ride_requests WHERE created_at >= CURRENT_DATE AND status = 'completed';
  
  RETURN json_build_object(
    'totalCustomers', v_total_users,
    'totalProviders', v_total_providers,
    'activeProviders', v_active_providers,
    'pendingProviders', v_pending_providers,
    'totalOrders', v_total_orders,
    'todayOrders', v_today_orders,
    'todayRevenue', v_today_revenue,
    'totalRevenue', v_today_revenue
  );
END;
$$;

-- Create get_all_orders_for_admin
CREATE OR REPLACE FUNCTION get_all_orders_for_admin(
  p_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID, type TEXT, tracking_id TEXT, status TEXT, user_id UUID, user_name TEXT, user_phone TEXT,
  provider_id UUID, provider_name TEXT, pickup_address TEXT, destination_address TEXT, amount NUMERIC, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id, 'ride'::TEXT, COALESCE(r.tracking_id, 'RID-' || LEFT(r.id::TEXT, 8))::TEXT, r.status::TEXT, r.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown')::TEXT,
    COALESCE(u.phone_number, '')::TEXT, r.provider_id,
    COALESCE(pu.first_name || ' ' || pu.last_name, '')::TEXT,
    COALESCE(r.pickup_address, '')::TEXT, COALESCE(r.destination_address, '')::TEXT,
    COALESCE(r.final_fare, r.estimated_fare, 0)::NUMERIC, r.created_at
  FROM ride_requests r
  LEFT JOIN users u ON r.user_id = u.id
  LEFT JOIN service_providers sp ON r.provider_id = sp.id
  LEFT JOIN users pu ON sp.user_id = pu.id
  WHERE (p_type IS NULL OR p_type = '' OR p_type = 'ride' OR p_type = 'all')
    AND (p_status IS NULL OR p_status = '' OR r.status = p_status)
  ORDER BY r.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Create count_all_orders_for_admin
CREATE OR REPLACE FUNCTION count_all_orders_for_admin(
  p_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) FROM ride_requests 
    WHERE (p_type IS NULL OR p_type = '' OR p_type = 'ride' OR p_type = 'all')
      AND (p_status IS NULL OR p_status = '' OR status = p_status)
  );
END;
$$;

-- Create get_realtime_order_stats
CREATE OR REPLACE FUNCTION get_realtime_order_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_orders BIGINT := 0;
  v_today_completed BIGINT := 0;
  v_today_cancelled BIGINT := 0;
  v_today_revenue NUMERIC := 0;
  v_active_rides BIGINT := 0;
  v_online_providers BIGINT := 0;
BEGIN
  SELECT 
    COALESCE(COUNT(*), 0),
    COALESCE(COUNT(*) FILTER (WHERE status = 'completed'), 0),
    COALESCE(COUNT(*) FILTER (WHERE status = 'cancelled'), 0),
    COALESCE(SUM(COALESCE(final_fare, estimated_fare, 0)) FILTER (WHERE status = 'completed'), 0)
  INTO v_today_orders, v_today_completed, v_today_cancelled, v_today_revenue
  FROM ride_requests WHERE created_at >= CURRENT_DATE;
  
  SELECT COALESCE(COUNT(*), 0) INTO v_active_rides FROM ride_requests 
    WHERE status IN ('pending', 'matched', 'arriving', 'in_progress');
  
  SELECT COALESCE(COUNT(*), 0) INTO v_online_providers FROM service_providers 
    WHERE COALESCE(is_available, false) = true;
  
  RETURN json_build_object(
    'today_orders', v_today_orders,
    'today_completed', v_today_completed,
    'today_cancelled', v_today_cancelled,
    'today_revenue', v_today_revenue,
    'active_rides', v_active_rides,
    'online_providers', v_online_providers,
    'hourly_orders', '[]'::json
  );
END;
$$;

-- Create get_realtime_service_breakdown
CREATE OR REPLACE FUNCTION get_realtime_service_breakdown()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN json_build_object(
    'rides', json_build_object(
      'total', COALESCE((SELECT COUNT(*) FROM ride_requests WHERE created_at >= CURRENT_DATE), 0),
      'active', COALESCE((SELECT COUNT(*) FROM ride_requests WHERE status IN ('pending', 'matched', 'in_progress') AND created_at >= CURRENT_DATE), 0),
      'completed', COALESCE((SELECT COUNT(*) FROM ride_requests WHERE status = 'completed' AND created_at >= CURRENT_DATE), 0),
      'revenue', COALESCE((SELECT SUM(COALESCE(final_fare, estimated_fare, 0)) FROM ride_requests WHERE status = 'completed' AND created_at >= CURRENT_DATE), 0)
    ),
    'deliveries', json_build_object('total', 0, 'active', 0, 'completed', 0, 'revenue', 0),
    'shopping', json_build_object('total', 0, 'active', 0, 'completed', 0, 'revenue', 0),
    'queue', json_build_object('total', 0, 'active', 0, 'completed', 0, 'revenue', 0),
    'moving', json_build_object('total', 0, 'active', 0, 'completed', 0, 'revenue', 0),
    'laundry', json_build_object('total', 0, 'active', 0, 'completed', 0, 'revenue', 0)
  );
END;
$$;

-- Create get_live_provider_stats
CREATE OR REPLACE FUNCTION get_live_provider_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN json_build_object(
    'total_providers', COALESCE((SELECT COUNT(*) FROM service_providers), 0),
    'online_providers', COALESCE((SELECT COUNT(*) FROM service_providers WHERE COALESCE(is_available, false) = true), 0),
    'busy_providers', 0,
    'pending_verification', COALESCE((SELECT COUNT(*) FROM service_providers WHERE status = 'pending'), 0),
    'by_type', COALESCE((SELECT json_object_agg(provider_type, cnt) FROM (SELECT provider_type, COUNT(*) as cnt FROM service_providers WHERE provider_type IS NOT NULL GROUP BY provider_type) t), '{}'::json)
  );
END;
$$;

-- Create get_revenue_trends
CREATE OR REPLACE FUNCTION get_revenue_trends()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT json_agg(row_to_json(t)) FROM (
      SELECT date_trunc('day', created_at)::date as date, COUNT(*) as orders,
        COALESCE(SUM(COALESCE(final_fare, estimated_fare, 0)), 0) as revenue
      FROM ride_requests WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY date_trunc('day', created_at)::date ORDER BY date DESC
    ) t),
    '[]'::json
  );
END;
$$;

-- Create get_all_providers_for_admin
CREATE OR REPLACE FUNCTION get_all_providers_for_admin(
  p_status TEXT DEFAULT NULL,
  p_provider_type TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID, user_id UUID, provider_uid TEXT, provider_type TEXT, status TEXT,
  is_available BOOLEAN, is_verified BOOLEAN, rating NUMERIC, total_rides INT, total_earnings NUMERIC,
  user_first_name TEXT, user_last_name TEXT, user_email TEXT, user_phone TEXT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id, sp.user_id, sp.provider_uid, sp.provider_type, sp.status,
    COALESCE(sp.is_available, false), sp.is_verified,
    COALESCE(sp.rating, 0)::NUMERIC, COALESCE(sp.total_trips, 0)::INT, 0::NUMERIC,
    u.first_name, u.last_name, u.email, u.phone_number, sp.created_at
  FROM service_providers sp
  LEFT JOIN users u ON sp.user_id = u.id
  WHERE (p_status IS NULL OR p_status = '' OR sp.status = p_status)
    AND (p_provider_type IS NULL OR p_provider_type = '' OR sp.provider_type = p_provider_type)
  ORDER BY sp.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Create count_providers_for_admin
CREATE OR REPLACE FUNCTION count_providers_for_admin(
  p_status TEXT DEFAULT NULL,
  p_provider_type TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) FROM service_providers
    WHERE (p_status IS NULL OR p_status = '' OR status = p_status)
      AND (p_provider_type IS NULL OR p_provider_type = '' OR provider_type = p_provider_type)
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin(TEXT, TEXT, INT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_all_orders_for_admin(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_realtime_order_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_realtime_service_breakdown() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_live_provider_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_revenue_trends() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_providers_for_admin(TEXT, TEXT, INT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_providers_for_admin(TEXT, TEXT) TO anon, authenticated, service_role;
