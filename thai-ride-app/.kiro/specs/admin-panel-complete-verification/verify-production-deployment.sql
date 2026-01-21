-- Production Deployment Verification Script
-- Run this in Supabase Dashboard SQL Editor after applying migration 301
-- ================================================================

-- ================================================================
-- 1. Check Migration Applied
-- ================================================================
SELECT 
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
WHERE version >= '301'
ORDER BY version DESC
LIMIT 5;

-- Expected: Should see version 301 with recent executed_at timestamp

-- ================================================================
-- 2. Verify RPC Functions Exist
-- ================================================================
SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  routine_definition IS NOT NULL as has_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_admin_providers_v2',
  'count_admin_providers_v2',
  'get_admin_customers',
  'count_admin_customers'
)
ORDER BY routine_name;

-- Expected: 4 rows, all with routine_type = 'FUNCTION' and has_definition = true

-- ================================================================
-- 3. Check Function Parameters
-- ================================================================
SELECT 
  routine_name,
  parameter_name,
  data_type,
  parameter_mode
FROM information_schema.parameters
WHERE specific_schema = 'public'
AND routine_name IN (
  'get_admin_providers_v2',
  'count_admin_providers_v2',
  'get_admin_customers',
  'count_admin_customers'
)
ORDER BY routine_name, ordinal_position;

-- Expected: Should show all parameters for each function

-- ================================================================
-- 4. Verify Admin User Exists and Has Correct Role
-- ================================================================
SELECT 
  id,
  email,
  role,
  first_name,
  last_name,
  created_at,
  last_active_at
FROM users
WHERE email = 'superadmin@gobear.app';

-- Expected: 1 row with role = 'super_admin' or 'admin'
-- If no rows: User doesn't exist in users table (see troubleshooting)
-- If role is NULL: Need to update role (see troubleshooting)

-- ================================================================
-- 5. Test get_admin_providers_v2 Function
-- ================================================================
SELECT 
  id,
  email,
  first_name,
  last_name,
  provider_type,
  status,
  is_online,
  rating,
  total_trips,
  created_at
FROM get_admin_providers_v2(
  p_status := NULL,
  p_provider_type := NULL,
  p_limit := 5,
  p_offset := 0
);

-- Expected: Returns provider data (may be empty if no providers)
-- Should NOT error with "User not found" or "Access denied"

-- ================================================================
-- 6. Test count_admin_providers_v2 Function
-- ================================================================
SELECT count_admin_providers_v2(
  p_status := NULL,
  p_provider_type := NULL
) as total_providers;

-- Expected: Returns integer count (may be 0 if no providers)

-- ================================================================
-- 7. Test get_admin_customers Function
-- ================================================================
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  total_rides,
  wallet_balance,
  created_at
FROM get_admin_customers(
  p_search := NULL,
  p_status := NULL,
  p_limit := 5,
  p_offset := 0
);

-- Expected: Returns customer data (may be empty if no customers)

-- ================================================================
-- 8. Test count_admin_customers Function
-- ================================================================
SELECT count_admin_customers(
  p_search := NULL,
  p_status := NULL
) as total_customers;

-- Expected: Returns integer count (may be 0 if no customers)

-- ================================================================
-- 9. Check Function Permissions
-- ================================================================
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_admin_providers_v2',
  'count_admin_providers_v2',
  'get_admin_customers',
  'count_admin_customers'
)
ORDER BY routine_name, grantee;

-- Expected: Should see EXECUTE privilege granted to 'authenticated' role

-- ================================================================
-- 10. Verify Function Security Settings
-- ================================================================
SELECT 
  p.proname as function_name,
  CASE p.prosecdef 
    WHEN true THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_type,
  pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
  'get_admin_providers_v2',
  'count_admin_providers_v2',
  'get_admin_customers',
  'count_admin_customers'
)
ORDER BY p.proname;

-- Expected: All functions should have security_type = 'SECURITY DEFINER'

