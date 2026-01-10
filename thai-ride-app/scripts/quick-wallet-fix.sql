-- =====================================================
-- Quick Wallet Fix - One-Click Solution
-- รันไฟล์นี้เพื่อแก้ไขปัญหา Wallet ทันที
-- =====================================================

-- ========================================
-- STEP 1: Ensure Wallet Exists
-- ========================================
DO $$
DECLARE
  v_user_id UUID;
  v_wallet_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '❌ กรุณา Login ก่อนรันสคริปต์นี้';
  END IF;
  
  -- Check if wallet exists
  SELECT id INTO v_wallet_id
  FROM user_wallets
  WHERE user_id = v_user_id;
  
  IF v_wallet_id IS NULL THEN
    -- Create wallet
    INSERT INTO user_wallets (user_id, balance, total_earned, total_spent)
    VALUES (v_user_id, 0, 0, 0)
    RETURNING id INTO v_wallet_id;
    
    RAISE NOTICE '✅ สร้าง Wallet สำเร็จ: %', v_wallet_id;
  ELSE
    RAISE NOTICE '✅ Wallet มีอยู่แล้ว: %', v_wallet_id;
  END IF;
END $$;

-- ========================================
-- STEP 2: Create Test Transactions
-- ========================================

-- Transaction 1: Initial Topup
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
  0.00,
  1000.00,
  '💰 เติมเงินเริ่มต้น',
  'completed',
  NOW() - INTERVAL '7 days'
WHERE NOT EXISTS (
  SELECT 1 FROM wallet_transactions 
  WHERE user_id = auth.uid() 
  AND description = '💰 เติมเงินเริ่มต้น'
);

-- Transaction 2: Payment
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
  -250.00,
  1000.00,
  750.00,
  '🚗 ชำระค่าบริการ Ride #12345',
  'completed',
  NOW() - INTERVAL '5 days'
WHERE NOT EXISTS (
  SELECT 1 FROM wallet_transactions 
  WHERE user_id = auth.uid() 
  AND description = '🚗 ชำระค่าบริการ Ride #12345'
);

-- Transaction 3: Second Topup
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
  750.00,
  1250.00,
  '💰 เติมเงินครั้งที่ 2',
  'completed',
  NOW() - INTERVAL '3 days'
WHERE NOT EXISTS (
  SELECT 1 FROM wallet_transactions 
  WHERE user_id = auth.uid() 
  AND description = '💰 เติมเงินครั้งที่ 2'
);

-- Transaction 4: Cashback
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
  1250.00,
  1300.00,
  '🎁 เงินคืนจากโปรโมชั่น',
  'completed',
  NOW() - INTERVAL '2 days'
WHERE NOT EXISTS (
  SELECT 1 FROM wallet_transactions 
  WHERE user_id = auth.uid() 
  AND description = '🎁 เงินคืนจากโปรโมชั่น'
);

-- Transaction 5: Another Payment
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
  1300.00,
  1150.00,
  '🚗 ชำระค่าบริการ Ride #12346',
  'completed',
  NOW() - INTERVAL '1 day'
WHERE NOT EXISTS (
  SELECT 1 FROM wallet_transactions 
  WHERE user_id = auth.uid() 
  AND description = '🚗 ชำระค่าบริการ Ride #12346'
);

-- Transaction 6: Referral Bonus
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
  'referral',
  100.00,
  1150.00,
  1250.00,
  '👥 โบนัสแนะนำเพื่อน',
  'completed',
  NOW() - INTERVAL '12 hours'
WHERE NOT EXISTS (
  SELECT 1 FROM wallet_transactions 
  WHERE user_id = auth.uid() 
  AND description = '👥 โบนัสแนะนำเพื่อน'
);

-- ========================================
-- STEP 3: Update Wallet Balance
-- ========================================
UPDATE user_wallets
SET 
  balance = 1250.00,
  total_earned = 1650.00,  -- 1000 + 500 + 50 + 100
  total_spent = 400.00,     -- 250 + 150
  updated_at = NOW()
