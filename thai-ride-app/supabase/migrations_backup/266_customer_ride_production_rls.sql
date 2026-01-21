-- Migration: 266_customer_ride_production_rls.sql
-- Description: Production-ready RLS policies for customer ride booking with role validation
-- Date: 2026-01-14
-- Purpose: Ensure only customers can create rides, with proper role-based access control

BEGIN;

-- =====================================================
-- 1. DROP EXISTING POLICIES (Clean slate)
-- =====================================================

DO $$
BEGIN
    -- Drop all existing policies on ride_requests
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'ride_requests'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON ride_requests';
    END LOOP;
    
    RAISE NOTICE '✓ Dropped all existing ride_requests policies';
END $$;

-- =====================================================
-- 2. ENABLE RLS
-- =====================================================

ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. CUSTOMER POLICIES (Role-based)
-- =====================================================

-- Policy 1: Customers can view their own rides
CREATE POLICY "customer_view_own_rides_prod" ON ride_requests
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('customer', 'admin')
        )
    );

-- Policy 2: Customers can create rides (with role validation)
CREATE POLICY "customer_create_rides_prod" ON ride_requests
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('customer', 'admin')
        )
    );

-- Policy 3: Customers can update their own pending rides (for cancellation)
CREATE POLICY "customer_update_own_rides_prod" ON ride_requests
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('customer', 'admin')
        )
    )
    WITH CHECK (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('customer', 'admin')
        )
    );

-- =====================================================
-- 4. PROVIDER POLICIES (Role-based)
-- =====================================================

-- Policy 4: Providers can view ALL pending rides (for job pool)
CREATE POLICY "provider_view_pending_rides_prod" ON ride_requests
    FOR SELECT TO authenticated
    USING (
        status = 'pending' 
        AND provider_id IS NULL
        AND EXISTS (
            SELECT 1 FROM providers_v2 
            WHERE providers_v2.user_id = auth.uid()
            AND providers_v2.status IN ('active', 'approved')
            AND providers_v2.is_available = true
        )
    );

-- Policy 5: Providers can view rides assigned to them
CREATE POLICY "provider_view_assigned_rides_prod" ON ride_requests
    FOR SELECT TO authenticated
    USING (
        provider_id IS NOT NULL 
        AND EXISTS (
            SELECT 1 FROM providers_v2 
            WHERE providers_v2.id = ride_requests.provider_id 
            AND providers_v2.user_id = auth.uid()
        )
    );

-- Policy 6: Providers can accept pending rides (UPDATE to assign themselves)
CREATE POLICY "provider_accept_rides_prod" ON ride_requests
    FOR UPDATE TO authenticated
    USING (
        status = 'pending' 
        AND provider_id IS NULL
        AND EXISTS (
            SELECT 1 FROM providers_v2 
            WHERE providers_v2.user_id = auth.uid()
            AND providers_v2.status IN ('active', 'approved')
            AND providers_v2.is_available = true
        )
    )
    WITH CHECK (
        -- After update, provider_id should be set to the provider's ID
        provider_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM providers_v2 
            WHERE providers_v2.id = ride_requests.provider_id 
            AND providers_v2.user_id = auth.uid()
        )
    );

-- Policy 7: Providers can update rides assigned to them
CREATE POLICY "provider_update_assigned_rides_prod" ON ride_requests
    FOR UPDATE TO authenticated
    USING (
        provider_id IS NOT NULL 
        AND EXISTS (
            SELECT 1 FROM providers_v2 
            WHERE providers_v2.id = ride_requests.provider_id 
            AND providers_v2.user_id = auth.uid()
        )
    )
    WITH CHECK (
        provider_id IS NOT NULL 
        AND EXISTS (
            SELECT 1 FROM providers_v2 
            WHERE providers_v2.id = ride_requests.provider_id 
            AND providers_v2.user_id = auth.uid()
        )
    );

-- =====================================================
-- 5. ADMIN POLICIES (Full access)
-- =====================================================

