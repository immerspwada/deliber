-- =====================================================
-- Quick Wallet Fix - With Specific User ID
-- แทนที่ YOUR_USER_ID ด้วย user_id ที่ได้จาก debug report
-- =====================================================

-- ใส่ user_id ของคุณที่นี่ (จาก debug report)
DO $$
DECLARE
  v_user_id UUID := 'bc1a3546-ee13-47d6-804a-6be9055509b4'; -- แก้ไขตรงนี้
  v_wallet_id UUID;
  v_txn_count INTEGER;
BEGIN
  -- Step 1: Check/Create wallet
  SELECT id INTO v_wallet_id FROM user_wallets WHERE user_id = v_user_id;
  
  IF v_wallet_id IS NULL THEN
    INSERT INTO user_wallets (user_id, balance, total_earned, total_spent)
    VALUES (v_user_id, 0, 0, 0)
    RETURNING id INTO v_wallet_id;
    RAISE NOTICE '✅ Created wallet: %', v_wallet_id;
  ELSE
    RAISE NOTICE '✅ Wallet exists: %', v_wallet_id;
  END IF;
  
  -- Step 2: Create transactions (only if not exist)
  INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description, status, created_at)
  SELECT v_user_id, 'topup', 1000.00, 0.00, 1000.00, '💰 เติมเงินเริ่มต้น', 'completed', NOW() - INTERVAL '7 days'
  WHERE NOT EXISTS (SELECT 1 FROM wallet_transactions WHERE user_id = v_user_id AND description = '💰 เติมเงินเริ่มต้น');
  
  INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description, status, created_at)
  SELECT v_user_id, 'payment', -250.00, 1000.00, 750.00, '🚗 ชำระค่าบริการ Ride #12345', 'completed', NOW() - INTERVAL '5 days'
  WHERE NOT EXISTS (SELECT 1 FROM wallet_transactions WHERE user_id = v_user_id AND description = '🚗 ชำระค่าบริการ Ride #12345');
  
  INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description, status, created_at)
  SELECT v_user_id, 'topup', 500.00, 750.00, 1250.00, '💰 เติมเงินครั้งที่ 2', 'completed', NOW() - INTERVAL '3 days'
  WHERE NOT EXISTS (SELECT 1 FROM wallet_transactions WHERE user_id = v_user_id AND description = '💰 เติมเงินครั้งที่ 2');
  
  INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description, status, created_at)
  SELECT v_user_id, 'cashback', 50.00, 1250.00, 1300.00, '🎁 เงินคืนจากโปรโมชั่น', 'completed', NOW() - INTERVAL '2 days'
  WHERE NOT EXISTS (SELECT 1 FROM wallet_transactions WHERE user_id = v_user_id AND description = '🎁 เงินคืนจากโปรโมชั่น');
  
  INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description, status, created_at)
  SELECT v_user_id, 'payment', -150.00, 1300.00, 1150.00, '🚗 ชำระค่าบริการ Ride #12346', 'completed', NOW() - INTERVAL '1 day'
  WHERE NOT EXISTS (SELECT 1 FROM wallet_transactions WHERE user_id = v_user_id AND description = '🚗 ชำระค่าบริการ Ride #12346');
  
  INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description, status, created_at)
  SELECT v_user_id, 'referral', 100.00, 1150.00, 1250.00, '👥 โบนัสแนะนำเพื่อน', 'completed', NOW() - INTERVAL '12 hours'
  WHERE NOT EXISTS (SELECT 1 FROM wallet_transactions WHERE user_id = v_user_id AND description = '👥 โบนัสแนะนำเพื่อน');
  
  -- Step 3: Update wallet balance
  UPDATE user_wallets
  SET balance = 1250.00, total_earned = 1650.00, total_spent = 400.00, updated_at = NOW()
  WHERE user_id = v_user_id;
  
  -- Step 4: Get transaction count
  SELECT COUNT(*) INTO v_txn_count FROM wallet_transactions WHERE user_id = v_user_id;
  
  -- Step 5: Show summary
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '           ✅ WALLET FIX COMPLETED';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '💰 ยอดเงินคงเหลือ: ฿1250.00';
  RAISE NOTICE '📈 รายรับทั้งหมด: ฿1650.00';
  RAISE NOTICE '📉 รายจ่ายทั้งหมด: ฿400.00';
  RAISE NOTICE '📝 จำนวนธุรกรรม: % รายการ', v_txn_count;
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '🎉 กรุณา Refresh หน้าเว็บ (Cmd+Shift+R)';
  RAISE NOTICE '================================================';
END $$;

-- Verify the result
SELECT 
  'SUMMARY' as section,
  balance::TEXT || ' บาท' as balance,
  total_earned::TEXT || ' บาท' as total_earned,
  total_spent::TEXT || ' บาท' as total_spent,
  (SELECT COUNT(*)::TEXT FROM wallet_transactions WHERE user_id = 'bc1a3546-ee13-47d6-804a-6be9055509b4') || ' รายการ' as transactions
FROM user_wallets
WHERE user_id = 'bc1a3546-ee13-47d6-804a-6be9055509b4';
