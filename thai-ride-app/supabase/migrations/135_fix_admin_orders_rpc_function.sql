-- Migration: 135_fix_admin_orders_rpc_function.sql
-- Description: Fix get_all_orders_for_admin RPC function with correct column names and type casts
-- Date: 2024-12-21

DROP FUNCTION IF EXISTS get_all_orders_for_admin(TEXT, TEXT, INT, INT);

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
      r.tracking_id::TEXT,
      r.status::TEXT,
      r.user_id,
      COALESCE(u.name, CONCAT(u.first_name, ' ', u.last_name), u.email, 'ไม่ระบุ')::TEXT as user_name,
      COALESCE(u.phone, u.phone_number, '')::TEXT as user_phone,
      COALESCE(u.email, '')::TEXT as user_email,
      COALESCE(u.member_uid, '')::TEXT as member_uid,
      r.provider_id,
      COALESCE(pu.name, CONCAT(pu.first_name, ' ', pu.last_name), '')::TEXT as provider_name,
      COALESCE(r.pickup_address, '')::TEXT as pickup_address,
      COALESCE(r.destination_address, '')::TEXT as destination_address,
      COALESCE(r.final_fare, r.estimated_fare, 0)::NUMERIC as amount,
      r.created_at,
      r.updated_at
    FROM ride_requests r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN service_providers sp ON r.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE (p_type IS NULL OR p_type = '' OR p_type = 'ride')
      AND (p_status IS NULL OR p_status = '' OR r.status = p_status)
    
    UNION ALL
    
    -- Deliveries
    SELECT 
      d.id,
      'delivery'::TEXT as type,
      d.tracking_id::TEXT,
      d.status::TEXT,
      d.user_id,
      COALESCE(u.name, CONCAT(u.first_name, ' ', u.last_name), u.email, 'ไม่ระบุ')::TEXT as user_name,
      COALESCE(u.phone, u.phone_number, '')::TEXT as user_phone,
      COALESCE(u.email, '')::TEXT as user_email,
      COALESCE(u.member_uid, '')::TEXT as member_uid,
      d.provider_id,
      COALESCE(pu.name, CONCAT(pu.first_name, ' ', pu.last_name), '')::TEXT as provider_name,
      COALESCE(d.sender_address, '')::TEXT as pickup_address,
      COALESCE(d.recipient_address, '')::TEXT as destination_address,
      COALESCE(d.final_fee, d.estimated_fee, 0)::NUMERIC as amount,
      d.created_at,
      d.updated_at
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
      s.tracking_id::TEXT,
      s.status::TEXT,
      s.user_id,
      COALESCE(u.name, CONCAT(u.first_name, ' ', u.last_name), u.email, 'ไม่ระบุ')::TEXT as user_name,
      COALESCE(u.phone, u.phone_number, '')::TEXT as user_phone,
      COALESCE(u.email, '')::TEXT as user_email,
      COALESCE(u.member_uid, '')::TEXT as member_uid,
      s.provider_id,
      COALESCE(pu.name, CONCAT(pu.first_name, ' ', pu.last_name), '')::TEXT as provider_name,
      COALESCE(s.store_name, '')::TEXT as pickup_address,
      COALESCE(s.delivery_address, '')::TEXT as destination_address,
      COALESCE(s.total_cost, s.service_fee, 0)::NUMERIC as amount,
      s.created_at,
      s.updated_at
    FROM shopping_requests s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN service_providers sp ON s.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE (p_type IS NULL OR p_type = '' OR p_type = 'shopping')
      AND (p_status IS NULL OR p_status = '' OR s.status = p_status)
    
    UNION ALL
    
    -- Queue Bookings
    SELECT 
      q.id,
      'queue'::TEXT as type,
      q.tracking_id::TEXT,
      q.status::TEXT,
      q.user_id,
      COALESCE(u.name, CONCAT(u.first_name, ' ', u.last_name), u.email, 'ไม่ระบุ')::TEXT as user_name,
      COALESCE(u.phone, u.phone_number, '')::TEXT as user_phone,
      COALESCE(u.email, '')::TEXT as user_email,
      COALESCE(u.member_uid, '')::TEXT as member_uid,
      q.provider_id,
      COALESCE(pu.name, CONCAT(pu.first_name, ' ', pu.last_name), '')::TEXT as provider_name,
      COALESCE(q.location_name, '')::TEXT as pickup_address,
      ''::TEXT as destination_address,
      COALESCE(q.final_fee, q.service_fee, 0)::NUMERIC as amount,
      q.created_at,
      q.updated_at
    FROM queue_bookings q
    LEFT JOIN users u ON q.user_id = u.id
    LEFT JOIN service_providers sp ON q.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE (p_type IS NULL OR p_type = '' OR p_type = 'queue')
      AND (p_status IS NULL OR p_status = '' OR q.status = p_status)
    
    UNION ALL
    
    -- Moving Requests
    SELECT 
      m.id,
      'moving'::TEXT as type,
      m.tracking_id::TEXT,
      m.status::TEXT,
      m.user_id,
      COALESCE(u.name, CONCAT(u.first_name, ' ', u.last_name), u.email, 'ไม่ระบุ')::TEXT as user_name,
      COALESCE(u.phone, u.phone_number, '')::TEXT as user_phone,
      COALESCE(u.email, '')::TEXT as user_email,
      COALESCE(u.member_uid, '')::TEXT as member_uid,
      m.provider_id,
      COALESCE(pu.name, CONCAT(pu.first_name, ' ', pu.last_name), '')::TEXT as provider_name,
      COALESCE(m.pickup_address, '')::TEXT as pickup_address,
      COALESCE(m.destination_address, '')::TEXT as destination_address,
      COALESCE(m.final_price, m.estimated_price, 0)::NUMERIC as amount,
      m.created_at,
      m.updated_at
    FROM moving_requests m
    LEFT JOIN users u ON m.user_id = u.id
    LEFT JOIN service_providers sp ON m.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE (p_type IS NULL OR p_type = '' OR p_type = 'moving')
      AND (p_status IS NULL OR p_status = '' OR m.status = p_status)
    
    UNION ALL
    
    -- Laundry Requests (no delivery_address column)
    SELECT 
      l.id,
      'laundry'::TEXT as type,
      l.tracking_id::TEXT,
      l.status::TEXT,
      l.user_id,
      COALESCE(u.name, CONCAT(u.first_name, ' ', u.last_name), u.email, 'ไม่ระบุ')::TEXT as user_name,
      COALESCE(u.phone, u.phone_number, '')::TEXT as user_phone,
      COALESCE(u.email, '')::TEXT as user_email,
      COALESCE(u.member_uid, '')::TEXT as member_uid,
      l.provider_id,
      COALESCE(pu.name, CONCAT(pu.first_name, ' ', pu.last_name), '')::TEXT as provider_name,
      COALESCE(l.pickup_address, '')::TEXT as pickup_address,
      COALESCE(l.pickup_address, '')::TEXT as destination_address,
      COALESCE(l.final_price, l.estimated_price, 0)::NUMERIC as amount,
      l.created_at,
      l.updated_at
    FROM laundry_requests l
    LEFT JOIN users u ON l.user_id = u.id
    LEFT JOIN service_providers sp ON l.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE (p_type IS NULL OR p_type = '' OR p_type = 'laundry')
      AND (p_status IS NULL OR p_status = '' OR l.status = p_status)
  )
  SELECT * FROM all_orders
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to all roles
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin TO anon;
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin TO service_role;

COMMENT ON FUNCTION get_all_orders_for_admin IS 'Get all orders from all service tables for admin dashboard - SECURITY DEFINER bypasses RLS';
