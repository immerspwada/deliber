-- =====================================================
-- Wallet System Verification Script
-- ตรวจสอบความถูกต้องของระบบ Wallet ทั้งหมด
-- =====================================================

-- ========================================
-- SECTION 1: Check User & Wallet
-- ========================================
DO $$
DECLARE
  v_user_id UUID;
  v_wallet_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '❌ ERROR: No authenticated user. Please login first.';
  END IF;
  
  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  RAISE NOTICE '✅ User ID: %', v_user_id;
  RAISE NOTICE '✅ User Email: %', v_user_email;
  
  -- Check wallet
  SELECT id INTO v_wallet_id FROM user_wallets WHERE user_id = v_user_id;
  
  IF v_wallet_id IS NULL THEN
    RAISE NOTICE '⚠️  WARNING: No wallet found. Creating wallet...';
    
    -- Create wallet
    INSERT INTO user_wallets (user_id, balance, total_earned, total_spent)
    VALUES (v_user_id, 0, 0, 0)
    RETURNING id INTO v_wallet_id;
    
    RAISE NOTICE '✅ Wallet created: %', v_wallet_id;
  ELSE
    RAISE NOTICE '✅ Wallet exists: %', v_wallet_id;
  END IF;
END $$;

-- ========================================
-- SECTION 2: Check Functions
-- ========================================
SELECT 
  '✅ Function Check' as section,
  proname as function_name,
  'EXISTS' as status
FROM pg_proc
WHERE proname IN (
  'ensure_user_wallet',
  'get_customer_wallet',
  'process_wallet_transaction',
  'pay_from_wallet_safe',
  'topup_wallet_safe',
  'verify_wallet_balance',
  'reconcile_wallet_balance',
  'create_simple_topup_request',
  'get_topup_requests_by_user',
  'get_customer_bank_accounts',
  'add_customer_bank_account',
  'get_customer_withdrawals',
  'request_customer_withdrawal',
  'get_payment_receiving_accounts'
)
ORDER BY proname;

-- ========================================
-- SECTION 3: Check Constraints
-- ========================================
SELECT 
  '✅ Constraint Check' as section,
  conname as constraint_name,
  'ACTIVE' as status
FROM pg_constraint
WHERE conrelid = 'user_wallets'::regclass
  AND conname IN (
    'check_balance_non_negative',
    'check_total_earned_non_negative',
    'check_total_spent_non_negative'
  );

-- ========================================
-- SECTION 4: Check RLS Policies
-- ========================================
SELECT 
  '✅ RLS Policy Check' as section,
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE tablename IN ('user_wallets', 'wallet_transactions', 'topup_requests')
ORDER BY tablename, policyname;

-- ========================================
-- SECTION 5: Check Current Wallet Data
-- ========================================
SELECT 
  '📊 Current Wallet Data' as section,
  'Balance' as metric,
  COALESCE(balance, 0)::TEXT as value
FROM user_wallets
WHERE user_id = auth.uid()

UNION ALL

SELECT 
  '📊 Current Wallet Data',
  'Total Earned',
  COALESCE(total_earned, 0)::TEXT
FROM user_wallets
WHERE user_id = auth.uid()

UNION ALL

SELECT 
  '📊 Current Wallet Data',
  'Total Spent',
  COALESCE(total_spent, 0)::TEXT
FROM user_wallets
WHERE user_id = auth.uid()

UNION ALL

SELECT 
  '📊 Current Wallet Data',
  'Transactions',
  COUNT(*)::TEXT
FROM wallet_transactions
WHERE user_id = auth.uid()

UNION ALL

SELECT 
  '📊 Current Wallet Data',
  'Topup Requests',
  COUNT(*)::TEXT
FROM topup_requests
WHERE user_id = auth.uid()

UNION ALL

SELECT 
  '📊 Current Wallet Data',
  'Bank Accounts',
  COUNT(*)::TEXT
FROM customer_bank_accounts
WHERE user_id = auth.uid()

UNION ALL

