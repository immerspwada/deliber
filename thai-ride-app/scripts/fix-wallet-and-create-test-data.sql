-- =====================================================
-- Fix Wallet & Create Test Data
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Ensure current user has a wallet
DO $$
DECLARE
  v_user_id UUID;
  v_wallet_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found. Please login first.';
  END IF;
  
  -- Check if wallet exists
  SELECT id INTO v_wallet_id
  FROM user_wallets
  WHERE user_id = v_user_id;
  
  -- Create wallet if not exists
  IF v_wallet_id IS NULL THEN
    INSERT INTO user_wallets (user_id, balance, total_earned, total_spent)
    VALUES (v_user_id, 0, 0, 0)
    RETURNING id INTO v_wallet_id;
    
    RAISE NOTICE 'Created wallet % for user %', v_wallet_id, v_user_id;
  ELSE
    RAISE NOTICE 'Wallet already exists: %', v_wallet_id;
  END IF;
END $$;

-- Step 2: Create test transactions
INSERT INTO wallet_transactions (
  user_id,
  type,
  amount,
  balance_before,
  balance_after,
  description,
  status,
  created_at
)
SELECT 
  auth.uid(),
  'topup',
  500.00,
  0.00,
  500.00,
  'เติมเงินทดสอบครั้งที่ 1',
  'completed',
  NOW() - INTERVAL '5 days'
WHERE NOT EXISTS (
  SELECT 1 FROM wallet_transactions 
  WHERE user_id = auth.uid() AND description = 'เติมเงินทดสอบครั้งที่ 1'
);

INSERT INTO wallet_transactions (
  user_id,
  type,
  amount,
  balance_before,
  balance_after,
  description,
  status,
  created_at
)
SELECT 
  auth.uid(),
  'payment',
  -150.00,
  500.00,
  350.00,
  'ชำระค่าบริการ Ride',
  'completed',
  NOW() - INTERVAL '3 days'
WHERE NOT EXISTS (
  SELECT 1 FROM wallet_transactions 
  WHERE user_id = auth.uid() AND description = 'ชำระค่าบริการ Ride'
);

INSERT INTO wallet_transactions (
  user_id,
  type,
  amount,
  balance_before,
  balance_after,
  description,
  status,
  created_at
)
SELECT 
  auth.uid(),
  'topup',
  1000.00,
  350.00,
  1350.00,
  'เติมเงินทดสอบครั้งที่ 2',
  'completed',
  NOW() - INTERVAL '1 day'
WHERE NOT EXISTS (
  SELECT 1 FROM wallet_transactions 
  WHERE user_id = auth.uid() AND description = 'เติมเงินทดสอบครั้งที่ 2'
);

INSERT INTO wallet_transactions (
  user_id,
  type,
  amount,
  balance_before,
  balance_after,
  description,
  status,
  created_at
)
SELECT 
  auth.uid(),
  'cashback',
  50.00,
  1350.00,
  1400.00,
  'เงินคืนจากโปรโมชั่น',
  'completed',
  NOW() - INTERVAL '12 hours'
WHERE NOT EXISTS (
  SELECT 1 FROM wallet_transactions 
  WHERE user_id = auth.uid() AND description = 'เงินคืนจากโปรโมชั่น'
);

-- Step 3: Update wallet balance to match transactions
UPDATE user_wallets
SET 
  balance = 1400.00,
  total_earned = 1550.00,
  total_spent = 150.00,
  updated_at = NOW()
WHERE user_id = auth.uid();

-- Step 4: Create test topup requests
INSERT INTO topup_requests (
  user_id,
  tracking_id,
  amount,
  payment_method,
  status,
  created_at
)
SELECT 
  auth.uid(),
  'TOP-' || EXTRACT(EPOCH FROM NOW())::TEXT || '-001',
  500.00,
  'promptpay',
  'approved',
  NOW() - INTERVAL '2 days'
WHERE NOT EXISTS (
  SELECT 1 FROM topup_requests 
  WHERE user_id = auth.uid() AND amount = 500.00 AND status = 'approved'
);

INSERT INTO topup_requests (
  user_id,
  tracking_id,
  amount,
  payment_method,
  status,
  created_at
)
SELECT 
  auth.uid(),
  'TOP-' || EXTRACT(EPOCH FROM NOW())::TEXT || '-002',
  200.00,
  'bank_transfer',
  'pending',
  NOW() - INTERVAL '1 hour'
WHERE NOT EXISTS (
  SELECT 1 FROM topup_requests 
  WHERE user_id = auth.uid() AND amount = 200.00 AND status = 'pending'
);

-- Step 5: Verify data
SELECT 
  'Summary' as section,
  'Wallet Balance' as item,
  balance::TEXT as value
FROM user_wallets
WHERE user_id = auth.uid()

UNION ALL

SELECT 
  'Summary',
  'Total Earned',
  total_earned::TEXT
FROM user_wallets
WHERE user_id = auth.uid()

UNION ALL

SELECT 
  'Summary',
  'Total Spent',
  total_spent::TEXT
FROM user_wallets
WHERE user_id = auth.uid()

UNION ALL

SELECT 
  'Counts',
  'Transactions',
  COUNT(*)::TEXT
FROM wallet_transactions
WHERE user_id = auth.uid()

UNION ALL

SELECT 
  'Counts',
  'Topup Requests',
  COUNT(*)::TEXT
FROM topup_requests
WHERE user_id = auth.uid()

UNION ALL

SELECT 
  'Counts',
  'Pending Topups',
  COUNT(*)::TEXT
FROM topup_requests
WHERE user_id = auth.uid() AND status = 'pending';

-- Step 6: Test the get_customer_wallet function
SELECT * FROM get_customer_wallet(auth.uid());
