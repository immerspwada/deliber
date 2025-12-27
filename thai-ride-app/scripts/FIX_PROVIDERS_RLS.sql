-- =====================================================
-- FIX PROVIDERS RLS - Run in Supabase SQL Editor
-- =====================================================

-- Allow all authenticated users to read service_providers
DROP POLICY IF EXISTS "Anyone can read providers" ON service_providers;
CREATE POLICY "Anyone can read providers" ON service_providers
  FOR SELECT TO authenticated USING (true);

-- Allow all authenticated users to read users (for join)
DROP POLICY IF EXISTS "Anyone can read users" ON users;
CREATE POLICY "Anyone can read users" ON users
  FOR SELECT TO authenticated USING (true);

-- Grant permissions
GRANT SELECT ON service_providers TO authenticated;
GRANT SELECT ON users TO authenticated;

-- Test query (same as useAdminAPI.ts)
SELECT 
  sp.id,
  sp.user_id,
  sp.provider_uid,
  sp.provider_type,
  sp.status,
  sp.is_available,
  sp.is_online,
  sp.is_verified,
  sp.rating,
  sp.total_rides,
  sp.total_trips,
  sp.total_earnings,
  sp.created_at,
  u.email,
  u.first_name,
  u.last_name,
  u.phone_number
FROM service_providers sp
LEFT JOIN users u ON sp.user_id = u.id
ORDER BY sp.created_at DESC
LIMIT 10;

SELECT 'DONE! Refresh /admin/providers' as result;
