-- Migration: 319_fix_topup_function_overload.sql
-- Description: Fix PGRST203 error by removing 4-parameter version of get_topup_requests_admin
-- Author: Kiro AI Assistant
-- Date: 2026-01-22
-- Issue: PGRST203 - Function overloading conflict between 3-param and 4-param versions

-- =====================================================
-- PROBLEM ANALYSIS
-- =====================================================
-- Error: Could not choose the best candidate function between:
-- 1. get_topup_requests_admin(p_status => text, p_limit => integer, p_offset => integer) [3 params]
-- 2. get_topup_requests_admin(p_status => text, p_search => text, p_limit => integer, p_offset => integer) [4 params]
--
-- Root Cause: Two functions with same name but different signatures exist
-- Solution: Keep only the 3-parameter version (from migration 316)

-- =====================================================
-- STEP 1: LIST CURRENT FUNCTIONS
-- =====================================================

DO $$
DECLARE
  func_record RECORD;
BEGIN
  RAISE NOTICE '=== Current get_topup_requests_admin functions ===';
  
  FOR func_record IN 
    SELECT 
      proname as function_name,
      pronargs as num_args,
      pg_get_function_arguments(oid) as arguments,
      pg_get_function_identity_arguments(oid) as identity_args
    FROM pg_proc 
    WHERE proname = 'get_topup_requests_admin'
    ORDER BY pronargs
  LOOP
    RAISE NOTICE 'Function: % with % args: %', 
      func_record.function_name, 
      func_record.num_args,
      func_record.arguments;
  END LOOP;
END $$;

-- =====================================================
-- STEP 2: DROP 4-PARAMETER VERSION
-- =====================================================

-- Drop the 4-parameter version (with p_search)
DROP FUNCTION IF EXISTS public.get_topup_requests_admin(TEXT, TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_topup_requests_admin(text, text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_topup_requests_admin(p_status TEXT, p_search TEXT, p_limit INTEGER, p_offset INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_topup_requests_admin(p_status text, p_search text, p_limit integer, p_offset integer) CASCADE;

RAISE NOTICE '✅ Dropped 4-parameter version of get_topup_requests_admin';

-- =====================================================
-- STEP 3: VERIFY 3-PARAMETER VERSION EXISTS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_topup_requests_admin'
    AND pronargs = 3
    AND pg_get_function_identity_arguments(oid) = 'p_status text, p_limit integer, p_offset integer'
  ) THEN
    RAISE EXCEPTION 'ERROR: 3-parameter version of get_topup_requests_admin not found! Apply migration 316 first.';
  ELSE
    RAISE NOTICE '✅ 3-parameter version exists and is correct';
  END IF;
END $$;

-- =====================================================
-- STEP 4: VERIFY NO CONFLICTS REMAIN
-- =====================================================

DO $$
DECLARE
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM pg_proc 
  WHERE proname = 'get_topup_requests_admin';
  
  IF conflict_count > 1 THEN
    RAISE EXCEPTION 'ERROR: Still have % versions of get_topup_requests_admin', conflict_count;
  ELSIF conflict_count = 0 THEN
    RAISE EXCEPTION 'ERROR: No get_topup_requests_admin function found!';
  ELSE
    RAISE NOTICE '✅ Only 1 version of get_topup_requests_admin exists';
  END IF;
END $$;

-- =====================================================
-- STEP 5: LIST FINAL STATE
-- =====================================================

DO $$
DECLARE
  func_record RECORD;
BEGIN
  RAISE NOTICE '=== Final get_topup_requests_admin function ===';
  
  FOR func_record IN 
    SELECT 
      proname as function_name,
      pronargs as num_args,
      pg_get_function_arguments(oid) as arguments
    FROM pg_proc 
    WHERE proname = 'get_topup_requests_admin'
  LOOP
    RAISE NOTICE 'Function: %(%) with % args', 
      func_record.function_name,
      func_record.arguments,
      func_record.num_args;
  END LOOP;
  
  RAISE NOTICE '=== Migration 319 completed successfully ===';
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON MIGRATION IS 'Fix PGRST203 by removing 4-parameter version of get_topup_requests_admin, keeping only 3-parameter version from migration 316';
