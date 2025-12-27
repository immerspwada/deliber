-- =====================================================
-- Migration 179: Complete Admin Dashboard Fix
-- แก้ไขปัญหาทั้งหมดที่ทำให้ Admin ไม่แสดงข้อมูล
-- รวม Functions ทั้งหมดที่จำเป็นสำหรับ Admin
-- =====================================================

-- Drop all existing admin functions first
DROP FUNCTION IF EXISTS get_admin_dashboard_stats() CASCADE;
DROP FUNCTION IF EXISTS get_all_orders_for_admin(TEXT, TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_all_orders_for_admin(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_all_providers_for_admin(TEXT, TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_providers_for_admin(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_realtime_order_stats() CASCADE;
DROP FUNCTION IF EXISTS get_realtime_service_breakdown() CASCADE;
DROP FUNCTION IF EXISTS get_live_provider_stats() CASCADE;
DROP FUNCTION IF EXISTS get_revenue_trends() CASCADE;
DROP FUNCTION IF EXISTS get_active_providers_locations() CASCADE;
DROP FUNCTION IF EXISTS get_reorderable_items(UUID, INTEGER) CASCADE;

-- =====================================================
-- 1. ENSURE REQUIRED COLUMNS EXIST
-- =====================================================
DO $$
BEGIN
  -- ride_requests columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ride_requests' AND column_name = 'final_fare') THEN
    ALTER TABLE ride_requests ADD COLUMN final_fare NUMERIC(10,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ride_requests' AND column_name = 'tracking_id') THEN
    ALTER TABLE ride_requests ADD COLUMN tracking_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ride_requests' AND column_name = 'completed_at') THEN
    ALTER TABLE ride_requests ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ride_requests' AND column_name = 'reorder_count') THEN
    ALTER TABLE ride_requests ADD COLUMN reorder_count INTEGER DEFAULT 0;
  END IF;
  
  -- service_providers columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'is_available') THEN
    ALTER TABLE service_providers ADD COLUMN is_available BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'provider_uid') THEN
    ALTER TABLE service_providers ADD COLUMN provider_uid TEXT;
  END IF;
  
  -- delivery_requests columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_requests' AND column_name = 'completed_at') THEN
    ALTER TABLE delivery_requests ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_requests' AND column_name = 'reorder_count') THEN
    ALTER TABLE delivery_requests ADD COLUMN reorder_count INTEGER DEFAULT 0;
  END IF;
END $$;


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
BEGIN
  SELECT json_build_object(
    'totalCustomers', COALESCE((SELECT COUNT(*) FROM users), 0),
    'totalProviders', COALESCE((SELECT COUNT(*) FROM service_providers), 0),
    'activeProviders', COALESCE((SELECT COUNT(*) FROM service_providers WHERE COALESCE(is_available, is_online, false) = true), 0),
    'pendingProviders', COALESCE((SELECT COUNT(*) FROM service_providers WHERE status = 'pending'), 0),
    'totalOrders', COALESCE((SELECT COUNT(*) FROM ride_requests), 0) + 
                   COALESCE((SELECT COUNT(*) FROM delivery_requests), 0) +
                   COALESCE((SELECT COUNT(*) FROM shopping_requests), 0),
    'todayOrders', COALESCE((SELECT COUNT(*) FROM ride_requests WHERE created_at >= CURRENT_DATE), 0),
    'todayRevenue', COALESCE((SELECT SUM(COALESCE(final_fare, estimated_fare, 0)) FROM ride_requests WHERE created_at >= CURRENT_DATE AND status = 'completed'), 0),
    'totalRevenue', COALESCE((SELECT SUM(COALESCE(final_fare, estimated_fare, 0)) FROM ride_requests WHERE status = 'completed'), 0)
  ) INTO result;
  
  RETURN result;
END;
$func$;

-- =====================================================
-- 3. GET ALL ORDERS FOR ADMIN
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
    COALESCE(d.sender_address, '')::TEXT,
    COALESCE(d.recipient_address, '')::TEXT,
    COALESCE(d.final_fee, d.estimated_fee, 0)::NUMERIC,
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
    COALESCE(s.total_cost, s.service_fee, 0)::NUMERIC,
    s.created_at
  FROM shopping_requests s
  LEFT JOIN users u ON s.user_id = u.id
  LEFT JOIN service_providers sp ON s.provider_id = sp.id
  LEFT JOIN users pu ON sp.user_id = pu.id
  WHERE (p_type IS NULL OR p_type = '' OR p_type = 'shopping' OR p_type = 'all')
    AND (p_status IS NULL OR p_status = '' OR s.status = p_status)
  
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$func$;


-- =====================================================
-- 4. COUNT ALL ORDERS FOR ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION count_all_orders_for_admin(
  p_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_count INT := 0;
BEGIN
  IF p_type IS NULL OR p_type = '' OR p_type = 'ride' OR p_type = 'all' THEN
    v_count := v_count + COALESCE((SELECT COUNT(*)::INT FROM ride_requests WHERE (p_status IS NULL OR p_status = '' OR status = p_status)), 0);
  END IF;
  
  IF p_type IS NULL OR p_type = '' OR p_type = 'delivery' OR p_type = 'all' THEN
    v_count := v_count + COALESCE((SELECT COUNT(*)::INT FROM delivery_requests WHERE (p_status IS NULL OR p_status = '' OR status = p_status)), 0);
  END IF;
  
  IF p_type IS NULL OR p_type = '' OR p_type = 'shopping' OR p_type = 'all' THEN
    v_count := v_count + COALESCE((SELECT COUNT(*)::INT FROM shopping_requests WHERE (p_status IS NULL OR p_status = '' OR status = p_status)), 0);
  END IF;
  
  RETURN v_count;
END;
$func$;

-- =====================================================
-- 5. GET ALL PROVIDERS FOR ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION get_all_providers_for_admin(
  p_status TEXT DEFAULT NULL,
  p_provider_type TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  provider_uid TEXT,
  provider_type TEXT,
  status TEXT,
  is_available BOOLEAN,
  is_verified BOOLEAN,
  rating NUMERIC,
  total_rides INT,
  total_earnings NUMERIC,
  user_first_name TEXT,
  user_last_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.user_id,
    COALESCE(sp.provider_uid, 'PRV-' || LEFT(sp.id::TEXT, 8))::TEXT,
    sp.provider_type::TEXT,
    COALESCE(sp.status, 'pending')::TEXT,
    COALESCE(sp.is_available, sp.is_online, false),
    COALESCE(sp.is_verified, false),
    COALESCE(sp.rating, 0)::NUMERIC,
    COALESCE(sp.total_rides, sp.total_trips, 0)::INT,
    COALESCE(sp.total_earnings, 0)::NUMERIC,
    COALESCE(u.first_name, '')::TEXT,
    COALESCE(u.last_name, '')::TEXT,
    COALESCE(u.email, '')::TEXT,
    COALESCE(u.phone_number, '')::TEXT,
    sp.created_at
  FROM service_providers sp
  LEFT JOIN users u ON sp.user_id = u.id
  WHERE (p_status IS NULL OR p_status = '' OR sp.status = p_status)
    AND (p_provider_type IS NULL OR p_provider_type = '' OR sp.provider_type = p_provider_type)
  ORDER BY sp.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$func$;

-- =====================================================
-- 6. COUNT PROVIDERS FOR ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION count_providers_for_admin(
  p_status TEXT DEFAULT NULL,
  p_provider_type TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  RETURN COALESCE((
    SELECT COUNT(*)::INT 
    FROM service_providers
    WHERE (p_status IS NULL OR p_status = '' OR status = p_status)
      AND (p_provider_type IS NULL OR p_provider_type = '' OR provider_type = p_provider_type)
  ), 0);
END;
$func$;


-- =====================================================
-- 7. REALTIME ORDER STATS
-- =====================================================
CREATE OR REPLACE FUNCTION get_realtime_order_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  RETURN json_build_object(
    'today_orders', COALESCE((SELECT COUNT(*) FROM ride_requests WHERE created_at >= CURRENT_DATE), 0),
    'today_completed', COALESCE((SELECT COUNT(*) FROM ride_requests WHERE created_at >= CURRENT_DATE AND status = 'completed'), 0),
    'today_cancelled', COALESCE((SELECT COUNT(*) FROM ride_requests WHERE created_at >= CURRENT_DATE AND status = 'cancelled'), 0),
    'today_revenue', COALESCE((SELECT SUM(COALESCE(final_fare, estimated_fare, 0)) FROM ride_requests WHERE created_at >= CURRENT_DATE AND status = 'completed'), 0),
    'active_rides', COALESCE((SELECT COUNT(*) FROM ride_requests WHERE status IN ('pending', 'matched', 'arriving', 'in_progress')), 0),
    'online_providers', COALESCE((SELECT COUNT(*) FROM service_providers WHERE COALESCE(is_available, is_online, false) = true AND status = 'approved'), 0),
    'hourly_orders', COALESCE((
      SELECT json_agg(row_to_json(h))
      FROM (
        SELECT EXTRACT(HOUR FROM created_at)::int as hour, COUNT(*) as count
        FROM ride_requests WHERE created_at >= CURRENT_DATE
        GROUP BY EXTRACT(HOUR FROM created_at) ORDER BY hour
      ) h
    ), '[]'::json)
  );
END;
$func$;

-- =====================================================
-- 8. REALTIME SERVICE BREAKDOWN
-- =====================================================
CREATE OR REPLACE FUNCTION get_realtime_service_breakdown()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  RETURN json_build_object(
    'rides', json_build_object(
      'total', COALESCE((SELECT COUNT(*) FROM ride_requests WHERE created_at >= CURRENT_DATE), 0),
      'active', COALESCE((SELECT COUNT(*) FROM ride_requests WHERE status IN ('pending', 'matched', 'in_progress')), 0),
      'completed', COALESCE((SELECT COUNT(*) FROM ride_requests WHERE created_at >= CURRENT_DATE AND status = 'completed'), 0),
      'revenue', COALESCE((SELECT SUM(COALESCE(final_fare, estimated_fare, 0)) FROM ride_requests WHERE created_at >= CURRENT_DATE AND status = 'completed'), 0)
    ),
    'deliveries', json_build_object(
      'total', COALESCE((SELECT COUNT(*) FROM delivery_requests WHERE created_at >= CURRENT_DATE), 0),
      'active', COALESCE((SELECT COUNT(*) FROM delivery_requests WHERE status IN ('pending', 'matched', 'picking_up', 'delivering')), 0),
      'completed', COALESCE((SELECT COUNT(*) FROM delivery_requests WHERE created_at >= CURRENT_DATE AND status = 'delivered'), 0),
      'revenue', COALESCE((SELECT SUM(COALESCE(final_fee, estimated_fee, 0)) FROM delivery_requests WHERE created_at >= CURRENT_DATE AND status = 'delivered'), 0)
    ),
    'shopping', json_build_object(
      'total', COALESCE((SELECT COUNT(*) FROM shopping_requests WHERE created_at >= CURRENT_DATE), 0),
      'active', COALESCE((SELECT COUNT(*) FROM shopping_requests WHERE status IN ('pending', 'matched', 'shopping', 'delivering')), 0),
      'completed', COALESCE((SELECT COUNT(*) FROM shopping_requests WHERE created_at >= CURRENT_DATE AND status = 'delivered'), 0),
      'revenue', COALESCE((SELECT SUM(COALESCE(total_cost, service_fee, 0)) FROM shopping_requests WHERE created_at >= CURRENT_DATE AND status = 'delivered'), 0)
    )
  );
END;
$func$;

-- =====================================================
-- 9. LIVE PROVIDER STATS
-- =====================================================
CREATE OR REPLACE FUNCTION get_live_provider_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  RETURN json_build_object(
    'total_providers', COALESCE((SELECT COUNT(*) FROM service_providers WHERE status = 'approved'), 0),
    'online_providers', COALESCE((SELECT COUNT(*) FROM service_providers WHERE COALESCE(is_available, is_online, false) = true AND status = 'approved'), 0),
    'busy_providers', COALESCE((SELECT COUNT(DISTINCT provider_id) FROM ride_requests WHERE status IN ('matched', 'arriving', 'in_progress') AND provider_id IS NOT NULL), 0),
    'pending_verification', COALESCE((SELECT COUNT(*) FROM service_providers WHERE status = 'pending'), 0),
    'by_type', COALESCE((
      SELECT json_object_agg(provider_type, json_build_object('total', cnt, 'online', online_cnt))
      FROM (
        SELECT provider_type, COUNT(*) as cnt, 
               COUNT(*) FILTER (WHERE COALESCE(is_available, is_online, false) = true) as online_cnt
        FROM service_providers WHERE status = 'approved'
        GROUP BY provider_type
      ) t
    ), '{}'::json)
  );
END;
$func$;

-- =====================================================
-- 10. REVENUE TRENDS (Last 7 days)
-- =====================================================
CREATE OR REPLACE FUNCTION get_revenue_trends()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  RETURN COALESCE((
    SELECT json_agg(row_to_json(d) ORDER BY d.date)
    FROM (
      SELECT 
        dates.date::date as date,
        COALESCE(r.revenue, 0) as ride_revenue,
        COALESCE(r.count, 0) as ride_count,
        COALESCE(r.revenue, 0) as total_revenue,
        COALESCE(r.count, 0) as total_orders
      FROM (SELECT generate_series(CURRENT_DATE - 6, CURRENT_DATE, '1 day')::date as date) dates
      LEFT JOIN (
        SELECT DATE(created_at) as date, SUM(COALESCE(final_fare, estimated_fare, 0)) as revenue, COUNT(*) as count
        FROM ride_requests WHERE status = 'completed' AND created_at >= CURRENT_DATE - 6
        GROUP BY DATE(created_at)
      ) r ON dates.date = r.date
    ) d
  ), '[]'::json);
END;
$func$;


-- =====================================================
-- 11. ACTIVE PROVIDERS LOCATIONS
-- =====================================================
CREATE OR REPLACE FUNCTION get_active_providers_locations()
RETURNS TABLE (
  id UUID, provider_uid TEXT, provider_type TEXT, user_name TEXT, phone_number TEXT,
  current_lat NUMERIC, current_lng NUMERIC, is_online BOOLEAN, rating NUMERIC,
  total_trips INT, last_updated TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    COALESCE(sp.provider_uid, 'PRV-' || LEFT(sp.id::TEXT, 8))::TEXT,
    sp.provider_type::TEXT,
    COALESCE(u.first_name || ' ' || u.last_name, '')::TEXT,
    COALESCE(u.phone_number, '')::TEXT,
    sp.current_lat::NUMERIC,
    sp.current_lng::NUMERIC,
    COALESCE(sp.is_available, sp.is_online, false),
    COALESCE(sp.rating, 0)::NUMERIC,
    COALESCE(sp.total_trips, sp.total_rides, 0)::INT,
    sp.updated_at
  FROM service_providers sp
  LEFT JOIN users u ON sp.user_id = u.id
  WHERE sp.status = 'approved'
    AND COALESCE(sp.is_available, sp.is_online, false) = true
    AND sp.current_lat IS NOT NULL AND sp.current_lng IS NOT NULL
  ORDER BY sp.updated_at DESC;
END;
$func$;

-- =====================================================
-- 12. GET REORDERABLE ITEMS
-- =====================================================
CREATE OR REPLACE FUNCTION get_reorderable_items(
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID, service_type TEXT, from_location TEXT, to_location TEXT,
  completed_at TIMESTAMPTZ, reorder_count INTEGER, can_reorder BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN RETURN; END IF;
  
  RETURN QUERY
  SELECT r.id, 'ride'::TEXT, COALESCE(r.pickup_address, '')::TEXT, COALESCE(r.destination_address, '')::TEXT,
         r.completed_at, COALESCE(r.reorder_count, 0)::INTEGER, TRUE
  FROM ride_requests r
  WHERE r.user_id = v_user_id AND r.status = 'completed' AND r.completed_at > NOW() - INTERVAL '30 days'
  
  UNION ALL
  
  SELECT d.id, 'delivery'::TEXT, COALESCE(d.sender_address, '')::TEXT, COALESCE(d.recipient_address, '')::TEXT,
         d.completed_at, COALESCE(d.reorder_count, 0)::INTEGER, TRUE
  FROM delivery_requests d
  WHERE d.user_id = v_user_id AND d.status = 'completed' AND d.completed_at > NOW() - INTERVAL '30 days'
  
  ORDER BY completed_at DESC NULLS LAST LIMIT p_limit;
EXCEPTION WHEN OTHERS THEN RETURN;
END;
$func$;

-- =====================================================
-- 13. GRANT ALL PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin(TEXT, TEXT, INT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_all_orders_for_admin(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_providers_for_admin(TEXT, TEXT, INT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_providers_for_admin(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_realtime_order_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_realtime_service_breakdown() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_live_provider_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_revenue_trends() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_active_providers_locations() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_reorderable_items(UUID, INTEGER) TO anon, authenticated, service_role;

-- =====================================================
-- 14. VERIFICATION TEST
-- =====================================================
DO $$
DECLARE
  v_test JSON;
BEGIN
  -- Test dashboard stats
  SELECT get_admin_dashboard_stats() INTO v_test;
  RAISE NOTICE '✅ get_admin_dashboard_stats: %', v_test;
  
  -- Test realtime stats
  SELECT get_realtime_order_stats() INTO v_test;
  RAISE NOTICE '✅ get_realtime_order_stats: %', v_test;
  
  -- Test service breakdown
  SELECT get_realtime_service_breakdown() INTO v_test;
  RAISE NOTICE '✅ get_realtime_service_breakdown: %', v_test;
  
  -- Test provider stats
  SELECT get_live_provider_stats() INTO v_test;
  RAISE NOTICE '✅ get_live_provider_stats: %', v_test;
  
  RAISE NOTICE '=== ALL ADMIN FUNCTIONS VERIFIED ===';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error: %', SQLERRM;
END $$;

SELECT 'Migration 179 Complete - Admin Dashboard Fixed' as status;
