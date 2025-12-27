-- =====================================================
-- COMPLETE FIX V2: Admin Dashboard Functions
-- แก้ไขปัญหาข้อมูลไม่แสดงใน Admin Dashboard
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_admin_dashboard_stats() CASCADE;
DROP FUNCTION IF EXISTS get_all_orders_for_admin(TEXT, TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_all_orders_for_admin(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_all_providers_for_admin(TEXT, TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_providers_for_admin(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_all_deliveries_for_admin(TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_deliveries_for_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_all_shopping_for_admin(TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_shopping_for_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_active_providers_locations() CASCADE;

-- =====================================================
-- 1. DASHBOARD STATS
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
  
  -- Providers count (use is_available, handle both column names)
  SELECT COUNT(*) INTO v_total_providers FROM service_providers;
  BEGIN
    SELECT COUNT(*) INTO v_online_providers FROM service_providers WHERE is_available = true;
  EXCEPTION WHEN undefined_column THEN
    BEGIN
      SELECT COUNT(*) INTO v_online_providers FROM service_providers WHERE is_online = true;
    EXCEPTION WHEN undefined_column THEN
      v_online_providers := 0;
    END;
  END;
  SELECT COUNT(*) INTO v_pending_verifications FROM service_providers WHERE status = 'pending' OR is_verified = false;
  
  -- Rides count
  SELECT COUNT(*) INTO v_total_rides FROM ride_requests;
  SELECT COUNT(*) INTO v_active_rides FROM ride_requests WHERE status IN ('pending', 'matched', 'pickup', 'in_progress');
  SELECT COALESCE(SUM(COALESCE(final_fare, actual_fare, estimated_fare, 0)), 0) INTO v_total_revenue FROM ride_requests WHERE status = 'completed';

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
  
  -- Support tickets (optional)
  BEGIN
    SELECT COUNT(*) INTO v_open_tickets FROM support_tickets WHERE status IN ('open', 'in_progress');
  EXCEPTION WHEN undefined_table THEN
    v_open_tickets := 0;
  END;
  
  -- Subscriptions (optional)
  BEGIN
    SELECT COUNT(*) INTO v_active_subscriptions FROM user_subscriptions WHERE status = 'active';
  EXCEPTION WHEN undefined_table THEN
    v_active_subscriptions := 0;
  END;
  
  -- Insurance claims (optional)
  BEGIN
    SELECT COUNT(*) INTO v_pending_insurance_claims FROM insurance_claims WHERE status IN ('submitted', 'under_review');
  EXCEPTION WHEN undefined_table THEN
    v_pending_insurance_claims := 0;
  END;
  
  -- Scheduled rides (optional)
  BEGIN
    SELECT COUNT(*) INTO v_scheduled_rides FROM scheduled_rides WHERE status IN ('scheduled', 'confirmed');
  EXCEPTION WHEN undefined_table THEN
    v_scheduled_rides := 0;
  END;
  
  -- Companies (optional)
  BEGIN
    SELECT COUNT(*) INTO v_active_companies FROM companies WHERE status = 'active';
  EXCEPTION WHEN undefined_table THEN
    v_active_companies := 0;
  END;
  
  RETURN QUERY SELECT 
    v_total_users, v_total_providers, v_online_providers, v_total_rides, v_active_rides,
    v_total_deliveries, v_total_shopping, v_total_revenue, v_pending_verifications,
    v_open_tickets, v_active_subscriptions, v_pending_insurance_claims, v_scheduled_rides, v_active_companies;
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
  -- Rides
  SELECT 
    r.id,
    'ride'::TEXT as type,
    COALESCE(r.tracking_id, 'RID-' || LEFT(r.id::TEXT, 8))::TEXT as tracking_id,
    r.status::TEXT,
    r.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.name, u.email, 'Unknown')::TEXT as user_name,
    COALESCE(u.phone_number, u.phone, '')::TEXT as user_phone,
    r.provider_id,
    CASE WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.name, '') ELSE '' END::TEXT as provider_name,
    COALESCE(r.pickup_address, '')::TEXT as pickup_address,
    COALESCE(r.destination_address, '')::TEXT as destination_address,
    COALESCE(r.final_fare, r.actual_fare, r.estimated_fare, 0)::NUMERIC as amount,
    r.created_at
  FROM ride_requests r
  LEFT JOIN users u ON r.user_id = u.id
  LEFT JOIN service_providers sp ON r.provider_id = sp.id
  LEFT JOIN users pu ON sp.user_id = pu.id
  WHERE (p_type IS NULL OR p_type = '' OR p_type = 'ride' OR p_type = 'all')
    AND (p_status IS NULL OR p_status = '' OR r.status = p_status)
  
  UNION ALL

  -- Deliveries (use sender_address, recipient_address, actual_fee)
  SELECT 
    d.id,
    'delivery'::TEXT as type,
    COALESCE(d.tracking_id, 'DEL-' || LEFT(d.id::TEXT, 8))::TEXT as tracking_id,
    d.status::TEXT,
    d.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.name, u.email, 'Unknown')::TEXT as user_name,
    COALESCE(u.phone_number, u.phone, '')::TEXT as user_phone,
    d.provider_id,
    CASE WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.name, '') ELSE '' END::TEXT as provider_name,
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
  
  -- Shopping (use store_name, store_address, delivery_address, total_cost)
  SELECT 
    s.id,
    'shopping'::TEXT as type,
    COALESCE(s.tracking_id, 'SHP-' || LEFT(s.id::TEXT, 8))::TEXT as tracking_id,
    s.status::TEXT,
    s.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.name, u.email, 'Unknown')::TEXT as user_name,
    COALESCE(u.phone_number, u.phone, '')::TEXT as user_phone,
    s.provider_id,
    CASE WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.name, '') ELSE '' END::TEXT as provider_name,
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
  LIMIT p_limit OFFSET p_offset;
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
    EXCEPTION WHEN undefined_table THEN NULL;
    END;
  END IF;
  
  IF p_type IS NULL OR p_type = '' OR p_type = 'shopping' OR p_type = 'all' THEN
    BEGIN
      SELECT COUNT(*)::INT INTO v_temp FROM shopping_requests WHERE (p_status IS NULL OR p_status = '' OR status = p_status);
      v_count := v_count + COALESCE(v_temp, 0);
    EXCEPTION WHEN undefined_table THEN NULL;
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
    COALESCE(sp.status, sp.background_check_status, 'pending')::TEXT as status,
    COALESCE(sp.is_available, sp.is_online, false) as is_available,
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
  WHERE (p_status IS NULL OR p_status = '' OR sp.status = p_status OR sp.background_check_status = p_status)
    AND (p_provider_type IS NULL OR p_provider_type = '' OR sp.provider_type = p_provider_type)
  ORDER BY sp.created_at DESC
  LIMIT p_limit OFFSET p_offset;
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
  WHERE (p_status IS NULL OR p_status = '' OR status = p_status OR background_check_status = p_status)
    AND (p_provider_type IS NULL OR p_provider_type = '' OR provider_type = p_provider_type);
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. GET ALL DELIVERIES FOR ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION get_all_deliveries_for_admin(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID, tracking_id TEXT, status TEXT, user_id UUID, user_name TEXT, user_phone TEXT,
  provider_id UUID, provider_name TEXT, provider_phone TEXT, pickup_address TEXT,
  destination_address TEXT, amount NUMERIC, payment_method TEXT, created_at TIMESTAMPTZ,
  matched_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    COALESCE(d.tracking_id, 'DEL-' || LEFT(d.id::TEXT, 8))::TEXT,
    d.status::TEXT,
    d.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.name, 'Unknown')::TEXT,
    COALESCE(u.phone_number, u.phone, '')::TEXT,
    d.provider_id,
    CASE WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.name, '') ELSE '' END::TEXT,
    CASE WHEN sp.id IS NOT NULL THEN COALESCE(pu.phone_number, pu.phone, '') ELSE '' END::TEXT,
    COALESCE(d.sender_address, '')::TEXT,
    COALESCE(d.recipient_address, '')::TEXT,
    COALESCE(d.actual_fee, d.estimated_fee, 0)::NUMERIC,
    COALESCE(d.payment_method, 'cash')::TEXT,
    d.created_at,
    d.matched_at,
    d.completed_at,
    d.cancelled_at
  FROM delivery_requests d
  LEFT JOIN users u ON d.user_id = u.id
  LEFT JOIN service_providers sp ON d.provider_id = sp.id
  LEFT JOIN users pu ON sp.user_id = pu.id
  WHERE (p_status IS NULL OR p_status = '' OR d.status = p_status)
  ORDER BY d.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. COUNT DELIVERIES FOR ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION count_deliveries_for_admin(p_status TEXT DEFAULT NULL)
