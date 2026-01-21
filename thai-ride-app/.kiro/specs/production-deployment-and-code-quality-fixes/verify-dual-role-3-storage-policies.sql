-- ============================================================================
-- Dual-Role System Verification - Part 3: Storage Bucket Policies
-- Requirement: 12.3
-- ============================================================================

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

-- Expected: Storage policies should JOIN providers_v2 for provider-related buckets
-- Pattern: JOIN providers_v2 p ON p.id = [related_table].provider_id AND p.user_id = auth.uid()

-- Check specific storage buckets for ride-evidence
SELECT 
  policyname,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND (policyname LIKE '%ride%' OR policyname LIKE '%evidence%')
ORDER BY policyname;

-- Check provider-documents bucket policies
SELECT 
  policyname,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%provider%'
ORDER BY policyname;
