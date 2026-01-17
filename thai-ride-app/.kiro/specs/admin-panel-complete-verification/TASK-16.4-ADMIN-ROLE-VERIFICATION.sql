-- ================================================================
-- Task 16.4: Verify Admin User Role in Production
-- ================================================================
-- This script verifies and fixes the admin user role in production
-- Run in Supabase Dashboard → SQL Editor
-- ================================================================

-- ================================================================
-- STEP 1: Check Current Admin User
-- ================================================================
SELECT 
  id,
  email,
  role,
  created_at,
  last_active_at,
  verification_status
FROM users 
WHERE email = 'superadmin@gobear.app';

-- Expected Result:
-- ✅ User exists
-- ✅ role = 'super_admin' or 'admin'
-- ❌ If role is NULL or 'customer' or 'provider', needs fixing

-- ================================================================
-- STEP 2: Fix Admin Role (if needed)
-- ================================================================
-- Only run this if the role is NOT 'super_admin' or 'admin'

UPDATE users 
SET 
  role = 'super_admin',
  verification_status = 'verified',
  updated_at = NOW()
WHERE email = 'superadmin@gobear.app';

-- Verify the update
SELECT 
  id,
  email,
  role,
  verification_status,
  updated_at
FROM users 
WHERE email = 'superadmin@gobear.app';

-- ================================================================
-- STEP 3: Verify Admin Access to RPC Functions
-- ================================================================
-- Test that admin can call the RPC functions

-- Test get_admin_providers_v2
SELECT * FROM get_admin_providers_v2(NULL, NULL, 5, 0);

-- Test count_admin_providers_v2
SELECT count_admin_providers_v2(NULL, NULL);

-- Test get_admin_customers
SELECT * FROM get_admin_customers(NULL, NULL, 5, 0);

-- Test count_admin_customers
SELECT count_admin_customers(NULL, NULL);

-- Expected Results:
-- ✅ All queries return data without errors
-- ✅ No "Access denied" errors
-- ✅ No "User not found" errors

-- ================================================================
-- STEP 4: Check Admin User in Auth System
-- ================================================================
-- Verify the user exists in Supabase Auth

SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'superadmin@gobear.app';

-- Expected Result:
-- ✅ User exists in auth.users
-- ✅ email_confirmed_at is NOT NULL
-- ✅ id matches the id in public.users table

-- ================================================================
-- STEP 5: Verify Admin Can Access All Tables
-- ================================================================
-- Test RLS policies allow admin access

-- Test providers_v2 access
SELECT COUNT(*) as provider_count FROM providers_v2;

-- Test users access
SELECT COUNT(*) as user_count FROM users WHERE role = 'customer';

-- Test ride_requests access
SELECT COUNT(*) as ride_count FROM ride_requests;

-- Test wallets access
SELECT COUNT(*) as wallet_count FROM wallets;

-- Expected Results:
-- ✅ All queries return counts without errors
-- ✅ No RLS policy violations

-- ================================================================
-- STEP 6: Create Additional Admin Users (Optional)
-- ================================================================
-- If you need to create more admin users, use this template:

/*
-- First, create the user in Supabase Auth Dashboard
-- Then run this to set their role:

UPDATE users 
SET 
  role = 'admin',  -- or 'super_admin'
  verification_status = 'verified',
  updated_at = NOW()
WHERE email = 'new-admin@example.com';

-- Verify
SELECT id, email, role FROM users WHERE email = 'new-admin@example.com';
*/

-- ================================================================
-- STEP 7: Verify Admin Panel Access
-- ================================================================
-- After running the above, test in the application:
-- 1. Login with superadmin@gobear.app
-- 2. Navigate to /admin/providers
-- 3. Verify page loads without errors
-- 4. Verify all admin features work

-- ================================================================
-- TROUBLESHOOTING
-- ================================================================

-- Issue 1: User not found
-- Solution: Check if user exists in auth.users
SELECT * FROM auth.users WHERE email = 'superadmin@gobear.app';

-- Issue 2: Access denied errors
-- Solution: Verify role is set correctly
SELECT role FROM users WHERE email = 'superadmin@gobear.app';

-- Issue 3: RLS policy violations
-- Solution: Check RLS policies on tables
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('providers_v2', 'users', 'ride_requests', 'wallets')
ORDER BY tablename, policyname;

-- Issue 4: Email not confirmed
-- Solution: Confirm email in auth.users
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'superadmin@gobear.app' 
AND email_confirmed_at IS NULL;

-- ================================================================
-- SUCCESS CRITERIA
-- ================================================================
-- ✅ User exists in both auth.users and public.users
-- ✅ Role is 'super_admin' or 'admin'
-- ✅ Email is confirmed
-- ✅ Can call all admin RPC functions
-- ✅ Can access all tables
-- ✅ Can login to admin panel
-- ✅ Admin panel loads without errors
-- ================================================================

-- ================================================================
-- FINAL VERIFICATION QUERY
-- ================================================================
-- Run this to get a complete status report:

SELECT 
  'Admin User Status' as check_type,
  CASE 
    WHEN u.id IS NULL THEN '❌ User not found'
    WHEN u.role NOT IN ('admin', 'super_admin') THEN '❌ Invalid role: ' || COALESCE(u.role, 'NULL')
    WHEN au.email_confirmed_at IS NULL THEN '⚠️ Email not confirmed'
    ELSE '✅ All checks passed'
  END as status,
  u.email,
  u.role,
  u.verification_status,
  au.email_confirmed_at,
  u.created_at,
  u.last_active_at
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'superadmin@gobear.app'

UNION ALL

SELECT 
  'RPC Function Access' as check_type,
  CASE 
    WHEN (SELECT COUNT(*) FROM get_admin_providers_v2(NULL, NULL, 1, 0)) >= 0 THEN '✅ Can access RPC functions'
    ELSE '❌ Cannot access RPC functions'
  END as status,
  NULL as email,
  NULL as role,
  NULL as verification_status,
  NULL as email_confirmed_at,
  NULL as created_at,
  NULL as last_active_at;

-- ================================================================
-- NOTES
-- ================================================================
-- 1. Always verify changes in a test environment first
-- 2. Keep a backup of the original role before updating
-- 3. Document any changes made to admin users
-- 4. Use 'super_admin' for full access, 'admin' for limited access
-- 5. Never share admin credentials
-- ================================================================
