-- Fix Provider Job Visibility - Final Solution
-- Migration: 260_fix_provider_job_visibility_final.sql
-- Description: Clean up conflicting RLS policies and ensure providers can see all customer jobs
-- Date: 2026-01-13

BEGIN;

-- =====================================================
-- 1. CLEAN UP ALL EXISTING CONFLICTING POLICIES
-- =====================================================

-- Drop all existing policies on ride_requests to start fresh
DROP POLICY IF EXISTS "Allow all ride_requests" ON ride_requests;
DROP POLICY IF EXISTS "Users can view own rides" ON ride_requests;
DROP POLICY IF EXISTS "Users can create rides" ON ride_requests;
DROP POLICY IF EXISTS "Users can update own rides" ON ride_requests;
DROP POLICY IF EXISTS "Providers can view assigned rides" ON ride_requests;
DROP POLICY IF EXISTS "providers_view_pending_rides" ON ride_requests;
DROP POLICY IF EXISTS "providers_update_own_rides" ON ride_requests;
DROP POLICY IF EXISTS "provider_read_pending_rides_v2" ON ride_requests;
DROP POLICY IF EXISTS "provider_read_assigned_rides_v2" ON ride_requests;
DROP POLICY IF EXISTS "provider_update_rides_v2" ON ride_requests;
DROP POLICY IF EXISTS "customers_own_rides" ON ride_requests;
DROP POLICY IF EXISTS "providers_assigned_rides" ON ride_requests;
DROP POLICY IF EXISTS "customer_view_own_rides" ON ride_requests;
DROP POLICY IF EXISTS "customer_create_rides" ON ride_requests;
DROP POLICY IF EXISTS "customer_update_own_pending_rides" ON ride_requests;
DROP POLICY IF EXISTS "provider_view_pending_rides" ON ride_requests;
DROP POLICY IF EXISTS "provider_update_assigned_rides" ON ride_requests;
DROP POLICY IF EXISTS "admin_full_access_rides" ON ride_requests;
DROP POLICY IF EXISTS "Users can view own ride requests" ON ride_requests;
DROP POLICY IF EXISTS "Users can create ride requests" ON ride_requests;
DROP POLICY IF EXISTS "Providers can view assigned rides" ON ride_requests;
DROP POLICY IF EXISTS "ride_requests_public_read" ON ride_requests;
DROP POLICY IF EXISTS "ride_requests_insert_own" ON ride_requests;
DROP POLICY IF EXISTS "ride_requests_update_own" ON ride_requests;
DROP POLICY IF EXISTS "ride_requests_provider_update" ON ride_requests;
DROP POLICY IF EXISTS "admin_full_access_ride_requests" ON ride_requests;
DROP POLICY IF EXISTS "public_read_ride_requests" ON ride_requests;
DROP POLICY IF EXISTS "rr_customer_read_own" ON ride_requests;
DROP POLICY IF EXISTS "rr_customer_create" ON ride_requests;
DROP POLICY IF EXISTS "rr_provider_read_pending" ON ride_requests;
DROP POLICY IF EXISTS "rr_provider_read_assigned" ON ride_requests;
DROP POLICY IF EXISTS "rr_provider_update_assigned" ON ride_requests;
DROP POLICY IF EXISTS "rr_admin_full_access" ON ride_requests;

-- =====================================================
-- 2. ENSURE PROPER TABLE STRUCTURE
-- =====================================================

-- Ensure ride_requests has proper columns and constraints
DO $
BEGIN
    -- Ensure user_id column exists and references auth.users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ride_requests' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE ride_requests ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Ensure provider_id references providers_v2.id (not user_id)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%ride_requests_provider_id%' 
        AND table_name = 'ride_requests'
    ) THEN
        ALTER TABLE ride_requests DROP CONSTRAINT IF EXISTS ride_requests_provider_id_fkey;
        ALTER TABLE ride_requests DROP CONSTRAINT IF EXISTS fk_ride_requests_provider_id;
    END IF;
    
    -- Add correct foreign key constraint
    ALTER TABLE ride_requests 
    ADD CONSTRAINT fk_ride_requests_provider_id 
    FOREIGN KEY (provider_id) REFERENCES providers_v2(id) ON DELETE SET NULL;
END $;

-- =====================================================
-- 3. CREATE SIMPLE, CLEAR RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;

-- Policy 1: Customers can manage their own rides
CREATE POLICY "customer_own_rides" ON ride_requests
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 2: Providers can see ALL pending rides (this is the key fix!)
CREATE POLICY "provider_see_all_pending_rides" ON ride_requests
    FOR SELECT TO authenticated
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

-- Policy 3: Providers can see and update rides assigned to them
CREATE POLICY "provider_assigned_rides" ON ride_requests
    FOR ALL TO authenticated
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
    );

-- Policy 4: Providers can accept pending rides (UPDATE to assign themselves)
CREATE POLICY "provider_accept_pending_rides" ON ride_requests
    FOR UPDATE TO authenticated
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
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM providers_v2 
            WHERE providers_v2.user_id = auth.uid() 
            AND providers_v2.status IN ('approved', 'active')
        )
    );

-- Policy 5: Admin full access
CREATE POLICY "admin_full_access" ON ride_requests
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 4. ENSURE PROPER INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for job matching performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ride_requests_pending_jobs 
ON ride_requests(status, provider_id, created_at) 
WHERE status = 'pending' AND provider_id IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ride_requests_provider_jobs 
ON ride_requests(provider_id, status, updated_at) 
WHERE provider_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ride_requests_customer_jobs 
ON ride_requests(user_id, status, created_at DESC);

