-- =====================================================
-- Migration: 174_fix_admin_orders_column_names.sql
-- =====================================================
-- CRITICAL FIX: Changed actual_fare → final_fare
--               Changed actual_fee → final_fee
-- =====================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS get_all_orders_for_admin(TEXT, TEXT, INT, INT);
DROP FUNCTION IF EXISTS count_all_orders_for_admin(TEXT, TEXT);

-- =====================================================
-- 1. GET ALL ORDERS FOR ADMIN (Fixed column names)
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
  -- Rides (FIXED: final_fare instead of actual_fare)
  SELECT 
    r.id,
    'ride'::TEXT as type,
    COALESCE(r.tracking_id, 'RID-' || LEFT(r.id::TEXT, 8))::TEXT as tracking_id,
    r.status::TEXT,
    r.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown')::TEXT as user_name,
    COALESCE(u.phone_number, '')::TEXT as user_phone,
    r.provider_id,
    CASE 
      WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.email, '')
      ELSE ''
    END::TEXT as provider_name,
    COALESCE(r.pickup_address, '')::TEXT as pickup_address,
    COALESCE(r.destination_address, '')::TEXT as destination_address,
    COALESCE(r.final_fare, r.estimated_fare, 0)::NUMERIC as amount,
    r.created_at
  FROM ride_requests r
  LEFT JOIN users u ON r.user_id = u.id
  LEFT JOIN service_providers sp ON r.provider_id = sp.id
  LEFT JOIN users pu ON sp.user_id = pu.id
  WHERE (p_type IS NULL OR p_type = '' OR p_type = 'ride')
    AND (p_status IS NULL OR p_status = '' OR r.status = p_status)
  
  UNION ALL
  
  -- Deliveries (FIXED: final_fee instead of actual_fee)
  SELECT 
    d.id,
    'delivery'::TEXT as type,
    COALESCE(d.tracking_id, 'DEL-' || LEFT(d.id::TEXT, 8))::TEXT as tracking_id,
    d.status::TEXT,
    d.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown')::TEXT as user_name,
    COALESCE(u.phone_number, '')::TEXT as user_phone,
    d.provider_id,
    CASE 
      WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.email, '')
      ELSE ''
    END::TEXT as provider_name,
    COALESCE(d.sender_address, '')::TEXT as pickup_address,
    COALESCE(d.recipient_address, '')::TEXT as destination_address,
    COALESCE(d.final_fee, d.estimated_fee, 0)::NUMERIC as amount,
    d.created_at
  FROM delivery_requests d
  LEFT JOIN users u ON d.user_id = u.id
  LEFT JOIN service_providers sp ON d.provider_id = sp.id
  LEFT JOIN users pu ON sp.user_id = pu.id
  WHERE (p_type IS NULL OR p_type = '' OR p_type = 'delivery')
    AND (p_status IS NULL OR p_status = '' OR d.status = p_status)
  
  UNION ALL
  
  -- Shopping
  SELECT 
    s.id,
    'shopping'::TEXT as type,
    COALESCE(s.tracking_id, 'SHP-' || LEFT(s.id::TEXT, 8))::TEXT as tracking_id,
    s.status::TEXT,
    s.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown')::TEXT as user_name,
    COALESCE(u.phone_number, '')::TEXT as user_phone,
    s.provider_id,
    CASE 
      WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.email, '')
      ELSE ''
    END::TEXT as provider_name,
    COALESCE(s.store_name, s.store_address, '')::TEXT as pickup_address,
    COALESCE(s.delivery_address, '')::TEXT as destination_address,
    COALESCE(s.total_cost, s.service_fee, 0)::NUMERIC as amount,
    s.created_at
  FROM shopping_requests s
  LEFT JOIN users u ON s.user_id = u.id
  LEFT JOIN service_providers sp ON s.provider_id = sp.id
  LEFT JOIN users pu ON sp.user_id = pu.id
  WHERE (p_type IS NULL OR p_type = '' OR p_type = 'shopping')
    AND (p_status IS NULL OR p_status = '' OR s.status = p_status)
  
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. COUNT ALL ORDERS FOR ADMIN
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
  IF p_type IS NULL OR p_type = '' OR p_type = 'ride' THEN
    SELECT COUNT(*)::INT INTO v_temp 
    FROM ride_requests 
    WHERE (p_status IS NULL OR p_status = '' OR status = p_status);
    v_count := v_count + COALESCE(v_temp, 0);
  END IF;
  
  IF p_type IS NULL OR p_type = '' OR p_type = 'delivery' THEN
    SELECT COUNT(*)::INT INTO v_temp 
    FROM delivery_requests 
    WHERE (p_status IS NULL OR p_status = '' OR status = p_status);
    v_count := v_count + COALESCE(v_temp, 0);
  END IF;
  
  IF p_type IS NULL OR p_type = '' OR p_type = 'shopping' THEN
    SELECT COUNT(*)::INT INTO v_temp 
    FROM shopping_requests 
    WHERE (p_status IS NULL OR p_status = '' OR status = p_status);
    v_count := v_count + COALESCE(v_temp, 0);
  END IF;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin TO anon;
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin TO service_role;

GRANT EXECUTE ON FUNCTION count_all_orders_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION count_all_orders_for_admin TO anon;
GRANT EXECUTE ON FUNCTION count_all_orders_for_admin TO service_role;
