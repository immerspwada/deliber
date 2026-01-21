-- Production Readiness Verification Script
-- ==========================================
-- Run this script to verify the Customer Suspension System is ready for production

\echo '🔍 Starting Production Readiness Verification...'
\echo ''

-- 1. Check Migration Applied
\echo '1️⃣ Checking Migration 312...'
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      AND column_name IN ('status', 'suspended_at', 'suspension_reason')
    ) THEN '✅ Migration 312 applied'
    ELSE '❌ Migration 312 NOT applied'
  END AS migration_status;

-- 2. Check Columns
\echo ''
\echo '2️⃣ Checking Required Columns...'
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE 
    WHEN column_name IN ('status', 'suspended_at', 'suspension_reason') THEN '✅'
    ELSE '⚠️'
  END AS status
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('status', 'suspended_at', 'suspension_reason', 'email', 'full_name', 'phone_number')
ORDER BY column_name;

-- 3. Check Indexes
\echo ''
\echo '3️⃣ Checking Performance Indexes...'
SELECT 
  indexname,
  indexdef,
  CASE 
    WHEN indexname LIKE '%status%' THEN '✅ Status index'
    WHEN indexname LIKE '%email%' THEN '✅ Email index'
    WHEN indexname LIKE '%phone%' THEN '✅ Phone index'
    ELSE '⚠️ Other index'
  END AS index_type
FROM pg_indexes
WHERE tablename = 'profiles'
AND indexname LIKE 'idx_profiles_%'
ORDER BY indexname;

-- 4. Check RPC Functions
\echo ''
\echo '4️⃣ Checking RPC Functions...'
SELECT 
  routine_name,
  routine_type,
  security_type,
  CASE 
    WHEN routine_name IN (
      'admin_suspend_customer',
      'admin_unsuspend_customer',
      'admin_bulk_suspend_customers',
      'admin_get_customers'
    ) THEN '✅ Required function'
    ELSE '⚠️ Other function'
  END AS function_status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE 'admin_%customer%'
ORDER BY routine_name;

-- 5. Check Function Permissions
\echo ''
\echo '5️⃣ Checking Function Permissions...'
SELECT 
  routine_name,
  grantee,
  privilege_type,
  CASE 
    WHEN grantee = 'authenticated' AND privilege_type = 'EXECUTE' THEN '✅'
    ELSE '⚠️'
  END AS permission_status
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
AND routine_name LIKE 'admin_%customer%'
ORDER BY routine_name, grantee;

-- 6. Check RLS Policies
\echo ''
\echo '6️⃣ Checking RLS Policies...'
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  CASE 
    WHEN tablename = 'profiles' THEN '✅ Profiles policy'
    ELSE '⚠️ Other policy'
  END AS policy_status
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 7. Check Data Integrity
\echo ''
\echo '7️⃣ Checking Data Integrity...'
SELECT 
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE role = 'customer') as total_customers,
  COUNT(*) FILTER (WHERE role = 'customer' AND status = 'active') as active_customers,
  COUNT(*) FILTER (WHERE role = 'customer' AND status = 'suspended') as suspended_customers,
  COUNT(*) FILTER (WHERE role = 'customer' AND status = 'banned') as banned_customers,
  COUNT(*) FILTER (WHERE role = 'customer' AND status IS NULL) as null_status_customers
FROM profiles;

-- 8. Check Constraint Violations
\echo ''
\echo '8️⃣ Checking for Constraint Violations...'
SELECT 
  'Status constraint' as check_name,
  COUNT(*) as violation_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No violations'
    ELSE '❌ Violations found'
  END AS status
FROM profiles
WHERE role = 'customer'
AND status NOT IN ('active', 'suspended', 'banned')
AND status IS NOT NULL;

-- 9. Check Suspended Customers Data Quality
\echo ''
\echo '9️⃣ Checking Suspended Customers Data Quality...'
SELECT 
  'Suspended without reason' as check_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All suspended customers have reasons'
    ELSE '⚠️ Some suspended customers missing reasons'
  END AS status
FROM profiles
WHERE role = 'customer'
AND status = 'suspended'
AND (suspension_reason IS NULL OR suspension_reason = '');

SELECT 
  'Suspended without timestamp' as check_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All suspended customers have timestamps'
    ELSE '⚠️ Some suspended customers missing timestamps'
  END AS status
FROM profiles
WHERE role = 'customer'
AND status = 'suspended'
AND suspended_at IS NULL;

-- 10. Test RPC Functions (Read-only)
\echo ''
\echo '🔟 Testing RPC Functions (Read-only)...'

-- Test admin_get_customers (requires admin role)
\echo 'Testing admin_get_customers...'
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'admin_get_customers'
    ) THEN '✅ Function exists'
    ELSE '❌ Function missing'
  END AS function_test;

-- 11. Performance Check
\echo ''
\echo '1️⃣1️⃣ Checking Query Performance...'
EXPLAIN ANALYZE
SELECT id, email, full_name, phone_number, status, created_at, suspended_at, suspension_reason
FROM profiles
WHERE role = 'customer'
AND status = 'active'
ORDER BY created_at DESC
LIMIT 20;

-- 12. Security Check
\echo ''
\echo '1️⃣2️⃣ Checking Security Configuration...'
SELECT 
  'RLS Enabled' as security_check,
  CASE 
    WHEN relrowsecurity THEN '✅ RLS is enabled'
    ELSE '❌ RLS is NOT enabled'
  END AS status
FROM pg_class
WHERE relname = 'profiles';

-- 13. Summary
\echo ''
\echo '📊 Verification Summary'
\echo '======================'
\echo ''

SELECT 
  '✅ Migration Applied' as check_item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      AND column_name = 'status'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS result
UNION ALL
SELECT 
  '✅ Indexes Created',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'profiles' 
      AND indexname LIKE 'idx_profiles_status%'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END
UNION ALL
SELECT 
  '✅ RPC Functions Created',
  CASE 
    WHEN (
      SELECT COUNT(*) FROM information_schema.routines 
      WHERE routine_name IN (
        'admin_suspend_customer',
        'admin_unsuspend_customer',
        'admin_bulk_suspend_customers',
        'admin_get_customers'
      )
    ) = 4 THEN 'PASS'
    ELSE 'FAIL'
  END
UNION ALL
SELECT 
  '✅ RLS Enabled',
  CASE 
    WHEN (
      SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END
UNION ALL
SELECT 
  '✅ Data Integrity',
  CASE 
    WHEN (
      SELECT COUNT(*) FROM profiles 
      WHERE role = 'customer' 
      AND status NOT IN ('active', 'suspended', 'banned')
      AND status IS NOT NULL
    ) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END;

\echo ''
\echo '✅ Verification Complete!'
\echo ''
\echo 'Next Steps:'
\echo '1. Review all checks above'
\echo '2. Fix any FAIL items'
\echo '3. Run manual testing'
\echo '4. Deploy to production'
\echo ''
