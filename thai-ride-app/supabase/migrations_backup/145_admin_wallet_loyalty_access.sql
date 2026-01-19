-- =====================================================
-- Migration: 145_admin_wallet_loyalty_access.sql
-- Feature: F23 - Admin Dashboard Wallet & Loyalty Access
-- Description: เพิ่ม public read policies สำหรับ user_wallets และ user_loyalty
-- =====================================================

-- =====================================================
-- 1. PUBLIC READ POLICIES FOR WALLET AND LOYALTY
-- =====================================================

-- 1.1 user_wallets - public read for admin dashboard
DROP POLICY IF EXISTS "public_read_user_wallets" ON user_wallets;
CREATE POLICY "public_read_user_wallets" ON user_wallets
  FOR SELECT
  USING (true);

-- 1.2 user_loyalty - public read for admin dashboard
DROP POLICY IF EXISTS "public_read_user_loyalty" ON user_loyalty;
CREATE POLICY "public_read_user_loyalty" ON user_loyalty
  FOR SELECT
  USING (true);

-- =====================================================
-- 2. VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Public read policies created for user_wallets and user_loyalty';
END $$;