RETURNS INT AS $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*)::INT INTO v_count FROM delivery_requests WHERE (p_status IS NULL OR p_status = '' OR status = p_status);
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. GET ALL SHOPPING FOR ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION get_all_shopping_for_admin(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID, tracking_id TEXT, status TEXT, user_id UUID, user_name TEXT, user_phone TEXT,
  provider_id UUID, provider_name TEXT, provider_phone TEXT, store_address TEXT,
  delivery_address TEXT, amount NUMERIC, payment_method TEXT, shopping_list TEXT,
  created_at TIMESTAMPTZ, matched_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    COALESCE(s.tracking_id, 'SHP-' || LEFT(s.id::TEXT, 8))::TEXT,
    s.status::TEXT,
    s.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.name, 'Unknown')::TEXT,
    COALESCE(u.phone_number, u.phone, '')::TEXT,
    s.provider_id,
    CASE WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.name, '') ELSE '' END::TEXT,
    CASE WHEN sp.id IS NOT NULL THEN COALESCE(pu.phone_number, pu.phone, '') ELSE '' END::TEXT,
    COALESCE(s.store_name || ' - ' || s.store_address, s.store_address, '')::TEXT,
    COALESCE(s.delivery_address, '')::TEXT,
    COALESCE(s.total_cost, s.service_fee, 0)::NUMERIC,
    COALESCE(s.payment_method, 'cash')::TEXT,
    COALESCE(s.item_list, '')::TEXT,
    s.created_at,
    s.matched_at,
    s.completed_at,
    s.cancelled_at
  FROM shopping_requests s
  LEFT JOIN users u ON s.user_id = u.id
  LEFT JOIN service_providers sp ON s.provider_id = sp.id
  LEFT JOIN users pu ON sp.user_id = pu.id
  WHERE (p_status IS NULL OR p_status = '' OR s.status = p_status)
  ORDER BY s.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. COUNT SHOPPING FOR ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION count_shopping_for_admin(p_status TEXT DEFAULT NULL)
