-- Task 16.4: Verify Admin User Role in Production
-- This script verifies that the admin user has the correct role in the users table

-- ============================================================================
-- STEP 1: Check if admin user exists in users table
-- ============================================================================

SELECT 
  id,
  email,
  role,
  first_name,
  last_name,
  created_at
FROM users
WHERE email = 'superadmin@gobear.app';

-- Expected result: 1 row with role = 'super_admin' or 'admin'
-- If no rows: User doesn't exist in users table (see STEP 3)
-- If role is NULL or wrong: Need to update (see STEP 4)

-- ============================================================================
-- STEP 2: Check if user exists in auth.users
-- ============================================================================

SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'superadmin@gobear.app';

-- Expected result: 1 row
-- If no rows: User needs to be created via Supabase Auth

-- ============================================================================
-- STEP 3: Create user record if missing (ONLY IF STEP 1 RETURNED NO ROWS)
-- ============================================================================

-- First, get the auth user ID from STEP 2
-- Replace 'YOUR-AUTH-USER-ID' with the actual ID from STEP 2

/*
INSERT INTO users (id, email, role, first_name, last_name)
VALUES (
  'YOUR-AUTH-USER-ID',  -- Replace with actual auth.users.id
  'superadmin@gobear.app',
  'super_admin',
  'Super',
  'Admin'
)
ON CONFLICT (id) DO NOTHING;
*/

-- ============================================================================
-- STEP 4: Update user role if incorrect (ONLY IF ROLE IS WRONG)
-- ============================================================================

/*
UPDATE users
SET role = 'super_admin'
WHERE email = 'superadmin@gobear.app';
*/

-- ============================================================================
-- STEP 5: Verify the update
-- ============================================================================

SELECT 
  id,
  email,
  role,
  first_name,
  last_name
FROM users
WHERE email = 'superadmin@gobear.app';

-- Expected result: role = 'super_admin' or 'admin'

-- ============================================================================
-- STEP 6: Test admin access with RPC function
-- ============================================================================

-- This will test if the admin user can access admin RPC functions
SELECT * FROM get_admin_providers_v2(NULL, NULL, 5, 0);

-- Expected result: Provider list (or empty array if no providers)
-- If error "Access denied": Role is not set correctly
-- If error "User not found": User record doesn't exist in users table

-- ============================================================================
-- STEP 7: Check all admin users in the system
-- ============================================================================

SELECT 
  id,
  email,
  role,
  first_name,
  last_name,
  created_at
FROM users
WHERE role IN ('admin', 'super_admin')
ORDER BY created_at DESC;

-- This shows all users with admin privileges

-- ============================================================================
-- VERIFICATION SUMMARY
-- ============================================================================

-- Run this final query to get a complete summary:

SELECT 
  'Admin User Verification' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM users 
      WHERE email = 'superadmin@gobear.app' 
      AND role IN ('admin', 'super_admin')
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM users 
      WHERE email = 'superadmin@gobear.app' 
      AND role IN ('admin', 'super_admin')
    ) THEN 'Admin user exists with correct role'
    ELSE 'Admin user missing or has incorrect role'
  END as message;

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- Issue: "User not found" error when accessing admin panel
-- Solution: Run STEP 3 to create user record

-- Issue: "Access denied" error when accessing admin panel
-- Solution: Run STEP 4 to update user role

-- Issue: User exists but can't login
-- Solution: Check auth.users table (STEP 2) and verify email is confirmed

-- Issue: Multiple admin users needed
-- Solution: Repeat STEP 3 for each admin user with their auth.users.id

-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. The 'users' table is separate from 'auth.users'
-- 2. auth.users handles authentication (login/password)
-- 3. users table handles authorization (roles/permissions)
-- 4. Both tables must have matching records with same ID
-- 5. Role can be 'admin' or 'super_admin' (both have full access)
-- 6. After updating role, user must logout and login again

-- ============================================================================
-- SUCCESS CRITERIA
-- ============================================================================

-- ✅ User exists in auth.users
-- ✅ User exists in users table
-- ✅ User role is 'super_admin' or 'admin'
-- ✅ User can access admin RPC functions
-- ✅ User can login to admin panel
-- ✅ No "Access denied" errors
-- ✅ No "User not found" errors
