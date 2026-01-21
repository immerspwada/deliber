-- ============================================================================
-- Dual-Role System Verification - Part 1: Column Existence
-- Requirement: 12.1
-- ============================================================================

-- Verify providers_v2.user_id column exists
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'providers_v2'
  AND column_name = 'user_id';

-- Expected: 1 row showing user_id column with type uuid

-- Verify foreign key relationship to auth.users
SELECT
  tc.constraint_name,
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
  AND tc.table_name = 'providers_v2'
  AND kcu.column_name = 'user_id';

-- Expected: 1 row showing foreign key to auth.users(id)
