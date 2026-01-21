-- =====================================================
-- Verification Script for Topup Requests Fix
-- Run this after deploying migration 305
-- =====================================================

-- 1. Check if new columns exist
SELECT 
  'Column Check' as test_name,
  COUNT(*) as columns_found,
  CASE 
    WHEN COUNT(*) = 5 THEN '✅ PASS'
    ELSE '❌ FAIL - Missing columns'
  END as status
FROM information_schema.columns 
WHERE table_name = 'topup_requests' 
  AND column_name IN ('requested_at', 'processed_at', 'processed_by', 'rejection_reason', 'payment_proof_url');

-- 2. Check if indexes were created
SELECT 
  'Index Check' as test_name,
  COUNT(*) as indexes_found,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ PASS'
    ELSE '❌ FAIL - Missing indexes'
  END as status
FROM pg_indexes 
WHERE tablename = 'topup_requests' 
  AND indexname IN ('idx_topup_requests_requested_at', 'idx_topup_requests_processed_at', 'idx_topup_requests_processed_by');

-- 3. Check if data was backfilled
SELECT 
  'Data Backfill Check' as test_name,
  COUNT(*) as total_records,
  COUNT(requested_at) as has_requested_at,
  COUNT(CASE WHEN status IN ('approved', 'rejected') THEN processed_at END) as has_processed_at,
  CASE 
    WHEN COUNT(*) = COUNT(requested_at) THEN '✅ PASS - requested_at backfilled'
    ELSE '❌ FAIL - requested_at not backfilled'
  END as status
FROM topup_requests;

-- 4. Test RPC function
SELECT 
  'RPC Function Test' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'get_topup_requests_admin'
    ) THEN '✅ PASS - Function exists'
    ELSE '❌ FAIL - Function not found'
  END as status;

-- 5. Sample data check
SELECT 
  id,
  status,
  amount,
  created_at,
  requested_at,
  approved_at,
  rejected_at,
  processed_at,
  admin_id,
  processed_by,
  admin_note,
  rejection_reason,
  slip_image_url,
  payment_proof_url
FROM topup_requests
ORDER BY created_at DESC
LIMIT 3;

-- 6. Test approve/reject functions exist
SELECT 
  'Approve/Reject Functions' as test_name,
  COUNT(*) as functions_found,
  CASE 
    WHEN COUNT(*) = 2 THEN '✅ PASS'
    ELSE '❌ FAIL - Missing functions'
  END as status
FROM pg_proc 
WHERE proname IN ('approve_topup_request', 'reject_topup_request');

-- 7. Check RLS policies
SELECT 
  'RLS Policy Check' as test_name,
  COUNT(*) as policies_found,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASS'
    ELSE '❌ FAIL - No RLS policies'
  END as status
FROM pg_policies 
WHERE tablename = 'topup_requests';

-- 8. Summary
SELECT 
  '=== SUMMARY ===' as section,
  (SELECT COUNT(*) FROM topup_requests WHERE status = 'pending') as pending_requests,
  (SELECT COUNT(*) FROM topup_requests WHERE status = 'approved') as approved_requests,
  (SELECT COUNT(*) FROM topup_requests WHERE status = 'rejected') as rejected_requests,
  (SELECT COUNT(*) FROM topup_requests) as total_requests;