-- Policy 8: Admins have full access to all rides
CREATE POLICY "admin_full_access_rides_prod" ON ride_requests
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- =====================================================
-- 6. VALIDATION FUNCTION (Prevent role bypass)
-- =====================================================

-- Function to validate ride creation
CREATE OR REPLACE FUNCTION validate_ride_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_role TEXT;
BEGIN
    -- Get user role
    SELECT role INTO v_user_role
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Only customers and admins can create rides
    IF v_user_role NOT IN ('customer', 'admin', 'super_admin') THEN
        RAISE EXCEPTION 'Only customers can create ride requests. Your role: %', v_user_role;
    END IF;
    
    -- Validate required fields
    IF NEW.pickup_lat IS NULL OR NEW.pickup_lng IS NULL THEN
        RAISE EXCEPTION 'Pickup location is required';
    END IF;
    
    IF NEW.destination_lat IS NULL OR NEW.destination_lng IS NULL THEN
        RAISE EXCEPTION 'Destination location is required';
    END IF;
    
    IF NEW.pickup_address IS NULL OR LENGTH(TRIM(NEW.pickup_address)) < 3 THEN
        RAISE EXCEPTION 'Valid pickup address is required';
    END IF;
    
    IF NEW.destination_address IS NULL OR LENGTH(TRIM(NEW.destination_address)) < 3 THEN
        RAISE EXCEPTION 'Valid destination address is required';
    END IF;
    
    IF NEW.estimated_fare IS NULL OR NEW.estimated_fare <= 0 THEN
        RAISE EXCEPTION 'Valid estimated fare is required';
    END IF;
    
    -- Validate coordinates range
    IF NEW.pickup_lat < -90 OR NEW.pickup_lat > 90 THEN
        RAISE EXCEPTION 'Invalid pickup latitude';
    END IF;
    
    IF NEW.pickup_lng < -180 OR NEW.pickup_lng > 180 THEN
        RAISE EXCEPTION 'Invalid pickup longitude';
    END IF;
    
    IF NEW.destination_lat < -90 OR NEW.destination_lat > 90 THEN
        RAISE EXCEPTION 'Invalid destination latitude';
    END IF;
    
    IF NEW.destination_lng < -180 OR NEW.destination_lng > 180 THEN
        RAISE EXCEPTION 'Invalid destination longitude';
    END IF;
    
    -- Set default status if not provided
    IF NEW.status IS NULL THEN
        NEW.status := 'pending';
    END IF;
    
    -- Set tracking_id if not provided
    IF NEW.tracking_id IS NULL THEN
        NEW.tracking_id := 'RID-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS validate_ride_creation_trigger ON ride_requests;

-- Create trigger
CREATE TRIGGER validate_ride_creation_trigger
    BEFORE INSERT ON ride_requests
    FOR EACH ROW
    EXECUTE FUNCTION validate_ride_creation();

-- =====================================================
-- 7. AUDIT LOGGING (Track ride creation)
-- =====================================================

