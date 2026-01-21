-- QUICK FIX: Admin Customers Access Issue
-- =========================================
-- Run this in Supabase SQL Editor to fix the "Unauthorized: Admin access required" error
-- This ensures your admin user has the correct role in the profiles table

-- Step 1: Check current user and their role
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as metadata_role
FROM auth.users
WHERE email LIKE '%admin%' OR raw_user_meta_data->>'role' = 'admin'
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Check profiles table for admin users
SELECT 
  p.id,
  p.email,
  p.role,
  p.created_at
FROM profiles p
WHERE p.role = 'admin'
ORDER BY p.created_at DESC
LIMIT 5;

-- Step 3: Check users table for admin users
SELECT 
  u.id,
  u.email,
  u.role,
  u.created_at
FROM users u
WHERE u.role = 'admin'
ORDER BY u.created_at DESC
LIMIT 5;

-- Step 4: Sync users to profiles (if profiles is missing data)
-- This will copy all users from the users table to profiles table
INSERT INTO profiles (id, email, full_name, phone_number, role, status, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  u.name as full_name,
  u.phone as phone_number,
  COALESCE(u.role, 'customer') as role,
  'active' as status,
  u.created_at,
  u.updated_at
FROM users u
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone_number = EXCLUDED.phone_number,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Step 5: Verify the sync worked
SELECT 
  'profiles' as source,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE role = 'admin') as admin_count,
  COUNT(*) FILTER (WHERE role = 'customer') as customer_count
FROM profiles
UNION ALL
SELECT 
  'users' as source,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE role = 'admin') as admin_count,
  COUNT(*) FILTER (WHERE role = 'customer') as customer_count
FROM users;

-- Step 6: Test the admin_get_customers function
-- Replace 'YOUR_ADMIN_USER_ID' with your actual admin user ID from Step 1
-- SELECT * FROM admin_get_customers(NULL, NULL, 10, 0);
