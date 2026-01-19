-- Migration: 267_provider_production_rls_policies.sql
-- Author: AI Assistant
-- Date: 2026-01-14
-- Description: Production-ready RLS policies for Provider system
-- Role Impact:
--   - Customer: Can see provider info for their active rides
--   - Provider: Can see and update their own data
--   - Admin: Full access to all provider data

BEGIN;

-- =====================================================
-- PROVIDERS_V2 TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on providers_v2 if not already enabled
ALTER TABLE providers_v2 ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "providers_own_data" ON providers_v2;
DROP POLICY IF EXISTS "providers_select_own" ON providers_v2;
DROP POLICY IF EXISTS "providers_update_own" ON providers_v2;
DROP POLICY IF EXISTS "providers_insert_own" ON providers_v2;
DROP POLICY IF EXISTS "customers_see_assigned_provider" ON providers_v2;
DROP POLICY IF EXISTS "admin_full_access" ON providers_v2;

-- Provider: SELECT own data
CREATE POLICY "providers_select_own" ON providers_v2
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
  );

-- Provider: UPDATE own data (limited fields)
CREATE POLICY "providers_update_own" ON providers_v2
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    -- Prevent providers from changing critical fields
    AND status = (SELECT status FROM providers_v2 WHERE id = providers_v2.id)
    AND user_id = (SELECT user_id FROM providers_v2 WHERE id = providers_v2.id)
  );

-- Provider: INSERT own data (during registration)
CREATE POLICY "providers_insert_own" ON providers_v2
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Customer: SELECT provider info for their active rides
CREATE POLICY "customers_see_assigned_provider" ON providers_v2
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ride_requests
      WHERE ride_requests.provider_id = providers_v2.id
        AND ride_requests.user_id = auth.uid()
        AND ride_requests.status IN ('matched', 'arriving', 'picked_up', 'in_progress')
    )
  );

-- Admin: Full access to all providers
CREATE POLICY "admin_full_access" ON providers_v2
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- PROVIDER_LOCATIONS TABLE RLS POLICIES
-- =====================================================

-- Create provider_locations table if not exists
CREATE TABLE IF NOT EXISTS provider_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers_v2(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  heading DECIMAL(5, 2), -- 0-360 degrees
  speed DECIMAL(5, 2), -- km/h
  accuracy DECIMAL(6, 2), -- meters
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180),
  CONSTRAINT valid_heading CHECK (heading IS NULL OR (heading >= 0 AND heading <= 360)),
  CONSTRAINT valid_speed CHECK (speed IS NULL OR speed >= 0),
  CONSTRAINT valid_accuracy CHECK (accuracy IS NULL OR accuracy >= 0)
);

-- Indexes for provider_locations
CREATE INDEX IF NOT EXISTS idx_provider_locations_provider 
  ON provider_locations(provider_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_locations_updated 
  ON provider_locations(updated_at DESC);

-- Enable RLS on provider_locations
ALTER TABLE provider_locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "provider_own_location" ON provider_locations;
DROP POLICY IF EXISTS "provider_select_own_location" ON provider_locations;
DROP POLICY IF EXISTS "provider_insert_own_location" ON provider_locations;
DROP POLICY IF EXISTS "provider_update_own_location" ON provider_locations;
DROP POLICY IF EXISTS "customer_see_assigned_provider_location" ON provider_locations;
DROP POLICY IF EXISTS "admin_all_locations" ON provider_locations;

-- Provider: SELECT own location
CREATE POLICY "provider_select_own_location" ON provider_locations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = provider_locations.provider_id
        AND providers_v2.user_id = auth.uid()
    )
  );

-- Provider: INSERT own location
CREATE POLICY "provider_insert_own_location" ON provider_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = provider_locations.provider_id
        AND providers_v2.user_id = auth.uid()
    )
  );

-- Provider: UPDATE own location
CREATE POLICY "provider_update_own_location" ON provider_locations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = provider_locations.provider_id
        AND providers_v2.user_id = auth.uid()
    )
  );

