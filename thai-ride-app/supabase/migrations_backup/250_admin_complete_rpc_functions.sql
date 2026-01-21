-- Migration: 250_admin_complete_rpc_functions.sql
-- Description: Complete set of RPC functions for Admin Dashboard
-- Date: 2026-01-13

-- =====================================================
-- DROP EXISTING FUNCTIONS (if any)
-- =====================================================
DROP FUNCTION IF EXISTS get_admin_dashboard_stats() CASCADE;
DROP FUNCTION IF EXISTS get_all_orders_for_admin(TEXT, TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_all_orders_for_admin(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_realtime_order_stats() CASCADE;
DROP FUNCTION IF EXISTS get_realtime_service_breakdown() CASCADE;
DROP FUNCTION IF EXISTS get_live_provider_stats() CASCADE;
DROP FUNCTION IF EXISTS get_revenue_trends() CASCADE;
DROP FUNCTION IF EXISTS get_active_providers_locations() CASCADE;
DROP FUNCTION IF EXISTS get_all_deliveries_for_admin(TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_deliveries_for_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_all_shopping_for_admin(TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_shopping_for_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_all_queues_for_admin(TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_queues_for_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_all_moving_for_admin(TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_moving_for_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_all_laundry_for_admin(TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_laundry_for_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_all_cancellations_for_admin(TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_cancellations_for_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_pending_provider_count() CASCADE;

-- =====================================================
-- 1. GET ADMIN DASHBOARD STATS
-- =====================================================
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  v_total_users INT;
  v_total_providers INT;
  v_online_providers INT;
  v_pending_verifications INT;
  v_total_rides INT;
  v_active_rides INT;
  v_total_revenue NUMERIC;
  v_today_orders INT;
  v_today_revenue NUMERIC;
BEGIN
  -- Count users
  SELECT COUNT(*) INTO v_total_users FROM users;
  
  -- Count providers
  SELECT COUNT(*) INTO v_total_providers FROM providers_v2;
  SELECT COUNT(*) INTO v_online_providers FROM providers_v2 WHERE is_online = true;
  SELECT COUNT(*) INTO v_pending_verifications FROM providers_v2 WHERE status = 'pending';
  
  -- Count rides
  SELECT COUNT(*) INTO v_total_rides FROM ride_requests;
  SELECT COUNT(*) INTO v_active_rides FROM ride_requests WHERE status IN ('pending', 'matched', 'in_progress');
  
  -- Calculate revenue
  SELECT COALESCE(SUM(fare), 0) INTO v_total_revenue FROM ride_requests WHERE status = 'completed';
  
  -- Today's stats
  SELECT COUNT(*) INTO v_today_orders FROM ride_requests WHERE created_at >= CURRENT_DATE;
  SELECT COALESCE(SUM(fare), 0) INTO v_today_revenue FROM ride_requests WHERE status = 'completed' AND created_at >= CURRENT_DATE;
  
  result := json_build_object(
    'totalCustomers', v_total_users,
    'total_users', v_total_users,
    'totalProviders', v_total_providers,
    'total_providers', v_total_providers,
    'activeProviders', v_online_providers,
    'online_providers', v_online_providers,
    'pendingProviders', v_pending_verifications,
    'pending_verifications', v_pending_verifications,
    'totalOrders', v_total_rides,
    'total_rides', v_total_rides,
    'pendingOrders', v_active_rides,
    'active_rides', v_active_rides,
    'todayOrders', v_today_orders,
    'todayRevenue', v_today_revenue,
    'total_revenue', v_total_revenue
  );
  
  RETURN result;
END;
$$;

-- =====================================================
-- 2. GET ALL ORDERS FOR ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION get_all_orders_for_admin(
  p_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  tracking_id TEXT,
  type TEXT,
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
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    COALESCE(r.tracking_id, LEFT(r.id::TEXT, 8)) as tracking_id,
    'ride'::TEXT as type,
    r.status::TEXT,
    r.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as user_name,
    u.phone_number as user_phone,
    r.provider_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'Unassigned') as provider_name,
    r.pickup_address,
    r.dropoff_address as destination_address,
    COALESCE(r.fare, 0) as amount,
    r.created_at
  FROM ride_requests r
  LEFT JOIN users u ON r.user_id = u.id
  LEFT JOIN providers_v2 p ON r.provider_id = p.id
  WHERE (p_type IS NULL OR p_type = 'ride')
    AND (p_status IS NULL OR r.status::TEXT = p_status)
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- 3. COUNT ALL ORDERS FOR ADMIN
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
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM ride_requests r
  WHERE (p_type IS NULL OR p_type = 'ride')
    AND (p_status IS NULL OR r.status::TEXT = p_status);
  
  RETURN v_count;
END;
$$;

-- =====================================================
-- 4. GET REALTIME ORDER STATS
-- =====================================================
CREATE OR REPLACE FUNCTION get_realtime_order_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'today_orders', (SELECT COUNT(*) FROM ride_requests WHERE created_at >= CURRENT_DATE),
    'today_completed', (SELECT COUNT(*) FROM ride_requests WHERE status = 'completed' AND created_at >= CURRENT_DATE),
    'today_cancelled', (SELECT COUNT(*) FROM ride_requests WHERE status = 'cancelled' AND created_at >= CURRENT_DATE),
    'today_revenue', (SELECT COALESCE(SUM(fare), 0) FROM ride_requests WHERE status = 'completed' AND created_at >= CURRENT_DATE),
    'active_rides', (SELECT COUNT(*) FROM ride_requests WHERE status IN ('pending', 'matched', 'in_progress')),
    'online_providers', (SELECT COUNT(*) FROM providers_v2 WHERE is_online = true),
    'hourly_orders', (
      SELECT json_agg(hourly)
      FROM (
        SELECT 
          date_trunc('hour', created_at) as hour,
          COUNT(*) as count
        FROM ride_requests
        WHERE created_at >= CURRENT_DATE
        GROUP BY date_trunc('hour', created_at)
        ORDER BY hour
      ) hourly
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- =====================================================
-- 5. GET REALTIME SERVICE BREAKDOWN
-- =====================================================
CREATE OR REPLACE FUNCTION get_realtime_service_breakdown()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'rides', json_build_object(
      'total', (SELECT COUNT(*) FROM ride_requests WHERE created_at >= CURRENT_DATE),
      'active', (SELECT COUNT(*) FROM ride_requests WHERE status IN ('pending', 'matched', 'in_progress') AND created_at >= CURRENT_DATE),
      'completed', (SELECT COUNT(*) FROM ride_requests WHERE status = 'completed' AND created_at >= CURRENT_DATE),
      'revenue', (SELECT COALESCE(SUM(fare), 0) FROM ride_requests WHERE status = 'completed' AND created_at >= CURRENT_DATE)
    ),
    'deliveries', json_build_object(
      'total', (SELECT COUNT(*) FROM delivery_requests WHERE created_at >= CURRENT_DATE),
      'active', (SELECT COUNT(*) FROM delivery_requests WHERE status IN ('pending', 'matched', 'in_progress') AND created_at >= CURRENT_DATE),
      'completed', (SELECT COUNT(*) FROM delivery_requests WHERE status = 'completed' AND created_at >= CURRENT_DATE),
      'revenue', (SELECT COALESCE(SUM(fare), 0) FROM delivery_requests WHERE status = 'completed' AND created_at >= CURRENT_DATE)
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- =====================================================
-- 6. GET LIVE PROVIDER STATS
-- =====================================================
CREATE OR REPLACE FUNCTION get_live_provider_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_providers', (SELECT COUNT(*) FROM providers_v2),
    'online_providers', (SELECT COUNT(*) FROM providers_v2 WHERE is_online = true),
    'available_providers', (SELECT COUNT(*) FROM providers_v2 WHERE is_online = true AND is_available = true),
    'pending_verification', (SELECT COUNT(*) FROM providers_v2 WHERE status = 'pending'),
    'by_type', (
      SELECT json_object_agg(provider_type, cnt)
      FROM (
        SELECT provider_type, COUNT(*) as cnt
        FROM providers_v2
        WHERE is_online = true
        GROUP BY provider_type
      ) t
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- =====================================================
-- 7. GET REVENUE TRENDS
-- =====================================================
CREATE OR REPLACE FUNCTION get_revenue_trends()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(daily ORDER BY day)
  INTO result
  FROM (
    SELECT 
      date_trunc('day', created_at)::DATE as day,
      COUNT(*) as orders,
      COALESCE(SUM(fare), 0) as revenue
    FROM ride_requests
    WHERE status = 'completed'
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY date_trunc('day', created_at)
  ) daily;
  
  RETURN COALESCE(result, '[]'::JSON);
END;
$$;

-- =====================================================
-- 8. GET ACTIVE PROVIDERS LOCATIONS
-- =====================================================
CREATE OR REPLACE FUNCTION get_active_providers_locations()
RETURNS TABLE (
  id UUID,
  provider_uid TEXT,
  provider_type TEXT,
  user_name TEXT,
  phone_number TEXT,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  is_online BOOLEAN,
  rating NUMERIC,
  total_trips INT,
  last_updated TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.provider_uid,
    p.provider_type,
    COALESCE(p.first_name || ' ' || p.last_name, 'Unknown') as user_name,
    p.phone_number,
    p.current_lat,
    p.current_lng,
    p.is_online,
    p.rating,
    p.total_trips,
    p.updated_at as last_updated
  FROM providers_v2 p
  WHERE p.is_online = true
  ORDER BY p.updated_at DESC;
END;
$$;

-- =====================================================
-- 9. GET PENDING PROVIDER COUNT
-- =====================================================
CREATE OR REPLACE FUNCTION get_pending_provider_count()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM providers_v2 WHERE status = 'pending';
  RETURN v_count;
END;
$$;


-- =====================================================
-- 10. GET ALL DELIVERIES FOR ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION get_all_deliveries_for_admin(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  tracking_id TEXT,
  status TEXT,
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  provider_id UUID,
  provider_name TEXT,
  provider_phone TEXT,
  pickup_address TEXT,
  destination_address TEXT,
  amount NUMERIC,
  payment_method TEXT,
  created_at TIMESTAMPTZ,
  matched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    COALESCE(d.tracking_id, LEFT(d.id::TEXT, 8)) as tracking_id,
    d.status::TEXT,
    d.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as user_name,
    u.phone_number as user_phone,
    d.provider_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'Unassigned') as provider_name,
    p.phone_number as provider_phone,
    d.pickup_address,
    d.dropoff_address as destination_address,
    COALESCE(d.fare, 0) as amount,
    COALESCE(d.payment_method, 'cash') as payment_method,
    d.created_at,
    d.matched_at,
    d.completed_at,
    d.cancelled_at
  FROM delivery_requests d
  LEFT JOIN users u ON d.user_id = u.id
  LEFT JOIN providers_v2 p ON d.provider_id = p.id
  WHERE (p_status IS NULL OR d.status::TEXT = p_status)
  ORDER BY d.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION count_deliveries_for_admin(p_status TEXT DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM delivery_requests WHERE (p_status IS NULL OR status::TEXT = p_status);
  RETURN v_count;
END;
$$;

-- =====================================================
-- 11. GET ALL SHOPPING FOR ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION get_all_shopping_for_admin(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  tracking_id TEXT,
  status TEXT,
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  provider_id UUID,
  provider_name TEXT,
  provider_phone TEXT,
  store_address TEXT,
  delivery_address TEXT,
  amount NUMERIC,
  payment_method TEXT,
  shopping_list TEXT,
  created_at TIMESTAMPTZ,
  matched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    COALESCE(s.tracking_id, LEFT(s.id::TEXT, 8)) as tracking_id,
    s.status::TEXT,
    s.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as user_name,
    u.phone_number as user_phone,
    s.provider_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'Unassigned') as provider_name,
    p.phone_number as provider_phone,
    s.store_name as store_address,
    s.delivery_address,
    COALESCE(s.estimated_total, 0) as amount,
    COALESCE(s.payment_method, 'cash') as payment_method,
    s.shopping_list::TEXT,
    s.created_at,
    s.matched_at,
    s.completed_at,
    s.cancelled_at
  FROM shopping_requests s
  LEFT JOIN users u ON s.user_id = u.id
  LEFT JOIN providers_v2 p ON s.provider_id = p.id
  WHERE (p_status IS NULL OR s.status::TEXT = p_status)
  ORDER BY s.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION count_shopping_for_admin(p_status TEXT DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM shopping_requests WHERE (p_status IS NULL OR status::TEXT = p_status);
  RETURN v_count;
END;
$$;

-- =====================================================
-- 12. GET ALL QUEUES FOR ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION get_all_queues_for_admin(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  tracking_id TEXT,
  status TEXT,
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  provider_id UUID,
  provider_name TEXT,
  provider_phone TEXT,
  place_name TEXT,
  place_address TEXT,
  amount NUMERIC,
  payment_method TEXT,
  special_requests TEXT,
  created_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    COALESCE(q.tracking_id, LEFT(q.id::TEXT, 8)) as tracking_id,
    q.status::TEXT,
    q.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as user_name,
    u.phone_number as user_phone,
    q.provider_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'Unassigned') as provider_name,
    p.phone_number as provider_phone,
    q.place_name,
    q.place_address,
    COALESCE(q.service_fee, 0) as amount,
    COALESCE(q.payment_method, 'cash') as payment_method,
    q.notes as special_requests,
    q.created_at,
    q.confirmed_at,
    q.completed_at,
    q.cancelled_at
  FROM queue_bookings q
  LEFT JOIN users u ON q.user_id = u.id
  LEFT JOIN providers_v2 p ON q.provider_id = p.id
  WHERE (p_status IS NULL OR q.status::TEXT = p_status)
  ORDER BY q.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION count_queues_for_admin(p_status TEXT DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM queue_bookings WHERE (p_status IS NULL OR status::TEXT = p_status);
  RETURN v_count;
END;
$$;

-- =====================================================
-- 13. GET ALL MOVING FOR ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION get_all_moving_for_admin(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  tracking_id TEXT,
  status TEXT,
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  provider_id UUID,
  provider_name TEXT,
  provider_phone TEXT,
  pickup_address TEXT,
  destination_address TEXT,
  amount NUMERIC,
  payment_method TEXT,
  items_description TEXT,
  created_at TIMESTAMPTZ,
  matched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    COALESCE(m.tracking_id, LEFT(m.id::TEXT, 8)) as tracking_id,
    m.status::TEXT,
    m.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as user_name,
    u.phone_number as user_phone,
    m.provider_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'Unassigned') as provider_name,
    p.phone_number as provider_phone,
    m.pickup_address,
    m.dropoff_address as destination_address,
    COALESCE(m.fare, 0) as amount,
    COALESCE(m.payment_method, 'cash') as payment_method,
    m.items_description,
    m.created_at,
    m.matched_at,
    m.completed_at,
    m.cancelled_at
  FROM moving_requests m
  LEFT JOIN users u ON m.user_id = u.id
  LEFT JOIN providers_v2 p ON m.provider_id = p.id
  WHERE (p_status IS NULL OR m.status::TEXT = p_status)
  ORDER BY m.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION count_moving_for_admin(p_status TEXT DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM moving_requests WHERE (p_status IS NULL OR status::TEXT = p_status);
  RETURN v_count;
END;
$$;

-- =====================================================
-- 14. GET ALL LAUNDRY FOR ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION get_all_laundry_for_admin(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  tracking_id TEXT,
  status TEXT,
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  provider_id UUID,
  provider_name TEXT,
  provider_phone TEXT,
  pickup_address TEXT,
  amount NUMERIC,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  matched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    COALESCE(l.tracking_id, LEFT(l.id::TEXT, 8)) as tracking_id,
    l.status::TEXT,
    l.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as user_name,
    u.phone_number as user_phone,
    l.provider_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'Unassigned') as provider_name,
    p.phone_number as provider_phone,
    l.pickup_address,
    COALESCE(l.total_price, 0) as amount,
    COALESCE(l.payment_method, 'cash') as payment_method,
    l.special_instructions as notes,
    l.created_at,
    l.picked_up_at as matched_at,
    l.delivered_at,
    l.cancelled_at
  FROM laundry_requests l
  LEFT JOIN users u ON l.user_id = u.id
  LEFT JOIN providers_v2 p ON l.provider_id = p.id
  WHERE (p_status IS NULL OR l.status::TEXT = p_status)
  ORDER BY l.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION count_laundry_for_admin(p_status TEXT DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM laundry_requests WHERE (p_status IS NULL OR status::TEXT = p_status);
  RETURN v_count;
END;
$$;

-- =====================================================
-- 15. GET ALL CANCELLATIONS FOR ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION get_all_cancellations_for_admin(
  p_service_type TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  tracking_id TEXT,
  service_type TEXT,
  user_name TEXT,
  provider_name TEXT,
  cancel_reason TEXT,
  cancelled_by TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    COALESCE(r.tracking_id, LEFT(r.id::TEXT, 8)) as tracking_id,
    'ride'::TEXT as service_type,
    COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as user_name,
    COALESCE(p.first_name || ' ' || p.last_name, 'N/A') as provider_name,
    r.cancel_reason,
    r.cancelled_by,
    r.cancelled_at,
    r.created_at
  FROM ride_requests r
  LEFT JOIN users u ON r.user_id = u.id
  LEFT JOIN providers_v2 p ON r.provider_id = p.id
  WHERE r.status = 'cancelled'
    AND (p_service_type IS NULL OR p_service_type = 'ride')
  ORDER BY r.cancelled_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION count_cancellations_for_admin(p_service_type TEXT DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM ride_requests 
  WHERE status = 'cancelled' 
    AND (p_service_type IS NULL OR p_service_type = 'ride');
  RETURN v_count;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS TO ALL ROLES
-- =====================================================
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin(TEXT, TEXT, INT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_all_orders_for_admin(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_realtime_order_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_realtime_service_breakdown() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_live_provider_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_revenue_trends() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_active_providers_locations() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_pending_provider_count() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_deliveries_for_admin(TEXT, INT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_deliveries_for_admin(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_shopping_for_admin(TEXT, INT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_shopping_for_admin(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_queues_for_admin(TEXT, INT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_queues_for_admin(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_moving_for_admin(TEXT, INT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_moving_for_admin(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_laundry_for_admin(TEXT, INT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_laundry_for_admin(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_cancellations_for_admin(TEXT, INT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_cancellations_for_admin(TEXT) TO anon, authenticated, service_role;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION get_admin_dashboard_stats IS 'Get dashboard statistics for admin - SECURITY DEFINER bypasses RLS';
COMMENT ON FUNCTION get_all_orders_for_admin IS 'Get all orders for admin with pagination - SECURITY DEFINER bypasses RLS';
COMMENT ON FUNCTION get_realtime_order_stats IS 'Get realtime order statistics for admin dashboard';
COMMENT ON FUNCTION get_live_provider_stats IS 'Get live provider statistics for admin dashboard';
