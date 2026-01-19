-- =====================================================
-- Deployment Verification Script: RLS Policies
-- =====================================================
-- Purpose: Verify all RLS policies from migrations 306, 308, 309 exist
-- Usage: Run this in Supabase Dashboard SQL Editor after deployment
-- Expected: All policies should return 'EXISTS' status
-- =====================================================

-- Check if RLS is enabled on required tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity = true THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'order_reassignments',
  'profiles'
)
ORDER BY tablename;

-- =====================================================
-- Verify Migration 306 Policies (Order Reassignment)
-- =====================================================

-- Check order_reassignments table policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  CASE 
    WHEN policyname IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'order_reassignments'
ORDER BY policyname;

-- Expected policies for order_reassignments:
-- 1. admin_full_access_reassignments

-- =====================================================
-- Verify Migration 308 Policies (Customer Suspension)
-- =====================================================

-- Check profiles table policies related to suspension
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  CASE 
    WHEN policyname IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profiles'
AND policyname IN (
  'customer_suspended_blocked',
  'customer_suspended_no_update'
)
ORDER BY policyname;

-- Expected policies for profiles (suspension):
-- 1. customer_suspended_blocked (SELECT)
-- 2. customer_suspended_no_update (UPDATE)

-- =====================================================
-- All Profiles Policies (Complete View)
-- =====================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profiles'
ORDER BY policyname;

-- =====================================================
-- Verify Dual-Role System Integrity
-- =====================================================

-- Check if providers_v2.user_id column exists (dual-role system)
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  CASE 
    WHEN column_name = 'user_id' THEN '✅ DUAL-ROLE COLUMN EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'providers_v2'
AND column_name = 'user_id';

-- Check if RLS policies use dual-role pattern (JOIN to providers_v2)
-- This checks if any policies reference providers_v2 table
SELECT 
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN qual::text LIKE '%providers_v2%' OR with_check::text LIKE '%providers_v2%' 
    THEN '✅ USES DUAL-ROLE PATTERN'
    ELSE '⚠️ NO DUAL-ROLE REFERENCE'
  END as dual_role_check,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
AND (
  qual::text LIKE '%provider_id%' 
  OR with_check::text LIKE '%provider_id%'
)
ORDER BY tablename, policyname;

-- =====================================================
-- Storage Bucket Policies (Dual-Role Check)
-- =====================================================

-- Check storage.objects policies for dual-role pattern
SELECT 
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN qual::text LIKE '%providers_v2%' OR with_check::text LIKE '%providers_v2%' 
    THEN '✅ USES DUAL-ROLE PATTERN'
    ELSE '⚠️ NO DUAL-ROLE REFERENCE'
  END as dual_role_check,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND (
  qual::text LIKE '%provider%' 
  OR with_check::text LIKE '%provider%'
)
ORDER BY policyname;

-- =====================================================
-- Policy Details (For Debugging)
-- =====================================================

-- Show full policy definitions for order_reassignments
SELECT 
  policyname,
  cmd,
  qual::text as using_clause,
  with_check::text as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'order_reassignments';

-- Show full policy definitions for profiles suspension policies
SELECT 
  policyname,
  cmd,
  qual::text as using_clause,
  with_check::text as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profiles'
AND policyname IN (
  'customer_suspended_blocked',
  'customer_suspended_no_update'
);

-- =====================================================
-- Summary Report
-- =====================================================

WITH expected_policies AS (
  SELECT 'order_reassignments' as table_name, 'admin_full_access_reassignments' as policy_name
  UNION ALL
  SELECT 'profiles', 'customer_suspended_blocked'
  UNION ALL
  SELECT 'profiles', 'customer_suspended_no_update'
),
actual_policies AS (
  SELECT tablename as table_name, policyname as policy_name
  FROM pg_policies
  WHERE schemaname = 'public'
)
SELECT 
  'RLS Policies Verification' as check_type,
  COUNT(*) as total_expected,
  COUNT(a.policy_name) as found,
  COUNT(*) - COUNT(a.policy_name) as missing,
  CASE 
    WHEN COUNT(*) - COUNT(a.policy_name) = 0 THEN '✅ ALL POLICIES EXIST'
    ELSE '❌ SOME POLICIES MISSING'
  END as status
FROM expected_policies e
LEFT JOIN actual_policies a 
  ON e.table_name = a.table_name 
  AND e.policy_name = a.policy_name;

-- List missing policies (if any)
WITH expected_policies AS (
  SELECT 'order_reassignments' as table_name, 'admin_full_access_reassignments' as policy_name
  UNION ALL
  SELECT 'profiles', 'customer_suspended_blocked'
  UNION ALL
  SELECT 'profiles', 'customer_suspended_no_update'
),
actual_policies AS (
  SELECT tablename as table_name, policyname as policy_name
  FROM pg_policies
  WHERE schemaname = 'public'
)
SELECT 
  e.table_name,
  e.policy_name,
  '❌ MISSING' as status
FROM expected_policies e
LEFT JOIN actual_policies a 
  ON e.table_name = a.table_name 
  AND e.policy_name = a.policy_name
WHERE a.policy_name IS NULL;

-- =====================================================
-- Expected Output:
-- ✅ RLS enabled on order_reassignments and profiles
-- ✅ 3 policies should exist (1 for order_reassignments, 2 for profiles)
-- ✅ providers_v2.user_id column exists (dual-role system)
-- ✅ Storage policies use dual-role pattern
-- =====================================================
