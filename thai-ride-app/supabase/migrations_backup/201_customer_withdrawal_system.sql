-- =============================================
-- CUSTOMER WITHDRAWAL SYSTEM
-- =============================================
-- Allow customers to withdraw money from their wallet
-- Similar to provider withdrawal but for customers
-- =============================================

-- 1. Create customer_bank_accounts table (if not exists)
CREATE TABLE IF NOT EXISTS customer_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_code VARCHAR(20) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create customer_withdrawals table (if not exists)
CREATE TABLE IF NOT EXISTS customer_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES customer_bank_accounts(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 100),
  fee DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  transaction_ref TEXT,
  processed_at TIMESTAMPTZ,
  failed_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_bank_accounts_user ON customer_bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_withdrawals_user ON customer_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_withdrawals_status ON customer_withdrawals(status);

-- 4. Enable RLS
ALTER TABLE customer_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_withdrawals ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for customer_bank_accounts
DROP POLICY IF EXISTS "customer_bank_accounts_select" ON customer_bank_accounts;
CREATE POLICY "customer_bank_accounts_select" ON customer_bank_accounts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "customer_bank_accounts_insert" ON customer_bank_accounts;
CREATE POLICY "customer_bank_accounts_insert" ON customer_bank_accounts
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "customer_bank_accounts_update" ON customer_bank_accounts;
CREATE POLICY "customer_bank_accounts_update" ON customer_bank_accounts
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "customer_bank_accounts_delete" ON customer_bank_accounts;
CREATE POLICY "customer_bank_accounts_delete" ON customer_bank_accounts
  FOR DELETE USING (true);

-- 6. RLS Policies for customer_withdrawals
DROP POLICY IF EXISTS "customer_withdrawals_select" ON customer_withdrawals;
CREATE POLICY "customer_withdrawals_select" ON customer_withdrawals
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "customer_withdrawals_insert" ON customer_withdrawals;
CREATE POLICY "customer_withdrawals_insert" ON customer_withdrawals
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "customer_withdrawals_update" ON customer_withdrawals;
CREATE POLICY "customer_withdrawals_update" ON customer_withdrawals
  FOR UPDATE USING (true);

-- 7. Function: Get customer bank accounts
CREATE OR REPLACE FUNCTION get_customer_bank_accounts(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  bank_code VARCHAR(20),
  bank_name VARCHAR(100),
  account_number VARCHAR(20),
  account_name VARCHAR(100),
  is_default BOOLEAN,
  is_verified BOOLEAN,
  created_at TIMESTAMPTZ
) AS $func$
BEGIN
  RETURN QUERY
  SELECT 
    ba.id,
    ba.bank_code,
    ba.bank_name,
    ba.account_number,
    ba.account_name,
    ba.is_default,
    ba.is_verified,
    ba.created_at
  FROM customer_bank_accounts ba
  WHERE ba.user_id = p_user_id
  ORDER BY ba.is_default DESC, ba.created_at DESC;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function: Add customer bank account
CREATE OR REPLACE FUNCTION add_customer_bank_account(
  p_user_id UUID,
  p_bank_code VARCHAR(20),
  p_bank_name VARCHAR(100),
  p_account_number VARCHAR(20),
  p_account_name VARCHAR(100),
  p_is_default BOOLEAN DEFAULT false
)
RETURNS TABLE (
  success BOOLEAN,
  account_id UUID,
  message TEXT
) AS $func$
DECLARE
  v_account_id UUID;
BEGIN
  -- If setting as default, unset other defaults first
  IF p_is_default THEN
    UPDATE customer_bank_accounts
    SET is_default = false
    WHERE user_id = p_user_id;
  END IF;
  
  -- Insert new account
  INSERT INTO customer_bank_accounts (user_id, bank_code, bank_name, account_number, account_name, is_default)
  VALUES (p_user_id, p_bank_code, p_bank_name, p_account_number, p_account_name, p_is_default)
  RETURNING id INTO v_account_id;
  
  RETURN QUERY SELECT true, v_account_id, 'เพิ่มบัญชีธนาคารสำเร็จ'::TEXT;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function: Delete customer bank account