RETURNS INT AS $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*)::INT INTO v_count FROM shopping_requests WHERE (p_status IS NULL OR p_status = '' OR status = p_status);
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. GET ACTIVE PROVIDERS LOCATIONS
-- =====================================================
CREATE OR REPLACE FUNCTION get_active_providers_locations()
RETURNS TABLE (
  id UUID, provider_uid TEXT, provider_type TEXT, user_name TEXT, phone_number TEXT,
  current_lat NUMERIC, current_lng NUMERIC, is_online BOOLEAN, rating NUMERIC,
  total_trips INT, last_updated TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    COALESCE(sp.provider_uid, 'PRV-' || LEFT(sp.id::TEXT, 8))::TEXT,
    sp.provider_type::TEXT,
    COALESCE(u.first_name || ' ' || u.last_name, u.name, '')::TEXT,
    COALESCE(u.phone_number, u.phone, '')::TEXT,
    sp.current_lat::NUMERIC,
    sp.current_lng::NUMERIC,
    COALESCE(sp.is_available, sp.is_online, false),
    COALESCE(sp.rating, 0)::NUMERIC,
    COALESCE(sp.total_trips, sp.total_rides, 0)::INT,
    sp.updated_at
  FROM service_providers sp
  LEFT JOIN users u ON sp.user_id = u.id
  WHERE (sp.status = 'approved' OR sp.status = 'active' OR sp.background_check_status = 'approved')
    AND (sp.is_available = true OR sp.is_online = true)
    AND sp.current_lat IS NOT NULL AND sp.current_lng IS NOT NULL
  ORDER BY sp.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_all_orders_for_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_providers_for_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_providers_for_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_deliveries_for_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_deliveries_for_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_shopping_for_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_shopping_for_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_active_providers_locations TO anon, authenticated, service_role;

-- =====================================================
-- 12. ADD MISSING COLUMNS IF NOT EXIST
-- =====================================================
DO $$
BEGIN
  -- Add is_available if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_providers' AND column_name = 'is_available') THEN
    ALTER TABLE service_providers ADD COLUMN is_available BOOLEAN DEFAULT false;
  END IF;
  
  -- Add status if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_providers' AND column_name = 'status') THEN
    ALTER TABLE service_providers ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;
  
  -- Add is_verified if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_providers' AND column_name = 'is_verified') THEN
    ALTER TABLE service_providers ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;
  
  -- Add total_rides if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_providers' AND column_name = 'total_rides') THEN
    ALTER TABLE service_providers ADD COLUMN total_rides INT DEFAULT 0;
  END IF;
  
  -- Add total_earnings if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_providers' AND column_name = 'total_earnings') THEN
    ALTER TABLE service_providers ADD COLUMN total_earnings NUMERIC DEFAULT 0;
  END IF;
  
  -- Add provider_uid if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_providers' AND column_name = 'provider_uid') THEN
    ALTER TABLE service_providers ADD COLUMN provider_uid VARCHAR(20);
  END IF;
  
  -- Add tracking_id to ride_requests if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ride_requests' AND column_name = 'tracking_id') THEN
    ALTER TABLE ride_requests ADD COLUMN tracking_id TEXT;
  END IF;
  
  -- Add final_fare to ride_requests if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ride_requests' AND column_name = 'final_fare') THEN
    ALTER TABLE ride_requests ADD COLUMN final_fare NUMERIC;
  END IF;
  
  -- Add matched_at to delivery_requests if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_requests' AND column_name = 'matched_at') THEN
    ALTER TABLE delivery_requests ADD COLUMN matched_at TIMESTAMPTZ;
  END IF;
  
  -- Add completed_at to delivery_requests if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_requests' AND column_name = 'completed_at') THEN
    ALTER TABLE delivery_requests ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
  
  -- Add cancelled_at to delivery_requests if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_requests' AND column_name = 'cancelled_at') THEN
    ALTER TABLE delivery_requests ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;
  
  -- Add payment_method to delivery_requests if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_requests' AND column_name = 'payment_method') THEN
    ALTER TABLE delivery_requests ADD COLUMN payment_method TEXT DEFAULT 'cash';
  END IF;
  
  -- Add tracking_id to delivery_requests if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_requests' AND column_name = 'tracking_id') THEN
    ALTER TABLE delivery_requests ADD COLUMN tracking_id TEXT;
  END IF;
  
  -- Add tracking_id to shopping_requests if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopping_requests' AND column_name = 'tracking_id') THEN
    ALTER TABLE shopping_requests ADD COLUMN tracking_id TEXT;
  END IF;
  
  -- Add matched_at to shopping_requests if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopping_requests' AND column_name = 'matched_at') THEN
    ALTER TABLE shopping_requests ADD COLUMN matched_at TIMESTAMPTZ;
  END IF;
  
  -- Add completed_at to shopping_requests if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopping_requests' AND column_name = 'completed_at') THEN
    ALTER TABLE shopping_requests ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
  
  -- Add cancelled_at to shopping_requests if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopping_requests' AND column_name = 'cancelled_at') THEN
    ALTER TABLE shopping_requests ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;
  
  -- Add payment_method to shopping_requests if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopping_requests' AND column_name = 'payment_method') THEN
    ALTER TABLE shopping_requests ADD COLUMN payment_method TEXT DEFAULT 'cash';
  END IF;
END $$;

-- =====================================================
-- 13. SEED DEMO DATA IF EMPTY
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
    RAISE NOTICE 'Creating demo data...';
    
    -- Create demo customer
    INSERT INTO users (email, first_name, last_name, phone_number, member_uid, verification_status, created_at)
    VALUES ('customer@demo.com', 'Demo', 'Customer', '0812345678', 'TRD-DEMO0001', 'verified', NOW())
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO v_customer_id;
    
    IF v_customer_id IS NULL THEN
      SELECT id INTO v_customer_id FROM users WHERE email = 'customer@demo.com';
    END IF;
    
    -- Create demo driver user
    INSERT INTO users (email, first_name, last_name, phone_number, member_uid, verification_status, created_at)
    VALUES ('driver@demo.com', 'Demo', 'Driver', '0898765432', 'TRD-DEMO0002', 'verified', NOW())
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO v_driver_user_id;
    
    IF v_driver_user_id IS NULL THEN
      SELECT id INTO v_driver_user_id FROM users WHERE email = 'driver@demo.com';
    END IF;
    
    -- Create demo provider
    IF v_driver_user_id IS NOT NULL THEN
      INSERT INTO service_providers (user_id, provider_type, status, is_available, is_verified, rating, provider_uid, created_at)
      VALUES (v_driver_user_id, 'driver', 'approved', true, true, 4.8, 'PRV-DEMO0001', NOW())
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_provider_id;
    END IF;
    
    -- Create demo ride
    IF v_customer_id IS NOT NULL THEN
      INSERT INTO ride_requests (user_id, pickup_address, destination_address, pickup_lat, pickup_lng, destination_lat, destination_lng, estimated_fare, status, tracking_id, created_at)
      VALUES (v_customer_id, 'Central World, Bangkok', 'Siam Paragon, Bangkok', 13.7466, 100.5391, 13.7460, 100.5347, 85.00, 'pending', 'RID-DEMO0001', NOW())
      ON CONFLICT DO NOTHING;
      
      -- Create demo delivery
      INSERT INTO delivery_requests (user_id, sender_name, sender_phone, sender_address, sender_lat, sender_lng, recipient_name, recipient_phone, recipient_address, recipient_lat, recipient_lng, package_description, package_weight, estimated_fee, status, tracking_id, created_at)
      VALUES (v_customer_id, 'Demo Sender', '0812345678', 'Central World', 13.7466, 100.5391, 'Demo Recipient', '0898765432', 'Siam Paragon', 13.7460, 100.5347, 'Test Package', 1.5, 50.00, 'pending', 'DEL-DEMO0001', NOW())
      ON CONFLICT DO NOTHING;
      
      -- Create demo shopping
      INSERT INTO shopping_requests (user_id, store_name, store_address, store_lat, store_lng, delivery_address, delivery_lat, delivery_lng, item_list, budget_limit, service_fee, status, tracking_id, created_at)
      VALUES (v_customer_id, 'Big C', 'Big C Ratchadamri', 13.7450, 100.5400, 'Home Address', 13.7500, 100.5450, 'Milk, Bread, Eggs', 500.00, 30.00, 'pending', 'SHP-DEMO0001', NOW())
      ON CONFLICT DO NOTHING;
    END IF;
    
    RAISE NOTICE 'Demo data created successfully';
  ELSE
    RAISE NOTICE 'Data already exists, skipping demo data creation';
  END IF;
END $$;

-- =====================================================
-- 14. FIX ANALYTICS_EVENTS RLS POLICY
-- =====================================================
DO $
BEGIN
  -- Create analytics_events table if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
    CREATE TABLE analytics_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id),
      session_id TEXT,
      event_name TEXT NOT NULL,
      event_category TEXT,
      properties JSONB DEFAULT '{}',
      page_url TEXT,
      device_type TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
    CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
  END IF;
  
  -- Enable RLS
  ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing policies
  DROP POLICY IF EXISTS "anon_insert_analytics" ON analytics_events;
  DROP POLICY IF EXISTS "authenticated_insert_analytics" ON analytics_events;
  DROP POLICY IF EXISTS "authenticated_read_own_analytics" ON analytics_events;
  DROP POLICY IF EXISTS "admin_full_access_analytics" ON analytics_events;
  
  -- Allow anonymous users to insert analytics (for tracking before login)
  CREATE POLICY "anon_insert_analytics" ON analytics_events
    FOR INSERT TO anon WITH CHECK (true);
  
  -- Allow authenticated users to insert analytics
  CREATE POLICY "authenticated_insert_analytics" ON analytics_events
    FOR INSERT TO authenticated WITH CHECK (true);
  
  -- Allow authenticated users to read their own analytics
  CREATE POLICY "authenticated_read_own_analytics" ON analytics_events
    FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
  
  -- Admin full access
  CREATE POLICY "admin_full_access_analytics" ON analytics_events
    FOR ALL TO authenticated USING (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );
    
  RAISE NOTICE 'analytics_events RLS policies updated';