-- ================================================================
-- 11. Check for Old/Conflicting Functions
-- ================================================================
SELECT 
  routine_name,
  routine_type,
  specific_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (
  routine_name LIKE '%admin_provider%'
  OR routine_name LIKE '%admin_customer%'
)
ORDER BY routine_name;

-- Expected: Should only see the 4 functions we created
-- If you see duplicates or old versions, they need to be dropped

-- ================================================================
-- 12. Test Function with Filters
-- ================================================================
-- Test provider filters
SELECT COUNT(*) as approved_providers
FROM get_admin_providers_v2(
  p_status := 'approved',
  p_provider_type := NULL,
  p_limit := 100,
  p_offset := 0
);

-- Test customer search
SELECT COUNT(*) as searched_customers
FROM get_admin_customers(
  p_search := 'test',
  p_status := NULL,
  p_limit := 100,
  p_offset := 0
);

-- Expected: Both queries return counts without errors

-- ================================================================
-- 13. Verify No Errors in Recent Logs
-- ================================================================
-- Note: This query may not work in all Supabase versions
-- Check logs manually in Dashboard → Logs → Postgres Logs
SELECT 
  log_time,
  message,
  detail
FROM pg_log
WHERE log_time > NOW() - INTERVAL '1 hour'
AND (
  message LIKE '%get_admin_providers_v2%'
  OR message LIKE '%count_admin_providers_v2%'
  OR message LIKE '%get_admin_customers%'
  OR message LIKE '%count_admin_customers%'
)
ORDER BY log_time DESC
LIMIT 20;

-- Expected: No error messages related to these functions

-- ================================================================
-- VERIFICATION SUMMARY
-- ================================================================
-- Run this final check to confirm everything is working:

DO $
DECLARE
  v_functions_count INT;
  v_admin_exists BOOLEAN;
  v_admin_role TEXT;
  v_test_result INT;
BEGIN
  -- Check functions exist
  SELECT COUNT(*) INTO v_functions_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_admin_providers_v2',
    'count_admin_providers_v2',
    'get_admin_customers',
    'count_admin_customers'
  );
  
  -- Check admin user
  SELECT EXISTS(
    SELECT 1 FROM users WHERE email = 'superadmin@gobear.app'
  ) INTO v_admin_exists;
  
  SELECT role INTO v_admin_role
  FROM users WHERE email = 'superadmin@gobear.app';
  
  -- Test function call
  SELECT count_admin_providers_v2(NULL, NULL) INTO v_test_result;
  
  -- Print results
  RAISE NOTICE '=== VERIFICATION RESULTS ===';
  RAISE NOTICE 'Functions created: % of 4', v_functions_count;
  RAISE NOTICE 'Admin user exists: %', v_admin_exists;
  RAISE NOTICE 'Admin user role: %', COALESCE(v_admin_role, 'NULL');
  RAISE NOTICE 'Function test result: % providers', v_test_result;
  
  IF v_functions_count = 4 AND v_admin_exists AND v_admin_role IN ('admin', 'super_admin') THEN
    RAISE NOTICE '✅ DEPLOYMENT SUCCESSFUL - All checks passed!';
  ELSE
    RAISE WARNING '⚠️ DEPLOYMENT INCOMPLETE - Please review results above';
  END IF;
END;
$;

-- ================================================================
-- TROUBLESHOOTING QUERIES
-- ================================================================

-- If admin user doesn't exist, create it:
-- (Uncomment and replace UUID with your auth.users.id)
/*
INSERT INTO users (id, email, role, first_name, last_name)
VALUES (
  'YOUR-AUTH-USER-ID-HERE',
  'superadmin@gobear.app',
  'super_admin',
  'Super',
  'Admin'
)
ON CONFLICT (id) DO UPDATE
SET role = 'super_admin';
*/

-- If admin user exists but role is wrong, update it:
/*
UPDATE users
SET role = 'super_admin'
WHERE email = 'superadmin@gobear.app';
*/

-- If functions don't exist, re-run migration 301:
-- Copy content from: supabase/migrations/301_fix_admin_rpc_role_check.sql

-- ================================================================
-- END OF VERIFICATION SCRIPT
-- ================================================================