CREATE OR REPLACE FUNCTION delete_customer_bank_account(
  p_user_id UUID,
  p_account_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $func$
BEGIN
  -- Check if account exists and belongs to user
  IF NOT EXISTS (SELECT 1 FROM customer_bank_accounts WHERE id = p_account_id AND user_id = p_user_id) THEN
    RETURN QUERY SELECT false, 'ไม่พบบัญชีธนาคาร'::TEXT;
    RETURN;
  END IF;
  
  -- Check if account is used in pending withdrawals
  IF EXISTS (SELECT 1 FROM customer_withdrawals WHERE bank_account_id = p_account_id AND status IN ('pending', 'processing')) THEN
    RETURN QUERY SELECT false, 'ไม่สามารถลบได้ มีคำขอถอนเงินที่รอดำเนินการ'::TEXT;
    RETURN;
  END IF;
  
  DELETE FROM customer_bank_accounts WHERE id = p_account_id AND user_id = p_user_id;
  
  RETURN QUERY SELECT true, 'ลบบัญชีธนาคารสำเร็จ'::TEXT;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function: Request customer withdrawal
CREATE OR REPLACE FUNCTION request_customer_withdrawal(
  p_user_id UUID,
  p_bank_account_id UUID,
  p_amount DECIMAL(12,2)
)
RETURNS TABLE (
  success BOOLEAN,
  withdrawal_id UUID,
  message TEXT
) AS $func$
DECLARE
  v_balance DECIMAL(12,2);
  v_fee DECIMAL(10,2) := 0; -- No fee for now
  v_net_amount DECIMAL(12,2);
  v_withdrawal_id UUID;
  v_pending_amount DECIMAL(12,2);
BEGIN
  -- Check minimum amount
  IF p_amount < 100 THEN
    RETURN QUERY SELECT false, NULL::UUID, 'จำนวนเงินขั้นต่ำ 100 บาท'::TEXT;
    RETURN;
  END IF;
  
  -- Get wallet balance
  SELECT COALESCE(balance, 0) INTO v_balance
  FROM user_wallets
  WHERE user_id = p_user_id;
  
  IF v_balance IS NULL THEN
    v_balance := 0;
  END IF;
  
  -- Get pending withdrawals
  SELECT COALESCE(SUM(amount), 0) INTO v_pending_amount
  FROM customer_withdrawals
  WHERE user_id = p_user_id AND status IN ('pending', 'processing');
  
  -- Available balance = wallet balance - pending withdrawals
  IF (v_balance - v_pending_amount) < p_amount THEN
    RETURN QUERY SELECT false, NULL::UUID, ('ยอดเงินไม่เพียงพอ (คงเหลือ ' || (v_balance - v_pending_amount) || ' บาท)')::TEXT;
    RETURN;
  END IF;
  
  -- Verify bank account belongs to user
  IF NOT EXISTS (SELECT 1 FROM customer_bank_accounts WHERE id = p_bank_account_id AND user_id = p_user_id) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'บัญชีธนาคารไม่ถูกต้อง'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate net amount
  v_net_amount := p_amount - v_fee;
  
  -- Create withdrawal request
  INSERT INTO customer_withdrawals (user_id, bank_account_id, amount, fee, net_amount, status)
  VALUES (p_user_id, p_bank_account_id, p_amount, v_fee, v_net_amount, 'pending')
  RETURNING id INTO v_withdrawal_id;
  
  -- Create notification for customer
  INSERT INTO user_notifications (user_id, type, title, message, data)
  VALUES (
    p_user_id,
    'withdrawal',
    'คำขอถอนเงิน',
    'คำขอถอนเงิน ฿' || p_amount || ' ถูกส่งแล้ว รอการอนุมัติ',
    jsonb_build_object('withdrawal_id', v_withdrawal_id, 'amount', p_amount)
  );
  
  RETURN QUERY SELECT true, v_withdrawal_id, 'ส่งคำขอถอนเงินสำเร็จ'::TEXT;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Function: Get customer withdrawals
CREATE OR REPLACE FUNCTION get_customer_withdrawals(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  amount DECIMAL(12,2),
  fee DECIMAL(10,2),
  net_amount DECIMAL(12,2),
  status TEXT,
  transaction_ref TEXT,
  failed_reason TEXT,
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  created_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ
) AS $func$
BEGIN
  RETURN QUERY
  SELECT 
    cw.id,
    cw.amount,
    cw.fee,
    cw.net_amount,
    cw.status::TEXT,
    cw.transaction_ref,
    cw.failed_reason,
    ba.bank_name::TEXT,
    ba.account_number::TEXT,
    ba.account_name::TEXT,
    cw.created_at,
    cw.processed_at
  FROM customer_withdrawals cw
  LEFT JOIN customer_bank_accounts ba ON cw.bank_account_id = ba.id
  WHERE cw.user_id = p_user_id
  ORDER BY cw.created_at DESC
  LIMIT p_limit;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Function: Cancel customer withdrawal
CREATE OR REPLACE FUNCTION cancel_customer_withdrawal(
  p_user_id UUID,
  p_withdrawal_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $func$
DECLARE
  v_status TEXT;
BEGIN
  -- Get current status
  SELECT status INTO v_status
  FROM customer_withdrawals
  WHERE id = p_withdrawal_id AND user_id = p_user_id;
  
  IF v_status IS NULL THEN
    RETURN QUERY SELECT false, 'ไม่พบคำขอถอนเงิน'::TEXT;
    RETURN;
  END IF;
  
  IF v_status != 'pending' THEN
    RETURN QUERY SELECT false, ('ไม่สามารถยกเลิกได้ สถานะปัจจุบัน: ' || v_status)::TEXT;
    RETURN;
  END IF;
  
  -- Update status to cancelled
  UPDATE customer_withdrawals
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_withdrawal_id AND user_id = p_user_id;
  
  RETURN QUERY SELECT true, 'ยกเลิกคำขอถอนเงินสำเร็จ'::TEXT;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Admin functions for customer withdrawals
CREATE OR REPLACE FUNCTION admin_get_customer_withdrawals(
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  member_uid TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  amount DECIMAL(12,2),
  fee DECIMAL(10,2),
  net_amount DECIMAL(12,2),
  status TEXT,
  transaction_ref TEXT,
  failed_reason TEXT,
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  created_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ
) AS $func$
BEGIN
  RETURN QUERY
  SELECT 
    cw.id,
    cw.user_id,
    u.member_uid::TEXT,
    CONCAT(u.first_name, ' ', u.last_name)::TEXT as customer_name,
    u.phone_number::TEXT as customer_phone,
    cw.amount,
    cw.fee,
    cw.net_amount,
    cw.status::TEXT,
    cw.transaction_ref,
    cw.failed_reason,
    ba.bank_name::TEXT,
    ba.account_number::TEXT,
    ba.account_name::TEXT,
    cw.created_at,
    cw.processed_at
  FROM customer_withdrawals cw
  JOIN users u ON cw.user_id = u.id
  LEFT JOIN customer_bank_accounts ba ON cw.bank_account_id = ba.id
  WHERE (p_status IS NULL OR cw.status = p_status)
  ORDER BY cw.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Admin count customer withdrawals
CREATE OR REPLACE FUNCTION admin_count_customer_withdrawals(
  p_status TEXT DEFAULT NULL
)
RETURNS INTEGER AS $func$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM customer_withdrawals
  WHERE (p_status IS NULL OR status = p_status);
  
  RETURN v_count;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Admin get customer withdrawal stats
CREATE OR REPLACE FUNCTION admin_get_customer_withdrawal_stats()
RETURNS TABLE (
  total_count BIGINT,
  total_amount DECIMAL(12,2),
  pending_count BIGINT,
  pending_amount DECIMAL(12,2),
  completed_count BIGINT,
  completed_amount DECIMAL(12,2),
  rejected_count BIGINT,
  rejected_amount DECIMAL(12,2),
  today_count BIGINT,
  today_amount DECIMAL(12,2)
) AS $func$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_count,
    COALESCE(SUM(amount), 0)::DECIMAL(12,2) as total_amount,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_count,
    COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)::DECIMAL(12,2) as pending_amount,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_count,
    COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0)::DECIMAL(12,2) as completed_amount,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as rejected_count,
    COALESCE(SUM(amount) FILTER (WHERE status = 'failed'), 0)::DECIMAL(12,2) as rejected_amount,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::BIGINT as today_count,
    COALESCE(SUM(amount) FILTER (WHERE created_at >= CURRENT_DATE), 0)::DECIMAL(12,2) as today_amount
  FROM customer_withdrawals;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Admin approve customer withdrawal
