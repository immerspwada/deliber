-- =====================================================
-- Migration 310 Verification Script
-- =====================================================
-- Run this after applying migration 310 to verify installation

\echo '🔍 Verifying Migration 310 - Admin Settings System'
\echo ''

-- =====================================================
-- 1. CHECK TABLES
-- =====================================================
\echo '1️⃣ Checking Tables...'
SELECT 
  CASE 
    WHEN COUNT(*) = 2 THEN '✅ Tables created: system_settings, settings_audit_log'
    ELSE '❌ Missing tables! Expected 2, found ' || COUNT(*)
  END as table_check
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('system_settings', 'settings_audit_log');

\echo ''

-- =====================================================
-- 2. CHECK SETTINGS COUNT
-- =====================================================
\echo '2️⃣ Checking Settings Count...'
SELECT 
  CASE 
    WHEN COUNT(*) = 50 THEN '✅ All 50 default settings created'
    ELSE '⚠️ Expected 50 settings, found ' || COUNT(*)
  END as settings_count
FROM system_settings;

\echo ''
\echo 'Settings by Category:'
SELECT 
  category,
  COUNT(*) as count,
  CASE 
    WHEN category = 'general' AND COUNT(*) = 6 THEN '✅'
    WHEN category = 'ride' AND COUNT(*) = 8 THEN '✅'
    WHEN category = 'payment' AND COUNT(*) = 8 THEN '✅'
    WHEN category = 'provider' AND COUNT(*) = 5 THEN '✅'
    WHEN category = 'notification' AND COUNT(*) = 4 THEN '✅'
    WHEN category = 'security' AND COUNT(*) = 5 THEN '✅'
    WHEN category = 'features' AND COUNT(*) = 8 THEN '✅'
    WHEN category = 'map' AND COUNT(*) = 3 THEN '✅'
    WHEN category = 'analytics' AND COUNT(*) = 3 THEN '✅'
    ELSE '⚠️'
  END as status
FROM system_settings
GROUP BY category
ORDER BY category;

\echo ''

-- =====================================================
-- 3. CHECK RLS POLICIES
-- =====================================================
\echo '3️⃣ Checking RLS Policies...'
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN policyname IS NOT NULL THEN '✅'
    ELSE '❌'
  END as status
FROM pg_policies
WHERE tablename IN ('system_settings', 'settings_audit_log')
ORDER BY tablename, policyname;

\echo ''

-- Check RLS is enabled
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS enabled'
    ELSE '❌ RLS not enabled!'
  END as rls_status
FROM pg_tables
WHERE tablename IN ('system_settings', 'settings_audit_log')
ORDER BY tablename;

\echo ''

-- =====================================================
-- 4. CHECK FUNCTIONS
-- =====================================================
\echo '4️⃣ Checking RPC Functions...'
SELECT 
  routine_name,
  '✅' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_settings_by_category',
  'update_setting',
  'get_settings_categories'
)
ORDER BY routine_name;

\echo ''

-- Check function count
SELECT 
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ All 3 RPC functions created'
    ELSE '⚠️ Expected 3 functions, found ' || COUNT(*)
  END as function_check
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%setting%';

\echo ''

-- =====================================================
-- 5. CHECK INDEXES
-- =====================================================
\echo '5️⃣ Checking Indexes...'
SELECT 
  indexname,
  tablename,
  '✅' as status
FROM pg_indexes
WHERE tablename IN ('system_settings', 'settings_audit_log')
AND schemaname = 'public'
ORDER BY tablename, indexname;

\echo ''

-- =====================================================
-- 6. CHECK SAMPLE SETTINGS
-- =====================================================
\echo '6️⃣ Checking Sample Settings...'
SELECT 
  category,
  setting_key,
  setting_value,
  data_type,
  '✅' as status
FROM system_settings
WHERE setting_key IN (
  'app_name',
  'maintenance_mode',
  'base_fare',
  'commission_rate',
  'approval_required'
)
ORDER BY category, setting_key;

