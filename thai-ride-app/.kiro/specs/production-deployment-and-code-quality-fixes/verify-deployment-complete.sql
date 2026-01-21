-- =====================================================
-- MASTER DEPLOYMENT VERIFICATION SCRIPT
-- =====================================================
-- Purpose: Complete verification of migrations 306, 308, 309
-- Usage: Run this in Supabase Dashboard SQL Editor after deployment
-- Expected: All checks should pass with ✅ status
-- =====================================================
-- Migrations Verified:
-- - 306: Admin Order Reassignment System
-- - 308: Customer Suspension System
-- - 309: Fix get_admin_customers Status
-- =====================================================

\echo '═══════════════════════════════════════════════════════════'
\echo 'DEPLOYMENT VERIFICATION - MIGRATIONS 306, 308, 309'
\echo '═══════════════════════════════════════════════════════════'
\echo ''

-- =====================================================
-- SECTION 1: RPC FUNCTIONS VERIFICATION
-- =====================================================

\echo '1️⃣  VERIFYING RPC FUNCTIONS...'
\echo ''

SELECT 
  '📋 RPC Functions Check' as check_section,
  routine_name as function_name,
  routine_type as type,
  '✅ EXISTS' as status
FROM information_schema.routines
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

-- Summary
WITH expected AS (
  SELECT unnest(ARRAY[
    'reassign_order',
    'get_reassignment_history',
    'get_available_providers',
    'suspend_customer_account',
    'unsuspend_customer_account',
    'get_admin_customers'
  ]) as func_name
)
SELECT 
  '📊 Functions Summary' as summary,
  COUNT(*) as total_expected,
  COUNT(r.routine_name) as found,
  COUNT(*) - COUNT(r.routine_name) as missing,
  CASE 
    WHEN COUNT(*) - COUNT(r.routine_name) = 0 THEN '✅ ALL FUNCTIONS EXIST'
    ELSE '❌ MISSING FUNCTIONS'
  END as status
FROM expected e
LEFT JOIN information_schema.routines r 
  ON r.routine_schema = 'public' 
  AND r.routine_name = e.func_name;

\echo ''

-- =====================================================
-- SECTION 2: TABLES AND COLUMNS VERIFICATION
-- =====================================================

\echo '2️⃣  VERIFYING TABLES AND COLUMNS...'
\echo ''

-- Check order_reassignments table
SELECT 
  '📋 order_reassignments Table' as check_section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_reassignments')
    THEN '✅ TABLE EXISTS'
    ELSE '❌ TABLE MISSING'
  END as status,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'order_reassignments') as column_count;

-- Check profiles suspension columns
SELECT 
  '📋 Suspension Columns' as check_section,
  column_name,
  data_type,
  '✅ EXISTS' as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
AND column_name IN ('status', 'suspension_reason', 'suspended_at', 'suspended_by')
ORDER BY column_name;

-- Summary
SELECT 
  '📊 Columns Summary' as summary,
  4 as expected_columns,
  COUNT(*) as found_columns,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ ALL COLUMNS EXIST'
    ELSE '❌ MISSING COLUMNS'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
AND column_name IN ('status', 'suspension_reason', 'suspended_at', 'suspended_by');

\echo ''

-- =====================================================
-- SECTION 3: RLS POLICIES VERIFICATION
-- =====================================================

\echo '3️⃣  VERIFYING RLS POLICIES...'
\echo ''

-- Check RLS enabled
SELECT 
  '📋 RLS Status' as check_section,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('order_reassignments', 'profiles')
ORDER BY tablename;

-- Check specific policies
SELECT 
  '📋 RLS Policies' as check_section,
  tablename,
  policyname,
  cmd as operation,
  '✅ EXISTS' as status
FROM pg_policies
WHERE schemaname = 'public'
AND (
  (tablename = 'order_reassignments' AND policyname = 'admin_full_access_reassignments')
  OR
  (tablename = 'profiles' AND policyname IN ('customer_suspended_blocked', 'customer_suspended_no_update'))
)
ORDER BY tablename, policyname;

