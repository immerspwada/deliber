-- =====================================================
-- SETUP ADMIN USER - Manual Steps
-- =====================================================
-- Run this AFTER creating user in Supabase Auth Dashboard
-- Replace 'YOUR_USER_ID' with the actual UUID from Auth

-- Step 1: Check if user exists in users table
SELECT id, email, role FROM users WHERE email = 'superadmin@gobear.app';

-- Step 2: If user doesn't exist, insert it
-- Replace YOUR_USER_ID with the UUID from Supabase Auth
INSERT INTO users (id, email, first_name, last_name, role, verification_status)
VALUES (
  'YOUR_USER_ID',  -- Replace with actual UUID
  'superadmin@gobear.app',
  'Super',
  'Admin',
  'super_admin',
  'verified'
)
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  verification_status = 'verified';

-- Step 3: If user already exists, just update role
UPDATE users 
SET role = 'super_admin', verification_status = 'verified'
WHERE email = 'superadmin@gobear.app';

-- Step 4: Verify the update
SELECT id, email, first_name, last_name, role, verification_status 
FROM users 
WHERE email = 'superadmin@gobear.app';

-- =====================================================
-- ALTERNATIVE: Create admin from existing user
-- =====================================================
-- If you have an existing user you want to make admin:

-- UPDATE users SET role = 'super_admin' WHERE email = 'your-existing-email@example.com';

-- =====================================================
-- Check all admin users
-- =====================================================
SELECT id, email, first_name, last_name, role, created_at
FROM users
WHERE role IN ('admin', 'super_admin')
ORDER BY created_at DESC;
