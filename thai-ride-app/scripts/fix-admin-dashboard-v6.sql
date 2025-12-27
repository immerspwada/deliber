-- =====================================================
-- FIX ADMIN DASHBOARD V6 - Complete Fix
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Drop all existing admin functions
DROP FUNCTION IF EXISTS get_admin_dashboard_stats() CASCADE;
DROP FUNCTION IF EXISTS get_realtime_order_stats() CASCADE;
DROP FUNCTION IF EXISTS get_realtime_service_breakdown() CASCADE;
DROP FUNCTION IF EXISTS get_live_provider_stats() CASCADE;
DROP FUNCTION IF EXISTS get_revenue_trends() CASCADE;
DROP FUNCTION IF EXISTS get_all_orders_for_admin(TEXT, TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_all_orders_for_admin(TEXT, TEXT) CASCADE;

-- =====================================================
-- 2. DASHBOARD STATS FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  result JSON;
  v_total_users BIGINT := 0;
  v_total_providers BIGINT := 0;
  v_active_providers BIGINT := 0;
  v_pending_providers BIGINT := 0;
  v_total_orders BIGINT := 0;
  v_today_orders BIGINT := 0;
  v_today_revenue NUMERIC := 0;
  v_total_revenue NUMERIC := 0;
BEGIN
  -- Count users
  SELECT COUNT(*) INTO v_total_users FROM users;
  
  -- Count providers
  SELECT COUNT(*) INTO v_total_providers FROM service_providers;
  SELECT COUNT(*) INTO v_active_providers FROM service_providers WHERE COALESCE(is_available, is_online, false) = true;
  SELECT COUNT(*) INTO v_pending_providers FROM service_providers WHERE status = 'pending';
  
  -- Count orders from all tables
  SELECT COALESCE(SUM(cnt), 0) INTO v_total_orders FROM (
    SELECT COUNT(*) as cnt FROM ride_requests
    UNION ALL SELECT COUNT(*) FROM delivery_requests
    UNION ALL SELECT COUNT(*) FROM shopping_requests
    UNION ALL SELECT COUNT(*) FROM queue_bookings
    UNION ALL SELECT COUNT(*) FROM moving_requests
    UNION ALL SELECT COUNT(*) FROM laundry_requests
  ) t;
  
  -- Today's orders
  SELECT COALESCE(SUM(cnt), 0) INTO v_today_orders FROM (
    SELECT COUNT(*) as cnt FROM ride_requests WHERE created_at >= CURRENT_DATE
    UNION ALL SELECT COUNT(*) FROM delivery_requests WHERE created_at >= CURRENT_DATE
    UNION ALL SELECT COUNT(*) FROM shopping_requests WHERE created_at >= CURRENT_DATE
  ) t;
  
  -- Revenue
  SELECT COALESCE(SUM(COALESCE(final_fare, estimated_fare, 0)), 0) INTO v_today_revenue 
  FROM ride_requests WHERE created_at >= CURRENT_DATE AND status = 'completed';
  
  SELECT COALESCE(SUM(COALESCE(final_fare, estimated_fare, 0)), 0) INTO v_total_revenue 
  FROM ride_requests WHERE status = 'completed';
  
  -- Build result
  result := json_build_object(
    'totalCustomers', v_total_users,
    'totalProviders', v_total_providers,
    'activeProviders', v_active_providers,
    'pendingProviders', v_pending_providers,
    'totalOrders', v_total_orders,
    'todayOrders', v_today_orders,
    'todayRevenue', v_today_revenue,
    'totalRevenue', v_total_revenue
  );
  
  RETURN result;
END;
$func$;

-- =====================================================
-- 3. REALTIME ORDER STATS
-- =====================================================
CREATE OR REPLACE FUNCTION get_realtime_order_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  result JSON;
  v_today_orders BIGINT := 0;
  v_today_completed BIGINT := 0;
  v_today_cancelled BIGINT := 0;
  v_today_revenue NUMERIC := 0;
  v_active_rides BIGINT := 0;
  v_online_providers BIGINT := 0;
BEGIN
  -- Today's stats from ride_requests
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COALESCE(SUM(COALESCE(final_fare, estimated_fare, 0)) FILTER (WHERE status = 'completed'), 0)
  INTO v_today_orders, v_today_completed, v_today_cancelled, v_today_revenue
  FROM ride_requests 
  WHERE created_at >= CURRENT_DATE;
  
  -- Active rides
  SELECT COUNT(*) INTO v_active_rides 
  FROM ride_requests 
  WHERE status IN ('pending', 'matched', 'arriving', 'in_progress');
  
  -- Online providers
  SELECT COUNT(*) INTO v_online_providers 
  FROM service_providers 
  WHERE COALESCE(is_available, is_online, false) = true;
  
  result := json_build_object(
    'today_orders', v_today_orders,
    'today_completed', v_today_completed,
    'today_cancelled', v_today_cancelled,
    'today_revenue', v_today_revenue,
    'active_rides', v_active_rides,
    'online_providers', v_online_providers,
    'hourly_orders', '[]'::json
  );
  
  RETURN result;
END;
$func$;

-- =====================================================
-- 4. SERVICE BREAKDOWN
-- =====================================================
CREATE OR REPLACE FUNCTION get_realtime_service_breakdown()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'rides', json_build_object(
      'total', (SELECT COUNT(*) FROM ride_requests WHERE created_at >= CURRENT_DATE),
      'active', (SELECT COUNT(*) FROM ride_requests WHERE status IN ('pending', 'matched', 'in_progress') AND created_at >= CURRENT_DATE),
      'completed', (SELECT COUNT(*) FROM ride_requests WHERE status = 'completed' AND created_at >= CURRENT_DATE),
      'revenue', COALESCE((SELECT SUM(COALESCE(final_fare, estimated_fare, 0)) FROM ride_requests WHERE status = 'completed' AND created_at >= CURRENT_DATE), 0)
    ),
    'deliveries', json_build_object(
      'total', (SELECT COUNT(*) FROM delivery_requests WHERE created_at >= CURRENT_DATE),
      'active', (SELECT COUNT(*) FROM delivery_requests WHERE status IN ('pending', 'matched', 'in_progress') AND created_at >= CURRENT_DATE),
      'completed', (SELECT COUNT(*) FROM delivery_requests WHERE status = 'completed' AND created_at >= CURRENT_DATE),
      'revenue', COALESCE((SELECT SUM(COALESCE(final_fare, delivery_fee, 0)) FROM delivery_requests WHERE status = 'completed' AND created_at >= CURRENT_DATE), 0)
    ),
    'shopping', json_build_object(
      'total', (SELECT COUNT(*) FROM shopping_requests WHERE created_at >= CURRENT_DATE),
      'active', (SELECT COUNT(*) FROM shopping_requests WHERE status IN ('pending', 'matched', 'in_progress') AND created_at >= CURRENT_DATE),
      'completed', (SELECT COUNT(*) FROM shopping_requests WHERE status = 'completed' AND created_at >= CURRENT_DATE),
      'revenue', COALESCE((SELECT SUM(COALESCE(final_total, service_fee, 0)) FROM shopping_requests WHERE status = 'completed' AND created_at >= CURRENT_DATE), 0)
    ),
    'queue', json_build_object(
      'total', (SELECT COUNT(*) FROM queue_bookings WHERE created_at >= CURRENT_DATE),
      'active', (SELECT COUNT(*) FROM queue_bookings WHERE status IN ('pending', 'confirmed') AND created_at >= CURRENT_DATE),
      'completed', (SELECT COUNT(*) FROM queue_bookings WHERE status = 'completed' AND created_at >= CURRENT_DATE),
      'revenue', 0
    ),
    'moving', json_build_object(
      'total', (SELECT COUNT(*) FROM moving_requests WHERE created_at >= CURRENT_DATE),
      'active', (SELECT COUNT(*) FROM moving_requests WHERE status IN ('pending', 'matched', 'in_progress') AND created_at >= CURRENT_DATE),
      'completed', (SELECT COUNT(*) FROM moving_requests WHERE status = 'completed' AND created_at >= CURRENT_DATE),
      'revenue', COALESCE((SELECT SUM(COALESCE(final_price, estimated_price, 0)) FROM moving_requests WHERE status = 'completed' AND created_at >= CURRENT_DATE), 0)
    ),
    'laundry', json_build_object(
      'total', (SELECT COUNT(*) FROM laundry_requests WHERE created_at >= CURRENT_DATE),
      'active', (SELECT COUNT(*) FROM laundry_requests WHERE status IN ('pending', 'matched', 'in_progress') AND created_at >= CURRENT_DATE),
      'completed', (SELECT COUNT(*) FROM laundry_requests WHERE status = 'delivered' AND created_at >= CURRENT_DATE),
      'revenue', COALESCE((SELECT SUM(COALESCE(final_price, estimated_price, 0)) FROM laundry_requests WHERE status = 'delivered' AND created_at >= CURRENT_DATE), 0)
    )
  ) INTO result;
  
  RETURN result;
