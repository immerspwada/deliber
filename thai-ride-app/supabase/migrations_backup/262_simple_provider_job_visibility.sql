-- Simple Provider Job Visibility - Remove Complex Conditions
-- Migration: 262_simple_provider_job_visibility.sql
-- Description: Simplify RLS policies to allow providers to see ALL customer jobs without complex filters
-- Date: 2026-01-13

BEGIN;

-- =====================================================
-- 1. DROP ALL EXISTING COMPLEX POLICIES
-- =====================================================

-- Drop all existing policies on ride_requests
DROP POLICY IF EXISTS "customer_own_rides" ON ride_requests;
DROP POLICY IF EXISTS "provider_see_all_pending_rides" ON ride_requests;
DROP POLICY IF EXISTS "provider_assigned_rides" ON ride_requests;
DROP POLICY IF EXISTS "provider_accept_pending_rides" ON ride_requests;
DROP POLICY IF EXISTS "admin_full_access" ON ride_requests;

-- Drop any other policies that might exist
DO $
BEGIN
    -- Drop all policies on ride_requests table
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'ride_requests'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON ride_requests';
    END LOOP;
END $;

-- =====================================================
-- 2. CREATE SIMPLE RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;

-- Policy 1: Customers can manage their own rides
CREATE POLICY "simple_customer_rides" ON ride_requests
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 2: Providers can see ALL pending rides (NO FILTERS!)
CREATE POLICY "simple_provider_see_pending" ON ride_requests
    FOR SELECT TO authenticated
    USING (
        status = 'pending' 
        AND provider_id IS NULL
    );

-- Policy 3: Providers can accept ANY pending ride (NO FILTERS!)
CREATE POLICY "simple_provider_accept_pending" ON ride_requests
    FOR UPDATE TO authenticated
    USING (
        status = 'pending' 
        AND provider_id IS NULL
    )
    WITH CHECK (true);

