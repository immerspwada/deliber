-- =====================================================
-- Deployment Verification Script: RPC Functions
-- =====================================================
-- Purpose: Verify all RPC functions from migrations 306, 308, 309 exist
-- Usage: Run this in Supabase Dashboard SQL Editor after deployment
-- Expected: All functions should return 'EXISTS' status
-- =====================================================

-- Check if all required RPC functions exist
SELECT 
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  -- Migration 306: Admin Order Reassignment
  'reassign_order',
  'get_reassignment_history',
  'get_available_providers',
  
  -- Migration 308: Customer Suspension
  'suspend_customer_account',
  'unsuspend_customer_account',
  
  -- Migration 309: Fixed Admin Customers
  'get_admin_customers'
)
ORDER BY routine_name;

-- =====================================================
-- Detailed Function Verification
-- =====================================================

-- 1. Verify reassign_order function signature
SELECT 
  routine_name,
  data_type as return_type,
  routine_definition IS NOT NULL as has_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'reassign_order';

-- 2. Verify get_reassignment_history function signature
SELECT 
  routine_name,
  data_type as return_type,
  routine_definition IS NOT NULL as has_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_reassignment_history';

-- 3. Verify get_available_providers function signature
SELECT 
  routine_name,
  data_type as return_type,
  routine_definition IS NOT NULL as has_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_available_providers';

-- 4. Verify suspend_customer_account function signature
SELECT 
  routine_name,
  data_type as return_type,
  routine_definition IS NOT NULL as has_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'suspend_customer_account';

-- 5. Verify unsuspend_customer_account function signature
SELECT 
  routine_name,
  data_type as return_type,
  routine_definition IS NOT NULL as has_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'unsuspend_customer_account';

-- 6. Verify get_admin_customers function signature
SELECT 
  routine_name,
  data_type as return_type,
  routine_definition IS NOT NULL as has_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_admin_customers';

-- =====================================================
-- Function Parameters Verification
-- =====================================================

-- Check parameters for reassign_order
SELECT 
  routine_name,
  parameter_name,
  data_type,
  parameter_mode
FROM information_schema.parameters
WHERE specific_schema = 'public'
AND routine_name = 'reassign_order'
ORDER BY ordinal_position;

-- Check parameters for get_available_providers
SELECT 
  routine_name,
  parameter_name,
  data_type,
  parameter_mode
FROM information_schema.parameters
WHERE specific_schema = 'public'
AND routine_name = 'get_available_providers'
ORDER BY ordinal_position;

-- Check parameters for suspend_customer_account
SELECT 
  routine_name,
  parameter_name,
  data_type,
  parameter_mode
FROM information_schema.parameters
WHERE specific_schema = 'public'
AND routine_name = 'suspend_customer_account'
ORDER BY ordinal_position;

-- Check parameters for get_admin_customers
SELECT 
  routine_name,
  parameter_name,
  data_type,
  parameter_mode
FROM information_schema.parameters
WHERE specific_schema = 'public'
AND routine_name = 'get_admin_customers'
ORDER BY ordinal_position;

-- =====================================================
-- Summary Report
-- =====================================================

SELECT 
  'RPC Functions Verification' as check_type,
  COUNT(*) as total_expected,
  COUNT(*) FILTER (WHERE routine_name IS NOT NULL) as found,
  COUNT(*) FILTER (WHERE routine_name IS NULL) as missing,
  CASE 
    WHEN COUNT(*) FILTER (WHERE routine_name IS NULL) = 0 THEN '✅ ALL FUNCTIONS EXIST'
    ELSE '❌ SOME FUNCTIONS MISSING'
  END as status
FROM (
  SELECT unnest(ARRAY[
    'reassign_order',
    'get_reassignment_history',
    'get_available_providers',
    'suspend_customer_account',
    'unsuspend_customer_account',
    'get_admin_customers'
  ]) as expected_function
) expected
LEFT JOIN information_schema.routines r 
  ON r.routine_schema = 'public' 
  AND r.routine_name = expected.expected_function;

-- =====================================================
-- Expected Output:
-- ✅ 6 functions should exist
-- ✅ All functions should have definitions
-- ✅ All functions should have correct parameters
-- =====================================================