SELECT 
  '📊 Current Wallet Data',
  'Withdrawals',
  COUNT(*)::TEXT
FROM customer_withdrawals
WHERE user_id = auth.uid();

-- ========================================
-- SECTION 6: Test get_customer_wallet Function
-- ========================================
SELECT 
  '🧪 Function Test' as section,
  'get_customer_wallet' as function_name,
  wallet_id::TEXT as wallet_id,
  balance::TEXT as balance,
  total_earned::TEXT as total_earned,
  total_spent::TEXT as total_spent,
  pending_topup_count::TEXT as pending_topups
FROM get_customer_wallet(auth.uid());

-- ========================================
-- SECTION 7: Verify Balance Integrity
-- ========================================
SELECT 
  '🔍 Balance Verification' as section,
  CASE 
    WHEN is_valid THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  calculated_balance::TEXT as calculated,
  stored_balance::TEXT as stored,
  difference::TEXT as difference,
  message
FROM verify_wallet_balance(auth.uid());

-- ========================================
-- SECTION 8: Check Payment Accounts
-- ========================================
SELECT 
  '💳 Payment Accounts' as section,
  account_type,
  display_name,
  account_number,
  CASE WHEN qr_code_url IS NOT NULL THEN '✅ Has QR' ELSE '❌ No QR' END as qr_status
FROM get_payment_receiving_accounts(NULL);

-- ========================================
-- SECTION 9: Recent Transactions
-- ========================================
SELECT 
  '📝 Recent Transactions' as section,
  type,
  amount::TEXT,
  description,
  status,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM wallet_transactions
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- ========================================
-- SECTION 10: Summary Report
-- ========================================
DO $$
DECLARE
  v_wallet_exists BOOLEAN;
  v_has_transactions BOOLEAN;
  v_balance_valid BOOLEAN;
  v_functions_exist INTEGER;
  v_status TEXT;
BEGIN
  -- Check wallet
  SELECT EXISTS(SELECT 1 FROM user_wallets WHERE user_id = auth.uid())
  INTO v_wallet_exists;
  
  -- Check transactions
  SELECT EXISTS(SELECT 1 FROM wallet_transactions WHERE user_id = auth.uid())
  INTO v_has_transactions;
  
  -- Check balance validity
  SELECT is_valid INTO v_balance_valid
  FROM verify_wallet_balance(auth.uid());
  
  -- Check functions
  SELECT COUNT(*) INTO v_functions_exist
  FROM pg_proc
  WHERE proname IN (
    'ensure_user_wallet',
    'get_customer_wallet',
    'process_wallet_transaction',
    'pay_from_wallet_safe',
    'topup_wallet_safe'
  );
  
  -- Determine status
  IF v_wallet_exists AND v_balance_valid AND v_functions_exist >= 5 THEN
    v_status := '✅ SYSTEM HEALTHY';
  ELSIF v_wallet_exists AND v_functions_exist >= 5 THEN
    v_status := '⚠️  SYSTEM OK (No transactions yet)';
  ELSE
    v_status := '❌ SYSTEM NEEDS ATTENTION';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '           WALLET SYSTEM STATUS';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Overall Status: %', v_status;
  RAISE NOTICE '';
  RAISE NOTICE 'Wallet Exists: %', CASE WHEN v_wallet_exists THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE 'Has Transactions: %', CASE WHEN v_has_transactions THEN '✅ YES' ELSE '⚠️  NO' END;
  RAISE NOTICE 'Balance Valid: %', CASE WHEN v_balance_valid THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE 'Functions Ready: %', CASE WHEN v_functions_exist >= 5 THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE '================================================';
  
  IF NOT v_wallet_exists THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  ACTION REQUIRED: Run fix-wallet-and-create-test-data.sql';
  END IF;
  
  IF NOT v_has_transactions THEN
    RAISE NOTICE '';
    RAISE NOTICE '💡 TIP: Run fix-wallet-and-create-test-data.sql to create test data';
  END IF;
END $$;
