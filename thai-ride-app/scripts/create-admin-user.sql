-- ============================================
-- CREATE ADMIN USER FOR PRODUCTION
-- ============================================
-- Run this script in Supabase SQL Editor to create an admin user
-- 
-- IMPORTANT: 
-- 1. First create the user via Supabase Auth (Dashboard > Authentication > Users > Add User)
--    - Email: your-admin@email.com
--    - Password: your-secure-password
-- 2. Then run this script to set the role to 'admin' or 'super_admin'
-- ============================================

-- Option 1: Update existing user to admin role by email
-- Replace 'your-admin@email.com' with the actual admin email
UPDATE users 
SET role = 'super_admin'
WHERE email = 'your-admin@email.com';

-- Option 2: Update by user ID (get ID from Supabase Auth dashboard)
-- UPDATE users 
-- SET role = 'super_admin'
-- WHERE id = 'your-user-uuid-here';

-- Verify the update
SELECT id, email, first_name, last_name, role, created_at
FROM users
WHERE role IN ('admin', 'super_admin');
