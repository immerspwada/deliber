-- Verification script for migration 302
-- ======================================

-- 1. Check if functions exist
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('get_admin_providers_v2', 'count_admin_providers_v2')
ORDER BY p.proname;

-- 2. Test get_admin_providers_v2 with no filters
SELECT 
  id,
  email,
  first_name,
  last_name,
  status,
  provider_type
FROM get_admin_providers_v2(NULL, NULL, 5, 0);

-- 3. Test get_admin_providers_v2 with status filter
SELECT 
  id,
  email,
  status
FROM get_admin_providers_v2('pending', NULL, 5, 0);

-- 4. Test count_admin_providers_v2 with no filters
SELECT count_admin_providers_v2(NULL, NULL) as total_providers;

-- 5. Test count_admin_providers_v2 with status filter
SELECT count_admin_providers_v2('pending', NULL) as pending_providers;

-- 6. Verify no ambiguous column errors
-- This should return results without "column reference 'id' is ambiguous" error
SELECT 
  id,
  user_id,
  email,
  status
FROM get_admin_providers_v2(NULL, NULL, 1, 0);