END;
$func$;

-- =====================================================
-- 5. LIVE PROVIDER STATS
-- =====================================================
CREATE OR REPLACE FUNCTION get_live_provider_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_providers', (SELECT COUNT(*) FROM service_providers),
    'online_providers', (SELECT COUNT(*) FROM service_providers WHERE COALESCE(is_available, is_online, false) = true),
    'busy_providers', (SELECT COUNT(*) FROM service_providers WHERE COALESCE(is_available, is_online, false) = true AND id IN (
      SELECT provider_id FROM ride_requests WHERE status IN ('matched', 'arriving', 'in_progress') AND provider_id IS NOT NULL
    )),
    'pending_verification', (SELECT COUNT(*) FROM service_providers WHERE status = 'pending'),
    'by_type', (
      SELECT json_object_agg(provider_type, cnt)
      FROM (
        SELECT provider_type, COUNT(*) as cnt 
        FROM service_providers 
        GROUP BY provider_type
      ) t
    )
  ) INTO result;
  
  RETURN result;
END;
$func$;

-- =====================================================
-- 6. REVENUE TRENDS
-- =====================================================
CREATE OR REPLACE FUNCTION get_revenue_trends()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT 
        date_trunc('day', created_at)::date as date,
        COUNT(*) as orders,
        COALESCE(SUM(COALESCE(final_fare, estimated_fare, 0)), 0) as revenue
      FROM ride_requests
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY date_trunc('day', created_at)::date
      ORDER BY date DESC
    ) t
  );