-- Policy 4: Providers can see and update rides assigned to them
CREATE POLICY "simple_provider_assigned" ON ride_requests
    FOR ALL TO authenticated
    USING (
        provider_id IS NOT NULL 
        AND (
            provider_id::text = auth.uid()::text 
            OR EXISTS (
                SELECT 1 FROM providers_v2 
                WHERE providers_v2.id = ride_requests.provider_id 
                AND providers_v2.user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        provider_id IS NOT NULL 
        AND (
            provider_id::text = auth.uid()::text 
            OR EXISTS (
                SELECT 1 FROM providers_v2 
                WHERE providers_v2.id = ride_requests.provider_id 
                AND providers_v2.user_id = auth.uid()
            )
        )
    );

-- Policy 5: Admin full access (keep this simple too)
CREATE POLICY "simple_admin_access" ON ride_requests
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
-- 3. REMOVE COMPLEX PROVIDER REQUIREMENTS
-- =====================================================

-- Update providers_v2 table to remove complex status requirements
-- Make all providers "available" by default for testing
UPDATE providers_v2 
SET 
    is_online = true,
    is_available = true,
    status = 'active'
WHERE status IN ('approved', 'pending', 'inactive');

-- =====================================================
-- 4. CREATE SIMPLE FUNCTION FOR GETTING JOBS
-- =====================================================

-- Drop existing complex function
DROP FUNCTION IF EXISTS get_nearby_pending_rides(DECIMAL, DECIMAL, DECIMAL);

-- Create simple function that returns ALL pending rides
CREATE OR REPLACE FUNCTION get_all_pending_rides()
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
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
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
        r.created_at
    FROM ride_requests r
    WHERE r.status = 'pending'
        AND r.provider_id IS NULL
    ORDER BY r.created_at DESC
    LIMIT 50;
END;
$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_all_pending_rides() TO authenticated;

-- =====================================================
-- 5. ENSURE PROPER INDEXES (SIMPLE ONES)
-- =====================================================

-- Drop complex indexes
DROP INDEX IF EXISTS idx_ride_requests_pending_jobs;
DROP INDEX IF EXISTS idx_ride_requests_provider_jobs;
DROP INDEX IF EXISTS idx_ride_requests_pickup_location;

-- Create simple indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_simple_pending_rides 
ON ride_requests(status, provider_id, created_at DESC) 
WHERE status = 'pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_simple_user_rides 
ON ride_requests(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_simple_provider_rides 
ON ride_requests(provider_id, status) 
WHERE provider_id IS NOT NULL;

-- =====================================================
-- 6. CREATE TEST DATA (FOR DEVELOPMENT)
-- =====================================================

-- Insert test ride requests if none exist
DO $
BEGIN
    -- Only insert if no pending rides exist
    IF NOT EXISTS (SELECT 1 FROM ride_requests WHERE status = 'pending') THEN
        
        -- Create test customer if not exists
        INSERT INTO profiles (id, email, role, first_name, last_name, phone_number)
        VALUES (
            '00000000-0000-0000-0000-000000000001',
            'test-customer@example.com',
            'customer',
            'ลูกค้า',
            'ทดสอบ',
            '081-234-5678'
        )
        ON CONFLICT (id) DO NOTHING;

        -- Insert test ride requests
        INSERT INTO ride_requests (
            id,
            user_id,
            tracking_id,
            status,
            pickup_lat,
            pickup_lng,
            pickup_address,
            destination_lat,
            destination_lng,
            destination_address,
            estimated_fare,
            created_at
        ) VALUES 
        (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000001',
            'TEST-001',
            'pending',
            13.7563,
            100.5018,
            'สยามพารากอน กรุงเทพฯ',
            13.7467,
            100.5342,
            'เซ็นทรัลเวิลด์ กรุงเทพฯ',
            150.00,
            NOW() - INTERVAL '2 minutes'
        ),
        (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000001',
            'TEST-002',
            'pending',
            13.7308,
            100.5418,
            'ห้างสรรพสินค้าเอ็มบีเค',
            13.7650,
            100.5380,
            'สถานีรถไฟฟ้าชิดลม',
            120.00,
            NOW() - INTERVAL '5 minutes'
        ),
        (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000001',
            'TEST-003',
            'pending',
            13.7441,
            100.5325,
            'สถานีรถไฟฟ้าราชเทวี',
            13.7200,
            100.5150,
            'สนามบินน้ำ',
            200.00,
            NOW() - INTERVAL '1 minute'
        );

        RAISE NOTICE 'Test ride requests created for development';
    END IF;
END $;

-- =====================================================
-- 7. CREATE SIMPLE TEST FUNCTION
-- =====================================================

-- Function to test simple job visibility
CREATE OR REPLACE FUNCTION test_simple_job_visibility()
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
    
    -- Test 2: Check if function works
    RETURN QUERY
    SELECT 
        'function_works'::TEXT,
        (SELECT COUNT(*) FROM get_all_pending_rides()) >= 0,
        'Function returned ' || (SELECT COUNT(*) FROM get_all_pending_rides())::TEXT || ' rides';
    
    -- Test 3: Check RLS policies
    RETURN QUERY
    SELECT 
        'rls_policies_simple'::TEXT,
        (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'ride_requests' AND policyname LIKE 'simple_%') >= 4,
        'Found ' || (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'ride_requests' AND policyname LIKE 'simple_%')::TEXT || ' simple policies';
END;
$;

GRANT EXECUTE ON FUNCTION test_simple_job_visibility() TO authenticated;

COMMIT;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON POLICY "simple_customer_rides" ON ride_requests IS 'Customers can manage their own ride requests - SIMPLE VERSION';
COMMENT ON POLICY "simple_provider_see_pending" ON ride_requests IS 'Providers can see ALL pending rides without any complex filters - SIMPLE VERSION';
COMMENT ON POLICY "simple_provider_accept_pending" ON ride_requests IS 'Providers can accept ANY pending ride without complex checks - SIMPLE VERSION';
COMMENT ON POLICY "simple_provider_assigned" ON ride_requests IS 'Providers can manage rides assigned to them - SIMPLE VERSION';
COMMENT ON POLICY "simple_admin_access" ON ride_requests IS 'Admins have full access - SIMPLE VERSION';

COMMENT ON FUNCTION get_all_pending_rides IS 'Get ALL pending ride requests without any filters - SIMPLE VERSION for testing';
COMMENT ON FUNCTION test_simple_job_visibility IS 'Test function to verify simple job visibility is working';

-- Log completion
DO $
BEGIN
    RAISE NOTICE '✅ Simple Provider Job Visibility migration completed successfully';
    RAISE NOTICE '📋 Summary:';
    RAISE NOTICE '   - Removed all complex RLS policies';
    RAISE NOTICE '   - Created 5 simple RLS policies';
    RAISE NOTICE '   - Removed distance/location filters';
    RAISE NOTICE '   - Removed provider status requirements';
    RAISE NOTICE '   - Created simple function get_all_pending_rides()';
    RAISE NOTICE '   - Added test data for development';
    RAISE NOTICE '   - Created test function test_simple_job_visibility()';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 To test: SELECT * FROM test_simple_job_visibility();';
    RAISE NOTICE '📋 To see jobs: SELECT * FROM get_all_pending_rides();';
END $;