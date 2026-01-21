-- Migration: 240_fix_provider_ride_requests_rls.sql
-- Fix RLS policies to use providers_v2 table instead of service_providers
-- Also handle provider_id column that may reference different tables
-- Date: 2026-01-12

BEGIN;

-- =====================================================
-- 1. Drop old policies that reference service_providers
-- =====================================================
DROP POLICY IF EXISTS "rr_provider_read_pending" ON ride_requests;
DROP POLICY IF EXISTS "rr_provider_read_assigned" ON ride_requests;
DROP POLICY IF EXISTS "rr_provider_update_assigned" ON ride_requests;
DROP POLICY IF EXISTS "providers_view_pending_rides" ON ride_requests;
DROP POLICY IF EXISTS "providers_update_own_rides" ON ride_requests;
DROP POLICY IF EXISTS "provider_view_pending_rides" ON ride_requests;
DROP POLICY IF EXISTS "provider_update_assigned_rides" ON ride_requests;
DROP POLICY IF EXISTS "Providers can view assigned rides" ON ride_requests;

-- =====================================================
-- 2. Create new policies using providers_v2 table
-- Note: provider_id in ride_requests may be UUID from either
-- service_providers or providers_v2, so we check both
-- =====================================================

-- Policy: Providers can read pending rides (for job pool)
-- Allow any authenticated provider with approved/active status
CREATE POLICY "provider_read_pending_rides_v2" ON ride_requests
  FOR SELECT TO authenticated
  USING (
    status = 'pending' 
    AND provider_id IS NULL
    AND EXISTS (
      SELECT 1 FROM providers_v2 
      WHERE user_id = auth.uid() 
      AND status IN ('approved', 'active')
      AND is_online = true
    )
  );

-- Policy: Providers can read their assigned rides
-- Check if provider_id matches their providers_v2 id
CREATE POLICY "provider_read_assigned_rides_v2" ON ride_requests
  FOR SELECT TO authenticated
  USING (
    provider_id IS NOT NULL
    AND (
      -- Check providers_v2
      provider_id IN (SELECT id FROM providers_v2 WHERE user_id = auth.uid())
      OR
      -- Also check service_providers for backward compatibility
      provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
    )
  );

-- Policy: Providers can update rides (accept pending or update assigned)
CREATE POLICY "provider_update_rides_v2" ON ride_requests
  FOR UPDATE TO authenticated
  USING (
    -- Can update pending rides to accept them
    (status = 'pending' AND provider_id IS NULL AND EXISTS (
      SELECT 1 FROM providers_v2 
      WHERE user_id = auth.uid() 
      AND status IN ('approved', 'active')
      AND is_online = true
    ))
    OR
    -- Can update their assigned rides
    (provider_id IS NOT NULL AND (
      provider_id IN (SELECT id FROM providers_v2 WHERE user_id = auth.uid())
      OR provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
    ))
  )
  WITH CHECK (
    -- When accepting, provider_id must be their own provider id
    provider_id IN (SELECT id FROM providers_v2 WHERE user_id = auth.uid())
    OR provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
  );

-- =====================================================
-- 3. Same for delivery_requests
-- =====================================================
DROP POLICY IF EXISTS "provider_read_pending_deliveries" ON delivery_requests;
DROP POLICY IF EXISTS "provider_read_assigned_deliveries" ON delivery_requests;
DROP POLICY IF EXISTS "provider_update_deliveries" ON delivery_requests;

-- Policy: Providers can read pending deliveries
CREATE POLICY "provider_read_pending_deliveries_v2" ON delivery_requests
  FOR SELECT TO authenticated
  USING (
    status = 'pending' 
    AND provider_id IS NULL
    AND EXISTS (
      SELECT 1 FROM providers_v2 
      WHERE user_id = auth.uid() 
      AND status IN ('approved', 'active')
      AND is_online = true
    )
  );

-- Policy: Providers can read their assigned deliveries
CREATE POLICY "provider_read_assigned_deliveries_v2" ON delivery_requests
  FOR SELECT TO authenticated
  USING (
    provider_id IS NOT NULL
    AND (
      provider_id IN (SELECT id FROM providers_v2 WHERE user_id = auth.uid())
      OR provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
    )
  );

-- Policy: Providers can update deliveries
CREATE POLICY "provider_update_deliveries_v2" ON delivery_requests
  FOR UPDATE TO authenticated
  USING (
    (status = 'pending' AND provider_id IS NULL AND EXISTS (
      SELECT 1 FROM providers_v2 
      WHERE user_id = auth.uid() 
      AND status IN ('approved', 'active')
      AND is_online = true
    ))
    OR
    (provider_id IS NOT NULL AND (
      provider_id IN (SELECT id FROM providers_v2 WHERE user_id = auth.uid())
      OR provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
    ))
  )
  WITH CHECK (
    provider_id IN (SELECT id FROM providers_v2 WHERE user_id = auth.uid())
    OR provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
  );

-- =====================================================
-- 4. Same for shopping_requests
-- =====================================================
DROP POLICY IF EXISTS "provider_read_pending_shopping" ON shopping_requests;
DROP POLICY IF EXISTS "provider_read_assigned_shopping" ON shopping_requests;
DROP POLICY IF EXISTS "provider_update_shopping" ON shopping_requests;

-- Policy: Providers can read pending shopping requests
CREATE POLICY "provider_read_pending_shopping_v2" ON shopping_requests
  FOR SELECT TO authenticated
  USING (
    status = 'pending' 
    AND provider_id IS NULL
    AND EXISTS (
      SELECT 1 FROM providers_v2 
      WHERE user_id = auth.uid() 
      AND status IN ('approved', 'active')
      AND is_online = true
    )
  );

-- Policy: Providers can read their assigned shopping requests
CREATE POLICY "provider_read_assigned_shopping_v2" ON shopping_requests
  FOR SELECT TO authenticated
  USING (
    provider_id IS NOT NULL
    AND (
      provider_id IN (SELECT id FROM providers_v2 WHERE user_id = auth.uid())
      OR provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
    )
  );

-- Policy: Providers can update shopping requests
CREATE POLICY "provider_update_shopping_v2" ON shopping_requests
  FOR UPDATE TO authenticated
  USING (
    (status = 'pending' AND provider_id IS NULL AND EXISTS (
      SELECT 1 FROM providers_v2 
      WHERE user_id = auth.uid() 
      AND status IN ('approved', 'active')
      AND is_online = true
    ))
    OR
    (provider_id IS NOT NULL AND (
      provider_id IN (SELECT id FROM providers_v2 WHERE user_id = auth.uid())
      OR provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
    ))
  )
  WITH CHECK (
    provider_id IN (SELECT id FROM providers_v2 WHERE user_id = auth.uid())
    OR provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
  );

-- =====================================================
-- 5. Add indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ride_requests_pending_provider 
  ON ride_requests(status, provider_id) 
  WHERE status = 'pending' AND provider_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_requests_pending_provider 
  ON delivery_requests(status, provider_id) 
  WHERE status = 'pending' AND provider_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_shopping_requests_pending_provider 
  ON shopping_requests(status, provider_id) 
  WHERE status = 'pending' AND provider_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_providers_v2_online_status 
  ON providers_v2(user_id, status, is_online) 
  WHERE status IN ('approved', 'active') AND is_online = true;

COMMIT;
