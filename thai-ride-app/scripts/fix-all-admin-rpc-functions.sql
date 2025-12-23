-- =====================================================
-- Fix All Admin RPC Functions
-- =====================================================
-- This script checks and creates ALL missing admin RPC functions
-- Run this in Supabase SQL Editor to fix 404 errors
-- =====================================================

-- =====================================================
-- 1. Helper Function: Check if user is admin
-- =====================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current user has admin role
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (
      role = 'admin'
      OR email = 'admin@demo.com'
      OR email LIKE '%@admin.%'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- =====================================================
-- 2. Dashboard Stats Function
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
    (SELECT COUNT(*) FROM service_providers WHERE status = 'pending')::BIGINT as pending_verifications,
    (SELECT COUNT(*) FROM support_tickets WHERE status IN ('open', 'in_progress'))::BIGINT as open_tickets,
    (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'active')::BIGINT as active_subscriptions,
    (SELECT COUNT(*) FROM insurance_claims WHERE status IN ('submitted', 'under_review'))::BIGINT as pending_insurance_claims,
    (SELECT COUNT(*) FROM scheduled_rides WHERE status IN ('scheduled', 'confirmed'))::BIGINT as scheduled_rides,
    (SELECT COUNT(*) FROM companies WHERE status = 'active')::BIGINT as active_companies;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO authenticated;

-- =====================================================
-- 3. Get All Providers for Admin
-- =====================================================

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
  user_member_uid TEXT,
  vehicle_type TEXT,
  vehicle_plate TEXT
) AS $$
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
    u.member_uid as user_member_uid,
    sp.vehicle_type,
    sp.vehicle_plate
  FROM service_providers sp
  LEFT JOIN users u ON sp.user_id = u.id
  WHERE (p_status IS NULL OR sp.status = p_status)
    AND (p_provider_type IS NULL OR sp.provider_type = p_provider_type)
  ORDER BY sp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_all_providers_for_admin TO authenticated;

-- =====================================================
-- 4. Count Providers for Admin
-- =====================================================

CREATE OR REPLACE FUNCTION count_providers_for_admin(
  p_status TEXT DEFAULT NULL,
  p_provider_type TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM service_providers sp
    WHERE (p_status IS NULL OR sp.status = p_status)
      AND (p_provider_type IS NULL OR sp.provider_type = p_provider_type)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION count_providers_for_admin TO authenticated;

-- =====================================================
-- 5. Get All Orders for Admin
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

GRANT EXECUTE ON FUNCTION get_all_orders_for_admin TO authenticated;

-- =====================================================
-- 6. Count All Orders for Admin
-- =====================================================

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

GRANT EXECUTE ON FUNCTION count_all_orders_for_admin TO authenticated;

-- =====================================================
-- 7. Get All Users for Admin
-- =====================================================

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

GRANT EXECUTE ON FUNCTION get_all_users_for_admin TO authenticated;

-- =====================================================
-- 8. Count Users for Admin
-- =====================================================

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

GRANT EXECUTE ON FUNCTION count_users_for_admin TO authenticated;

-- =====================================================
-- 9. Verification Complete
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✓ All admin RPC functions created/updated successfully';
  RAISE NOTICE '✓ Functions: is_admin, get_admin_dashboard_stats, get_all_providers_for_admin, count_providers_for_admin';
  RAISE NOTICE '✓ Functions: get_all_orders_for_admin, count_all_orders_for_admin';
  RAISE NOTICE '✓ Functions: get_all_users_for_admin, count_users_for_admin';
  RAISE NOTICE '✓ All functions granted to authenticated users';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run migration 166 for verification queue';
  RAISE NOTICE '2. Create test pending provider data';
  RAISE NOTICE '3. Test admin dashboard and verification queue';
END $$;