END $;

-- =====================================================
-- 15. FIX GET_REORDERABLE_ITEMS FUNCTION
-- =====================================================
DROP FUNCTION IF EXISTS get_reorderable_items(UUID, INTEGER);

CREATE OR REPLACE FUNCTION get_reorderable_items(
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  service_type TEXT,
  from_location TEXT,
  to_location TEXT,
  completed_at TIMESTAMPTZ,
  reorder_count INTEGER,
  can_reorder BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_user_id UUID;
BEGIN
  -- Use provided user_id or auth.uid()
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Return empty if no user
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  
  -- Rides
  SELECT 
    r.id,
    'ride'::TEXT as service_type,
    COALESCE(r.pickup_address, '')::TEXT as from_location,
    COALESCE(r.destination_address, '')::TEXT as to_location,
    r.completed_at,
    COALESCE(r.reorder_count, 0)::INTEGER as reorder_count,
    TRUE as can_reorder
  FROM ride_requests r
  WHERE r.user_id = v_user_id
  AND r.status = 'completed'
  AND r.completed_at IS NOT NULL
  AND r.completed_at > NOW() - INTERVAL '30 days'
  
  UNION ALL
  
  -- Deliveries
  SELECT 
    d.id,
    'delivery'::TEXT,
    COALESCE(d.sender_address, '')::TEXT,
    COALESCE(d.recipient_address, '')::TEXT,
    d.completed_at,
    COALESCE(d.reorder_count, 0)::INTEGER,
    TRUE
  FROM delivery_requests d
  WHERE d.user_id = v_user_id
  AND d.status = 'completed'
  AND d.completed_at IS NOT NULL
  AND d.completed_at > NOW() - INTERVAL '30 days'
  
  ORDER BY completed_at DESC NULLS LAST
  LIMIT p_limit;
  
EXCEPTION WHEN OTHERS THEN
  -- Return empty on any error
  RETURN;
END;
$;

-- Grant to both anon and authenticated
GRANT EXECUTE ON FUNCTION get_reorderable_items TO anon, authenticated, service_role;

-- =====================================================
-- 16. QUEUE BOOKINGS ADMIN FUNCTIONS
-- =====================================================
DROP FUNCTION IF EXISTS get_all_queues_for_admin(TEXT, INT, INT);
DROP FUNCTION IF EXISTS count_queues_for_admin(TEXT);

CREATE OR REPLACE FUNCTION get_all_queues_for_admin(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID, tracking_id TEXT, status TEXT, user_id UUID, user_name TEXT, user_phone TEXT,
  provider_id UUID, provider_name TEXT, provider_phone TEXT, place_name TEXT,
  place_address TEXT, amount NUMERIC, payment_method TEXT, special_requests TEXT,
  created_at TIMESTAMPTZ, confirmed_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    COALESCE(q.tracking_id, 'QUE-' || LEFT(q.id::TEXT, 8))::TEXT,
    q.status::TEXT,
    q.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.name, 'Unknown')::TEXT,
    COALESCE(u.phone_number, u.phone, '')::TEXT,
    q.provider_id,
    CASE WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.name, '') ELSE '' END::TEXT,
    CASE WHEN sp.id IS NOT NULL THEN COALESCE(pu.phone_number, pu.phone, '') ELSE '' END::TEXT,
    COALESCE(q.service_name, q.location_name, '')::TEXT,
    COALESCE(q.location_address, '')::TEXT,
    COALESCE(q.service_fee, 0)::NUMERIC,
    COALESCE(q.payment_method, 'cash')::TEXT,
    COALESCE(q.notes, '')::TEXT,
    q.created_at,
    q.confirmed_at,
    q.completed_at,
    q.cancelled_at
  FROM queue_bookings q
  LEFT JOIN users u ON q.user_id = u.id
  LEFT JOIN service_providers sp ON q.provider_id = sp.id
  LEFT JOIN users pu ON sp.user_id = pu.id
  WHERE (p_status IS NULL OR p_status = '' OR q.status = p_status)
  ORDER BY q.created_at DESC
  LIMIT p_limit OFFSET p_offset;
