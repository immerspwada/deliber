-- Migration: 097_fix_users_rls_policy.sql
-- Feature: F01 - Fix Users RLS Policy for Self-Query
-- Description: Allow users to query their own profile

-- =====================================================
-- FIX RLS POLICIES FOR users TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admin can view all users" ON users;
DROP POLICY IF EXISTS "Admin can update all users" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;

-- 1. Allow ANY authenticated user to view their OWN profile
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 2. Allow admin to view ALL users
CREATE POLICY "Admin can view all users"
ON users FOR SELECT
TO authenticated
USING (role = 'admin');

-- 3. Allow users to UPDATE their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Allow admin to UPDATE all users
CREATE POLICY "Admin can update all users"
ON users FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
  )
);

-- 5. Allow INSERT for new users (from auth trigger)
CREATE POLICY "Allow insert for new users"
ON users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 6. Allow service role full access (for triggers)
CREATE POLICY "Service role full access"
ON users FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT ALL ON users TO service_role;
