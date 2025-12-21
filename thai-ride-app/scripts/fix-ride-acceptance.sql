-- ============================================================================
-- FIX RIDE ACCEPTANCE - Run this in Supabase SQL Editor
-- ============================================================================
-- This script ensures providers can accept rides via direct table update
-- ============================================================================

-- 1. Drop existing conflicting policies
DROP POLICY IF EXISTS "providers_view_pending_rides" ON ride_requests;
DROP POLICY IF EXISTS "providers_update_own_rides" ON ride_requests;
DROP POLICY IF EXISTS "providers_accept_pending_rides" ON ride_requests;

-- 2. Create policy for providers to view pending rides
CREATE POLICY "providers_view_pending_rides" ON ride_requests
  FOR SELECT TO authenticated
  USING (
    -- Can see pending rides (to accept them)
    status = 'pending' 
    -- Can see rides they accepted
    OR provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
    -- Can see their own rides (as customer)
    OR user_id = auth.uid()
  );

-- 3. Create policy for providers to accept pending rides (UPDATE)
CREATE POLICY "providers_accept_pending_rides" ON ride_requests
  FOR UPDATE TO authenticated
  USING (
    -- Can update pending rides (to accept them)
    (status = 'pending' AND provider_id IS NULL)
    -- Can update rides they already accepted
    OR provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    -- Must be a provider to accept
    provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
  );

-- 4. Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'ride_requests'
ORDER BY policyname;

-- 5. Test: Check if there are any pending rides
SELECT 
  id,
  tracking_id,
  status,
  provider_id,
  pickup_address,
  destination_address,
  estimated_fare,
  created_at
FROM ride_requests
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 5;

-- 6. Show current providers
SELECT 
  sp.id as provider_id,
  sp.user_id,
  u.first_name,
  u.last_name,
  sp.status,
  sp.is_available,
  sp.provider_type
FROM service_providers sp
LEFT JOIN users u ON u.id = sp.user_id
ORDER BY sp.created_at DESC
LIMIT 10;

-- ============================================================================
-- DONE! Providers should now be able to accept rides via direct table update
-- ============================================================================
