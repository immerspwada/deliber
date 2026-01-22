-- Migration: 318_verify_and_fix_topup_conflicts.sql
-- Description: Verify and fix any remaining topup function conflicts
-- Author: Kiro AI Assistant
-- Date: 2026-01-22
-- Issue: PGRST203 - Function overloading conflict still exists in production

-- =====================================================
-- STEP 1: CHECK EXISTING FUNCTIONS
-- =====================================================

-- List all topup-related functions
DO $$
DECLARE
  func_record RECORD;
BEGIN
  RAISE NOTICE '=== Checking existing topup functions ===';
  
  FOR func_record IN 
    SELECT 
      proname as function_name,
      pronargs as num_args,
      pg_get_function_arguments(oid) as arguments,
      pg_get_function_identity_arguments(oid) as identity_args,
      pronamespace::regnamespace as schema_name
    FROM pg_proc 
    WHERE proname LIKE '%topup%'
    ORDER BY proname, pronargs
  LOOP
    RAISE NOTICE 'Function: %.% with % args: %', 
      func_record.schema_name,
      func_record.function_name, 
      func_record.num_args,
      func_record.arguments;
  END LOOP;
END $$;

-- =====================================================
-- STEP 2: DROP ALL OLD TOPUP FUNCTIONS (COMPREHENSIVE)
-- =====================================================

-- Drop any remaining old functions with various signatures
DROP FUNCTION IF EXISTS public.admin_get_topup_requests(VARCHAR, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_topup_requests(character varying, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_topup_requests(TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_topup_requests(text, integer, integer) CASCADE;

DROP FUNCTION IF EXISTS public.admin_get_topup_requests_enhanced(VARCHAR, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_topup_requests_enhanced(character varying, integer, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_topup_requests_enhanced(TEXT, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_topup_requests_enhanced(text, integer, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_topup_requests_enhanced(VARCHAR, INTEGER, INTEGER, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_topup_requests_enhanced(character varying, integer, integer, text, text, text) CASCADE;

DROP FUNCTION IF EXISTS public.admin_get_topup_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_topup_stats(timestamptz, timestamptz) CASCADE;

DROP FUNCTION IF EXISTS public.admin_approve_topup_request(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_approve_topup_request(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_approve_topup_request(UUID, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.admin_approve_topup_request(uuid, text, uuid) CASCADE;

DROP FUNCTION IF EXISTS public.admin_reject_topup_request(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_reject_topup_request(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_reject_topup_request(UUID, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.admin_reject_topup_request(uuid, text, uuid) CASCADE;

DROP FUNCTION IF EXISTS public.admin_count_topup_requests(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS public.admin_count_topup_requests(character varying) CASCADE;
DROP FUNCTION IF EXISTS public.admin_count_topup_requests(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_count_topup_requests(text) CASCADE;

-- Drop any functions with similar names that might conflict
DROP FUNCTION IF EXISTS public.get_topup_requests(TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_topup_requests(text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.count_topup_requests(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.count_topup_requests(text) CASCADE;

-- =====================================================
-- STEP 3: VERIFY NEW FUNCTIONS EXIST (from migration 316)
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== Verifying new functions ===';
  
  -- Check get_topup_requests_admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_topup_requests_admin'
    AND pronargs = 3
    AND pg_get_function_identity_arguments(oid) = 'p_status text, p_limit integer, p_offset integer'
  ) THEN
    RAISE EXCEPTION 'Function get_topup_requests_admin(TEXT, INT, INT) not found. Apply migration 316 first.';
  ELSE
    RAISE NOTICE '✓ get_topup_requests_admin exists';
  END IF;

  -- Check count_topup_requests_admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'count_topup_requests_admin'
    AND pronargs = 1
    AND pg_get_function_identity_arguments(oid) = 'p_status text'
  ) THEN
    RAISE EXCEPTION 'Function count_topup_requests_admin(TEXT) not found. Apply migration 316 first.';
  ELSE
    RAISE NOTICE '✓ count_topup_requests_admin exists';
  END IF;

  -- Check approve_topup_request
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'approve_topup_request'
    AND pronargs = 3
    AND pg_get_function_identity_arguments(oid) = 'p_request_id uuid, p_admin_id uuid, p_admin_note text'
  ) THEN
    RAISE EXCEPTION 'Function approve_topup_request(UUID, UUID, TEXT) not found. Apply migration 316 first.';
  ELSE
    RAISE NOTICE '✓ approve_topup_request exists';
  END IF;

  -- Check reject_topup_request
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'reject_topup_request'
    AND pronargs = 3
    AND pg_get_function_identity_arguments(oid) = 'p_request_id uuid, p_admin_id uuid, p_admin_note text'
  ) THEN
    RAISE EXCEPTION 'Function reject_topup_request(UUID, UUID, TEXT) not found. Apply migration 316 first.';
  ELSE
    RAISE NOTICE '✓ reject_topup_request exists';
  END IF;

  RAISE NOTICE '=== All new topup functions verified successfully ===';
END $$;

-- =====================================================
-- STEP 4: VERIFY NO CONFLICTS REMAIN
-- =====================================================

DO $$
DECLARE
  conflict_count INTEGER;
  func_record RECORD;
BEGIN
  RAISE NOTICE '=== Checking for remaining conflicts ===';
  
  -- Count functions with same name and arg count
  SELECT COUNT(*) INTO conflict_count
  FROM (
    SELECT proname, pronargs, COUNT(*) as cnt
    FROM pg_proc 
    WHERE proname LIKE '%topup%'
    GROUP BY proname, pronargs
    HAVING COUNT(*) > 1
  ) conflicts;
  
  IF conflict_count > 0 THEN
    RAISE WARNING 'Found % potential conflicts:', conflict_count;
    
    FOR func_record IN 
      SELECT proname, pronargs, COUNT(*) as cnt
      FROM pg_proc 
      WHERE proname LIKE '%topup%'
      GROUP BY proname, pronargs
      HAVING COUNT(*) > 1
    LOOP
      RAISE WARNING '  - % with % args has % definitions', 
        func_record.proname, 
        func_record.pronargs,
        func_record.cnt;
    END LOOP;
    
    RAISE EXCEPTION 'Function conflicts still exist. Manual intervention required.';
  ELSE
    RAISE NOTICE '✓ No function conflicts detected';
  END IF;
END $$;

-- =====================================================
-- STEP 5: LIST FINAL FUNCTIONS
-- =====================================================

DO $$
DECLARE
  func_record RECORD;
BEGIN
  RAISE NOTICE '=== Final topup functions ===';
  
  FOR func_record IN 
    SELECT 
      proname as function_name,
      pronargs as num_args,
      pg_get_function_arguments(oid) as arguments
    FROM pg_proc 
    WHERE proname LIKE '%topup%'
    ORDER BY proname, pronargs
  LOOP
    RAISE NOTICE 'Function: %(%) with % args', 
      func_record.function_name,
      func_record.arguments,
      func_record.num_args;
  END LOOP;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON MIGRATION IS 'Comprehensive fix for topup function conflicts - drops all old variations and verifies new standardized functions';