CREATE OR REPLACE FUNCTION admin_approve_customer_withdrawal(
  p_withdrawal_id UUID,
  p_transaction_ref TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $func$
DECLARE
  v_user_id UUID;
  v_amount DECIMAL(12,2);
  v_current_status TEXT;
BEGIN
  -- Get withdrawal info
  SELECT cw.user_id, cw.amount, cw.status
  INTO v_user_id, v_amount, v_current_status
  FROM customer_withdrawals cw
  WHERE cw.id = p_withdrawal_id;
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'ไม่พบรายการถอนเงิน'::TEXT;
    RETURN;
  END IF;
  
  IF v_current_status != 'pending' AND v_current_status != 'processing' THEN
    RETURN QUERY SELECT false, ('ไม่สามารถอนุมัติได้ สถานะปัจจุบัน: ' || v_current_status)::TEXT;
    RETURN;
  END IF;
  
  -- Deduct from wallet
  UPDATE user_wallets
  SET balance = balance - v_amount,
      total_spent = total_spent + v_amount,
      updated_at = NOW()
  WHERE user_id = v_user_id;
  
  -- Create wallet transaction
  INSERT INTO wallet_transactions (user_id, type, amount, description, reference_type, reference_id, status)
  VALUES (v_user_id, 'withdrawal', v_amount, 'ถอนเงินเข้าบัญชีธนาคาร', 'customer_withdrawal', p_withdrawal_id, 'completed');
  
  -- Update withdrawal status
  UPDATE customer_withdrawals
  SET status = 'completed',
      transaction_ref = COALESCE(p_transaction_ref, 'TXN-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS')),
      processed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_withdrawal_id;
  
  -- Send notification to customer
  INSERT INTO user_notifications (user_id, type, title, message, data)
  VALUES (
    v_user_id,
    'withdrawal',
    'ถอนเงินสำเร็จ',
    'คำขอถอนเงิน ฿' || v_amount || ' ได้รับการอนุมัติและโอนเงินเรียบร้อยแล้ว',
    jsonb_build_object('withdrawal_id', p_withdrawal_id, 'amount', v_amount, 'status', 'completed', 'notes', p_notes)
  );
  
  RETURN QUERY SELECT true, 'อนุมัติการถอนเงินสำเร็จ'::TEXT;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. Admin reject customer withdrawal
