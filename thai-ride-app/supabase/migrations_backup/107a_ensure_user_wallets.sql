-- Migration: 107_ensure_user_wallets.sql
-- Purpose: Ensure all users have wallet records (fix 406 errors)
-- 
-- Problem: Users created before wallet trigger was added don't have wallet records
-- This causes 406 "Not Acceptable" errors when querying with .single()
--
-- Solution: 
-- 1. Create wallets for existing users who don't have one
-- 2. Create loyalty records for existing users who don't have one
-- 3. Ensure trigger exists for new users

-- =====================================================
-- 1. CREATE WALLETS FOR EXISTING USERS
-- =====================================================

INSERT INTO public.user_wallets (user_id, balance, total_earned, total_spent, currency)
SELECT 
  u.id,
  0,
  0,
  0,
  'THB'
FROM public.users u
LEFT JOIN public.user_wallets w ON u.id = w.user_id
WHERE w.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 2. CREATE LOYALTY RECORDS FOR EXISTING USERS
-- =====================================================

INSERT INTO public.user_loyalty (user_id, current_points, lifetime_points, tier_id)
SELECT 
  u.id,
  0,
  0,
  (SELECT id FROM public.loyalty_tiers WHERE min_points = 0 LIMIT 1)
FROM public.users u
LEFT JOIN public.user_loyalty l ON u.id = l.user_id
WHERE l.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 3. ENSURE TRIGGER EXISTS (IDEMPOTENT)
-- =====================================================

-- Recreate the function to ensure it creates both wallet and loyalty
CREATE OR REPLACE FUNCTION public.ensure_user_wallet_and_loyalty()
RETURNS TRIGGER AS $$
BEGIN
  -- Create wallet if not exists
  INSERT INTO public.user_wallets (user_id, balance, total_earned, total_spent, currency)
  VALUES (NEW.id, 0, 0, 0, 'THB')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create loyalty if not exists
  INSERT INTO public.user_loyalty (user_id, current_points, lifetime_points)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on users table (for users created via direct insert)
DROP TRIGGER IF EXISTS ensure_user_wallet_trigger ON public.users;
CREATE TRIGGER ensure_user_wallet_trigger
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_user_wallet_and_loyalty();

-- =====================================================
-- 4. LOG RESULTS
-- =====================================================

DO $$
DECLARE
  wallet_count INTEGER;
  loyalty_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO wallet_count FROM public.user_wallets;
  SELECT COUNT(*) INTO loyalty_count FROM public.user_loyalty;
  
  RAISE NOTICE 'Migration 107 complete: % wallets, % loyalty records', wallet_count, loyalty_count;
END $$;
