-- Migration: 317_fix_topup_function_conflict.sql
-- Description: Fix function overloading conflict for topup requests
-- Author: Kiro AI Assistant
-- Date: 2026-01-22
-- Issue: PGRST203 - Multiple functions with similar signatures causing conflict

-- =====================================================
-- DROP OLD TOPUP FUNCTIONS (from migrations 187, 198)
-- =====================================================

-- Drop old admin_get_topup_requests functions
DROP FUNCTION IF EXISTS public.admin_get_topup_requests(VARCHAR, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_topup_requests(character varying, integer, integer) CASCADE;

-- Drop old admin_get_topup_requests_enhanced functions
DROP FUNCTION IF EXISTS public.admin_get_topup_requests_enhanced(VARCHAR, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_topup_requests_enhanced(character varying, integer, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_topup_requests_enhanced(VARCHAR, INTEGER, INTEGER, TEXT, TEXT, TEXT) CASCADE;

-- Drop old admin_get_topup_stats
DROP FUNCTION IF EXISTS public.admin_get_topup_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) CASCADE;

-- Drop old admin_approve_topup_request (different signature)
DROP FUNCTION IF EXISTS public.admin_approve_topup_request(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_approve_topup_request(UUID, TEXT, UUID) CASCADE;

-- Drop old admin_reject_topup_request (different signature)
DROP FUNCTION IF EXISTS public.admin_reject_topup_request(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_reject_topup_request(UUID, TEXT, UUID) CASCADE;

-- =====================================================
-- VERIFY NEW FUNCTIONS EXIST
-- =====================================================

-- The new functions should already exist from migration 316:
-- - get_topup_requests_admin(TEXT, INT, INT)
-- - count_topup_requests_admin(TEXT)
-- - approve_topup_request(UUID, UUID, TEXT)
-- - reject_topup_request(UUID, UUID, TEXT)

-- Verify they exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_topup_requests_admin'
    AND pronargs = 3
  ) THEN
    RAISE EXCEPTION 'Function get_topup_requests_admin not found. Apply migration 316 first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'count_topup_requests_admin'
    AND pronargs = 1
  ) THEN
    RAISE EXCEPTION 'Function count_topup_requests_admin not found. Apply migration 316 first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'approve_topup_request'
    AND pronargs = 3
  ) THEN
    RAISE EXCEPTION 'Function approve_topup_request not found. Apply migration 316 first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'reject_topup_request'
    AND pronargs = 3
  ) THEN
    RAISE EXCEPTION 'Function reject_topup_request not found. Apply migration 316 first.';
  END IF;

  RAISE NOTICE 'All new topup functions verified successfully';
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON MIGRATION IS 'Fix function overloading conflict by dropping old topup functions and keeping only the new standardized versions from migration 316';