-- Index for location-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ride_requests_pickup_location 
ON ride_requests(pickup_lat, pickup_lng, status) 
WHERE status = 'pending';

-- =====================================================
-- 5. UPDATE FUNCTION FOR NEARBY RIDES
-- =====================================================

-- Function to get nearby pending rides for providers (updated)
CREATE OR REPLACE FUNCTION get_nearby_pending_rides(
    provider_lat DECIMAL,
    provider_lng DECIMAL,
    radius_km DECIMAL DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    tracking_id TEXT,
    user_id UUID,
    pickup_lat DECIMAL,
    pickup_lng DECIMAL,
    pickup_address TEXT,
    destination_lat DECIMAL,
    destination_lng DECIMAL,
    destination_address TEXT,
    estimated_fare DECIMAL,
    created_at TIMESTAMPTZ,
    distance_km DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
    -- Check if caller is an active provider
    IF NOT EXISTS (
        SELECT 1 FROM providers_v2 
        WHERE user_id = auth.uid() 
        AND status IN ('approved', 'active')
        AND is_online = true
    ) THEN
        RAISE EXCEPTION 'Access denied: Not an active provider';
    END IF;

    RETURN QUERY
    SELECT 
        r.id,
        COALESCE(r.tracking_id, r.id::text) as tracking_id,
        r.user_id,
        r.pickup_lat,
        r.pickup_lng,
        r.pickup_address,
        r.destination_lat,
        r.destination_lng,
        r.destination_address,
        r.estimated_fare,
        r.created_at,
        -- Calculate distance using Haversine formula
        (
            6371 * acos(
                cos(radians(provider_lat)) * 
                cos(radians(r.pickup_lat)) * 
                cos(radians(r.pickup_lng) - radians(provider_lng)) + 
                sin(radians(provider_lat)) * 
                sin(radians(r.pickup_lat))
            )
        )::DECIMAL as distance_km
    FROM ride_requests r
    WHERE r.status = 'pending'
        AND r.provider_id IS NULL
        AND r.pickup_lat IS NOT NULL
        AND r.pickup_lng IS NOT NULL
        -- Pre-filter by bounding box for performance
        AND r.pickup_lat BETWEEN provider_lat - (radius_km / 111.0) AND provider_lat + (radius_km / 111.0)
        AND r.pickup_lng BETWEEN provider_lng - (radius_km / (111.0 * cos(radians(provider_lat)))) AND provider_lng + (radius_km / (111.0 * cos(radians(provider_lat))))
    HAVING (
        6371 * acos(
            cos(radians(provider_lat)) * 
            cos(radians(r.pickup_lat)) * 
            cos(radians(r.pickup_lng) - radians(provider_lng)) + 
            sin(radians(provider_lat)) * 
            sin(radians(r.pickup_lat))
        )
    ) <= radius_km
    ORDER BY distance_km ASC, r.created_at ASC
    LIMIT 20;
END;
$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_nearby_pending_rides(DECIMAL, DECIMAL, DECIMAL) TO authenticated;

-- =====================================================
-- 6. TEST DATA VERIFICATION FUNCTION
-- =====================================================

-- Function to test provider job visibility
CREATE OR REPLACE FUNCTION test_provider_job_visibility()
RETURNS TABLE (
    test_name TEXT,
    result BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
    -- Test 1: Check if there are pending rides
    RETURN QUERY
    SELECT 
        'pending_rides_exist'::TEXT,
        (SELECT COUNT(*) FROM ride_requests WHERE status = 'pending' AND provider_id IS NULL) > 0,
        'Found ' || (SELECT COUNT(*) FROM ride_requests WHERE status = 'pending' AND provider_id IS NULL)::TEXT || ' pending rides';
    
    -- Test 2: Check if providers_v2 table has active providers
    RETURN QUERY
    SELECT 
        'active_providers_exist'::TEXT,
        (SELECT COUNT(*) FROM providers_v2 WHERE status IN ('approved', 'active') AND is_online = true) > 0,
        'Found ' || (SELECT COUNT(*) FROM providers_v2 WHERE status IN ('approved', 'active') AND is_online = true)::TEXT || ' active providers';
    
    -- Test 3: Check RLS policies
    RETURN QUERY
    SELECT 
        'rls_policies_exist'::TEXT,
        (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'ride_requests') >= 5,
        'Found ' || (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'ride_requests')::TEXT || ' RLS policies';
END;
$;

GRANT EXECUTE ON FUNCTION test_provider_job_visibility() TO authenticated;

COMMIT;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON POLICY "customer_own_rides" ON ride_requests IS 'Customers can manage (CRUD) their own ride requests';
COMMENT ON POLICY "provider_see_all_pending_rides" ON ride_requests IS 'Active providers can see ALL pending rides from any customer - this is the key fix!';
COMMENT ON POLICY "provider_assigned_rides" ON ride_requests IS 'Providers can manage rides assigned to them';
COMMENT ON POLICY "provider_accept_pending_rides" ON ride_requests IS 'Providers can accept pending rides by updating provider_id';
COMMENT ON POLICY "admin_full_access" ON ride_requests IS 'Admins have full access to all ride requests';

COMMENT ON FUNCTION get_nearby_pending_rides IS 'Get nearby pending ride requests for provider job matching with distance calculation and security checks';
COMMENT ON FUNCTION test_provider_job_visibility IS 'Test function to verify provider job visibility is working correctly';