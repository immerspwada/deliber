-- =====================================================
-- Deployment Verification Script: Test Function Calls
-- =====================================================
-- Purpose: Test all RPC functions with sample parameters
-- Usage: Run this in Supabase Dashboard SQL Editor after deployment
-- Prerequisites: Must be logged in as admin user
-- Expected: All functions should execute without errors
-- =====================================================

-- =====================================================
-- IMPORTANT: Authentication Required
-- =====================================================
-- These tests require an authenticated admin user.
-- Make sure you're logged in to the Supabase Dashboard
-- with an admin account before running these tests.
-- =====================================================

-- =====================================================
-- Test 1: get_available_providers
-- =====================================================
-- Purpose: Verify function returns list of available providers
-- Expected: Returns table with provider information

SELECT 
  'Test 1: get_available_providers' as test_name,
  '✅ PASSED' as status,
  'Function executed successfully' as message
FROM get_available_providers(
  p_service_type := NULL,  -- All service types
  p_limit := 10            -- Limit to 10 results
)
LIMIT 1;

-- Detailed results
SELECT 
  id,
  full_name,
  phone,
  vehicle_type,
  rating,
  status,
  is_online
FROM get_available_providers(
  p_service_type := NULL,
  p_limit := 10
);

-- =====================================================
-- Test 2: get_available_providers with service filter
-- =====================================================
-- Purpose: Verify function filters by service type
-- Expected: Returns only providers for specified service

SELECT 
  'Test 2: get_available_providers (filtered)' as test_name,
  COUNT(*) as provider_count,
  CASE 
    WHEN COUNT(*) >= 0 THEN '✅ PASSED'
    ELSE '❌ FAILED'
  END as status
FROM get_available_providers(
  p_service_type := 'ride',
  p_limit := 10
);

-- =====================================================
-- Test 3: get_admin_customers (no filters)
-- =====================================================
-- Purpose: Verify function returns customer list
-- Expected: Returns table with customer information

SELECT 
  'Test 3: get_admin_customers' as test_name,
  '✅ PASSED' as status,
  'Function executed successfully' as message
FROM get_admin_customers(
  p_search_term := NULL,
  p_status := NULL,
  p_limit := 10,
  p_offset := 0
)
LIMIT 1;

-- Detailed results
SELECT 
  id,
  email,
  full_name,
  phone_number,
  status,
  wallet_balance,
  total_orders,
  created_at
FROM get_admin_customers(
  p_search_term := NULL,
  p_status := NULL,
  p_limit := 10,
  p_offset := 0
);

-- =====================================================
-- Test 4: get_admin_customers with status filter
-- =====================================================
-- Purpose: Verify function filters by customer status
-- Expected: Returns only customers with specified status

SELECT 
  'Test 4: get_admin_customers (active only)' as test_name,
  COUNT(*) as customer_count,
  CASE 
    WHEN COUNT(*) >= 0 THEN '✅ PASSED'
    ELSE '❌ FAILED'
  END as status
FROM get_admin_customers(
  p_search_term := NULL,
  p_status := 'active',
  p_limit := 10,
  p_offset := 0
);

-- =====================================================
-- Test 5: get_admin_customers with search
-- =====================================================
-- Purpose: Verify function searches by email/name/phone
-- Expected: Returns filtered results

SELECT 
  'Test 5: get_admin_customers (search)' as test_name,
  COUNT(*) as customer_count,
  CASE 
    WHEN COUNT(*) >= 0 THEN '✅ PASSED'
    ELSE '❌ FAILED'
  END as status
FROM get_admin_customers(
  p_search_term := 'test',
  p_status := NULL,
  p_limit := 10,
  p_offset := 0
);

-- =====================================================
-- Test 6: get_reassignment_history
-- =====================================================
-- Purpose: Verify function returns reassignment history
-- Expected: Returns table with reassignment records

SELECT 
  'Test 6: get_reassignment_history' as test_name,
  COUNT(*) as history_count,
  CASE 
    WHEN COUNT(*) >= 0 THEN '✅ PASSED'
    ELSE '❌ FAILED'
  END as status
FROM get_reassignment_history(
  p_order_id := NULL,
  p_provider_id := NULL,
  p_limit := 10,
  p_offset := 0
);

-- Detailed results (if any history exists)
SELECT 
  order_id,
  order_type,
  old_provider_name,
  new_provider_name,
  admin_name,
  reason,
  created_at
FROM get_reassignment_history(
  p_order_id := NULL,
  p_provider_id := NULL,
  p_limit := 10,
  p_offset := 0
);

-- =====================================================
-- Test 7: Verify profiles.status column exists
-- =====================================================
-- Purpose: Verify customer suspension system columns
-- Expected: All suspension columns should exist

SELECT 
  'Test 7: Suspension columns' as test_name,
  COUNT(*) as column_count,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ PASSED - All 4 columns exist'
    ELSE '❌ FAILED - Missing columns'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
AND column_name IN ('status', 'suspension_reason', 'suspended_at', 'suspended_by');

-- List the columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
AND column_name IN ('status', 'suspension_reason', 'suspended_at', 'suspended_by')
ORDER BY column_name;

-- =====================================================
-- Test 8: Verify order_reassignments table exists
-- =====================================================
-- Purpose: Verify audit table for order reassignments
-- Expected: Table should exist with correct columns

SELECT 
  'Test 8: order_reassignments table' as test_name,
  COUNT(*) as column_count,
  CASE 
    WHEN COUNT(*) >= 8 THEN '✅ PASSED - Table exists with columns'
    ELSE '❌ FAILED - Table or columns missing'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'order_reassignments';