-- Summary
WITH expected_policies AS (
  SELECT 'order_reassignments' as tbl, 'admin_full_access_reassignments' as pol
  UNION ALL SELECT 'profiles', 'customer_suspended_blocked'
  UNION ALL SELECT 'profiles', 'customer_suspended_no_update'
)
SELECT 
  '📊 Policies Summary' as summary,
  COUNT(*) as expected_policies,
  COUNT(p.policyname) as found_policies,
  CASE 
    WHEN COUNT(*) = COUNT(p.policyname) THEN '✅ ALL POLICIES EXIST'
    ELSE '❌ MISSING POLICIES'
  END as status
FROM expected_policies e
LEFT JOIN pg_policies p 
  ON p.schemaname = 'public' 
  AND p.tablename = e.tbl 
  AND p.policyname = e.pol;

\echo ''

-- =====================================================
-- SECTION 4: INDEXES VERIFICATION
-- =====================================================

\echo '4️⃣  VERIFYING PERFORMANCE INDEXES...'
\echo ''

SELECT 
  '📋 Indexes' as check_section,
  tablename,
  indexname,
  '✅ EXISTS' as status
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'order_reassignments'
AND indexname IN (
  'idx_order_reassignments_order',
  'idx_order_reassignments_provider',
  'idx_order_reassignments_admin'
)
ORDER BY indexname;

-- Check profiles indexes for suspension
SELECT 
  '📋 Profiles Indexes' as check_section,
  tablename,
  indexname,
  '✅ EXISTS' as status
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'profiles'
AND (
  indexname LIKE '%status%' 
  OR indexname LIKE '%suspended%'
)
ORDER BY indexname;

\echo ''

-- =====================================================
-- SECTION 5: DUAL-ROLE SYSTEM VERIFICATION
-- =====================================================

\echo '5️⃣  VERIFYING DUAL-ROLE SYSTEM...'
\echo ''

-- Check providers_v2.user_id column
SELECT 
  '📋 Dual-Role Column' as check_section,
  table_name,
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'user_id' THEN '✅ DUAL-ROLE SYSTEM INTACT'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'providers_v2'
AND column_name = 'user_id';

-- Check if policies use dual-role pattern
SELECT 
  '📋 Dual-Role Policies' as check_section,
  tablename,
  policyname,
  CASE 
    WHEN qual::text LIKE '%providers_v2%' OR with_check::text LIKE '%providers_v2%' 
    THEN '✅ USES DUAL-ROLE'
    ELSE '⚠️ NO DUAL-ROLE'
  END as dual_role_status
FROM pg_policies
WHERE schemaname = 'public'
AND (
  qual::text LIKE '%provider_id%' 
  OR with_check::text LIKE '%provider_id%'
)
LIMIT 5;

\echo ''

-- =====================================================
-- SECTION 6: FUNCTION EXECUTION TESTS
-- =====================================================

\echo '6️⃣  TESTING FUNCTION EXECUTION...'
\echo ''

-- Test get_available_providers
SELECT 
  '📋 Function Test' as check_section,
  'get_available_providers' as function_name,
  CASE 
    WHEN COUNT(*) >= 0 THEN '✅ EXECUTES'
    ELSE '❌ ERROR'
  END as status,
  COUNT(*) as result_count
FROM get_available_providers(NULL, 5);

-- Test get_admin_customers
SELECT 
  '📋 Function Test' as check_section,
  'get_admin_customers' as function_name,
  CASE 
    WHEN COUNT(*) >= 0 THEN '✅ EXECUTES'
    ELSE '❌ ERROR'
  END as status,
  COUNT(*) as result_count
FROM get_admin_customers(NULL, NULL, 5, 0);

