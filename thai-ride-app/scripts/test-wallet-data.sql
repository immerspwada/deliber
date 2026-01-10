-- Test Wallet Data Script
-- Run this in Supabase SQL Editor to create test data

-- 1. Check if user has wallet
SELECT 
  id,
  user_id,
  balance,
  total_earned,
  total_spent,
  created_at
FROM user_wallets
WHERE user_id = auth.uid();

-- 2. If no wallet exists, create one
INSERT INTO user_wallets (user_id, balance, total_earned, total_spent)
SELECT auth.uid(), 1000.00, 1000.00, 0.00
WHERE NOT EXISTS (
  SELECT 1 FROM user_wallets WHERE user_id = auth.uid()
);

-- 3. Create some test transactions
INSERT INTO wallet_transactions (
  user_id,
  type,
  amount,
  balance_before,
  balance_after,
  description,
  status
)
SELECT 
  auth.uid(),
  'topup',
  1000.00,
  0.00,
  1000.00,
  'เติมเงินทดสอบ',
  'completed'
WHERE NOT EXISTS (
  SELECT 1 FROM wallet_transactions WHERE user_id = auth.uid()
);

-- 4. Create test topup request
INSERT INTO topup_requests (
  user_id,
  tracking_id,
  amount,
  payment_method,
  status
)
SELECT 
  auth.uid(),
  'TOP-' || EXTRACT(EPOCH FROM NOW())::TEXT,
  500.00,
  'promptpay',
  'approved'
WHERE NOT EXISTS (
  SELECT 1 FROM topup_requests WHERE user_id = auth.uid()
);

-- 5. Verify data
SELECT 'Wallet' as type, COUNT(*) as count FROM user_wallets WHERE user_id = auth.uid()
UNION ALL
SELECT 'Transactions', COUNT(*) FROM wallet_transactions WHERE user_id = auth.uid()
UNION ALL
SELECT 'Topup Requests', COUNT(*) FROM topup_requests WHERE user_id = auth.uid();
