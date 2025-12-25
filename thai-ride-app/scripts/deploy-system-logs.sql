-- =====================================================
-- Deploy System Logs Migration
-- =====================================================
-- Run this in Supabase Dashboard SQL Editor

-- Check if migration already applied
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'system_logs'
  ) THEN
    RAISE NOTICE 'Migration already applied - system_logs table exists';
  ELSE
    RAISE NOTICE 'Applying migration...';
  END IF;
END $$;

-- Run the migration
\i supabase/migrations/172_system_logs.sql

-- Verify installation
DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_function_count INT;
  v_rls_enabled BOOLEAN;
BEGIN
  -- Check table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'system_logs'
  ) INTO v_table_exists;
  
  -- Check functions
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc 
  WHERE proname IN (
    'save_log_entry',
    'admin_get_logs',
    'admin_get_log_stats',
    'admin_get_error_trends',
    'admin_get_common_errors',
    'admin_clean_old_logs'
  );
  
  -- Check RLS
  SELECT rowsecurity INTO v_rls_enabled
  FROM pg_tables 
  WHERE tablename = 'system_logs';
  
  -- Report
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'System Logs Migration Verification';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Table exists: %', v_table_exists;
  RAISE NOTICE 'Functions created: % / 6', v_function_count;
  RAISE NOTICE 'RLS enabled: %', v_rls_enabled;
  RAISE NOTICE '==============================================';
  
  IF v_table_exists AND v_function_count = 6 AND v_rls_enabled THEN
    RAISE NOTICE '✅ Migration successful!';
  ELSE
    RAISE WARNING '⚠️ Migration incomplete - please check errors above';
  END IF;
END $$;

-- Test functions
SELECT 'Testing admin_get_log_stats...' AS test;
SELECT * FROM admin_get_log_stats(24);

SELECT 'Testing admin_get_logs...' AS test;
SELECT COUNT(*) as log_count FROM admin_get_logs();

RAISE NOTICE '==============================================';
RAISE NOTICE 'Deployment complete!';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Check admin dashboard: /admin/system-logs';
RAISE NOTICE '2. Test log viewer: Ctrl/Cmd + Shift + L';
RAISE NOTICE '3. Monitor logs in realtime';
RAISE NOTICE '==============================================';
