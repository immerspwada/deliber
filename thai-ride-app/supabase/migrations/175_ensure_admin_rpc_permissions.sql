-- =====================================================
-- Migration: 175_ensure_admin_rpc_permissions.sql
-- =====================================================
-- Purpose: Ensure all admin RPC functions have correct permissions
-- for anon, authenticated, and service_role
-- =====================================================

-- =====================================================
-- ORDERS RPC FUNCTIONS
-- =====================================================

-- Ensure get_all_orders_for_admin has correct permissions
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin(TEXT, TEXT, INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin(TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin(TEXT, TEXT, INT, INT) TO service_role;

-- Ensure count_all_orders_for_admin has correct permissions
GRANT EXECUTE ON FUNCTION count_all_orders_for_admin(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION count_all_orders_for_admin(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION count_all_orders_for_admin(TEXT, TEXT) TO service_role;

-- =====================================================
-- PROVIDERS RPC FUNCTIONS
-- =====================================================

-- Ensure get_all_providers_for_admin has correct permissions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_all_providers_for_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_providers_for_admin TO anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_providers_for_admin TO authenticated';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_providers_for_admin TO service_role';
    END IF;
END $$;

-- Ensure count_providers_for_admin has correct permissions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'count_providers_for_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION count_providers_for_admin TO anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION count_providers_for_admin TO authenticated';
        EXECUTE 'GRANT EXECUTE ON FUNCTION count_providers_for_admin TO service_role';
    END IF;
END $$;

-- =====================================================
-- DASHBOARD STATS RPC FUNCTION
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_admin_dashboard_stats') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats TO anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats TO authenticated';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats TO service_role';
    END IF;
END $$;

-- =====================================================
-- SERVICE-SPECIFIC RPC FUNCTIONS
-- =====================================================

-- Deliveries
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_all_deliveries_for_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_deliveries_for_admin TO anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_deliveries_for_admin TO authenticated';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_deliveries_for_admin TO service_role';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'count_deliveries_for_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION count_deliveries_for_admin TO anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION count_deliveries_for_admin TO authenticated';
        EXECUTE 'GRANT EXECUTE ON FUNCTION count_deliveries_for_admin TO service_role';
    END IF;
END $$;

-- Shopping
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_all_shopping_for_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_shopping_for_admin TO anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_shopping_for_admin TO authenticated';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_shopping_for_admin TO service_role';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'count_shopping_for_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION count_shopping_for_admin TO anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION count_shopping_for_admin TO authenticated';
        EXECUTE 'GRANT EXECUTE ON FUNCTION count_shopping_for_admin TO service_role';
    END IF;
END $$;

-- Queue Bookings
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_all_queues_for_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_queues_for_admin TO anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_queues_for_admin TO authenticated';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_queues_for_admin TO service_role';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'count_queues_for_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION count_queues_for_admin TO anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION count_queues_for_admin TO authenticated';
        EXECUTE 'GRANT EXECUTE ON FUNCTION count_queues_for_admin TO service_role';
    END IF;
END $$;

-- Moving
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_all_moving_for_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_moving_for_admin TO anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_moving_for_admin TO authenticated';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_moving_for_admin TO service_role';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'count_moving_for_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION count_moving_for_admin TO anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION count_moving_for_admin TO authenticated';
        EXECUTE 'GRANT EXECUTE ON FUNCTION count_moving_for_admin TO service_role';
    END IF;
END $$;

-- Laundry
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_all_laundry_for_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_laundry_for_admin TO anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_laundry_for_admin TO authenticated';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_laundry_for_admin TO service_role';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'count_laundry_for_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION count_laundry_for_admin TO anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION count_laundry_for_admin TO authenticated';
        EXECUTE 'GRANT EXECUTE ON FUNCTION count_laundry_for_admin TO service_role';
    END IF;
END $$;

-- Cancellations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_all_cancellations_for_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_cancellations_for_admin TO anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_cancellations_for_admin TO authenticated';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_cancellations_for_admin TO service_role';
    END IF;
END $$;

-- Active Providers Locations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_active_providers_locations') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_active_providers_locations TO anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_active_providers_locations TO authenticated';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_active_providers_locations TO service_role';
    END IF;
END $$;

-- Scheduled Rides
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_all_scheduled_rides_for_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_scheduled_rides_for_admin TO anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_scheduled_rides_for_admin TO authenticated';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_scheduled_rides_for_admin TO service_role';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'count_scheduled_rides_for_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION count_scheduled_rides_for_admin TO anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION count_scheduled_rides_for_admin TO authenticated';
        EXECUTE 'GRANT EXECUTE ON FUNCTION count_scheduled_rides_for_admin TO service_role';
    END IF;
END $$;

-- Service Bundles
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_all_bundle_templates_for_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_bundle_templates_for_admin TO anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_bundle_templates_for_admin TO authenticated';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_bundle_templates_for_admin TO service_role';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_all_service_bundles_for_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_service_bundles_for_admin TO anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_service_bundles_for_admin TO authenticated';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_service_bundles_for_admin TO service_role';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_service_bundles_stats_for_admin') THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_service_bundles_stats_for_admin TO anon';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_service_bundles_stats_for_admin TO authenticated';
        EXECUTE 'GRANT EXECUTE ON FUNCTION get_service_bundles_stats_for_admin TO service_role';
    END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify permissions are set correctly
DO $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM information_schema.routine_privileges
    WHERE routine_name = 'get_all_orders_for_admin'
      AND routine_schema = 'public'
      AND grantee = 'anon';
    
    IF v_count = 0 THEN
        RAISE WARNING 'Permission for anon on get_all_orders_for_admin not found!';
    ELSE
        RAISE NOTICE 'Permissions verified: anon can execute get_all_orders_for_admin';
    END IF;
END $$;