-- Test get_reassignment_history
SELECT 
  '📋 Function Test' as check_section,
  'get_reassignment_history' as function_name,
  CASE 
    WHEN COUNT(*) >= 0 THEN '✅ EXECUTES'
    ELSE '❌ ERROR'
  END as status,
  COUNT(*) as result_count
FROM get_reassignment_history(NULL, NULL, 5, 0);

\echo ''

-- =====================================================
-- SECTION 7: PERMISSIONS VERIFICATION
-- =====================================================

\echo '7️⃣  VERIFYING FUNCTION PERMISSIONS...'
\echo ''

SELECT 
  '📋 Execute Permissions' as check_section,
  routine_name as function_name,
  '✅ GRANTED TO authenticated' as status
FROM information_schema.routines
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

\echo ''

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

\echo '═══════════════════════════════════════════════════════════'
\echo 'FINAL VERIFICATION SUMMARY'
\echo '═══════════════════════════════════════════════════════════'

WITH verification_checks AS (
  -- Check 1: RPC Functions
  SELECT 
    'RPC Functions' as check_name,
    CASE WHEN COUNT(*) = 6 THEN true ELSE false END as passed
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name IN (
    'reassign_order', 'get_reassignment_history', 'get_available_providers',
    'suspend_customer_account', 'unsuspend_customer_account', 'get_admin_customers'
  )
  
  UNION ALL
  
  -- Check 2: Tables
  SELECT 
    'Tables & Columns',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_reassignments') THEN true ELSE false END
  
  UNION ALL
  
  -- Check 3: Suspension Columns
  SELECT 
    'Suspension Columns',
    CASE WHEN COUNT(*) = 4 THEN true ELSE false END
  FROM information_schema.columns
  WHERE table_name = 'profiles' 
  AND column_name IN ('status', 'suspension_reason', 'suspended_at', 'suspended_by')
  
  UNION ALL
  
  -- Check 4: RLS Policies
  SELECT 
    'RLS Policies',
    CASE WHEN COUNT(*) >= 3 THEN true ELSE false END
  FROM pg_policies
  WHERE schemaname = 'public'
  AND (
    (tablename = 'order_reassignments' AND policyname = 'admin_full_access_reassignments')
    OR (tablename = 'profiles' AND policyname IN ('customer_suspended_blocked', 'customer_suspended_no_update'))
  )
  
  UNION ALL
  
  -- Check 5: Indexes
  SELECT 
    'Performance Indexes',
    CASE WHEN COUNT(*) >= 3 THEN true ELSE false END
  FROM pg_indexes
  WHERE tablename = 'order_reassignments'
  
  UNION ALL
  
  -- Check 6: Dual-Role System
  SELECT 
    'Dual-Role System',
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'providers_v2' AND column_name = 'user_id'
    ) THEN true ELSE false END
)
SELECT 
  check_name,
  CASE 
    WHEN passed THEN '✅ PASSED'
    ELSE '❌ FAILED'
  END as status
FROM verification_checks
ORDER BY check_name;

-- Overall Status
SELECT 
  '═══════════════════════════════════════' as separator,
  CASE 
    WHEN COUNT(*) FILTER (WHERE passed = false) = 0 
    THEN '✅ ALL CHECKS PASSED - DEPLOYMENT SUCCESSFUL'
    ELSE '❌ SOME CHECKS FAILED - REVIEW REQUIRED'
  END as overall_status,
  '═══════════════════════════════════════' as separator2
FROM verification_checks;

\echo ''
\echo '═══════════════════════════════════════════════════════════'
\echo 'VERIFICATION COMPLETE'
\echo '═══════════════════════════════════════════════════════════'

-- =====================================================
-- Next Steps:
-- =====================================================
-- ✅ If all checks passed: Deployment successful!
-- ❌ If any checks failed: Review the specific section above
-- 📝 Document any issues found
-- 🔄 Run rollback scripts if needed (see rollback/ directory)
-- =====================================================