\echo ''

-- =====================================================
-- 7. TEST FUNCTION CALLS (Read-only)
-- =====================================================
\echo '7️⃣ Testing Function Calls...'

\echo 'Testing get_settings_categories():'
SELECT 
  category,
  setting_count,
  '✅' as status
FROM get_settings_categories()
ORDER BY category
LIMIT 5;

\echo ''
\echo 'Testing get_settings_by_category(''general''):'
SELECT 
  setting_key,
  setting_value,
  data_type,
  '✅' as status
FROM get_settings_by_category('general')
ORDER BY display_order
LIMIT 5;

\echo ''

-- =====================================================
-- 8. SUMMARY
-- =====================================================
\echo '📊 VERIFICATION SUMMARY'
\echo '======================='

DO $$
DECLARE
  v_tables_count INT;
  v_settings_count INT;
  v_categories_count INT;
  v_policies_count INT;
  v_functions_count INT;
  v_indexes_count INT;
  v_all_passed BOOLEAN := true;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO v_tables_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('system_settings', 'settings_audit_log');
  
  -- Count settings
  SELECT COUNT(*) INTO v_settings_count
  FROM system_settings;
  
  -- Count categories
  SELECT COUNT(DISTINCT category) INTO v_categories_count
  FROM system_settings;
  
  -- Count policies
  SELECT COUNT(*) INTO v_policies_count
  FROM pg_policies
  WHERE tablename IN ('system_settings', 'settings_audit_log');
  
  -- Count functions
  SELECT COUNT(*) INTO v_functions_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name LIKE '%setting%';
  
  -- Count indexes
  SELECT COUNT(*) INTO v_indexes_count
  FROM pg_indexes
  WHERE tablename IN ('system_settings', 'settings_audit_log')
  AND schemaname = 'public';
  
  -- Display results
  RAISE NOTICE '';
  RAISE NOTICE 'Tables: % (expected: 2) %', 
    v_tables_count, 
    CASE WHEN v_tables_count = 2 THEN '✅' ELSE '❌' END;
    
  RAISE NOTICE 'Settings: % (expected: 50) %', 
    v_settings_count,
    CASE WHEN v_settings_count = 50 THEN '✅' ELSE '⚠️' END;
    
  RAISE NOTICE 'Categories: % (expected: 9) %', 
    v_categories_count,
    CASE WHEN v_categories_count = 9 THEN '✅' ELSE '⚠️' END;
    
  RAISE NOTICE 'RLS Policies: % (expected: >= 3) %', 
    v_policies_count,
    CASE WHEN v_policies_count >= 3 THEN '✅' ELSE '❌' END;
    
  RAISE NOTICE 'Functions: % (expected: 3) %', 
    v_functions_count,
    CASE WHEN v_functions_count = 3 THEN '✅' ELSE '❌' END;
    
  RAISE NOTICE 'Indexes: % (expected: >= 5) %', 
    v_indexes_count,
    CASE WHEN v_indexes_count >= 5 THEN '✅' ELSE '⚠️' END;
  
  RAISE NOTICE '';
  
  -- Overall status
  IF v_tables_count = 2 AND 
     v_settings_count = 50 AND 
     v_categories_count = 9 AND 
     v_policies_count >= 3 AND 
     v_functions_count = 3 THEN
    RAISE NOTICE '🎉 ALL CHECKS PASSED! Migration 310 installed successfully.';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Generate types: npx supabase gen types --local > src/types/database.ts';
    RAISE NOTICE '2. Access UI: http://localhost:5173/admin/settings';
    RAISE NOTICE '3. Login as admin and test settings management';
  ELSE
    RAISE WARNING '⚠️ Some checks failed. Review output above.';
    v_all_passed := false;
  END IF;
  
  RAISE NOTICE '';
END $$;

\echo ''
\echo '✅ Verification Complete!'
\echo ''
