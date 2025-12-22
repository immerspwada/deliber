-- Migration: 147_fix_admin_users_access.sql
-- Description: Fix RLS policies to allow admin dashboard to read all users
-- Date: 2025-01-22
-- Updated: 2025-12-22 - Fixed to use 'anon' role instead of 'public'

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
DROP POLICY IF EXISTS "Public read access for admin" ON users;
DROP POLICY IF EXISTS "Anon read access for admin dashboard" ON users;
DROP POLICY IF EXISTS "Admin full access users" ON users;

-- 2. Enable RLS on users table (if not already)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 3. Create permissive policies for users table

-- Allow anon role to read users (for admin demo mode without auth)
-- Supabase client uses 'anon' role when not authenticated
CREATE POLICY "Anon read access for admin dashboard"
ON users FOR SELECT
TO anon
USING (true);

-- Allow authenticated users to read all users
CREATE POLICY "Admin full access users"
ON users FOR SELECT
TO authenticated
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
TO anon, authenticated
WITH CHECK (true);

-- 4. Grant permissions
GRANT SELECT ON users TO anon;
GRANT SELECT ON users TO authenticated;
GRANT UPDATE ON users TO authenticated;
GRANT INSERT ON users TO anon;
GRANT INSERT ON users TO authenticated;

-- 5. Add comments
COMMENT ON POLICY "Anon read access for admin dashboard" ON users IS 
  'Allow admin dashboard to read all users without authentication (demo mode)';
COMMENT ON POLICY "Admin full access users" ON users IS 
  'Allow authenticated users to read all users for admin functionality';