EXCEPTION WHEN undefined_table THEN
  RETURN;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION count_queues_for_admin(p_status TEXT DEFAULT NULL)
RETURNS INT AS $
DECLARE v_count INT := 0;
BEGIN
  SELECT COUNT(*)::INT INTO v_count FROM queue_bookings WHERE (p_status IS NULL OR p_status = '' OR status = p_status);
  RETURN COALESCE(v_count, 0);
EXCEPTION WHEN undefined_table THEN
  RETURN 0;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_all_queues_for_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_queues_for_admin TO anon, authenticated, service_role;

-- =====================================================
-- 17. MOVING ADMIN FUNCTIONS
-- =====================================================
DROP FUNCTION IF EXISTS get_all_moving_for_admin(TEXT, INT, INT);
DROP FUNCTION IF EXISTS count_moving_for_admin(TEXT);

CREATE OR REPLACE FUNCTION get_all_moving_for_admin(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID, tracking_id TEXT, status TEXT, user_id UUID, user_name TEXT, user_phone TEXT,
  provider_id UUID, provider_name TEXT, provider_phone TEXT, pickup_address TEXT,
  destination_address TEXT, amount NUMERIC, payment_method TEXT, items_description TEXT,
  created_at TIMESTAMPTZ, matched_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    COALESCE(m.tracking_id, 'MOV-' || LEFT(m.id::TEXT, 8))::TEXT,
    m.status::TEXT,
    m.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.name, 'Unknown')::TEXT,
    COALESCE(u.phone_number, u.phone, '')::TEXT,
    m.provider_id,
    CASE WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.name, '') ELSE '' END::TEXT,
    CASE WHEN sp.id IS NOT NULL THEN COALESCE(pu.phone_number, pu.phone, '') ELSE '' END::TEXT,
    COALESCE(m.pickup_address, '')::TEXT,
    COALESCE(m.destination_address, '')::TEXT,
    COALESCE(m.total_price, m.estimated_price, 0)::NUMERIC,
    COALESCE(m.payment_method, 'cash')::TEXT,
    COALESCE(m.items_description, '')::TEXT,
    m.created_at,
    m.matched_at,
    m.completed_at,
    m.cancelled_at
  FROM moving_requests m
  LEFT JOIN users u ON m.user_id = u.id
  LEFT JOIN service_providers sp ON m.provider_id = sp.id
  LEFT JOIN users pu ON sp.user_id = pu.id
  WHERE (p_status IS NULL OR p_status = '' OR m.status = p_status)
  ORDER BY m.created_at DESC
  LIMIT p_limit OFFSET p_offset;
