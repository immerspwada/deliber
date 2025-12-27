-- =====================================================
-- COMPLETE FIX: Admin Dashboard Functions
-- แก้ไขปัญหาข้อมูลไม่แสดงใน Admin Dashboard
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop existing functions first (with CASCADE to handle dependencies)
DROP FUNCTION IF EXISTS get_admin_dashboard_stats() CASCADE;
DROP FUNCTION IF EXISTS get_all_orders_for_admin(TEXT, TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_all_orders_for_admin(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_all_providers_for_admin(TEXT, TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_providers_for_admin(TEXT, TEXT) CASCADE;

-- =====================================================
-- 1. DASHBOARD STATS (Safe version - handles missing tables)
-- =====================================================
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
  total_users BIGINT,
  total_providers BIGINT,
  online_providers BIGINT,
  total_rides BIGINT,
  active_rides BIGINT,
  total_deliveries BIGINT,
  total_shopping BIGINT,
  total_revenue NUMERIC,
  pending_verifications BIGINT,
  open_tickets BIGINT,
  active_subscriptions BIGINT,
  pending_insurance_claims BIGINT,
  scheduled_rides BIGINT,
  active_companies BIGINT
) AS $$
DECLARE
  v_total_users BIGINT := 0;
  v_total_providers BIGINT := 0;
  v_online_providers BIGINT := 0;
  v_total_rides BIGINT := 0;
  v_active_rides BIGINT := 0;
  v_total_deliveries BIGINT := 0;
  v_total_shopping BIGINT := 0;
  v_total_revenue NUMERIC := 0;
  v_pending_verifications BIGINT := 0;
  v_open_tickets BIGINT := 0;
  v_active_subscriptions BIGINT := 0;
  v_pending_insurance_claims BIGINT := 0;
  v_scheduled_rides BIGINT := 0;
  v_active_companies BIGINT := 0;
BEGIN
  -- Users count
  SELECT COUNT(*) INTO v_total_users FROM users;
  
  -- Providers count
  SELECT COUNT(*) INTO v_total_providers FROM service_providers;
  SELECT COUNT(*) INTO v_online_providers FROM service_providers WHERE is_available = true;
  SELECT COUNT(*) INTO v_pending_verifications FROM service_providers WHERE status = 'pending' OR is_verified = false;
  
  -- Rides count
  SELECT COUNT(*) INTO v_total_rides FROM ride_requests;
  SELECT COUNT(*) INTO v_active_rides FROM ride_requests WHERE status IN ('pending', 'matched', 'pickup', 'in_progress');
  SELECT COALESCE(SUM(COALESCE(final_fare, estimated_fare, 0)), 0) INTO v_total_revenue FROM ride_requests WHERE status = 'completed';
  
  -- Deliveries count
  BEGIN
    SELECT COUNT(*) INTO v_total_deliveries FROM delivery_requests;
  EXCEPTION WHEN undefined_table THEN
    v_total_deliveries := 0;
  END;
  
  -- Shopping count
  BEGIN
    SELECT COUNT(*) INTO v_total_shopping FROM shopping_requests;
  EXCEPTION WHEN undefined_table THEN
    v_total_shopping := 0;
  END;
  
  -- Support tickets (optional table)
  BEGIN
    SELECT COUNT(*) INTO v_open_tickets FROM support_tickets WHERE status IN ('open', 'in_progress');
  EXCEPTION WHEN undefined_table THEN
    v_open_tickets := 0;
  END;
  
  -- Subscriptions (optional table)
  BEGIN
    SELECT COUNT(*) INTO v_active_subscriptions FROM user_subscriptions WHERE status = 'active';
  EXCEPTION WHEN undefined_table THEN
    v_active_subscriptions := 0;
  END;
  
  -- Insurance claims (optional table)
  BEGIN
    SELECT COUNT(*) INTO v_pending_insurance_claims FROM insurance_claims WHERE status IN ('submitted', 'under_review');
  EXCEPTION WHEN undefined_table THEN
    v_pending_insurance_claims := 0;
  END;
  
  -- Scheduled rides (optional table)
  BEGIN
    SELECT COUNT(*) INTO v_scheduled_rides FROM scheduled_rides WHERE status IN ('scheduled', 'confirmed');
  EXCEPTION WHEN undefined_table THEN
    v_scheduled_rides := 0;
  END;
  
  -- Companies (optional table)
  BEGIN
    SELECT COUNT(*) INTO v_active_companies FROM companies WHERE status = 'active';
  EXCEPTION WHEN undefined_table THEN
    v_active_companies := 0;
  END;
  
  RETURN QUERY SELECT 
    v_total_users,
    v_total_providers,
    v_online_providers,
    v_total_rides,
    v_active_rides,
    v_total_deliveries,
    v_total_shopping,
    v_total_revenue,
    v_pending_verifications,
    v_open_tickets,
    v_active_subscriptions,
    v_pending_insurance_claims,
    v_scheduled_rides,
    v_active_companies;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. GET ALL ORDERS FOR ADMIN
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    'ride'::TEXT as type,
    COALESCE(r.tracking_id, 'RID-' || LEFT(r.id::TEXT, 8))::TEXT as tracking_id,
    r.status::TEXT,
    r.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.name, u.email, 'Unknown')::TEXT as user_name,
    COALESCE(u.phone_number, u.phone, '')::TEXT as user_phone,
    r.provider_id,
    CASE WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.name, pu.email, '') ELSE '' END::TEXT as provider_name,
    COALESCE(r.pickup_address, '')::TEXT as pickup_address,
    COALESCE(r.destination_address, '')::TEXT as destination_address,
    COALESCE(r.final_fare, r.estimated_fare, 0)::NUMERIC as amount,
    r.created_at
  FROM ride_requests r
  LEFT JOIN users u ON r.user_id = u.id
  LEFT JOIN service_providers sp ON r.provider_id = sp.id
  LEFT JOIN users pu ON sp.user_id = pu.id
  WHERE (p_type IS NULL OR p_type = '' OR p_type = 'ride' OR p_type = 'all')
    AND (p_status IS NULL OR p_status = '' OR r.status = p_status)
  
  UNION ALL
  
  SELECT 
    d.id,
    'delivery'::TEXT as type,
    COALESCE(d.tracking_id, 'DEL-' || LEFT(d.id::TEXT, 8))::TEXT as tracking_id,
    d.status::TEXT,
    d.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.name, u.email, 'Unknown')::TEXT as user_name,
    COALESCE(u.phone_number, u.phone, '')::TEXT as user_phone,
    d.provider_id,
    CASE WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.name, pu.email, '') ELSE '' END::TEXT as provider_name,
    COALESCE(d.sender_address, '')::TEXT as pickup_address,
    COALESCE(d.recipient_address, '')::TEXT as destination_address,
    COALESCE(d.actual_fee, d.estimated_fee, 0)::NUMERIC as amount,
    d.created_at
  FROM delivery_requests d
  LEFT JOIN users u ON d.user_id = u.id
  LEFT JOIN service_providers sp ON d.provider_id = sp.id
  LEFT JOIN users pu ON sp.user_id = pu.id
  WHERE (p_type IS NULL OR p_type = '' OR p_type = 'delivery' OR p_type = 'all')
    AND (p_status IS NULL OR p_status = '' OR d.status = p_status)
  
  UNION ALL
  
  SELECT 
    s.id,
    'shopping'::TEXT as type,
    COALESCE(s.tracking_id, 'SHP-' || LEFT(s.id::TEXT, 8))::TEXT as tracking_id,
    s.status::TEXT,
    s.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.name, u.email, 'Unknown')::TEXT as user_name,
    COALESCE(u.phone_number, u.phone, '')::TEXT as user_phone,
    s.provider_id,
    CASE WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.name, pu.email, '') ELSE '' END::TEXT as provider_name,
    COALESCE(s.store_name, s.store_address, '')::TEXT as pickup_address,
    COALESCE(s.delivery_address, '')::TEXT as destination_address,
    COALESCE(s.total_cost, s.service_fee, 0)::NUMERIC as amount,
    s.created_at
  FROM shopping_requests s
  LEFT JOIN users u ON s.user_id = u.id
  LEFT JOIN service_providers sp ON s.provider_id = sp.id
  LEFT JOIN users pu ON sp.user_id = pu.id
  WHERE (p_type IS NULL OR p_type = '' OR p_type = 'shopping' OR p_type = 'all')
    AND (p_status IS NULL OR p_status = '' OR s.status = p_status)
  
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. COUNT ALL ORDERS FOR ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION count_all_orders_for_admin(
  p_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
  v_count INT := 0;
  v_temp INT;
BEGIN
  IF p_type IS NULL OR p_type = '' OR p_type = 'ride' OR p_type = 'all' THEN
    SELECT COUNT(*)::INT INTO v_temp FROM ride_requests WHERE (p_status IS NULL OR p_status = '' OR status = p_status);
    v_count := v_count + COALESCE(v_temp, 0);
  END IF;
  
  IF p_type IS NULL OR p_type = '' OR p_type = 'delivery' OR p_type = 'all' THEN
    BEGIN
      SELECT COUNT(*)::INT INTO v_temp FROM delivery_requests WHERE (p_status IS NULL OR p_status = '' OR status = p_status);
      v_count := v_count + COALESCE(v_temp, 0);
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;
  END IF;
  
  IF p_type IS NULL OR p_type = '' OR p_type = 'shopping' OR p_type = 'all' THEN
    BEGIN
      SELECT COUNT(*)::INT INTO v_temp FROM shopping_requests WHERE (p_status IS NULL OR p_status = '' OR status = p_status);
      v_count := v_count + COALESCE(v_temp, 0);
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;
  END IF;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. GET ALL PROVIDERS FOR ADMIN
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.user_id,
    COALESCE(sp.provider_uid, 'PRV-' || LEFT(sp.id::TEXT, 8))::TEXT as provider_uid,
    sp.provider_type::TEXT,
    sp.status::TEXT,
    COALESCE(sp.is_available, false) as is_available,
    COALESCE(sp.is_verified, false) as is_verified,
    COALESCE(sp.rating, 0)::NUMERIC as rating,
    COALESCE(sp.total_rides, sp.total_trips, 0)::INT as total_rides,
    COALESCE(sp.total_earnings, 0)::NUMERIC as total_earnings,
    COALESCE(u.first_name, '')::TEXT as user_first_name,
    COALESCE(u.last_name, '')::TEXT as user_last_name,
    COALESCE(u.email, '')::TEXT as user_email,
    COALESCE(u.phone_number, u.phone, '')::TEXT as user_phone,
    sp.created_at
  FROM service_providers sp
  LEFT JOIN users u ON sp.user_id = u.id
  WHERE (p_status IS NULL OR p_status = '' OR sp.status = p_status)
    AND (p_provider_type IS NULL OR p_provider_type = '' OR sp.provider_type = p_provider_type)
  ORDER BY sp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. COUNT PROVIDERS FOR ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION count_providers_for_admin(
  p_status TEXT DEFAULT NULL,
  p_provider_type TEXT DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*)::INT INTO v_count 
  FROM service_providers
  WHERE (p_status IS NULL OR p_status = '' OR status = p_status)
    AND (p_provider_type IS NULL OR p_provider_type = '' OR provider_type = p_provider_type);
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_all_orders_for_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_providers_for_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_providers_for_admin TO anon, authenticated, service_role;

-- =====================================================
-- 7. SEED DEMO DATA IF EMPTY
-- =====================================================
DO $$
DECLARE
  v_user_count INT;
  v_customer_id UUID;
  v_driver_user_id UUID;
  v_provider_id UUID;
BEGIN
  SELECT COUNT(*) INTO v_user_count FROM users;
  
  IF v_user_count = 0 THEN
    -- Create demo customer
    INSERT INTO users (email, first_name, last_name, phone_number, member_uid, verification_status, created_at)
    VALUES ('customer@demo.com', 'Demo', 'Customer', '0812345678', 'TRD-DEMO0001', 'verified', NOW())
    RETURNING id INTO v_customer_id;
    
    -- Create demo driver user
    INSERT INTO users (email, first_name, last_name, phone_number, member_uid, verification_status, created_at)
    VALUES ('driver@demo.com', 'Demo', 'Driver', '0898765432', 'TRD-DEMO0002', 'verified', NOW())
    RETURNING id INTO v_driver_user_id;
    
    -- Create demo provider
    INSERT INTO service_providers (user_id, provider_type, status, is_available, is_verified, rating, provider_uid, created_at)
    VALUES (v_driver_user_id, 'driver', 'approved', true, true, 4.8, 'PRV-DEMO0001', NOW())
    RETURNING id INTO v_provider_id;
    
    -- Create demo ride
    INSERT INTO ride_requests (user_id, pickup_address, destination_address, pickup_lat, pickup_lng, destination_lat, destination_lng, estimated_fare, status, tracking_id, created_at)
    VALUES (v_customer_id, 'Central World, Bangkok', 'Siam Paragon, Bangkok', 13.7466, 100.5391, 13.7460, 100.5347, 85.00, 'pending', 'RID-DEMO0001', NOW());
    
    RAISE NOTICE 'Demo data created: customer=%, driver=%, provider=%', v_customer_id, v_driver_user_id, v_provider_id;
  END IF;
END $$;

-- =====================================================
-- 8. TEST QUERIES
-- =====================================================
SELECT '=== Dashboard Stats ===' as test;
SELECT * FROM get_admin_dashboard_stats();

SELECT '=== Orders (limit 5) ===' as test;
SELECT * FROM get_all_orders_for_admin(NULL, NULL, 5, 0);

SELECT '=== Order Count ===' as test;
SELECT count_all_orders_for_admin(NULL, NULL) as total_orders;

SELECT '=== Providers (limit 5) ===' as test;
SELECT * FROM get_all_providers_for_admin(NULL, NULL, 5, 0);

SELECT '=== Provider Count ===' as test;
SELECT count_providers_for_admin(NULL, NULL) as total_providers;

SELECT '=== FIX COMPLETE ===' as status;
