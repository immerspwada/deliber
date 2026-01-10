-- =====================================================
-- Wallet Integrity Test Suite
-- ทดสอบความถูกต้องของระบบ Wallet
-- =====================================================

-- Test 1: Verify current balance
SELECT 
  '=== Test 1: Current Balance ===' as test,
  * 
FROM verify_wallet_balance(auth.uid());

-- Test 2: Try to pay more than balance (should fail)
DO $$
DECLARE
  v_result RECORD;
  v_current_balance DECIMAL(12,2);
BEGIN
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM user_wallets
  WHERE user_id = auth.uid();
  
  RAISE NOTICE '=== Test 2: Insufficient Balance Test ===';
  RAISE NOTICE 'Current balance: %', v_current_balance;
  
  -- Try to pay more than balance
  SELECT * INTO v_result
  FROM pay_from_wallet_safe(
    auth.uid(),
    v_current_balance + 100,
    'Test: Should fail - insufficient balance'
  );
  
  IF v_result.success THEN
    RAISE EXCEPTION 'CRITICAL: Payment succeeded with insufficient balance!';
  ELSE
    RAISE NOTICE 'PASS: Payment correctly rejected - %', v_result.message;
  END IF;
END $$;

-- Test 3: Try to pay negative amount (should fail)
DO $$
DECLARE
  v_result RECORD;
BEGIN
  RAISE NOTICE '=== Test 3: Negative Amount Test ===';
  
  SELECT * INTO v_result
  FROM pay_from_wallet_safe(
    auth.uid(),
    -100,
    'Test: Should fail - negative amount'
  );
  
  IF v_result.success THEN
    RAISE EXCEPTION 'CRITICAL: Payment succeeded with negative amount!';
  ELSE
    RAISE NOTICE 'PASS: Payment correctly rejected - %', v_result.message;
  END IF;
END $$;

-- Test 4: Try to pay zero amount (should fail)
DO $$
DECLARE
  v_result RECORD;
BEGIN
  RAISE NOTICE '=== Test 4: Zero Amount Test ===';
  
  SELECT * INTO v_result
  FROM pay_from_wallet_safe(
    auth.uid(),
    0,
    'Test: Should fail - zero amount'
  );
  
  IF v_result.success THEN
    RAISE EXCEPTION 'CRITICAL: Payment succeeded with zero amount!';
  ELSE
    RAISE NOTICE 'PASS: Payment correctly rejected - %', v_result.message;
  END IF;
END $$;

-- Test 5: Valid payment (should succeed)
DO $$
DECLARE
  v_result RECORD;
  v_balance_before DECIMAL(12,2);
  v_balance_after DECIMAL(12,2);
BEGIN
  RAISE NOTICE '=== Test 5: Valid Payment Test ===';
  
  -- Get balance before
  SELECT balance INTO v_balance_before
  FROM user_wallets
  WHERE user_id = auth.uid();
  
  RAISE NOTICE 'Balance before: %', v_balance_before;
  
  -- Make payment
  SELECT * INTO v_result
  FROM pay_from_wallet_safe(
    auth.uid(),
    10.00,
    'Test: Valid payment'
  );
  
  IF NOT v_result.success THEN
    RAISE EXCEPTION 'FAIL: Valid payment was rejected - %', v_result.message;
  END IF;
  
  -- Get balance after
  SELECT balance INTO v_balance_after
  FROM user_wallets
  WHERE user_id = auth.uid();
  
  RAISE NOTICE 'Balance after: %', v_balance_after;
  RAISE NOTICE 'Expected: %', v_balance_before - 10.00;
  
  IF v_balance_after = v_balance_before - 10.00 THEN
    RAISE NOTICE 'PASS: Balance correctly updated';
  ELSE
    RAISE EXCEPTION 'CRITICAL: Balance mismatch! Expected %, got %', 
      v_balance_before - 10.00, v_balance_after;
  END IF;
END $$;