EXCEPTION WHEN undefined_table THEN
  RETURN;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION count_moving_for_admin(p_status TEXT DEFAULT NULL)
RETURNS INT AS $
DECLARE v_count INT := 0;
BEGIN
  SELECT COUNT(*)::INT INTO v_count FROM moving_requests WHERE (p_status IS NULL OR p_status = '' OR status = p_status);
  RETURN COALESCE(v_count, 0);
EXCEPTION WHEN undefined_table THEN
  RETURN 0;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_all_moving_for_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_moving_for_admin TO anon, authenticated, service_role;

-- =====================================================
-- 18. LAUNDRY ADMIN FUNCTIONS
-- =====================================================
DROP FUNCTION IF EXISTS get_all_laundry_for_admin(TEXT, INT, INT);
DROP FUNCTION IF EXISTS count_laundry_for_admin(TEXT);

CREATE OR REPLACE FUNCTION get_all_laundry_for_admin(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID, tracking_id TEXT, status TEXT, user_id UUID, user_name TEXT, user_phone TEXT,
  provider_id UUID, provider_name TEXT, provider_phone TEXT, pickup_address TEXT,
  amount NUMERIC, payment_method TEXT, notes TEXT,
  created_at TIMESTAMPTZ, matched_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    COALESCE(l.tracking_id, 'LAU-' || LEFT(l.id::TEXT, 8))::TEXT,
    l.status::TEXT,
    l.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.name, 'Unknown')::TEXT,
    COALESCE(u.phone_number, u.phone, '')::TEXT,
    l.provider_id,
    CASE WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.name, '') ELSE '' END::TEXT,
    CASE WHEN sp.id IS NOT NULL THEN COALESCE(pu.phone_number, pu.phone, '') ELSE '' END::TEXT,
    COALESCE(l.pickup_address, '')::TEXT,
    COALESCE(l.total_price, l.estimated_price, 0)::NUMERIC,
    COALESCE(l.payment_method, 'cash')::TEXT,
    COALESCE(l.notes, '')::TEXT,
    l.created_at,
    l.matched_at,
    l.delivered_at,
    l.cancelled_at
  FROM laundry_requests l
  LEFT JOIN users u ON l.user_id = u.id
  LEFT JOIN service_providers sp ON l.provider_id = sp.id
  LEFT JOIN users pu ON sp.user_id = pu.id
  WHERE (p_status IS NULL OR p_status = '' OR l.status = p_status)
  ORDER BY l.created_at DESC
  LIMIT p_limit OFFSET p_offset;
