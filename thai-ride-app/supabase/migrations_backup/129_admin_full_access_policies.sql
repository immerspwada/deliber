-- =====================================================
-- Migration: 129_admin_full_access_policies.sql
-- Feature: F23 - Admin Dashboard Full Access
-- Description: RLS policies และ RPC functions สำหรับ Admin เข้าถึงข้อมูลทั้งหมด
-- =====================================================

-- =====================================================
-- 1. HELPER FUNCTION: Check if user is admin
-- =====================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current user has admin role
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- 2. ADMIN RLS POLICIES FOR ALL TABLES
-- =====================================================

-- 2.1 ride_requests
DROP POLICY IF EXISTS "admin_full_access_ride_requests" ON ride_requests;
CREATE POLICY "admin_full_access_ride_requests" ON ride_requests
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2.2 delivery_requests
DROP POLICY IF EXISTS "admin_full_access_delivery_requests" ON delivery_requests;
CREATE POLICY "admin_full_access_delivery_requests" ON delivery_requests
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2.3 shopping_requests
DROP POLICY IF EXISTS "admin_full_access_shopping_requests" ON shopping_requests;
CREATE POLICY "admin_full_access_shopping_requests" ON shopping_requests
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2.4 queue_bookings
DROP POLICY IF EXISTS "admin_full_access_queue_bookings" ON queue_bookings;
CREATE POLICY "admin_full_access_queue_bookings" ON queue_bookings
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2.5 moving_requests
DROP POLICY IF EXISTS "admin_full_access_moving_requests" ON moving_requests;
CREATE POLICY "admin_full_access_moving_requests" ON moving_requests
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2.6 laundry_requests
DROP POLICY IF EXISTS "admin_full_access_laundry_requests" ON laundry_requests;
CREATE POLICY "admin_full_access_laundry_requests" ON laundry_requests
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2.7 users
DROP POLICY IF EXISTS "admin_full_access_users" ON users;
CREATE POLICY "admin_full_access_users" ON users
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2.8 service_providers
DROP POLICY IF EXISTS "admin_full_access_service_providers" ON service_providers;
CREATE POLICY "admin_full_access_service_providers" ON service_providers
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2.9 payments
DROP POLICY IF EXISTS "admin_full_access_payments" ON payments;
CREATE POLICY "admin_full_access_payments" ON payments
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2.10 wallet_transactions
DROP POLICY IF EXISTS "admin_full_access_wallet_transactions" ON wallet_transactions;
CREATE POLICY "admin_full_access_wallet_transactions" ON wallet_transactions
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2.11 user_wallets
DROP POLICY IF EXISTS "admin_full_access_user_wallets" ON user_wallets;
CREATE POLICY "admin_full_access_user_wallets" ON user_wallets
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2.12 support_tickets
DROP POLICY IF EXISTS "admin_full_access_support_tickets" ON support_tickets;
CREATE POLICY "admin_full_access_support_tickets" ON support_tickets
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2.13 promo_codes
DROP POLICY IF EXISTS "admin_full_access_promo_codes" ON promo_codes;
CREATE POLICY "admin_full_access_promo_codes" ON promo_codes
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2.14 user_notifications
DROP POLICY IF EXISTS "admin_full_access_user_notifications" ON user_notifications;
CREATE POLICY "admin_full_access_user_notifications" ON user_notifications
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2.15 ride_ratings
DROP POLICY IF EXISTS "admin_full_access_ride_ratings" ON ride_ratings;
CREATE POLICY "admin_full_access_ride_ratings" ON ride_ratings
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2.16 delivery_ratings
DROP POLICY IF EXISTS "admin_full_access_delivery_ratings" ON delivery_ratings;
CREATE POLICY "admin_full_access_delivery_ratings" ON delivery_ratings
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2.17 shopping_ratings
DROP POLICY IF EXISTS "admin_full_access_shopping_ratings" ON shopping_ratings;
CREATE POLICY "admin_full_access_shopping_ratings" ON shopping_ratings
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2.18 refunds
DROP POLICY IF EXISTS "admin_full_access_refunds" ON refunds;
CREATE POLICY "admin_full_access_refunds" ON refunds
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2.19 scheduled_rides
DROP POLICY IF EXISTS "admin_full_access_scheduled_rides" ON scheduled_rides;
CREATE POLICY "admin_full_access_scheduled_rides" ON scheduled_rides
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2.20 user_subscriptions
DROP POLICY IF EXISTS "admin_full_access_user_subscriptions" ON user_subscriptions;
CREATE POLICY "admin_full_access_user_subscriptions" ON user_subscriptions
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2.21 insurance_claims
DROP POLICY IF EXISTS "admin_full_access_insurance_claims" ON insurance_claims;
CREATE POLICY "admin_full_access_insurance_claims" ON insurance_claims
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2.22 companies
DROP POLICY IF EXISTS "admin_full_access_companies" ON companies;
CREATE POLICY "admin_full_access_companies" ON companies
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- 3. RPC FUNCTIONS FOR ADMIN (BYPASS RLS)
-- =====================================================