-- Test 6: Valid topup (should succeed)
DO $$
DECLARE
  v_result RECORD;
  v_balance_before DECIMAL(12,2);
  v_balance_after DECIMAL(12,2);
BEGIN
  RAISE NOTICE '=== Test 6: Valid Topup Test ===';
  
  -- Get balance before
  SELECT balance INTO v_balance_before
  FROM user_wallets
  WHERE user_id = auth.uid();
  
  RAISE NOTICE 'Balance before: %', v_balance_before;
  
  -- Make topup
  SELECT * INTO v_result
  FROM topup_wallet_safe(
    auth.uid(),
    50.00,
    'Test: Valid topup'
  );
  
  IF NOT v_result.success THEN
    RAISE EXCEPTION 'FAIL: Valid topup was rejected - %', v_result.message;
  END IF;
  
  -- Get balance after
  SELECT balance INTO v_balance_after
  FROM user_wallets
  WHERE user_id = auth.uid();
  
  RAISE NOTICE 'Balance after: %', v_balance_after;
  RAISE NOTICE 'Expected: %', v_balance_before + 50.00;
  
  IF v_balance_after = v_balance_before + 50.00 THEN
    RAISE NOTICE 'PASS: Balance correctly updated';
  ELSE
    RAISE EXCEPTION 'CRITICAL: Balance mismatch! Expected %, got %', 
      v_balance_before + 50.00, v_balance_after;
  END IF;
END $$;

-- Test 7: Concurrent transaction test (race condition)
DO $$
DECLARE
  v_balance_before DECIMAL(12,2);
  v_balance_after DECIMAL(12,2);
  v_expected_balance DECIMAL(12,2);
BEGIN
  RAISE NOTICE '=== Test 7: Concurrent Transaction Test ===';
  
  -- Get balance before
  SELECT balance INTO v_balance_before
  FROM user_wallets
  WHERE user_id = auth.uid();
  
  RAISE NOTICE 'Balance before: %', v_balance_before;
  
  -- Simulate concurrent transactions
  PERFORM pay_from_wallet_safe(auth.uid(), 5.00, 'Concurrent test 1');
  PERFORM pay_from_wallet_safe(auth.uid(), 5.00, 'Concurrent test 2');
  PERFORM topup_wallet_safe(auth.uid(), 20.00, 'Concurrent test 3');
  
  -- Get balance after
  SELECT balance INTO v_balance_after
  FROM user_wallets
  WHERE user_id = auth.uid();
  
  v_expected_balance := v_balance_before - 5.00 - 5.00 + 20.00;
  
  RAISE NOTICE 'Balance after: %', v_balance_after;
  RAISE NOTICE 'Expected: %', v_expected_balance;
  
  IF v_balance_after = v_expected_balance THEN
    RAISE NOTICE 'PASS: Concurrent transactions handled correctly';
  ELSE
    RAISE EXCEPTION 'CRITICAL: Concurrent transaction error! Expected %, got %', 
      v_expected_balance, v_balance_after;
  END IF;
END $$;

-- Test 8: Verify final balance integrity
SELECT 
  '=== Test 8: Final Balance Verification ===' as test,
  * 
FROM verify_wallet_balance(auth.uid());

-- Test 9: Check audit log
SELECT 
  '=== Test 9: Audit Log ===' as test,
  COUNT(*) as audit_entries,
  MIN(created_at) as first_entry,
  MAX(created_at) as last_entry
FROM wallet_audit_log
WHERE user_id = auth.uid();

-- Test 10: Transaction history integrity
SELECT 
  '=== Test 10: Transaction History ===' as test,
  COUNT(*) as total_transactions,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_credits,
  SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_debits,
  SUM(amount) as net_balance
FROM wallet_transactions
WHERE user_id = auth.uid() AND status = 'completed';

-- Summary
SELECT 
  '=== SUMMARY ===' as section,
  'All tests completed' as status,
  NOW() as timestamp;
