-- =====================================================
-- Migration 177: Complete Admin Dashboard Fix
-- แก้ไขปัญหาข้อมูลไม่แสดงใน Admin Dashboard
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
DROP FUNCTION IF EXISTS get_reorderable_items(UUID, INTEGER) CASCADE;

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
  
  -- Providers count
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

  -- Deliveries
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
  
  -- Shopping
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
-- 6. GET ACTIVE PROVIDERS LOCATIONS
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
-- 7. GET REORDERABLE ITEMS (Fix 404 error)
-- =====================================================
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
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
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
  RETURN;
END;
$$;

-- =====================================================
-- 8. FIX ANALYTICS_EVENTS RLS
-- =====================================================
DO $$
BEGIN
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
  
  ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
  
  DROP POLICY IF EXISTS "anon_insert_analytics" ON analytics_events;
  DROP POLICY IF EXISTS "authenticated_insert_analytics" ON analytics_events;
  DROP POLICY IF EXISTS "authenticated_read_own_analytics" ON analytics_events;
  
  CREATE POLICY "anon_insert_analytics" ON analytics_events FOR INSERT TO anon WITH CHECK (true);
  CREATE POLICY "authenticated_insert_analytics" ON analytics_events FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "authenticated_read_own_analytics" ON analytics_events FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
END $$;

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_all_orders_for_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_all_providers_for_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_providers_for_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_active_providers_locations TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_reorderable_items TO anon, authenticated, service_role;
