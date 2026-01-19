-- Migration: 096_fix_provider_rls_policy.sql
-- Feature: F14 - Fix Provider RLS Policy for Self-Query
-- Description: Allow users to query their own provider record without admin role check

-- =====================================================
-- FIX RLS POLICIES FOR service_providers TABLE
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Providers can view own data" ON service_providers;
DROP POLICY IF EXISTS "Admin can view all providers" ON service_providers;
DROP POLICY IF EXISTS "Authenticated users can insert provider" ON service_providers;
DROP POLICY IF EXISTS "Providers can update own data" ON service_providers;
DROP POLICY IF EXISTS "Admin can update all providers" ON service_providers;

-- Enable RLS
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;

-- 1. Allow ANY authenticated user to view their OWN provider record
-- This is the most important policy - users MUST be able to check if they have a provider record
CREATE POLICY "Users can view own provider record"
ON service_providers FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Allow admin to view ALL providers
CREATE POLICY "Admin can view all providers"
ON service_providers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- 3. Allow authenticated users to INSERT their own provider record
CREATE POLICY "Users can insert own provider record"
ON service_providers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Allow providers to UPDATE their own data
CREATE POLICY "Providers can update own data"
ON service_providers FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Allow admin to UPDATE all providers
CREATE POLICY "Admin can update all providers"
ON service_providers FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- 6. Allow admin to DELETE providers (for cleanup)
CREATE POLICY "Admin can delete providers"
ON service_providers FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON service_providers TO authenticated;
GRANT DELETE ON service_providers TO authenticated;

-- =====================================================
-- CREATE HELPER FUNCTION FOR CHECKING PROVIDER STATUS
-- =====================================================

CREATE OR REPLACE FUNCTION get_my_provider_status()
RETURNS TABLE (
  provider_id uuid,
  status varchar,
  provider_type varchar,
  created_at timestamptz,
  is_verified boolean
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id as provider_id,
    sp.status,
    sp.provider_type,
    sp.created_at,
    sp.is_verified
  FROM service_providers sp
  WHERE sp.user_id = auth.uid();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_my_provider_status() TO authenticated;

COMMENT ON FUNCTION get_my_provider_status() IS 'Get current user provider status - bypasses RLS for self-check';