WHERE user_id = auth.uid();

-- ========================================
-- STEP 4: Create Topup Requests
-- ========================================

-- Approved Topup
INSERT INTO topup_requests (
  user_id,
  tracking_id,
  amount,
  payment_method,
  status,
  admin_note,
  created_at,
  updated_at
)
SELECT 
  auth.uid(),
  'TOP-' || TO_CHAR(NOW() - INTERVAL '7 days', 'YYYYMMDDHH24MISS') || '-001',
  1000.00,
  'promptpay',
  'approved',
  'อนุมัติแล้ว - ตรวจสอบสลิปเรียบร้อย',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '7 days'
WHERE NOT EXISTS (
  SELECT 1 FROM topup_requests 
  WHERE user_id = auth.uid() 
  AND amount = 1000.00 
  AND status = 'approved'
);

-- Pending Topup
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
  'TOP-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || '-002',
  300.00,
  'bank_transfer',
  'pending',
  NOW() - INTERVAL '30 minutes'
WHERE NOT EXISTS (
  SELECT 1 FROM topup_requests 
  WHERE user_id = auth.uid() 
  AND amount = 300.00 
  AND status = 'pending'
);

-- Another Approved Topup
INSERT INTO topup_requests (
  user_id,
  tracking_id,
  amount,
  payment_method,
  status,
  admin_note,
  created_at,
  updated_at
)
SELECT 
  auth.uid(),
  'TOP-' || TO_CHAR(NOW() - INTERVAL '3 days', 'YYYYMMDDHH24MISS') || '-003',
  500.00,
  'promptpay',
  'approved',
  'อนุมัติแล้ว',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
WHERE NOT EXISTS (
  SELECT 1 FROM topup_requests 
  WHERE user_id = auth.uid() 
  AND amount = 500.00 
  AND status = 'approved'
);

-- ========================================
-- STEP 5: Verify Results
-- ========================================
DO $$
DECLARE
  v_balance DECIMAL(12,2);
  v_total_earned DECIMAL(12,2);
  v_total_spent DECIMAL(12,2);
  v_txn_count INTEGER;
  v_topup_count INTEGER;
BEGIN
  -- Get wallet data
  SELECT balance, total_earned, total_spent
  INTO v_balance, v_total_earned, v_total_spent
  FROM user_wallets
  WHERE user_id = auth.uid();
  
  -- Get counts
  SELECT COUNT(*) INTO v_txn_count
  FROM wallet_transactions
  WHERE user_id = auth.uid();
  
  SELECT COUNT(*) INTO v_topup_count
  FROM topup_requests
  WHERE user_id = auth.uid();
  
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '           ✅ WALLET FIX COMPLETED';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '💰 ยอดเงินคงเหลือ: ฿%', v_balance;
  RAISE NOTICE '📈 รายรับทั้งหมด: ฿%', v_total_earned;
  RAISE NOTICE '📉 รายจ่ายทั้งหมด: ฿%', v_total_spent;
  RAISE NOTICE '📝 จำนวนธุรกรรม: % รายการ', v_txn_count;
  RAISE NOTICE '💳 คำขอเติมเงิน: % รายการ', v_topup_count;
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '🎉 กรุณา Refresh หน้าเว็บ (Cmd+Shift+R)';
  RAISE NOTICE '================================================';
END $$;

-- ========================================
-- STEP 6: Test Function
-- ========================================
SELECT 
  '🧪 Test Result' as section,
  wallet_id::TEXT,
  balance::TEXT || ' บาท' as balance,
  total_earned::TEXT || ' บาท' as total_earned,
  total_spent::TEXT || ' บาท' as total_spent,
  pending_topup_count::TEXT || ' รายการ' as pending_topups
FROM get_customer_wallet(auth.uid());
