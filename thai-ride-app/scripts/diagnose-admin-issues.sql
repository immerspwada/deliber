-- =====================================================
-- DIAGNOSTIC SCRIPT: Admin Dashboard Issues
-- วิเคราะห์ปัญหาที่ทำให้ Admin ไม่แสดงข้อมูล
-- =====================================================

-- 1. ตรวจสอบว่า RPC Functions มีอยู่หรือไม่
SELECT '=== CHECK RPC FUNCTIONS ===' as section;

SELECT 
  proname as function_name,
  CASE WHEN proname IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM pg_proc 
WHERE proname IN (
  'get_admin_dashboard_stats',
  'get_all_orders_for_admin',
  'count_all_orders_for_admin',
  'get_all_providers_for_admin',
  'count_providers_for_admin',
  'get_realtime_order_stats',
  'get_realtime_service_breakdown',
  'get_live_provider_stats',
  'get_revenue_trends',
  'get_active_providers_locations',
  'get_reorderable_items'
);

-- 2. ตรวจสอบ Column Names ใน ride_requests
SELECT '=== CHECK RIDE_REQUESTS COLUMNS ===' as section;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ride_requests' 
AND column_name IN ('final_fare', 'actual_fare', 'estimated_fare', 'tracking_id', 'status', 'provider_id');

-- 3. ตรวจสอบ Column Names ใน service_providers
SELECT '=== CHECK SERVICE_PROVIDERS COLUMNS ===' as section;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'service_providers' 
AND column_name IN ('is_available', 'is_online', 'status', 'provider_uid', 'is_verified', 'rating');

-- 4. ตรวจสอบ Column Names ใน users
SELECT '=== CHECK USERS COLUMNS ===' as section;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('first_name', 'last_name', 'name', 'email', 'phone_number', 'phone', 'member_uid');

-- 5. ตรวจสอบจำนวนข้อมูลในตาราง
SELECT '=== DATA COUNTS ===' as section;

SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'service_providers', COUNT(*) FROM service_providers
UNION ALL
SELECT 'ride_requests', COUNT(*) FROM ride_requests;

-- 6. ทดสอบ RPC Functions (ถ้ามี)
SELECT '=== TEST RPC FUNCTIONS ===' as section;

-- Test get_admin_dashboard_stats
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_admin_dashboard_stats') THEN
    RAISE NOTICE 'Testing get_admin_dashboard_stats...';
    PERFORM get_admin_dashboard_stats();
    RAISE NOTICE '✅ get_admin_dashboard_stats works';
  ELSE
    RAISE NOTICE '❌ get_admin_dashboard_stats NOT FOUND';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ get_admin_dashboard_stats ERROR: %', SQLERRM;
END $$;

-- Test get_all_orders_for_admin
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_all_orders_for_admin') THEN
    RAISE NOTICE 'Testing get_all_orders_for_admin...';
    PERFORM * FROM get_all_orders_for_admin(NULL, NULL, 5, 0);
    RAISE NOTICE '✅ get_all_orders_for_admin works';
  ELSE
    RAISE NOTICE '❌ get_all_orders_for_admin NOT FOUND';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ get_all_orders_for_admin ERROR: %', SQLERRM;
END $$;

-- Test get_all_providers_for_admin
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_all_providers_for_admin') THEN
    RAISE NOTICE 'Testing get_all_providers_for_admin...';
    PERFORM * FROM get_all_providers_for_admin(NULL, NULL, 5, 0);
    RAISE NOTICE '✅ get_all_providers_for_admin works';
  ELSE
    RAISE NOTICE '❌ get_all_providers_for_admin NOT FOUND';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ get_all_providers_for_admin ERROR: %', SQLERRM;
END $$;

-- Test get_realtime_order_stats
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_realtime_order_stats') THEN
    RAISE NOTICE 'Testing get_realtime_order_stats...';
    PERFORM get_realtime_order_stats();
    RAISE NOTICE '✅ get_realtime_order_stats works';
  ELSE
    RAISE NOTICE '❌ get_realtime_order_stats NOT FOUND';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ get_realtime_order_stats ERROR: %', SQLERRM;
END $$;

-- 7. ตรวจสอบ RLS Policies
SELECT '=== CHECK RLS POLICIES ===' as section;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('users', 'service_providers', 'ride_requests', 'delivery_requests', 'shopping_requests')
ORDER BY tablename, policyname;

-- 8. ตรวจสอบ Permissions
SELECT '=== CHECK FUNCTION PERMISSIONS ===' as section;

SELECT 
  p.proname as function_name,
  CASE 
    WHEN has_function_privilege('anon', p.oid, 'EXECUTE') THEN '✅' 
    ELSE '❌' 
  END as anon_access,
  CASE 
    WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN '✅' 
    ELSE '❌' 
  END as authenticated_access
FROM pg_proc p
WHERE p.proname IN (
  'get_admin_dashboard_stats',
  'get_all_orders_for_admin',
  'count_all_orders_for_admin',
  'get_all_providers_for_admin',
  'count_providers_for_admin',
  'get_realtime_order_stats',
  'get_realtime_service_breakdown',
  'get_live_provider_stats',
  'get_revenue_trends'
);

SELECT '=== DIAGNOSTIC COMPLETE ===' as status;
