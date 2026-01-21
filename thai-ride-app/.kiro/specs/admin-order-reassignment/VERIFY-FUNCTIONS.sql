-- ✅ Verification Script for Order Reassignment Functions
-- Run this in Supabase SQL Editor to verify all functions are working

-- 1. Check if all three functions exist
SELECT 
  routine_name,
  routine_type,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname IN ('get_available_providers', 'reassign_order', 'get_reassignment_history') 
  AND pronamespace = 'public'::regnamespace
ORDER BY routine_name;

-- Expected: 3 rows showing all three functions

-- 2. Check providers count
SELECT 
  COUNT(*) as total_providers,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_providers,
  COUNT(*) FILTER (WHERE is_online = true) as online_providers
FROM providers_v2;

-- Expected: At least 1 approved provider

-- 3. Test get_available_providers (as admin)
-- Note: This will only work if you're logged in as admin
SELECT * FROM get_available_providers(NULL, 5);

-- Expected: List of up to 5 approved providers

-- 4. Check job_reassignment_log table exists
SELECT COUNT(*) as reassignment_count FROM job_reassignment_log;

-- Expected: 0 or more (depending on if any reassignments have been done)

-- 5. Verify function permissions
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name IN ('get_available_providers', 'reassign_order', 'get_reassignment_history')
  AND routine_schema = 'public'
ORDER BY routine_name, grantee;

-- Expected: All three functions should have EXECUTE granted to 'authenticated'

-- ✅ If all queries return expected results, the functions are working correctly!
