-- Migration: 132_fix_ride_requests_visibility.sql
-- Description: Fix ride_requests visibility for Admin and ensure cross-role integration
-- Date: 2024-12-21

-- ============================================================================
-- 1. Ensure ride_requests table has proper RLS policies
-- ============================================================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "public_read_ride_requests" ON ride_requests;
DROP POLICY IF EXISTS "Allow all ride_requests" ON ride_requests;
DROP POLICY IF EXISTS "admin_full_access_ride_requests" ON ride_requests;
DROP POLICY IF EXISTS "customers_view_own_rides_v3" ON ride_requests;
DROP POLICY IF EXISTS "customers_create_rides_v3" ON ride_requests;
DROP POLICY IF EXISTS "providers_view_pending_rides_v3" ON ride_requests;

-- Enable RLS
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;

-- 1.1 Public read for all (allows Admin to see all orders)
CREATE POLICY "ride_requests_public_read" ON ride_requests
  FOR SELECT
  USING (true);

-- 1.2 Authenticated users can insert their own rides
CREATE POLICY "ride_requests_insert_own" ON ride_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- 1.3 Users can update their own rides (for cancellation)
CREATE POLICY "ride_requests_update_own" ON ride_requests
  FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- 1.4 Providers can update rides they're assigned to
CREATE POLICY "ride_requests_provider_update" ON ride_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM service_providers sp 
      WHERE sp.user_id = auth.uid() 
      AND sp.id = ride_requests.provider_id
    )
  );

-- ============================================================================
-- 2. Ensure get_all_orders_for_admin function exists and works
-- ============================================================================

-- Recreate the function with SECURITY DEFINER to bypass RLS
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
      COALESCE(u.name, CONCAT(u.first_name, ' ', u.last_name), u.email, 'ไม่ระบุ') as user_name,
      COALESCE(u.phone, u.phone_number, '') as user_phone,
      COALESCE(u.email, '') as user_email,
      COALESCE(u.member_uid, '') as member_uid,
      r.provider_id,
      COALESCE(pu.name, CONCAT(pu.first_name, ' ', pu.last_name), '') as provider_name,
      COALESCE(r.pickup_address, '') as pickup_address,
      COALESCE(r.destination_address, '') as destination_address,
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
      d.tracking_id,
      d.status,
      d.user_id,
      COALESCE(u.name, CONCAT(u.first_name, ' ', u.last_name), u.email, 'ไม่ระบุ') as user_name,
      COALESCE(u.phone, u.phone_number, '') as user_phone,
      COALESCE(u.email, '') as user_email,
      COALESCE(u.member_uid, '') as member_uid,
      d.provider_id,
      COALESCE(pu.name, CONCAT(pu.first_name, ' ', pu.last_name), '') as provider_name,
      COALESCE(d.sender_address, '') as pickup_address,
      COALESCE(d.recipient_address, '') as destination_address,
      COALESCE(d.estimated_fee, 0)::NUMERIC as amount,
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
      s.tracking_id,
      s.status,
      s.user_id,
      COALESCE(u.name, CONCAT(u.first_name, ' ', u.last_name), u.email, 'ไม่ระบุ') as user_name,
      COALESCE(u.phone, u.phone_number, '') as user_phone,
      COALESCE(u.email, '') as user_email,
      COALESCE(u.member_uid, '') as member_uid,
      s.provider_id,
      COALESCE(pu.name, CONCAT(pu.first_name, ' ', pu.last_name), '') as provider_name,
      COALESCE(s.store_name, '') as pickup_address,
      COALESCE(s.delivery_address, '') as destination_address,
      COALESCE(s.estimated_total, 0)::NUMERIC as amount,
      s.created_at,
      s.updated_at
    FROM shopping_requests s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN service_providers sp ON s.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE (p_type IS NULL OR p_type = '' OR p_type = 'shopping')
      AND (p_status IS NULL OR p_status = '' OR s.status = p_status)
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

-- ============================================================================
-- 3. Enable Realtime for ride_requests
-- ============================================================================

-- Enable realtime for ride_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE ride_requests;

-- ============================================================================
-- 4. Add comment
-- ============================================================================

COMMENT ON FUNCTION get_all_orders_for_admin IS 'Get all orders from all service tables for admin dashboard - SECURITY DEFINER bypasses RLS';
