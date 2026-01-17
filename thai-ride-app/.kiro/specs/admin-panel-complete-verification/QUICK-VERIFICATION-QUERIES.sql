-- ================================================================
-- QUICK VERIFICATION QUERIES FOR TASK 16.2
-- Run these in Supabase Dashboard SQL Editor
-- Production: https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt
-- ================================================================

-- ================================================================
-- QUERY 1: Check All 4 Functions Exist
-- Expected: 4 rows
-- ================================================================
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_admin_providers_v2',
  'count_admin_providers_v2',
  'get_admin_customers',
  'count_admin_customers'
)
ORDER BY routine_name;

-- ✅ PASS: 4 rows returned
-- ❌ FAIL: Less than 4 rows → Re-run migration 301


-- ================================================================
-- QUERY 2: Check Admin User Role
-- Expected: 1 row with role = 'super_admin' or 'admin'
-- ================================================================
SELECT 
  id,
  email,
  role,
  first_name,
  last_name
FROM users
WHERE email = 'superadmin@gobear.app';

-- ✅ PASS: User exists with role = 'super_admin' or 'admin'
-- ❌ FAIL: No rows → User doesn't exist
-- ❌ FAIL: role is NULL → Need to update role


-- ================================================================
-- QUERY 3: Test get_admin_providers_v2
-- Expected: Returns data without errors (may be 0 rows)
-- ================================================================
SELECT 
  id,
  email,
  first_name,
  last_name,
  provider_type,
  status,
  is_online
FROM get_admin_providers_v2(
  p_status := NULL,
  p_provider_type := NULL,
  p_limit := 5,
  p_offset := 0
);

-- ✅ PASS: Query executes without errors
-- ❌ FAIL: Error "User not found" → Check Query 2


-- ================================================================
-- QUERY 4: Test count_admin_providers_v2
-- Expected: Returns integer (e.g., 0, 5, 10)
-- ================================================================
SELECT count_admin_providers_v2(
  p_status := NULL,
  p_provider_type := NULL
) as total_providers;

-- ✅ PASS: Returns a number
-- ❌ FAIL: Any error → Check Query 2


-- ================================================================
-- QUERY 5: Test get_admin_customers
-- Expected: Returns data without errors (may be 0 rows)
-- ================================================================
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  total_rides
FROM get_admin_customers(
  p_search := NULL,
  p_status := NULL,
  p_limit := 5,
  p_offset := 0
);

-- ✅ PASS: Query executes without errors
-- ❌ FAIL: Error "User not found" → Check Query 2


-- ================================================================
-- QUERY 6: Test count_admin_customers
-- Expected: Returns integer
-- ================================================================
SELECT count_admin_customers(
  p_search := NULL,
  p_status := NULL
) as total_customers;

-- ✅ PASS: Returns a number
-- ❌ FAIL: Any error → Check Query 2


-- ================================================================
-- QUERY 7: Comprehensive Verification (Run Last)
-- Expected: "✅ DEPLOYMENT SUCCESSFUL" message
-- ================================================================
DO $$
DECLARE
  v_functions_count INT;
  v_admin_exists BOOLEAN;
  v_admin_role TEXT;
  v_test_providers INT;
  v_test_customers INT;
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
  
  -- Test function calls
  SELECT count_admin_providers_v2(NULL, NULL) INTO v_test_providers;
  SELECT count_admin_customers(NULL, NULL) INTO v_test_customers;
  
  -- Print results
  RAISE NOTICE '=== VERIFICATION RESULTS ===';
  RAISE NOTICE 'Functions created: % of 4', v_functions_count;
  RAISE NOTICE 'Admin user exists: %', v_admin_exists;
  RAISE NOTICE 'Admin user role: %', COALESCE(v_admin_role, 'NULL');
  RAISE NOTICE 'Total providers: %', v_test_providers;
  RAISE NOTICE 'Total customers: %', v_test_customers;
  RAISE NOTICE '';
  
  IF v_functions_count = 4 AND v_admin_exists AND v_admin_role IN ('admin', 'super_admin') THEN
    RAISE NOTICE '✅ DEPLOYMENT SUCCESSFUL - All checks passed!';
  ELSE
    RAISE WARNING '⚠️ DEPLOYMENT INCOMPLETE - Please review results above';
  END IF;
END;
$$;

-- Check Messages tab for output


-- ================================================================
-- TROUBLESHOOTING: Fix Admin Role (if needed)
-- ================================================================
-- Uncomment and run if Query 2 shows role is NULL:
/*
UPDATE users
SET role = 'super_admin'
WHERE email = 'superadmin@gobear.app';
*/


-- ================================================================
-- TROUBLESHOOTING: Create Admin User (if needed)
-- ================================================================
-- Uncomment and run if Query 2 returns no rows:
-- First, find your auth user ID:
/*
SELECT id, email FROM auth.users WHERE email = 'superadmin@gobear.app';
*/

-- Then insert into users table (replace YOUR-AUTH-USER-ID):
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


-- ================================================================
-- VERIFICATION CHECKLIST
-- ================================================================
-- [ ] Query 1: All 4 functions exist
-- [ ] Query 2: Admin user has correct role
-- [ ] Query 3: get_admin_providers_v2 works
-- [ ] Query 4: count_admin_providers_v2 works
-- [ ] Query 5: get_admin_customers works
-- [ ] Query 6: count_admin_customers works
-- [ ] Query 7: Comprehensive verification passes

-- ================================================================
-- END OF QUICK VERIFICATION
-- ================================================================
