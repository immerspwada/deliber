-- ============================================================================
-- FIX RIDE REQUESTS VISIBILITY FOR ADMIN
-- Run this in Supabase SQL Editor to fix the issue immediately
-- ============================================================================

-- 1. Drop existing conflicting policies
DROP POLICY IF EXISTS "public_read_ride_requests" ON ride_requests;
DROP POLICY IF EXISTS "Allow all ride_requests" ON ride_requests;
DROP POLICY IF EXISTS "admin_full_access_ride_requests" ON ride_requests;

-- 2. Create simple public read policy
CREATE POLICY "ride_requests_public_read" ON ride_requests
  FOR SELECT
  USING (true);

-- 3. Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'ride_requests';

-- 4. Test: Count all ride_requests
SELECT COUNT(*) as total_rides FROM ride_requests;

-- 5. Test: Get recent rides
SELECT id, status, user_id, pickup_address, created_at 
FROM ride_requests 
ORDER BY created_at DESC 
LIMIT 5;

-- 6. Recreate RPC function with SECURITY DEFINER
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
      '' as provider_name,
      COALESCE(r.pickup_address, '') as pickup_address,
      COALESCE(r.destination_address, '') as destination_address,
      COALESCE(r.final_fare, r.estimated_fare, 0)::NUMERIC as amount,
      r.created_at,
      r.updated_at
    FROM ride_requests r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE (p_type IS NULL OR p_type = '' OR p_type = 'ride')
      AND (p_status IS NULL OR p_status = '' OR r.status = p_status)
  )
  SELECT * FROM all_orders
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin TO anon;
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin TO authenticated;

-- 8. Test RPC function
SELECT * FROM get_all_orders_for_admin(NULL, NULL, 10, 0);

-- 9. Show success message
SELECT 'SUCCESS: Ride requests visibility fixed!' as message;
