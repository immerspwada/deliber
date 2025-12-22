-- =====================================================
-- Script: run-admin-data-access-fix.sql
-- Purpose: Fix Admin Dashboard data access for demo mode
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Add public read policies for user_wallets and user_loyalty
DROP POLICY IF EXISTS "public_read_user_wallets" ON user_wallets;
CREATE POLICY "public_read_user_wallets" ON user_wallets
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "public_read_user_loyalty" ON user_loyalty;
CREATE POLICY "public_read_user_loyalty" ON user_loyalty
  FOR SELECT
  USING (true);

-- 2. Grant execute to anon role (for demo mode)
GRANT EXECUTE ON FUNCTION get_all_users_for_admin TO anon;
GRANT EXECUTE ON FUNCTION count_users_for_admin TO anon;
GRANT EXECUTE ON FUNCTION get_all_providers_for_admin TO anon;
GRANT EXECUTE ON FUNCTION count_providers_for_admin TO anon;
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin TO anon;
GRANT EXECUTE ON FUNCTION count_all_orders_for_admin TO anon;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats TO anon;

-- Done!
SELECT 'Admin data access fix applied successfully' as status;
