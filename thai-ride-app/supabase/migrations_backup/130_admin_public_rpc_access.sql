-- =====================================================
-- Migration: 130_admin_public_rpc_access.sql
-- Feature: F23 - Admin Dashboard Public RPC Access
-- Description: อนุญาตให้เรียก RPC functions ได้โดยไม่ต้อง auth (สำหรับ demo mode)
-- =====================================================

-- =====================================================
-- 1. UPDATE RPC FUNCTIONS TO ALLOW ANON ACCESS
-- =====================================================

-- Grant execute to anon role for admin RPC functions
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin TO anon;
GRANT EXECUTE ON FUNCTION count_all_orders_for_admin TO anon;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats TO anon;
GRANT EXECUTE ON FUNCTION get_all_users_for_admin TO anon;
GRANT EXECUTE ON FUNCTION count_users_for_admin TO anon;
GRANT EXECUTE ON FUNCTION get_all_providers_for_admin TO anon;
GRANT EXECUTE ON FUNCTION count_providers_for_admin TO anon;
GRANT EXECUTE ON FUNCTION search_providers_for_admin TO anon;

-- =====================================================
-- 2. ADD PUBLIC SELECT POLICIES FOR ORDER TABLES
-- These allow reading data when RLS is enabled but no auth
-- =====================================================

-- 2.1 ride_requests - public read for admin dashboard
DROP POLICY IF EXISTS "public_read_ride_requests" ON ride_requests;
CREATE POLICY "public_read_ride_requests" ON ride_requests
  FOR SELECT
  USING (true);

-- 2.2 delivery_requests - public read for admin dashboard
DROP POLICY IF EXISTS "public_read_delivery_requests" ON delivery_requests;
CREATE POLICY "public_read_delivery_requests" ON delivery_requests
  FOR SELECT
  USING (true);

-- 2.3 shopping_requests - public read for admin dashboard
DROP POLICY IF EXISTS "public_read_shopping_requests" ON shopping_requests;
CREATE POLICY "public_read_shopping_requests" ON shopping_requests
  FOR SELECT
  USING (true);

-- 2.4 queue_bookings - public read for admin dashboard
DROP POLICY IF EXISTS "public_read_queue_bookings" ON queue_bookings;
CREATE POLICY "public_read_queue_bookings" ON queue_bookings
  FOR SELECT
  USING (true);

-- 2.5 moving_requests - public read for admin dashboard
DROP POLICY IF EXISTS "public_read_moving_requests" ON moving_requests;
CREATE POLICY "public_read_moving_requests" ON moving_requests
  FOR SELECT
  USING (true);

-- 2.6 laundry_requests - public read for admin dashboard
DROP POLICY IF EXISTS "public_read_laundry_requests" ON laundry_requests;
CREATE POLICY "public_read_laundry_requests" ON laundry_requests
  FOR SELECT
  USING (true);

-- 2.7 users - public read for admin dashboard (needed for joins)
DROP POLICY IF EXISTS "public_read_users" ON users;
CREATE POLICY "public_read_users" ON users
  FOR SELECT
  USING (true);

-- 2.8 service_providers - public read for admin dashboard
DROP POLICY IF EXISTS "public_read_service_providers" ON service_providers;
CREATE POLICY "public_read_service_providers" ON service_providers
  FOR SELECT
  USING (true);

-- =====================================================
-- 3. VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Admin public RPC access granted';
  RAISE NOTICE '✓ Public read policies created for order tables';
  RAISE NOTICE '⚠️ Note: This allows public read access - ensure production has proper auth';
END $$;
