-- =====================================================
-- PRODUCTION FIX: Remove 4-parameter version of get_topup_requests_admin
-- Issue: PGRST203 - Function overloading conflict
-- Date: 2026-01-22
-- =====================================================

-- Step 1: Check current state
DO $$
DECLARE
  func_count INTEGER;
  func_record RECORD;
BEGIN
  RAISE NOTICE '=== BEFORE FIX ===';
  
  SELECT COUNT(*) INTO func_count
  FROM pg_proc 
  WHERE proname = 'get_topup_requests_admin';
  
  RAISE NOTICE 'Current function count: %', func_count;
  
  FOR func_record IN 
    SELECT 
      proname,
      pronargs,
      pg_get_function_arguments(oid) as arguments
    FROM pg_proc 
    WHERE proname = 'get_topup_requests_admin'
    ORDER BY pronargs
  LOOP
    RAISE NOTICE '  - % params: %', func_record.pronargs, func_record.arguments;
  END LOOP;
END $$;

-- Step 2: Drop 4-parameter version (all possible variations)
DROP FUNCTION IF EXISTS public.get_topup_requests_admin(TEXT, TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_topup_requests_admin(text, text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_topup_requests_admin(p_status TEXT, p_search TEXT, p_limit INTEGER, p_offset INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_topup_requests_admin(p_status text, p_search text, p_limit integer, p_offset integer) CASCADE;

-- Also drop any VARCHAR variations
DROP FUNCTION IF EXISTS public.get_topup_requests_admin(VARCHAR, VARCHAR, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_topup_requests_admin(character varying, character varying, integer, integer) CASCADE;

RAISE NOTICE '✅ Dropped 4-parameter versions';

-- Step 3: Verify 3-parameter version exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_topup_requests_admin'
    AND pronargs = 3
    AND pg_get_function_identity_arguments(oid) = 'p_status text, p_limit integer, p_offset integer'
  ) THEN
    RAISE EXCEPTION '❌ ERROR: 3-parameter version not found! Migration 316 may not be applied.';
  ELSE
    RAISE NOTICE '✅ 3-parameter version exists and is correct';
  END IF;
END $$;

-- Step 4: Verify no conflicts remain
DO $$
DECLARE
  func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM pg_proc 
  WHERE proname = 'get_topup_requests_admin';
  
  IF func_count > 1 THEN
    RAISE EXCEPTION '❌ ERROR: Still have % versions of get_topup_requests_admin', func_count;
  ELSIF func_count = 0 THEN
    RAISE EXCEPTION '❌ ERROR: No get_topup_requests_admin function found!';
  ELSE
    RAISE NOTICE '✅ Only 1 version exists - CONFLICT RESOLVED!';
  END IF;
END $$;

-- Step 5: Show final state
DO $$
DECLARE
  func_record RECORD;
BEGIN
  RAISE NOTICE '=== AFTER FIX ===';
  
  FOR func_record IN 
    SELECT 
      proname,
      pronargs,
      pg_get_function_arguments(oid) as arguments,
      pg_get_function_identity_arguments(oid) as identity_args
    FROM pg_proc 
    WHERE proname = 'get_topup_requests_admin'
  LOOP
    RAISE NOTICE 'Function: %', func_record.proname;
    RAISE NOTICE '  Parameters: % (%)', func_record.pronargs, func_record.arguments;
    RAISE NOTICE '  Identity: %', func_record.identity_args;
  END LOOP;
  
  RAISE NOTICE '=== FIX COMPLETED SUCCESSFULLY ===';
END $$;

-- Step 6: Test the function (optional)
-- Uncomment to test if you have admin access
-- SELECT * FROM get_topup_requests_admin('pending', 1, 0);
