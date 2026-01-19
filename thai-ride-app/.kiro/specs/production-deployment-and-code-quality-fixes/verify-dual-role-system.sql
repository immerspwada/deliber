-- ============================================================================
-- Dual-Role System Integrity Verification Script
-- ============================================================================
-- This script verifies the dual-role architecture where providers have both:
-- - user_id (from auth.users) - used for authentication
-- - provider_id (from providers_v2.id) - used for business logic
--
-- Requirements: 12.1, 12.2, 12.3
-- ============================================================================

\echo '============================================================================'
\echo 'DUAL-ROLE SYSTEM VERIFICATION'
\echo '============================================================================'
\echo ''

-- ============================================================================
-- SECTION 1: Verify providers_v2.user_id Column Exists
-- Requirement: 12.1
-- ============================================================================

\echo '1. Verifying providers_v2.user_id column exists...'
\echo '-------------------------------------------------------------------'

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

\echo ''
\echo 'Expected: 1 row showing user_id column with type uuid'
\echo ''

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

\echo ''
\echo 'Expected: 1 row showing foreign key to auth.users(id)'
\echo ''

-- ============================================================================
-- SECTION 2: Verify RLS Policies Use Dual-Role JOIN Pattern
-- Requirement: 12.2
-- ============================================================================

\echo '2. Verifying RLS policies use dual-role JOIN pattern...'
\echo '-------------------------------------------------------------------'

-- Get all RLS policies that should use dual-role checks
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename IN (
  'ride_requests',
  'provider_earnings',
  'provider_withdrawals',
  'provider_locations',
  'provider_ratings'
)
ORDER BY tablename, policyname;

\echo ''
\echo 'Expected: Policies should contain JOIN to providers_v2 with user_id check'
\echo 'Pattern: EXISTS (SELECT 1 FROM providers_v2 WHERE providers_v2.id = table.provider_id AND providers_v2.user_id = auth.uid())'
\echo ''

-- Check specific critical policies
\echo '2.1 Checking ride_requests provider policies...'
SELECT 
  policyname,
  qual AS using_expression
FROM pg_policies
WHERE tablename = 'ride_requests'
  AND policyname LIKE '%provider%'
ORDER BY policyname;

\echo ''

\echo '2.2 Checking provider_earnings policies...'
SELECT 
  policyname,
  qual AS using_expression
FROM pg_policies
WHERE tablename = 'provider_earnings'
ORDER BY policyname;

\echo ''

\echo '2.3 Checking provider_withdrawals policies...'
SELECT 
  policyname,
  qual AS using_expression
FROM pg_policies
WHERE tablename = 'provider_withdrawals'
ORDER BY policyname;

\echo ''

-- ============================================================================
-- SECTION 3: Verify Storage Bucket Policies Use Dual-Role Checks
-- Requirement: 12.3
-- ============================================================================

\echo '3. Verifying storage bucket policies use dual-role checks...'
\echo '-------------------------------------------------------------------'

-- Check storage.objects policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
ORDER BY policyname;

\echo ''
\echo 'Expected: Storage policies should JOIN providers_v2 for provider-related buckets'
\echo 'Pattern: JOIN providers_v2 p ON p.id = [related_table].provider_id AND p.user_id = auth.uid()'
\echo ''

-- Check specific storage buckets
\echo '3.1 Checking ride-evidence bucket policies...'
SELECT 
  policyname,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND (policyname LIKE '%ride%' OR policyname LIKE '%evidence%')
ORDER BY policyname;

\echo ''

\echo '3.2 Checking provider-documents bucket policies...'
SELECT 
  policyname,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%provider%'
ORDER BY policyname;

\echo ''

-- ============================================================================
-- SECTION 4: Test Dual-Role System with Sample Data
-- ============================================================================

\echo '4. Testing dual-role system with sample queries...'
\echo '-------------------------------------------------------------------'

-- Check if we have sample data
\echo '4.1 Sample providers_v2 data (first 3 rows)...'
SELECT 
  id AS provider_id,
  user_id,
  name,
  status,
  created_at
FROM providers_v2
ORDER BY created_at DESC
LIMIT 3;

\echo ''

-- Verify dual-role relationship integrity
\echo '4.2 Verifying all providers have valid user_id...'
SELECT 
  COUNT(*) AS total_providers,
  COUNT(user_id) AS providers_with_user_id,
  COUNT(*) - COUNT(user_id) AS providers_without_user_id
FROM providers_v2;

\echo ''
\echo 'Expected: providers_without_user_id should be 0'
\echo ''

-- Check for orphaned providers (user_id doesn't exist in auth.users)
\echo '4.3 Checking for orphaned providers (invalid user_id)...'
SELECT 
  p.id AS provider_id,
  p.user_id,
  p.name,
  p.status
FROM providers_v2 p
LEFT JOIN auth.users u ON u.id = p.user_id
WHERE u.id IS NULL
LIMIT 5;

\echo ''
\echo 'Expected: 0 rows (no orphaned providers)'
\echo ''

-- ============================================================================
-- SECTION 5: Verify Common Anti-Patterns Are NOT Present
-- ============================================================================

\echo '5. Checking for common dual-role anti-patterns...'
\echo '-------------------------------------------------------------------'

-- Anti-pattern: Direct provider_id = auth.uid() check (WRONG!)
\echo '5.1 Searching for incorrect direct provider_id = auth.uid() pattern...'
SELECT 
  tablename,
  policyname,
  qual AS using_expression
FROM pg_policies
WHERE tablename IN (
  'ride_requests',
  'provider_earnings',
  'provider_withdrawals',
  'provider_locations'
)
  AND qual LIKE '%provider_id%auth.uid()%'
  AND qual NOT LIKE '%providers_v2%'
ORDER BY tablename, policyname;

\echo ''
\echo 'Expected: 0 rows (no policies with direct provider_id = auth.uid())'
\echo ''

-- ============================================================================
-- SECTION 6: Summary and Recommendations
-- ============================================================================

\echo '============================================================================'
\echo 'VERIFICATION SUMMARY'
\echo '============================================================================'
\echo ''
\echo 'Checklist:'
\echo '  [ ] providers_v2.user_id column exists (Section 1)'
\echo '  [ ] Foreign key to auth.users exists (Section 1)'
\echo '  [ ] RLS policies use dual-role JOIN pattern (Section 2)'
\echo '  [ ] Storage policies use dual-role checks (Section 3)'
\echo '  [ ] All providers have valid user_id (Section 4.2)'
\echo '  [ ] No orphaned providers (Section 4.3)'
\echo '  [ ] No anti-pattern policies found (Section 5)'
\echo ''
\echo 'If any checks fail, refer to:'
\echo '  - .kiro/steering/mcp-automation.md (Dual-Role System section)'
\echo '  - Migration examples in supabase/migrations/'
\echo ''
\echo '============================================================================'
