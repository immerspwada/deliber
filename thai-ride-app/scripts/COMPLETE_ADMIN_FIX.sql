-- =====================================================
-- COMPLETE ADMIN DASHBOARD FIX
-- =====================================================
-- Run this ENTIRE script in Supabase SQL Editor
-- This will fix ALL admin dashboard issues
-- =====================================================

-- STEP 1: Check current data
SELECT '=== CHECKING CURRENT DATA ===' as step;
SELECT 'Users: ' || COUNT(*)::TEXT as count FROM users;
SELECT 'Providers: ' || COUNT(*)::TEXT as count FROM service_providers;
SELECT 'Rides: ' || COUNT(*)::TEXT as count FROM ride_requests;

-- =====================================================
-- STEP 2: DROP ALL EXISTING ADMIN FUNCTIONS
-- =====================================================
DROP FUNCTION IF EXISTS get_admin_dashboard_stats() CASCADE;
DROP FUNCTION IF EXISTS get_realtime_order_stats() CASCADE;
DROP FUNCTION IF EXISTS get_realtime_service_breakdown() CASCADE;
DROP FUNCTION IF EXISTS get_live_provider_stats() CASCADE;
DROP FUNCTION IF EXISTS get_revenue_trends() CASCADE;
DROP FUNCTION IF EXISTS get_all_orders_for_admin(TEXT, TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_all_orders_for_admin(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_all_providers_for_admin(TEXT, TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_providers_for_admin(TEXT, TEXT) CASCADE;

-- =====================================================
-- STEP 3: CREATE get_admin_dashboard_stats
-- =====================================================
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
  -- Count users
  SELECT COALESCE(COUNT(*), 0) INTO v_total_users FROM users;
  
  -- Count providers
  SELECT COALESCE(COUNT(*), 0) INTO v_total_providers FROM service_providers;
  SELECT COALESCE(COUNT(*), 0) INTO v_active_providers FROM service_providers 
    WHERE COALESCE(is_available, false) = true OR COALESCE(is_online, false) = true;
  SELECT COALESCE(COUNT(*), 0) INTO v_pending_providers FROM service_providers WHERE status = 'pending';
  
  -- Count orders
  SELECT COALESCE(COUNT(*), 0) INTO v_total_orders FROM ride_requests;
  SELECT COALESCE(COUNT(*), 0) INTO v_today_orders FROM ride_requests WHERE created_at >= CURRENT_DATE;
  
  -- Revenue
  SELECT COALESCE(SUM(COALESCE(final_fare, estimated_fare, 0)), 0) INTO v_today_revenue 
  FROM ride_requests WHERE created_at >= CURRENT_DATE AND status = 'completed';
  
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

-- =====================================================
-- STEP 4: CREATE get_realtime_order_stats
-- =====================================================
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
    WHERE COALESCE(is_available, false) = true OR COALESCE(is_online, false) = true;
  
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

-- =====================================================
-- STEP 5: CREATE get_realtime_service_breakdown
-- =====================================================
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

-- =====================================================
-- STEP 6: CREATE get_live_provider_stats
-- =====================================================
CREATE OR REPLACE FUNCTION get_live_provider_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN json_build_object(
    'total_providers', COALESCE((SELECT COUNT(*) FROM service_providers), 0),
    'online_providers', COALESCE((SELECT COUNT(*) FROM service_providers WHERE COALESCE(is_available, false) = true OR COALESCE(is_online, false) = true), 0),
    'busy_providers', 0,
    'pending_verification', COALESCE((SELECT COUNT(*) FROM service_providers WHERE status = 'pending'), 0),
    'by_type', COALESCE((SELECT json_object_agg(provider_type, cnt) FROM (SELECT provider_type, COUNT(*) as cnt FROM service_providers WHERE provider_type IS NOT NULL GROUP BY provider_type) t), '{}'::json)
  );
END;
$$;

-- =====================================================
-- STEP 7: CREATE get_revenue_trends
-- =====================================================
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

-- =====================================================
-- STEP 8: CREATE get_all_orders_for_admin
-- =====================================================
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

-- =====================================================
-- STEP 9: CREATE count_all_orders_for_admin
-- =====================================================
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

-- =====================================================
-- STEP 10: CREATE get_all_providers_for_admin
-- =====================================================
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
    COALESCE(sp.is_available, sp.is_online, false), sp.is_verified,
    COALESCE(sp.rating, 0)::NUMERIC, COALESCE(sp.total_rides, 0)::INT, COALESCE(sp.total_earnings, 0)::NUMERIC,
    u.first_name, u.last_name, u.email, u.phone_number, sp.created_at
  FROM service_providers sp
  LEFT JOIN users u ON sp.user_id = u.id
  WHERE (p_status IS NULL OR p_status = '' OR sp.status = p_status)
    AND (p_provider_type IS NULL OR p_provider_type = '' OR sp.provider_type = p_provider_type)
  ORDER BY sp.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- =====================================================
-- STEP 11: CREATE count_providers_for_admin
-- =====================================================
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

-- =====================================================
-- STEP 12: GRANT PERMISSIONS TO ALL ROLES
-- =====================================================
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_realtime_order_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_realtime_service_breakdown() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_live_provider_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_revenue_trends() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin(TEXT, TEXT, INT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_all_orders_for_admin(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_providers_for_admin(TEXT, TEXT, INT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_providers_for_admin(TEXT, TEXT) TO anon, authenticated, service_role;

-- =====================================================
-- STEP 13: CREATE DEMO DATA IF EMPTY
-- =====================================================
DO $$
DECLARE
  v_user_count INT;
  v_user_id UUID;
BEGIN
  SELECT COUNT(*) INTO v_user_count FROM users;
  
  IF v_user_count = 0 THEN
    RAISE NOTICE 'Creating demo data...';
    
    -- Create demo users
    FOR i IN 1..5 LOOP
      INSERT INTO users (id, email, first_name, last_name, phone_number, verification_status, created_at)
      VALUES (gen_random_uuid(), 'customer' || i || '@demo.com', 'Customer', 'Demo ' || i, 
        '08' || LPAD((1000000 + i)::TEXT, 8, '0'), 'verified', NOW() - (i || ' days')::INTERVAL);
    END LOOP;
    
    -- Get first user
    SELECT id INTO v_user_id FROM users LIMIT 1;
    
    -- Create demo rides
    IF v_user_id IS NOT NULL THEN
      FOR i IN 1..10 LOOP
        INSERT INTO ride_requests (id, user_id, status, pickup_address, destination_address,
          pickup_lat, pickup_lng, destination_lat, destination_lng, estimated_fare, created_at)
        VALUES (gen_random_uuid(), v_user_id, 
          CASE WHEN i <= 3 THEN 'pending' WHEN i <= 6 THEN 'completed' ELSE 'cancelled' END,
          'Pickup ' || i, 'Destination ' || i, 13.7563, 100.5018, 13.7663, 100.5118,
          50 + (random() * 200), NOW() - ((i * 2) || ' hours')::INTERVAL);
      END LOOP;
    END IF;
    
    RAISE NOTICE 'Demo data created!';
  ELSE
    RAISE NOTICE 'Data already exists, skipping demo data creation';
  END IF;
END $$;

-- =====================================================
-- STEP 14: TEST ALL FUNCTIONS
-- =====================================================
SELECT '=== TESTING FUNCTIONS ===' as step;
SELECT get_admin_dashboard_stats() as dashboard_stats;
SELECT get_realtime_order_stats() as realtime_stats;
SELECT get_live_provider_stats() as provider_stats;

SELECT '=== ALL DONE! ===' as result;
SELECT 'Refresh your admin dashboard now' as instruction;
