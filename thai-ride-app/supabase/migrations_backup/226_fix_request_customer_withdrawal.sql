-- ============================================
-- Migration: 226_fix_request_customer_withdrawal.sql
-- Feature: F05 - Fix Customer Withdrawal Function
-- Date: 2026-01-10
-- ============================================
-- Description: Recreate request_customer_withdrawal function
-- The function was dropped in migration 208 but not recreated
-- This creates a new version that accepts bank_account_id and
-- fetches bank details from customer_bank_accounts table
-- ============================================

-- 1. Drop existing function if any
DROP FUNCTION IF EXISTS request_customer_withdrawal(UUID, UUID, DECIMAL);
DROP FUNCTION IF EXISTS request_customer_withdrawal(DECIMAL, TEXT, TEXT, TEXT);

-- 2. Create request_customer_withdrawal function
-- This version accepts bank_account_id and looks up bank details
CREATE OR REPLACE FUNCTION request_customer_withdrawal(
  p_user_id UUID,
  p_bank_account_id UUID,
  p_amount DECIMAL
)
RETURNS TABLE (
  success BOOLEAN,
  withdrawal_id UUID,
  message TEXT
) AS $$
DECLARE
  v_wallet_balance DECIMAL;
  v_pending_amount DECIMAL;
  v_available_balance DECIMAL;
  v_withdrawal_id UUID;
  v_withdrawal_uid TEXT;
  v_bank_name TEXT;
  v_bank_account_number TEXT;
  v_bank_account_name TEXT;
BEGIN
  -- Validate amount
  IF p_amount < 100 THEN
    RETURN QUERY SELECT false, NULL::UUID, 'จำนวนเงินขั้นต่ำ 100 บาท'::TEXT;
    RETURN;
  END IF;
  
  IF p_amount > 100000 THEN
    RETURN QUERY SELECT false, NULL::UUID, 'จำนวนเงินสูงสุด 100,000 บาท'::TEXT;
    RETURN;
  END IF;
  
  -- Get wallet balance
  SELECT COALESCE(balance, 0) INTO v_wallet_balance
  FROM user_wallets
  WHERE user_id = p_user_id;
  
  IF v_wallet_balance IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'ไม่พบข้อมูลกระเป๋าเงิน'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate pending withdrawal amount
  SELECT COALESCE(SUM(amount), 0) INTO v_pending_amount
  FROM customer_withdrawals
  WHERE user_id = p_user_id 
    AND status IN ('pending', 'approved');
  
  -- Calculate available balance
  v_available_balance := v_wallet_balance - v_pending_amount;
  
  IF v_available_balance < p_amount THEN
    RETURN QUERY SELECT 
      false, 
      NULL::UUID, 
      ('ยอดเงินไม่เพียงพอ (คงเหลือ ' || v_available_balance || ' บาท)')::TEXT;
    RETURN;
  END IF;
  
  -- Get bank account details
  SELECT 
    bank_name,
    account_number,
    account_name
  INTO 
    v_bank_name,
    v_bank_account_number,
    v_bank_account_name
  FROM customer_bank_accounts
  WHERE id = p_bank_account_id AND user_id = p_user_id;
  
  IF v_bank_name IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'ไม่พบข้อมูลบัญชีธนาคาร'::TEXT;
    RETURN;
  END IF;
  
  -- Check for existing pending withdrawals
  IF EXISTS (
    SELECT 1 FROM customer_withdrawals
    WHERE user_id = p_user_id AND status = 'pending'
  ) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'มีคำขอถอนเงินที่รออนุมัติอยู่แล้ว'::TEXT;
    RETURN;
  END IF;
  
  -- Create withdrawal request
  INSERT INTO customer_withdrawals (
    user_id,
    amount,
    bank_name,
    bank_account_number,
    bank_account_name,
    status
  ) VALUES (
    p_user_id,
    p_amount,
    v_bank_name,
    v_bank_account_number,
    v_bank_account_name,
    'pending'
  ) RETURNING id, withdrawal_uid INTO v_withdrawal_id, v_withdrawal_uid;
  
  -- Create notification for admins
  INSERT INTO user_notifications (
    user_id,
    type,
    title,
    message,
    data
  )
  SELECT 
    u.id,
    'withdrawal_request',
    'คำขอถอนเงินใหม่',
    'มีคำขอถอนเงิน ' || p_amount || ' บาท รหัส ' || v_withdrawal_uid,
    json_build_object(
      'withdrawal_id', v_withdrawal_id,
      'withdrawal_uid', v_withdrawal_uid,
      'amount', p_amount,
      'user_id', p_user_id
    )
  FROM users u
  WHERE u.role IN ('admin', 'super_admin');
  
  RETURN QUERY SELECT 
    true, 
    v_withdrawal_id, 
    ('สร้างคำขอถอนเงินเรียบร้อยแล้ว รหัส: ' || v_withdrawal_uid)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION request_customer_withdrawal(UUID, UUID, DECIMAL) TO anon, authenticated;

-- 4. Add comment
COMMENT ON FUNCTION request_customer_withdrawal(UUID, UUID, DECIMAL) IS 
  'Request customer withdrawal by providing user_id, bank_account_id, and amount. Returns success status, withdrawal_id, and message.';

-- ROLLBACK COMMANDS (for reference):
-- DROP FUNCTION IF EXISTS request_customer_withdrawal(UUID, UUID, DECIMAL);
