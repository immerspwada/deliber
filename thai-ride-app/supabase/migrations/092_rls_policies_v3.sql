-- Feature: Multi-Role Ride Booking System V3
-- Migration: 092_rls_policies_v3.sql
-- Description: Row Level Security policies for multi-role access control

-- ============================================================================
-- 1. ENABLE RLS ON ride_requests (if not already enabled)
-- ============================================================================

ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. DROP EXISTING POLICIES (clean slate)
-- ============================================================================

DROP POLICY IF EXISTS "customers_view_own_rides" ON ride_requests;
DROP POLICY IF EXISTS "customers_create_rides" ON ride_requests;
DROP POLICY IF EXISTS "providers_view_available_rides" ON ride_requests;
DROP POLICY IF EXISTS "providers_update_own_rides" ON ride_requests;
DROP POLICY IF EXISTS "admins_full_access_rides" ON ride_requests;

-- ============================================================================
-- 3. CUSTOMER POLICIES
-- ============================================================================

-- Customers can view their own rides
CREATE POLICY "customers_view_own_rides_v3" ON ride_requests
  FOR SELECT
  USING (
    auth.uid() = user_id
  );

-- Customers can create rides (via SECURITY DEFINER function)
-- This policy allows INSERT but actual creation goes through create_ride_atomic()
CREATE POLICY "customers_create_rides_v3" ON ride_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- Customers can cancel their own rides (via SECURITY DEFINER function)
CREATE POLICY "customers_cancel_own_rides_v3" ON ride_requests
  FOR UPDATE
  USING (
    auth.uid() = user_id AND
    status IN ('pending', 'matched', 'arriving')
  )
  WITH CHECK (
    auth.uid() = user_id AND
    status = 'cancelled'
  );

-- ============================================================================
-- 4. PROVIDER POLICIES
-- ============================================================================

-- Providers can view pending rides (for acceptance)
CREATE POLICY "providers_view_pending_rides_v3" ON ride_requests
  FOR SELECT
  USING (
    status = 'pending' AND
    EXISTS (
      SELECT 1 FROM service_providers
      WHERE id = auth.uid() AND status = 'available'
    )
  );

-- Providers can view their own accepted rides
CREATE POLICY "providers_view_own_rides_v3" ON ride_requests
  FOR SELECT
  USING (
    provider_id = auth.uid()
  );

-- Providers can update their own rides (status changes)
CREATE POLICY "providers_update_own_rides_v3" ON ride_requests
  FOR UPDATE
  USING (
    provider_id = auth.uid() AND
    status IN ('matched', 'arriving', 'picked_up', 'in_progress')
  )
  WITH CHECK (
    provider_id = auth.uid()
  );

-- ============================================================================
-- 5. ADMIN POLICIES
-- ============================================================================

-- Admins can view all rides
CREATE POLICY "admins_view_all_rides_v3" ON ride_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any ride
CREATE POLICY "admins_update_all_rides_v3" ON ride_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete rides (for cleanup)
CREATE POLICY "admins_delete_rides_v3" ON ride_requests
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 6. SYSTEM POLICIES (for SECURITY DEFINER functions)
-- ============================================================================

-- Allow SECURITY DEFINER functions to bypass RLS
-- This is handled by the SECURITY DEFINER attribute on functions

-- ============================================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "customers_view_own_rides_v3" ON ride_requests IS 
  'Customers can only view their own rides';

COMMENT ON POLICY "providers_view_pending_rides_v3" ON ride_requests IS 
  'Providers can view pending rides for acceptance';

COMMENT ON POLICY "providers_view_own_rides_v3" ON ride_requests IS 
  'Providers can view rides they have accepted';

COMMENT ON POLICY "admins_view_all_rides_v3" ON ride_requests IS 
  'Admins have full read access to all rides';

-- ============================================================================
-- 8. VERIFY RLS IS WORKING
-- ============================================================================

-- Test query (should return 0 if RLS is working correctly)
-- SELECT COUNT(*) FROM ride_requests WHERE user_id != auth.uid();