EXCEPTION WHEN undefined_table THEN
  RETURN;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION count_laundry_for_admin(p_status TEXT DEFAULT NULL)
RETURNS INT AS $
DECLARE v_count INT := 0;
BEGIN
  SELECT COUNT(*)::INT INTO v_count FROM laundry_requests WHERE (p_status IS NULL OR p_status = '' OR status = p_status);
  RETURN COALESCE(v_count, 0);
EXCEPTION WHEN undefined_table THEN
  RETURN 0;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_all_laundry_for_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_laundry_for_admin TO anon, authenticated, service_role;

-- =====================================================
-- 19. TEST QUERIES
-- =====================================================
SELECT '=== Dashboard Stats ===' as test;
SELECT * FROM get_admin_dashboard_stats();

SELECT '=== Orders (limit 5) ===' as test;
SELECT id, type, tracking_id, status, user_name, amount FROM get_all_orders_for_admin(NULL, NULL, 5, 0);

SELECT '=== Order Count ===' as test;
SELECT count_all_orders_for_admin(NULL, NULL) as total_orders;

SELECT '=== Providers (limit 5) ===' as test;
SELECT id, provider_uid, provider_type, status, is_available, user_first_name FROM get_all_providers_for_admin(NULL, NULL, 5, 0);

SELECT '=== Provider Count ===' as test;
SELECT count_providers_for_admin(NULL, NULL) as total_providers;

SELECT '=== Reorderable Items Test ===' as test;
SELECT * FROM get_reorderable_items(NULL, 5);

SELECT '=== FIX COMPLETE ===' as status;