CREATE OR REPLACE FUNCTION admin_reject_customer_withdrawal(
  p_withdrawal_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $func$
DECLARE
  v_user_id UUID;
  v_amount DECIMAL(12,2);
  v_current_status TEXT;
BEGIN
  -- Get withdrawal info
  SELECT cw.user_id, cw.amount, cw.status
  INTO v_user_id, v_amount, v_current_status
  FROM customer_withdrawals cw
  WHERE cw.id = p_withdrawal_id;
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'ไม่พบรายการถอนเงิน'::TEXT;
    RETURN;
  END IF;
  
  IF v_current_status != 'pending' AND v_current_status != 'processing' THEN
    RETURN QUERY SELECT false, ('ไม่สามารถปฏิเสธได้ สถานะปัจจุบัน: ' || v_current_status)::TEXT;
    RETURN;
  END IF;
  
  -- Update withdrawal status to failed (balance stays in wallet)
  UPDATE customer_withdrawals
  SET status = 'failed',
      failed_reason = COALESCE(p_reason, 'ถูกปฏิเสธโดยผู้ดูแลระบบ'),
      processed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_withdrawal_id;
  
  -- Send notification to customer
  INSERT INTO user_notifications (user_id, type, title, message, data)
  VALUES (
    v_user_id,
    'withdrawal',
    'คำขอถอนเงินถูกปฏิเสธ',
    'คำขอถอนเงิน ฿' || v_amount || ' ถูกปฏิเสธ' || 
    CASE WHEN p_reason IS NOT NULL THEN ': ' || p_reason ELSE '' END ||
    ' ยอดเงินยังคงอยู่ในกระเป๋าเงินของคุณ',
    jsonb_build_object('withdrawal_id', p_withdrawal_id, 'amount', v_amount, 'status', 'failed', 'reason', p_reason)
  );
  
  RETURN QUERY SELECT true, 'ปฏิเสธการถอนเงินสำเร็จ'::TEXT;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. Grant permissions
GRANT EXECUTE ON FUNCTION get_customer_bank_accounts TO anon, authenticated;
GRANT EXECUTE ON FUNCTION add_customer_bank_account TO anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_customer_bank_account TO anon, authenticated;
GRANT EXECUTE ON FUNCTION request_customer_withdrawal TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_customer_withdrawals TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cancel_customer_withdrawal TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_customer_withdrawals TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_count_customer_withdrawals TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_customer_withdrawal_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_approve_customer_withdrawal TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_reject_customer_withdrawal TO anon, authenticated;

-- 19. Enable realtime for customer_withdrawals
ALTER PUBLICATION supabase_realtime ADD TABLE customer_withdrawals;
