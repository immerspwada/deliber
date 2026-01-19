-- 🔍 Comprehensive Verification Script for Migrations 297-305
-- Run this after deploying all migrations to verify everything works

-- ============================================================================
-- 1. CHECK ADMIN RPC FUNCTIONS
-- ============================================================================
SELECT 
    '1. Admin RPC Functions' as check_category,
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'admin_%'
ORDER BY routine_name;

-- Expected functions:
-- admin_get_customers
-- admin_get_orders  
-- admin_get_payments
-- admin_get_providers
-- admin_get_revenue_stats
-- admin_get_scheduled_rides
-- admin_get_topup_requests
-- admin_get_withdrawals
-- ... and more

-- ============================================================================
-- 2. CHECK ADMIN RLS POLICIES
-- ============================================================================
SELECT 
    '2. Admin RLS Policies' as check_category,
    schemaname,
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies
WHERE policyname LIKE 'admin_%'
ORDER BY tablename, policyname;

-- ============================================================================
-- 3. TEST ADMIN_GET_CUSTOMERS
-- ============================================================================
SELECT 
    '3. Test admin_get_customers' as check_category,
    COUNT(*) as total_customers,
    COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as with_phone,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as with_email
FROM admin_get_customers(100, 0);

-- ============================================================================
-- 4. TEST ADMIN_GET_PROVIDERS
-- ============================================================================
SELECT 
    '4. Test admin_get_providers' as check_category,
    COUNT(*) as total_providers,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
    COUNT(CASE WHEN wallet_balance IS NOT NULL THEN 1 END) as with_wallet
FROM admin_get_providers(100, 0);

-- ============================================================================
-- 5. TEST ADMIN_GET_ORDERS
-- ============================================================================
SELECT 
    '5. Test admin_get_orders' as check_category,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
    COUNT(CASE WHEN customer_name IS NOT NULL THEN 1 END) as with_customer,
    COUNT(CASE WHEN provider_name IS NOT NULL THEN 1 END) as with_provider
FROM admin_get_orders(100, 0);

-- ============================================================================
-- 6. TEST ADMIN_GET_TOPUP_REQUESTS
-- ============================================================================
SELECT 
    '6. Test admin_get_topup_requests' as check_category,
    COUNT(*) as total_requests,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
    SUM(amount) as total_amount
FROM admin_get_topup_requests(100, 0);

-- ============================================================================
-- 7. TEST ADMIN_GET_WITHDRAWALS
-- ============================================================================
SELECT 
    '7. Test admin_get_withdrawals' as check_category,
    COUNT(*) as total_withdrawals,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
    SUM(amount) as total_amount
FROM admin_get_withdrawals(100, 0);

-- ============================================================================
-- 8. TEST ADMIN_GET_SCHEDULED_RIDES
-- ============================================================================
SELECT 
    '8. Test admin_get_scheduled_rides' as check_category,
    COUNT(*) as total_scheduled,
    COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
    COUNT(CASE WHEN scheduled_at > NOW() THEN 1 END) as future_rides
FROM admin_get_scheduled_rides(100, 0);

-- ============================================================================
-- 9. TEST ADMIN_GET_PAYMENTS
-- ============================================================================
SELECT 
    '9. Test admin_get_payments' as check_category,
    COUNT(*) as total_payments,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    SUM(amount) as total_amount
FROM admin_get_payments(100, 0);

-- ============================================================================
-- 10. TEST ADMIN_GET_REVENUE_STATS
-- ============================================================================
SELECT 
    '10. Test admin_get_revenue_stats' as check_category,
    *
FROM admin_get_revenue_stats(
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE
);

-- ============================================================================
-- 11. CHECK TABLE STRUCTURES
-- ============================================================================
SELECT 
    '11. Check wallets table' as check_category,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'wallets'
ORDER BY ordinal_position;

SELECT 
    '11. Check topup_requests table' as check_category,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'topup_requests'
ORDER BY ordinal_position;

SELECT 
    '11. Check providers_v2 table' as check_category,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'providers_v2'
ORDER BY ordinal_position;

-- ============================================================================
-- 12. CHECK INDEXES
-- ============================================================================
SELECT 
    '12. Check indexes' as check_category,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN (
    'profiles',
    'providers_v2',
    'ride_requests',
    'wallets',
    'topup_requests',
    'withdrawal_requests'
)
ORDER BY tablename, indexname;

-- ============================================================================
-- 13. CHECK FOREIGN KEYS
-- ============================================================================
SELECT 
    '13. Check foreign keys' as check_category,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN (
    'providers_v2',
    'ride_requests',
    'wallets',
    'topup_requests',
    'withdrawal_requests'
  )
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- 14. PERFORMANCE CHECK - SLOW QUERIES
-- ============================================================================
SELECT 
    '14. Check for slow queries' as check_category,
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%admin_%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- ============================================================================
-- 15. FINAL SUMMARY
-- ============================================================================
SELECT 
    '15. Deployment Summary' as check_category,
    (SELECT COUNT(*) FROM information_schema.routines 
     WHERE routine_name LIKE 'admin_%') as admin_functions,
    (SELECT COUNT(*) FROM pg_policies 
     WHERE policyname LIKE 'admin_%') as admin_policies,
    (SELECT COUNT(*) FROM admin_get_customers(1, 0)) as sample_customers,
    (SELECT COUNT(*) FROM admin_get_providers(1, 0)) as sample_providers,
    (SELECT COUNT(*) FROM admin_get_orders(1, 0)) as sample_orders;

-- ============================================================================
-- ✅ EXPECTED RESULTS
-- ============================================================================
-- 1. At least 10 admin RPC functions
-- 2. At least 15 admin RLS policies
-- 3. All test queries return without errors
-- 4. All tables have proper structure
-- 5. Indexes exist on key columns
-- 6. Foreign keys are properly defined
-- 7. No slow queries (mean_exec_time < 100ms)
-- ============================================================================