-- 3.1 Get all orders for admin (combined from all tables)
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
  user_email TEXT,
  member_uid TEXT,
  provider_id UUID,
  provider_name TEXT,
  pickup_address TEXT,
  destination_address TEXT,
  amount NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH all_orders AS (
    -- Rides
    SELECT 
      r.id,
      'ride'::TEXT as type,
      r.tracking_id,
      r.status,
      r.user_id,
      COALESCE(u.name, u.first_name || ' ' || u.last_name, u.email) as user_name,
      COALESCE(u.phone, u.phone_number) as user_phone,
      u.email as user_email,
      u.member_uid,
      r.provider_id,
      COALESCE(pu.name, pu.first_name || ' ' || pu.last_name) as provider_name,
      r.pickup_address,
      r.destination_address,
      COALESCE(r.final_fare, r.estimated_fare, 0)::NUMERIC as amount,
      r.created_at,
      r.updated_at
    FROM ride_requests r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN service_providers sp ON r.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE (p_type IS NULL OR p_type = 'ride')
      AND (p_status IS NULL OR r.status = p_status)
    
    UNION ALL
    
    -- Deliveries
    SELECT 
      d.id,
      'delivery'::TEXT as type,
      d.tracking_id,
      d.status,
      d.user_id,
      COALESCE(u.name, u.first_name || ' ' || u.last_name, u.email) as user_name,
      COALESCE(u.phone, u.phone_number) as user_phone,
      u.email as user_email,
      u.member_uid,
      d.provider_id,
      COALESCE(pu.name, pu.first_name || ' ' || pu.last_name) as provider_name,
      d.sender_address as pickup_address,
      d.recipient_address as destination_address,
      COALESCE(d.estimated_fee, 0)::NUMERIC as amount,
      d.created_at,
      d.updated_at
    FROM delivery_requests d
    LEFT JOIN users u ON d.user_id = u.id
    LEFT JOIN service_providers sp ON d.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE (p_type IS NULL OR p_type = 'delivery')
      AND (p_status IS NULL OR d.status = p_status)
    
    UNION ALL
    
    -- Shopping
    SELECT 
      s.id,
      'shopping'::TEXT as type,
      s.tracking_id,
      s.status,
      s.user_id,
      COALESCE(u.name, u.first_name || ' ' || u.last_name, u.email) as user_name,
      COALESCE(u.phone, u.phone_number) as user_phone,
      u.email as user_email,
      u.member_uid,
      s.provider_id,
      COALESCE(pu.name, pu.first_name || ' ' || pu.last_name) as provider_name,
      s.store_name as pickup_address,
      s.delivery_address as destination_address,
      COALESCE(s.service_fee, 0)::NUMERIC as amount,
      s.created_at,
      s.updated_at
    FROM shopping_requests s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN service_providers sp ON s.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE (p_type IS NULL OR p_type = 'shopping')
      AND (p_status IS NULL OR s.status = p_status)
    
    UNION ALL
    
    -- Queue Bookings
    SELECT 
      q.id,
      'queue'::TEXT as type,
      q.tracking_id,
      q.status,
      q.user_id,
      COALESCE(u.name, u.first_name || ' ' || u.last_name, u.email) as user_name,
      COALESCE(u.phone, u.phone_number) as user_phone,
      u.email as user_email,
      u.member_uid,
      q.provider_id,
      COALESCE(pu.name, pu.first_name || ' ' || pu.last_name) as provider_name,
      q.location_name as pickup_address,
      '' as destination_address,
      COALESCE(q.service_fee, 0)::NUMERIC as amount,
      q.created_at,
      q.updated_at
    FROM queue_bookings q
    LEFT JOIN users u ON q.user_id = u.id
    LEFT JOIN service_providers sp ON q.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE (p_type IS NULL OR p_type = 'queue')
      AND (p_status IS NULL OR q.status = p_status)
    
    UNION ALL
    
    -- Moving Requests
    SELECT 
      m.id,
      'moving'::TEXT as type,
      m.tracking_id,
      m.status,
      m.user_id,
      COALESCE(u.name, u.first_name || ' ' || u.last_name, u.email) as user_name,
      COALESCE(u.phone, u.phone_number) as user_phone,
      u.email as user_email,
      u.member_uid,
      m.provider_id,
      COALESCE(pu.name, pu.first_name || ' ' || pu.last_name) as provider_name,
      m.pickup_address,
      m.delivery_address as destination_address,
      COALESCE(m.estimated_price, 0)::NUMERIC as amount,
      m.created_at,
      m.updated_at
    FROM moving_requests m
    LEFT JOIN users u ON m.user_id = u.id
    LEFT JOIN service_providers sp ON m.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE (p_type IS NULL OR p_type = 'moving')
      AND (p_status IS NULL OR m.status = p_status)
    
    UNION ALL
    
    -- Laundry Requests
    SELECT 
      l.id,
      'laundry'::TEXT as type,
      l.tracking_id,
      l.status,
      l.user_id,
      COALESCE(u.name, u.first_name || ' ' || u.last_name, u.email) as user_name,
      COALESCE(u.phone, u.phone_number) as user_phone,
      u.email as user_email,
      u.member_uid,
      l.provider_id,
      COALESCE(pu.name, pu.first_name || ' ' || pu.last_name) as provider_name,
      l.pickup_address,
      l.delivery_address as destination_address,
      COALESCE(l.total_price, 0)::NUMERIC as amount,
      l.created_at,
      l.updated_at
    FROM laundry_requests l
    LEFT JOIN users u ON l.user_id = u.id
    LEFT JOIN service_providers sp ON l.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE (p_type IS NULL OR p_type = 'laundry')
      AND (p_status IS NULL OR l.status = p_status)
  )
  SELECT * FROM all_orders
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.2 Count all orders for admin
CREATE OR REPLACE FUNCTION count_all_orders_for_admin(
  p_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
  total_count BIGINT := 0;
  ride_count BIGINT := 0;
  delivery_count BIGINT := 0;
  shopping_count BIGINT := 0;
  queue_count BIGINT := 0;
  moving_count BIGINT := 0;
  laundry_count BIGINT := 0;
BEGIN
  IF p_type IS NULL OR p_type = 'ride' THEN
    SELECT COUNT(*) INTO ride_count FROM ride_requests WHERE (p_status IS NULL OR status = p_status);
    total_count := total_count + ride_count;
  END IF;
  
  IF p_type IS NULL OR p_type = 'delivery' THEN
    SELECT COUNT(*) INTO delivery_count FROM delivery_requests WHERE (p_status IS NULL OR status = p_status);
    total_count := total_count + delivery_count;
  END IF;
  
  IF p_type IS NULL OR p_type = 'shopping' THEN
    SELECT COUNT(*) INTO shopping_count FROM shopping_requests WHERE (p_status IS NULL OR status = p_status);
    total_count := total_count + shopping_count;
  END IF;
  
  IF p_type IS NULL OR p_type = 'queue' THEN
    SELECT COUNT(*) INTO queue_count FROM queue_bookings WHERE (p_status IS NULL OR status = p_status);
    total_count := total_count + queue_count;
  END IF;
  
  IF p_type IS NULL OR p_type = 'moving' THEN
    SELECT COUNT(*) INTO moving_count FROM moving_requests WHERE (p_status IS NULL OR status = p_status);
    total_count := total_count + moving_count;
  END IF;
  
  IF p_type IS NULL OR p_type = 'laundry' THEN
    SELECT COUNT(*) INTO laundry_count FROM laundry_requests WHERE (p_status IS NULL OR status = p_status);
    total_count := total_count + laundry_count;
  END IF;
  
  RETURN total_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.3 Get dashboard stats for admin
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
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM users)::BIGINT as total_users,
    (SELECT COUNT(*) FROM service_providers)::BIGINT as total_providers,
    (SELECT COUNT(*) FROM service_providers WHERE is_available = true)::BIGINT as online_providers,
    (SELECT COUNT(*) FROM ride_requests)::BIGINT as total_rides,
    (SELECT COUNT(*) FROM ride_requests WHERE status IN ('pending', 'matched', 'pickup', 'in_progress'))::BIGINT as active_rides,
    (SELECT COUNT(*) FROM delivery_requests)::BIGINT as total_deliveries,
    (SELECT COUNT(*) FROM shopping_requests)::BIGINT as total_shopping,
    (SELECT COALESCE(SUM(COALESCE(final_fare, estimated_fare, 0)), 0) FROM ride_requests WHERE status = 'completed')::NUMERIC as total_revenue,
    (SELECT COUNT(*) FROM service_providers WHERE is_verified = false)::BIGINT as pending_verifications,
    (SELECT COUNT(*) FROM support_tickets WHERE status IN ('open', 'in_progress'))::BIGINT as open_tickets,
    (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'active')::BIGINT as active_subscriptions,
    (SELECT COUNT(*) FROM insurance_claims WHERE status IN ('submitted', 'under_review'))::BIGINT as pending_insurance_claims,
    (SELECT COUNT(*) FROM scheduled_rides WHERE status IN ('scheduled', 'confirmed'))::BIGINT as scheduled_rides,
    (SELECT COUNT(*) FROM companies WHERE status = 'active')::BIGINT as active_companies;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.4 Get all users for admin