-- Customer: SELECT location of provider assigned to their active ride
CREATE POLICY "customer_see_assigned_provider_location" ON provider_locations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ride_requests
      WHERE ride_requests.provider_id = provider_locations.provider_id
        AND ride_requests.user_id = auth.uid()
        AND ride_requests.status IN ('matched', 'arriving', 'picked_up', 'in_progress')
    )
  );

-- Admin: Full access to all locations
CREATE POLICY "admin_all_locations" ON provider_locations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- PROVIDER_LOCATION_HISTORY TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on provider_location_history if exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'provider_location_history') THEN
    ALTER TABLE provider_location_history ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "provider_own_history" ON provider_location_history;
    DROP POLICY IF EXISTS "admin_all_history" ON provider_location_history;
    
    -- Provider: SELECT own history
    EXECUTE 'CREATE POLICY "provider_own_history" ON provider_location_history
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM providers_v2
          WHERE providers_v2.id = provider_location_history.provider_id
            AND providers_v2.user_id = auth.uid()
        )
      )';
    
    -- Admin: Full access
    EXECUTE 'CREATE POLICY "admin_all_history" ON provider_location_history
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN (''admin'', ''super_admin'')
        )
      )';
  END IF;
END $$;

-- =====================================================
-- RIDE_REQUESTS TABLE - PROVIDER ACCESS
-- =====================================================

-- Drop existing provider policies on ride_requests
DROP POLICY IF EXISTS "provider_see_assigned_rides" ON ride_requests;
DROP POLICY IF EXISTS "provider_see_available_rides" ON ride_requests;
DROP POLICY IF EXISTS "provider_update_assigned_rides" ON ride_requests;

-- Provider: SELECT rides assigned to them
CREATE POLICY "provider_see_assigned_rides" ON ride_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = ride_requests.provider_id
        AND providers_v2.user_id = auth.uid()
    )
  );

-- Provider: SELECT available rides (pending, no provider assigned)
CREATE POLICY "provider_see_available_rides" ON ride_requests
  FOR SELECT
  TO authenticated
  USING (
    status = 'pending'
    AND provider_id IS NULL
    AND EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.user_id = auth.uid()
        AND providers_v2.status IN ('approved', 'active')
        AND providers_v2.is_online = true
        AND providers_v2.is_available = true
    )
  );

-- Provider: UPDATE rides assigned to them (limited fields)
CREATE POLICY "provider_update_assigned_rides" ON ride_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = ride_requests.provider_id
        AND providers_v2.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = ride_requests.provider_id
        AND providers_v2.user_id = auth.uid()
    )
    -- Prevent changing critical fields
    AND user_id = (SELECT user_id FROM ride_requests WHERE id = ride_requests.id)
    AND provider_id = (SELECT provider_id FROM ride_requests WHERE id = ride_requests.id)
  );

-- =====================================================
-- HELPER FUNCTION: Check Provider Access
-- =====================================================

-- Function to check if user has provider access
CREATE OR REPLACE FUNCTION has_provider_access(p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_has_access BOOLEAN;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  SELECT EXISTS (
    SELECT 1 FROM providers_v2
    WHERE user_id = v_user_id
      AND status IN ('approved', 'active')
  ) INTO v_has_access;
  
  RETURN v_has_access;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION has_provider_access(UUID) TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON POLICY "providers_select_own" ON providers_v2 IS 
  'Provider can view their own profile data';

COMMENT ON POLICY "providers_update_own" ON providers_v2 IS 
  'Provider can update their own profile (limited fields)';

COMMENT ON POLICY "providers_insert_own" ON providers_v2 IS 
  'Provider can create their own profile during registration';

COMMENT ON POLICY "customers_see_assigned_provider" ON providers_v2 IS 
  'Customer can view provider info for their active rides';

COMMENT ON POLICY "admin_full_access" ON providers_v2 IS 
  'Admin has full access to all provider data';

COMMENT ON TABLE provider_locations IS 
  'Realtime location tracking for providers';

COMMENT ON FUNCTION has_provider_access IS 
  'Check if user has active provider access';

COMMIT;
