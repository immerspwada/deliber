-- Verification Script for Customer Suspension System
-- ===================================================
-- Run this in Supabase SQL Editor to verify deployment

-- 1. Check columns exist
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('status', 'suspension_reason', 'suspended_at', 'suspended_by')
ORDER BY column_name;
-- Expected: 4 rows

-- 2. Check indexes exist
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'profiles'
AND indexname IN ('idx_profiles_status', 'idx_profiles_suspended_by', 'idx_profiles_role_status')
ORDER BY indexname;
-- Expected: 3 rows

-- 3. Check functions exist
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname IN ('suspend_customer_account', 'unsuspend_customer_account')
AND pronamespace = 'public'::regnamespace
ORDER BY proname;
-- Expected: 2 rows

-- 4. Check RLS policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
AND policyname IN ('customer_suspended_blocked', 'customer_suspended_no_update')
ORDER BY policyname;
-- Expected: 2 rows

-- 5. Test suspend function (as admin)
-- Replace 'test-customer-uuid' with actual test customer ID
-- SELECT suspend_customer_account(
--   'test-customer-uuid'::UUID,
--   'Testing suspension system'
-- );

-- 6. Verify suspension
-- SELECT 
--   id,
--   full_name,
--   role,
--   status,
--   suspension_reason,
--   suspended_at,
--   suspended_by
-- FROM profiles
-- WHERE id = 'test-customer-uuid';
-- Expected: status = 'suspended'

-- 7. Test unsuspend function (as admin)
-- SELECT unsuspend_customer_account('test-customer-uuid'::UUID);

-- 8. Verify unsuspension
-- SELECT 
--   id,
--   full_name,
--   role,
--   status,
--   suspension_reason
-- FROM profiles
-- WHERE id = 'test-customer-uuid';
-- Expected: status = 'active', suspension_reason = NULL

-- 9. Check role distribution
SELECT 
  role,
  status,
  COUNT(*) as count
FROM profiles
GROUP BY role, status
ORDER BY role, status;

-- 10. Check suspended customers
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.status,
  p.suspension_reason,
  p.suspended_at,
  a.full_name as suspended_by_name
FROM profiles p
LEFT JOIN profiles a ON a.id = p.suspended_by
WHERE p.status = 'suspended'
AND p.role = 'customer'
ORDER BY p.suspended_at DESC
LIMIT 10;

-- 11. Verify admin can suspend (test with actual admin user)
-- This should succeed
-- SELECT suspend_customer_account(
--   'customer-uuid'::UUID,
--   'Test reason'
-- );

-- 12. Verify customer cannot suspend (test with customer user)
-- This should fail with "Only admins can suspend customers"
-- SELECT suspend_customer_account(
--   'another-customer-uuid'::UUID,
--   'Test reason'
-- );

-- 13. Verify provider cannot suspend (test with provider user)
-- This should fail with "Only admins can suspend customers"
-- SELECT suspend_customer_account(
--   'customer-uuid'::UUID,
--   'Test reason'
-- );

-- 14. Verify cannot suspend admin
-- This should fail with "Cannot suspend admin accounts"
-- SELECT suspend_customer_account(
--   'admin-uuid'::UUID,
--   'Test reason'
-- );

-- 15. Verify cannot suspend provider
-- This should fail with "Cannot suspend provider accounts"
-- SELECT suspend_customer_account(
--   'provider-uuid'::UUID,
--   'Test reason'
-- );

-- ✅ All checks passed if:
-- - All columns exist
-- - All indexes exist
-- - Both functions exist
-- - Both RLS policies exist
-- - Suspend/unsuspend works for customers
-- - Only admin can suspend
-- - Cannot suspend admin/provider
