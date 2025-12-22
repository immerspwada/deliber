-- ============================================
-- FIX: Admin Users Access
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Drop existing RLS policies on users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admin full access to users" ON users;
DROP POLICY IF EXISTS "admin_full_access_users" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "Public can read users" ON users;
DROP POLICY IF EXISTS "Anyone can read users" ON users;
DROP POLICY IF EXISTS "Anon can read users" ON users;

-- 2. Enable RLS on users table (if not already)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 3. Create permissive policies for users table

-- Allow anyone to read users (for admin demo mode)
CREATE POLICY "Anyone can read users"
ON users FOR SELECT
TO public
USING (true);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow insert for registration
CREATE POLICY "Allow user registration"
ON users FOR INSERT
TO public
WITH CHECK (true);

-- 4. Grant permissions
GRANT SELECT ON users TO anon;
GRANT SELECT ON users TO authenticated;
GRANT UPDATE ON users TO authenticated;
GRANT INSERT ON users TO anon;
GRANT INSERT ON users TO authenticated;

-- 5. Test query
SELECT COUNT(*) as total_users FROM users;
SELECT id, first_name, last_name, email, phone_number, member_uid, verification_status, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- Done!
SELECT 'Admin Users Access fixed! Total users: ' || COUNT(*)::text as status FROM users;
