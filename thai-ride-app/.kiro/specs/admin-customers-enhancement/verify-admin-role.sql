-- Quick Admin Role Verification Script
-- Run this in Supabase SQL Editor to diagnose the issue

-- ============================================
-- 1. CHECK CURRENT USER
-- ============================================
SELECT 
  'Current User' as check_type,
  auth.uid() as user_id,
  auth.email() as email;

-- ============================================
-- 2. CHECK PROFILES TABLE
-- ============================================
SELECT 
  'Profiles Check' as check_type,
  id,
  email,
  role,
  status,
  created_at
FROM profiles
WHERE email = 'superadmin@gobear.app'
   OR id = auth.uid();

-- ============================================
-- 3. CHECK USERS TABLE (FALLBACK)
-- ============================================
SELECT 
  'Users Check' as check_type,
  id,
  email,
  role,
  created_at
FROM users
WHERE email = 'superadmin@gobear.app'
   OR id = auth.uid();

-- ============================================
-- 4. CHECK AUTH.USERS (SUPABASE AUTH)
-- ============================================
SELECT 
  'Auth Users Check' as check_type,
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'superadmin@gobear.app';

-- ============================================
-- 5. CHECK IF FUNCTION EXISTS
-- ============================================
SELECT 
  'Function Check' as check_type,
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'admin_get_customers';

-- ============================================
-- 6. TEST FUNCTION CALL (WILL SHOW ERROR IF FAILS)
-- ============================================
-- Uncomment to test:
-- SELECT * FROM admin_get_customers(NULL, NULL, 10, 0);

-- ============================================
-- 7. CHECK RLS POLICIES ON PROFILES
-- ============================================
SELECT 
  'RLS Policies' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles';

-- ============================================
-- EXPECTED RESULTS:
-- ============================================
-- ✅ Current User: Should show your UUID and email
-- ✅ Profiles Check: Should show role = 'admin'
-- ✅ Users Check: Should show role = 'admin' (if profiles empty)
-- ✅ Auth Users Check: Should show your auth record
-- ✅ Function Check: Should show admin_get_customers exists
-- ✅ Test Function: Should return customer list (or empty array)
-- ✅ RLS Policies: Should show policies exist

-- ============================================
-- IF ADMIN ROLE IS MISSING, RUN THIS FIX:
-- ============================================
/*
INSERT INTO profiles (id, email, role, status, created_at, updated_at)
SELECT 
  id,
  email,
  'admin' as role,
  'active' as status,
  created_at,
  NOW() as updated_at
FROM auth.users
WHERE email = 'superadmin@gobear.app'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();
*/
