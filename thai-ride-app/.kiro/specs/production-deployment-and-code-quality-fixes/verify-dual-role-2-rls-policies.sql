-- ============================================================================
-- Dual-Role System Verification - Part 2: RLS Policies
-- Requirement: 12.2
-- ============================================================================

-- Get all RLS policies that should use dual-role checks
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression
FROM pg_policies
WHERE tablename IN (
  'ride_requests',
  'provider_earnings',
  'provider_withdrawals',
  'provider_locations',
  'provider_ratings'
)
ORDER BY tablename, policyname;

-- Expected: Policies should contain JOIN to providers_v2 with user_id check
-- Pattern: EXISTS (SELECT 1 FROM providers_v2 WHERE providers_v2.id = table.provider_id AND providers_v2.user_id = auth.uid())

-- Check for anti-pattern: Direct provider_id = auth.uid() check (WRONG!)
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

-- Expected: 0 rows (no policies with direct provider_id = auth.uid())