CREATE OR REPLACE FUNCTION get_all_users_for_admin(
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  phone_number TEXT,
  member_uid TEXT,
  role TEXT,
  is_active BOOLEAN,
  verification_status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.name,
    u.first_name,
    u.last_name,
    u.phone,
    u.phone_number,
    u.member_uid,
    u.role,
    COALESCE(u.is_active, true) as is_active,
    COALESCE(u.verification_status, 'pending') as verification_status,
    u.created_at,
    u.updated_at
  FROM users u
  WHERE (p_status IS NULL OR 
         (p_status = 'active' AND COALESCE(u.is_active, true) = true) OR
         (p_status = 'inactive' AND COALESCE(u.is_active, true) = false))
    AND (p_search IS NULL OR 
         u.name ILIKE '%' || p_search || '%' OR
         u.email ILIKE '%' || p_search || '%' OR
         u.phone ILIKE '%' || p_search || '%' OR
         u.phone_number ILIKE '%' || p_search || '%' OR
         u.first_name ILIKE '%' || p_search || '%' OR
         u.last_name ILIKE '%' || p_search || '%' OR
         u.member_uid ILIKE '%' || p_search || '%')
  ORDER BY u.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.5 Count users for admin
CREATE OR REPLACE FUNCTION count_users_for_admin(
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM users u
    WHERE (p_status IS NULL OR 
           (p_status = 'active' AND COALESCE(u.is_active, true) = true) OR
           (p_status = 'inactive' AND COALESCE(u.is_active, true) = false))
      AND (p_search IS NULL OR 
           u.name ILIKE '%' || p_search || '%' OR
           u.email ILIKE '%' || p_search || '%' OR
           u.phone ILIKE '%' || p_search || '%' OR
           u.phone_number ILIKE '%' || p_search || '%' OR
           u.first_name ILIKE '%' || p_search || '%' OR
           u.last_name ILIKE '%' || p_search || '%' OR
           u.member_uid ILIKE '%' || p_search || '%')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.6 Get all providers for admin
CREATE OR REPLACE FUNCTION get_all_providers_for_admin(
  p_status TEXT DEFAULT NULL,
  p_provider_type TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  provider_uid TEXT,
  provider_type TEXT,
  status TEXT,
  is_verified BOOLEAN,
  is_available BOOLEAN,
  allowed_services TEXT[],
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  rating NUMERIC,
  total_rides INT,
  total_earnings NUMERIC,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_email TEXT,
  user_first_name TEXT,
  user_last_name TEXT,
  user_phone TEXT,
  user_member_uid TEXT
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.user_id,
    sp.provider_uid,
    sp.provider_type,
    sp.status,
    COALESCE(sp.is_verified, false) as is_verified,
    COALESCE(sp.is_available, false) as is_available,
    sp.allowed_services,
    sp.current_lat,
    sp.current_lng,
    COALESCE(sp.rating, 0)::NUMERIC as rating,
    COALESCE(sp.total_rides, 0)::INT as total_rides,
    COALESCE(sp.total_earnings, 0)::NUMERIC as total_earnings,
    sp.rejection_reason,
    sp.created_at,
    sp.updated_at,
    u.email as user_email,
    u.first_name as user_first_name,
    u.last_name as user_last_name,
    COALESCE(u.phone, u.phone_number) as user_phone,
    u.member_uid as user_member_uid
  FROM service_providers sp
  LEFT JOIN users u ON sp.user_id = u.id
  WHERE (p_status IS NULL OR sp.status = p_status)
    AND (p_provider_type IS NULL OR sp.provider_type = p_provider_type)
  ORDER BY sp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.7 Count providers for admin
CREATE OR REPLACE FUNCTION count_providers_for_admin(
  p_status TEXT DEFAULT NULL,
  p_provider_type TEXT DEFAULT NULL
)
RETURNS BIGINT AS $
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM service_providers sp
    WHERE (p_status IS NULL OR sp.status = p_status)
      AND (p_provider_type IS NULL OR sp.provider_type = p_provider_type)
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.8 Search providers for admin
CREATE OR REPLACE FUNCTION search_providers_for_admin(
  p_search_query TEXT,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  provider_uid TEXT,
  provider_type TEXT,
  status TEXT,
  is_verified BOOLEAN,
  is_available BOOLEAN,
  allowed_services TEXT[],
  rating NUMERIC,
  total_rides INT,
  created_at TIMESTAMPTZ,
  user_email TEXT,
  user_first_name TEXT,
  user_last_name TEXT,
  user_phone TEXT,
  user_member_uid TEXT
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.user_id,
    sp.provider_uid,
    sp.provider_type,
    sp.status,
    COALESCE(sp.is_verified, false) as is_verified,
    COALESCE(sp.is_available, false) as is_available,
    sp.allowed_services,
    COALESCE(sp.rating, 0)::NUMERIC as rating,
    COALESCE(sp.total_rides, 0)::INT as total_rides,
    sp.created_at,
    u.email as user_email,
    u.first_name as user_first_name,
    u.last_name as user_last_name,
    COALESCE(u.phone, u.phone_number) as user_phone,
    u.member_uid as user_member_uid
  FROM service_providers sp
  LEFT JOIN users u ON sp.user_id = u.id
  WHERE 
    sp.provider_uid ILIKE '%' || p_search_query || '%' OR
    u.email ILIKE '%' || p_search_query || '%' OR
    u.first_name ILIKE '%' || p_search_query || '%' OR
    u.last_name ILIKE '%' || p_search_query || '%' OR
    u.phone ILIKE '%' || p_search_query || '%' OR
    u.phone_number ILIKE '%' || p_search_query || '%' OR
    u.member_uid ILIKE '%' || p_search_query || '%' OR
    (u.first_name || ' ' || u.last_name) ILIKE '%' || p_search_query || '%'
  ORDER BY sp.created_at DESC
  LIMIT p_limit;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION count_all_orders_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION count_users_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_providers_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION count_providers_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION search_providers_for_admin TO authenticated;

-- =====================================================
-- 5. COMMENTS
-- =====================================================

COMMENT ON FUNCTION is_admin() IS 'Check if current user is admin';
COMMENT ON FUNCTION get_all_orders_for_admin IS 'Get all orders from all service tables for admin dashboard';
COMMENT ON FUNCTION count_all_orders_for_admin IS 'Count all orders for admin pagination';
COMMENT ON FUNCTION get_admin_dashboard_stats IS 'Get dashboard statistics for admin';
COMMENT ON FUNCTION get_all_users_for_admin IS 'Get all users with search and filter for admin';
COMMENT ON FUNCTION count_users_for_admin IS 'Count users for admin pagination';

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Admin full access policies created';
  RAISE NOTICE '✓ Admin RPC functions created';
  RAISE NOTICE '✓ Permissions granted';
END $$;
