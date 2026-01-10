-- =====================================================
-- Debug Wallet Data
-- ตรวจสอบข้อมูลในฐานข้อมูลว่ามีหรือไม่
-- =====================================================

-- ========================================
-- 1. Check Current User
-- ========================================
SELECT 
  '👤 Current User' as section,
  auth.uid() as user_id,
  email
FROM auth.users
WHERE id = auth.uid();

-- ========================================
-- 2. Check Wallet Record
-- ========================================
SELECT 
  '💰 Wallet Record' as section,
  id as wallet_id,
  user_id,
  balance,
  total_earned,
  total_spent,
  created_at,
  updated_at
FROM user_wallets
WHERE user_id = auth.uid();

-- ========================================
-- 3. Check Transactions
-- ========================================
SELECT 
  '📝 Transactions' as section,
  id,
  type,
  amount,
  balance_before,
  balance_after,
  description,
  status,
  created_at
FROM wallet_transactions
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- 4. Check Topup Requests
-- ========================================
SELECT 
  '💳 Topup Requests' as section,
  id,
  tracking_id,
  amount,
  payment_method,
  status,
  created_at
FROM topup_requests
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- 5. Check Bank Accounts
-- ========================================
SELECT 
  '🏦 Bank Accounts' as section,
  id,
  bank_name,
  account_number,
  account_name,
  is_default,
  is_verified
FROM customer_bank_accounts
WHERE user_id = auth.uid();

-- ========================================
-- 6. Check Withdrawals
-- ========================================
SELECT 
  '💸 Withdrawals' as section,
  id,
  amount,
  fee,
  net_amount,
  status,
  created_at
FROM customer_withdrawals
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- 7. Test get_customer_wallet Function
-- ========================================
SELECT 
  '🧪 get_customer_wallet()' as section,
  wallet_id,
  balance,
  total_earned,
  total_spent,
  pending_topup_amount,
  pending_topup_count
FROM get_customer_wallet(auth.uid());

-- ========================================
-- 8. Count Records
-- ========================================
SELECT 
  '📊 Record Counts' as section,
  'Wallet' as record_type,
  COUNT(*)::TEXT as count
FROM user_wallets
WHERE user_id = auth.uid()

UNION ALL

SELECT 
  '📊 Record Counts',
  'Transactions',
  COUNT(*)::TEXT
FROM wallet_transactions
WHERE user_id = auth.uid()

UNION ALL

SELECT 
  '📊 Record Counts',
  'Topup Requests',
  COUNT(*)::TEXT
FROM topup_requests
WHERE user_id = auth.uid()

UNION ALL

SELECT 
  '📊 Record Counts',
  'Bank Accounts',
  COUNT(*)::TEXT
FROM customer_bank_accounts
WHERE user_id = auth.uid()

UNION ALL

SELECT 
  '📊 Record Counts',
  'Withdrawals',
  COUNT(*)::TEXT
FROM customer_withdrawals
WHERE user_id = auth.uid();

-- ========================================
-- 9. Check RLS Policies
-- ========================================
SELECT 
  '🔒 RLS Policies' as section,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('user_wallets', 'wallet_transactions', 'topup_requests', 'customer_bank_accounts', 'customer_withdrawals')
ORDER BY tablename, policyname;

-- ========================================
-- 10. Summary
-- ========================================
DO $$
DECLARE
  v_user_id UUID;
  v_wallet_count INTEGER;
  v_txn_count INTEGER;
  v_topup_count INTEGER;
  v_balance DECIMAL(12,2);
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ ERROR: No authenticated user';
    RETURN;
  END IF;
  
  -- Count records
  SELECT COUNT(*) INTO v_wallet_count FROM user_wallets WHERE user_id = v_user_id;
  SELECT COUNT(*) INTO v_txn_count FROM wallet_transactions WHERE user_id = v_user_id;
  SELECT COUNT(*) INTO v_topup_count FROM topup_requests WHERE user_id = v_user_id;
  
  -- Get balance
  SELECT COALESCE(balance, 0) INTO v_balance FROM user_wallets WHERE user_id = v_user_id;
  
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '           DEBUG SUMMARY';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Wallet Records: %', v_wallet_count;
  RAISE NOTICE 'Transactions: %', v_txn_count;
  RAISE NOTICE 'Topup Requests: %', v_topup_count;
  RAISE NOTICE 'Current Balance: ฿%', v_balance;
  RAISE NOTICE '';
  
  IF v_wallet_count = 0 THEN
    RAISE NOTICE '❌ PROBLEM: No wallet record found';
    RAISE NOTICE '✅ SOLUTION: Run scripts/quick-wallet-fix.sql';
  ELSIF v_txn_count = 0 THEN
    RAISE NOTICE '⚠️  WARNING: Wallet exists but no transactions';
    RAISE NOTICE '✅ SOLUTION: Run scripts/quick-wallet-fix.sql to create test data';
  ELSE
    RAISE NOTICE '✅ Data exists in database';
    RAISE NOTICE '⚠️  If not showing in UI, check:';
    RAISE NOTICE '   1. Browser console for errors';
    RAISE NOTICE '   2. Network tab for failed API calls';
    RAISE NOTICE '   3. RLS policies (see output above)';
  END IF;
  
  RAISE NOTICE '================================================';
END $$;