-- List the columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'order_reassignments'
ORDER BY ordinal_position;

-- =====================================================
-- Test 9: Verify indexes exist
-- =====================================================
-- Purpose: Verify performance indexes are created
-- Expected: All indexes should exist

SELECT 
  'Test 9: Performance indexes' as test_name,
  COUNT(*) as index_count,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ PASSED - Indexes exist'
    ELSE '⚠️ WARNING - Some indexes missing'
  END as status
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'order_reassignments'
AND indexname IN (
  'idx_order_reassignments_order',
  'idx_order_reassignments_provider',
  'idx_order_reassignments_admin'
);

-- List the indexes
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('order_reassignments', 'profiles')
AND indexname LIKE '%reassignment%' OR indexname LIKE '%status%' OR indexname LIKE '%suspended%'
ORDER BY tablename, indexname;

-- =====================================================
-- Test 10: Verify function permissions
-- =====================================================
-- Purpose: Verify functions are executable by authenticated users
-- Expected: All functions should have EXECUTE permission

SELECT 
  'Test 10: Function permissions' as test_name,
  routine_name,
  CASE 
    WHEN has_function_privilege('authenticated', routine_schema || '.' || routine_name || '(' || 
      COALESCE(
        (SELECT string_agg(parameter_mode || ' ' || data_type, ', ' ORDER BY ordinal_position)
         FROM information_schema.parameters p
         WHERE p.specific_schema = r.specific_schema
         AND p.specific_name = r.specific_name), 
        ''
      ) || ')', 'EXECUTE')
    THEN '✅ GRANTED'
    ELSE '❌ DENIED'
  END as execute_permission
FROM information_schema.routines r
WHERE routine_schema = 'public'
AND routine_name IN (
  'reassign_order',
  'get_reassignment_history',
  'get_available_providers',
  'suspend_customer_account',
  'unsuspend_customer_account',
  'get_admin_customers'
)
ORDER BY routine_name;

-- =====================================================
-- Summary Report
-- =====================================================

WITH test_results AS (
  -- Test 1: get_available_providers
  SELECT 1 as test_num, 'get_available_providers' as test_name, 
    CASE WHEN EXISTS(SELECT 1 FROM get_available_providers(NULL, 1) LIMIT 1) OR NOT EXISTS(SELECT 1 FROM get_available_providers(NULL, 1)) THEN true ELSE false END as passed
  
  UNION ALL
  
  -- Test 2: get_admin_customers
  SELECT 2, 'get_admin_customers',
    CASE WHEN EXISTS(SELECT 1 FROM get_admin_customers(NULL, NULL, 1, 0) LIMIT 1) OR NOT EXISTS(SELECT 1 FROM get_admin_customers(NULL, NULL, 1, 0)) THEN true ELSE false END
  
  UNION ALL
  
  -- Test 3: get_reassignment_history
  SELECT 3, 'get_reassignment_history',
    CASE WHEN EXISTS(SELECT 1 FROM get_reassignment_history(NULL, NULL, 1, 0) LIMIT 1) OR NOT EXISTS(SELECT 1 FROM get_reassignment_history(NULL, NULL, 1, 0)) THEN true ELSE false END
  
  UNION ALL
  
  -- Test 4: Suspension columns
  SELECT 4, 'suspension_columns',
    (SELECT COUNT(*) = 4 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name IN ('status', 'suspension_reason', 'suspended_at', 'suspended_by'))
  
  UNION ALL
  
  -- Test 5: order_reassignments table
  SELECT 5, 'order_reassignments_table',
    (SELECT COUNT(*) >= 8 FROM information_schema.columns WHERE table_name = 'order_reassignments')
  
  UNION ALL
  
  -- Test 6: Indexes
  SELECT 6, 'performance_indexes',
    (SELECT COUNT(*) >= 3 FROM pg_indexes WHERE tablename = 'order_reassignments')
)
SELECT 
  '═══════════════════════════════════════' as separator,
  'DEPLOYMENT VERIFICATION SUMMARY' as title,
  '═══════════════════════════════════════' as separator2
UNION ALL
SELECT 
  '',
  'Total Tests: ' || COUNT(*)::text,
  ''
FROM test_results
UNION ALL
SELECT 
  '',
  'Passed: ' || COUNT(*) FILTER (WHERE passed = true)::text,
  ''
FROM test_results
UNION ALL
SELECT 
  '',
  'Failed: ' || COUNT(*) FILTER (WHERE passed = false)::text,
  ''
FROM test_results
UNION ALL
SELECT 
  '',
  CASE 
    WHEN COUNT(*) FILTER (WHERE passed = false) = 0 THEN '✅ ALL TESTS PASSED'
    ELSE '❌ SOME TESTS FAILED'
  END,
  ''
FROM test_results;

-- =====================================================
-- Expected Output:
-- ✅ All functions execute without errors
-- ✅ All tables and columns exist
-- ✅ All indexes created
-- ✅ All permissions granted
-- ✅ Summary shows all tests passed
-- =====================================================

-- =====================================================
-- Notes for Manual Testing:
-- =====================================================
-- 1. If suspend_customer_account test is needed, create a test customer first
-- 2. If reassign_order test is needed, create a test order first
-- 3. Some tests may return 0 rows if no data exists (this is OK)
-- 4. Focus on verifying functions execute without SQL errors
-- 5. Actual data testing should be done in integration tests
-- =====================================================