END;
$func$;

-- =====================================================
-- 7. GET ALL ORDERS FOR ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION get_all_orders_for_admin(
  p_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  tracking_id TEXT,
  status TEXT,
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  provider_id UUID,
  provider_name TEXT,
  pickup_address TEXT,
  destination_address TEXT,
  amount NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    -- Rides
    SELECT 
      r.id,
      'ride'::TEXT as type,
      COALESCE(r.tracking_id, 'RID-' || LEFT(r.id::TEXT, 8))::TEXT,
      r.status::TEXT,
      r.user_id,
      COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown')::TEXT,
      COALESCE(u.phone_number, '')::TEXT,
      r.provider_id,
      COALESCE(pu.first_name || ' ' || pu.last_name, '')::TEXT,
      COALESCE(r.pickup_address, '')::TEXT,
      COALESCE(r.destination_address, '')::TEXT,
      COALESCE(r.final_fare, r.estimated_fare, 0)::NUMERIC,
      r.created_at
    FROM ride_requests r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN service_providers sp ON r.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE (p_type IS NULL OR p_type = '' OR p_type = 'ride' OR p_type = 'all')
      AND (p_status IS NULL OR p_status = '' OR r.status = p_status)
    
    UNION ALL
    
    -- Deliveries
    SELECT 
      d.id,
      'delivery'::TEXT,
      COALESCE(d.tracking_id, 'DEL-' || LEFT(d.id::TEXT, 8))::TEXT,
      d.status::TEXT,
      d.user_id,
      COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown')::TEXT,
      COALESCE(u.phone_number, '')::TEXT,
      d.provider_id,
      COALESCE(pu.first_name || ' ' || pu.last_name, '')::TEXT,
      COALESCE(d.pickup_address, '')::TEXT,
      COALESCE(d.destination_address, '')::TEXT,
      COALESCE(d.final_fare, d.delivery_fee, 0)::NUMERIC,
      d.created_at
    FROM delivery_requests d
    LEFT JOIN users u ON d.user_id = u.id
    LEFT JOIN service_providers sp ON d.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE (p_type IS NULL OR p_type = '' OR p_type = 'delivery' OR p_type = 'all')
      AND (p_status IS NULL OR p_status = '' OR d.status = p_status)
    
    UNION ALL
    
    -- Shopping
    SELECT 
      s.id,
      'shopping'::TEXT,
      COALESCE(s.tracking_id, 'SHP-' || LEFT(s.id::TEXT, 8))::TEXT,
      s.status::TEXT,
      s.user_id,
      COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown')::TEXT,
      COALESCE(u.phone_number, '')::TEXT,
      s.provider_id,
      COALESCE(pu.first_name || ' ' || pu.last_name, '')::TEXT,
      COALESCE(s.store_name, '')::TEXT,
      COALESCE(s.delivery_address, '')::TEXT,
      COALESCE(s.final_total, s.service_fee, 0)::NUMERIC,
      s.created_at
    FROM shopping_requests s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN service_providers sp ON s.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE (p_type IS NULL OR p_type = '' OR p_type = 'shopping' OR p_type = 'all')
      AND (p_status IS NULL OR p_status = '' OR s.status = p_status)
  ) combined
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$func$;

-- =====================================================
-- 8. COUNT ALL ORDERS FOR ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION count_all_orders_for_admin(
  p_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  total BIGINT := 0;
BEGIN
  SELECT COUNT(*) INTO total FROM (
    SELECT id FROM ride_requests 
    WHERE (p_type IS NULL OR p_type = '' OR p_type = 'ride' OR p_type = 'all')
      AND (p_status IS NULL OR p_status = '' OR status = p_status)
    UNION ALL
    SELECT id FROM delivery_requests 
    WHERE (p_type IS NULL OR p_type = '' OR p_type = 'delivery' OR p_type = 'all')
      AND (p_status IS NULL OR p_status = '' OR status = p_status)
    UNION ALL
    SELECT id FROM shopping_requests 
    WHERE (p_type IS NULL OR p_type = '' OR p_type = 'shopping' OR p_type = 'all')
      AND (p_status IS NULL OR p_status = '' OR status = p_status)
  ) t;
  
  RETURN total;
END;
$func$;

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_realtime_order_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_realtime_service_breakdown() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_live_provider_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_revenue_trends() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin(TEXT, TEXT, INT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_all_orders_for_admin(TEXT, TEXT) TO anon, authenticated, service_role;

-- =====================================================
-- 10. TEST
-- =====================================================
SELECT 'Testing functions...' as status;
SELECT get_admin_dashboard_stats() as dashboard_stats;
SELECT get_realtime_order_stats() as realtime_stats;
SELECT get_live_provider_stats() as provider_stats;
SELECT get_realtime_service_breakdown() as service_breakdown;
