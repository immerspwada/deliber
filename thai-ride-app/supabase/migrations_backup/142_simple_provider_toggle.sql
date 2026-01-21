-- Migration: 142_simple_provider_toggle.sql
-- Description: Simple fix for provider toggle online - just add RLS policy
-- This is the minimal fix needed to allow providers to toggle their online status

-- ============================================================================
-- 1. ENSURE RLS IS ENABLED
-- ============================================================================

ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. DROP EXISTING CONFLICTING POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "providers_update_own_availability" ON service_providers;
DROP POLICY IF EXISTS "providers_read_own_profile" ON service_providers;
DROP POLICY IF EXISTS "providers_update_own" ON service_providers;
DROP POLICY IF EXISTS "providers_select_own" ON service_providers;
DROP POLICY IF EXISTS "service_providers_select_own" ON service_providers;
DROP POLICY IF EXISTS "service_providers_update_own" ON service_providers;

-- ============================================================================
-- 3. CREATE SIMPLE RLS POLICIES FOR PROVIDERS
-- ============================================================================

-- Allow providers to read their own profile
CREATE POLICY "providers_can_read_own" ON service_providers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Allow providers to update their own profile (including is_available)
CREATE POLICY "providers_can_update_own" ON service_providers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow anyone to see online providers (for matching)
CREATE POLICY "anyone_can_see_online_providers" ON service_providers
  FOR SELECT TO authenticated
  USING (is_available = true);

-- ============================================================================
-- 4. GRANT BASIC PERMISSIONS
-- ============================================================================

GRANT SELECT, UPDATE ON service_providers TO authenticated;

-- ============================================================================
-- 5. AUTO-APPROVE ALL PENDING PROVIDERS (FOR TESTING)
-- ============================================================================

-- This makes all pending providers approved so they can toggle online
UPDATE service_providers
SET 
  status = 'approved',
  is_verified = true,
  updated_at = NOW()
WHERE status = 'pending' OR status IS NULL;

-- ============================================================================
-- 6. VERIFY
-- ============================================================================

-- Show all providers and their status
SELECT 
  id,
  user_id,
  status,
  is_verified,
  is_available,
  provider_type,
  created_at
FROM service_providers
ORDER BY created_at DESC
LIMIT 10;