-- Create audit log table if not exists
CREATE TABLE IF NOT EXISTS ride_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE ride_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "admin_view_audit_logs" ON ride_audit_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Function to log ride actions
CREATE OR REPLACE FUNCTION log_ride_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Log on INSERT
    IF TG_OP = 'INSERT' THEN
        INSERT INTO ride_audit_log (ride_id, user_id, action, new_status, metadata)
        VALUES (
            NEW.id,
            NEW.user_id,
            'CREATE',
            NEW.status,
            jsonb_build_object(
                'pickup_address', NEW.pickup_address,
                'destination_address', NEW.destination_address,
                'estimated_fare', NEW.estimated_fare,
                'ride_type', NEW.ride_type
            )
        );
    END IF;
    
    -- Log on UPDATE (status change)
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO ride_audit_log (ride_id, user_id, action, old_status, new_status, metadata)
        VALUES (
            NEW.id,
            COALESCE(NEW.user_id, OLD.user_id),
            'STATUS_CHANGE',
            OLD.status,
            NEW.status,
            jsonb_build_object(
                'provider_id', NEW.provider_id,
                'updated_by', auth.uid()
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS log_ride_action_trigger ON ride_requests;

-- Create trigger
CREATE TRIGGER log_ride_action_trigger
    AFTER INSERT OR UPDATE ON ride_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_ride_action();

-- =====================================================
-- 8. INDEXES (Performance)
-- =====================================================

-- Drop old indexes
DROP INDEX IF EXISTS idx_simple_pending_rides;
DROP INDEX IF EXISTS idx_simple_user_rides;
DROP INDEX IF EXISTS idx_simple_provider_rides;

-- Create optimized indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ride_requests_customer_status 
    ON ride_requests(user_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ride_requests_pending_pool 
    ON ride_requests(status, provider_id, created_at DESC) 
    WHERE status = 'pending' AND provider_id IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ride_requests_provider_assigned 
    ON ride_requests(provider_id, status, created_at DESC) 
    WHERE provider_id IS NOT NULL;

-- =====================================================
-- 9. TESTING FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION test_customer_ride_rls()
RETURNS TABLE (
    test_name TEXT,
    passed BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Test 1: Check policies exist
    RETURN QUERY
    SELECT 
        'policies_exist'::TEXT,
        (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'ride_requests' AND policyname LIKE '%_prod') >= 8,
        'Found ' || (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'ride_requests' AND policyname LIKE '%_prod')::TEXT || ' production policies';
    
    -- Test 2: Check trigger exists
    RETURN QUERY
    SELECT 
        'validation_trigger_exists'::TEXT,
        EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'validate_ride_creation_trigger'),
        'Validation trigger is ' || CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'validate_ride_creation_trigger') THEN 'active' ELSE 'missing' END;
    
    -- Test 3: Check audit log table
    RETURN QUERY
    SELECT 
        'audit_log_exists'::TEXT,
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ride_audit_log'),
        'Audit log table is ' || CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ride_audit_log') THEN 'created' ELSE 'missing' END;
    
    -- Test 4: Check indexes
    RETURN QUERY
    SELECT 
        'indexes_exist'::TEXT,
        (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'ride_requests' AND indexname LIKE 'idx_ride_requests_%') >= 3,
        'Found ' || (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'ride_requests' AND indexname LIKE 'idx_ride_requests_%')::TEXT || ' optimized indexes';
END;
$$;

GRANT EXECUTE ON FUNCTION test_customer_ride_rls() TO authenticated;

COMMIT;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON POLICY "customer_view_own_rides_prod" ON ride_requests IS 
    'PRODUCTION: Customers can only view their own rides with role validation';

COMMENT ON POLICY "customer_create_rides_prod" ON ride_requests IS 
    'PRODUCTION: Only customers and admins can create rides with role validation';

COMMENT ON POLICY "provider_view_pending_rides_prod" ON ride_requests IS 
    'PRODUCTION: Active providers can view pending rides for job pool';

COMMENT ON POLICY "admin_full_access_rides_prod" ON ride_requests IS 
    'PRODUCTION: Admins have full access to all rides';

COMMENT ON FUNCTION validate_ride_creation IS 
    'PRODUCTION: Validates ride creation with role check and input validation';

COMMENT ON FUNCTION log_ride_action IS 
    'PRODUCTION: Audit logging for ride actions';

-- =====================================================
-- LOG COMPLETION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Customer Ride Production RLS Migration Completed';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '📋 Summary:';
    RAISE NOTICE '   ✓ 8 production-ready RLS policies created';
    RAISE NOTICE '   ✓ Role-based access control enforced';
    RAISE NOTICE '   ✓ Input validation trigger added';
    RAISE NOTICE '   ✓ Audit logging enabled';
    RAISE NOTICE '   ✓ Performance indexes created';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Security Features:';
    RAISE NOTICE '   • Customer role validation on create';
    RAISE NOTICE '   • Provider role validation on accept';
    RAISE NOTICE '   • Admin full access with audit trail';
    RAISE NOTICE '   • Input validation (coordinates, addresses, fare)';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Test: SELECT * FROM test_customer_ride_rls();';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
