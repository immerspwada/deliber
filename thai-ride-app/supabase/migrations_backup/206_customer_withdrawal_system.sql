-- ============================================
-- Migration: 206_customer_withdrawal_system.sql
-- Feature: F05 - Customer Withdrawal System
-- Date: 2024-12-30
-- ============================================
-- Description: Complete customer withdrawal system
-- Tables: customer_withdrawals
-- RLS: Yes
-- Realtime: Yes
-- ============================================

-- 1. Create customer_withdrawals table
CREATE TABLE IF NOT EXISTS customer_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  withdrawal_uid TEXT NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0 AND amount <= 100000),
  bank_name TEXT NOT NULL,
  bank_account_number TEXT NOT NULL,
  bank_account_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'rejected', 'cancelled')),
  reason TEXT, -- เหตุผลการปฏิเสธ
  admin_notes TEXT, -- หมายเหตุจาก admin
  processed_by UUID REFERENCES users(id), -- admin ที่ดำเนินการ
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_withdrawals_user_id ON customer_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_withdrawals_status ON customer_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_customer_withdrawals_created_at ON customer_withdrawals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_withdrawals_withdrawal_uid ON customer_withdrawals(withdrawal_uid);

-- 3. Enable RLS
ALTER TABLE customer_withdrawals ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Admin: Full access
CREATE POLICY "admin_full_access_customer_withdrawals" ON customer_withdrawals
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Customer: Own withdrawals only
CREATE POLICY "customer_own_withdrawals" ON customer_withdrawals
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE customer_withdrawals;

-- 6. Create function to generate withdrawal UID
CREATE OR REPLACE FUNCTION generate_withdrawal_uid()
RETURNS TEXT AS $$
DECLARE
  new_uid TEXT;
  uid_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate UID: WDR-YYYYMMDD-NNNNNN
    new_uid := 'WDR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
               LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0');
    
    -- Check if UID already exists
    SELECT EXISTS(
      SELECT 1 FROM customer_withdrawals WHERE withdrawal_uid = new_uid
    ) INTO uid_exists;
    
    -- Exit loop if UID is unique
    EXIT WHEN NOT uid_exists;
  END LOOP;
  
  RETURN new_uid;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to auto-generate withdrawal UID
CREATE OR REPLACE FUNCTION set_withdrawal_uid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.withdrawal_uid IS NULL OR NEW.withdrawal_uid = '' THEN
    NEW.withdrawal_uid := generate_withdrawal_uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_withdrawal_uid
  BEFORE INSERT ON customer_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION set_withdrawal_uid();

-- 8. Create trigger for updated_at
CREATE OR REPLACE FUNCTION customer_withdrawals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_customer_withdrawals_updated_at
  BEFORE UPDATE ON customer_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION customer_withdrawals_updated_at();

-- 9. Create function to request withdrawal
CREATE OR REPLACE FUNCTION request_customer_withdrawal(
  p_amount DECIMAL,
  p_bank_name TEXT,
  p_bank_account_number TEXT,
  p_bank_account_name TEXT
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_wallet_balance DECIMAL;
  v_withdrawal_id UUID;
  v_withdrawal_uid TEXT;
BEGIN
  -- Get user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'ไม่พบข้อมูลผู้ใช้');
  END IF;
  
  -- Validate amount
  IF p_amount <= 0 OR p_amount > 100000 THEN
    RETURN json_build_object('success', false, 'error', 'จำนวนเงินไม่ถูกต้อง (1-100,000 บาท)');
  END IF;
  
  -- Check wallet balance
  SELECT balance INTO v_wallet_balance
  FROM user_wallets
  WHERE user_id = v_user_id;
  
  IF v_wallet_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'ไม่พบข้อมูลกระเป๋าเงิน');
  END IF;
  
  IF v_wallet_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'ยอดเงินในกระเป๋าไม่เพียงพอ');
  END IF;
  
  -- Check for pending withdrawals
  IF EXISTS (
    SELECT 1 FROM customer_withdrawals
    WHERE user_id = v_user_id AND status = 'pending'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'มีคำขอถอนเงินที่รออนุมัติอยู่แล้ว');
  END IF;
  
  -- Create withdrawal request
  INSERT INTO customer_withdrawals (
    user_id, amount, bank_name, bank_account_number, bank_account_name
  ) VALUES (
    v_user_id, p_amount, p_bank_name, p_bank_account_number, p_bank_account_name
  ) RETURNING id, withdrawal_uid INTO v_withdrawal_id, v_withdrawal_uid;
  
  -- Create notification for admins
  INSERT INTO user_notifications (
    user_id, type, title, message, data
  )
  SELECT 
    u.id,
    'withdrawal_request',
    'คำขอถอนเงินใหม่',
    'มีคำขอถอนเงิน ' || p_amount || ' บาท รหัส ' || v_withdrawal_uid,
    json_build_object(
      'withdrawal_id', v_withdrawal_id,
      'withdrawal_uid', v_withdrawal_uid,
      'amount', p_amount
    )
  FROM users u
  WHERE u.role IN ('admin', 'super_admin');
  
  RETURN json_build_object(
    'success', true,
    'withdrawal_id', v_withdrawal_id,
    'withdrawal_uid', v_withdrawal_uid,
    'message', 'สร้างคำขอถอนเงินเรียบร้อยแล้ว'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to cancel withdrawal (customer only)
CREATE OR REPLACE FUNCTION cancel_customer_withdrawal(
  p_withdrawal_id UUID
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_current_status TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'ไม่พบข้อมูลผู้ใช้');
  END IF;
  
  -- Check if withdrawal exists and belongs to user
  SELECT status INTO v_current_status
  FROM customer_withdrawals
  WHERE id = p_withdrawal_id AND user_id = v_user_id;
  
  IF v_current_status IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'ไม่พบคำขอถอนเงิน');
  END IF;
  
  -- Can only cancel pending withdrawals
  IF v_current_status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'ไม่สามารถยกเลิกคำขอนี้ได้');
  END IF;
  
  -- Update status to cancelled
  UPDATE customer_withdrawals
  SET 
    status = 'cancelled',
    updated_at = NOW()
  WHERE id = p_withdrawal_id;
  
  RETURN json_build_object('success', true, 'message', 'ยกเลิกคำขอถอนเงินเรียบร้อยแล้ว');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create admin function to process withdrawal
CREATE OR REPLACE FUNCTION admin_process_withdrawal(
  p_withdrawal_id UUID,
  p_action TEXT, -- 'approve', 'reject', 'complete'
  p_reason TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
  v_withdrawal RECORD;
  v_wallet_balance DECIMAL;
BEGIN
  v_admin_id := auth.uid();
  
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = v_admin_id AND role IN ('admin', 'super_admin')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'ไม่มีสิทธิ์ดำเนินการ');
  END IF;
  
  -- Get withdrawal details
  SELECT * INTO v_withdrawal
  FROM customer_withdrawals
  WHERE id = p_withdrawal_id;
  
  IF v_withdrawal IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'ไม่พบคำขอถอนเงิน');
  END IF;
  
  -- Process based on action
  IF p_action = 'approve' THEN
    IF v_withdrawal.status != 'pending' THEN
      RETURN json_build_object('success', false, 'error', 'สถานะไม่ถูกต้องสำหรับการอนุมัติ');
    END IF;
    
    -- Check wallet balance again
    SELECT balance INTO v_wallet_balance
    FROM user_wallets
    WHERE user_id = v_withdrawal.user_id;
    
    IF v_wallet_balance < v_withdrawal.amount THEN
      RETURN json_build_object('success', false, 'error', 'ยอดเงินในกระเป๋าไม่เพียงพอ');
    END IF;
    
    -- Deduct from wallet
    UPDATE user_wallets
    SET balance = balance - v_withdrawal.amount
    WHERE user_id = v_withdrawal.user_id;
    
    -- Add transaction record
    INSERT INTO wallet_transactions (
      user_id, type, amount, description, reference_id, reference_type
    ) VALUES (
      v_withdrawal.user_id,
      'withdrawal',
      -v_withdrawal.amount,
      'ถอนเงินเข้าบัญชี ' || v_withdrawal.bank_name || ' ' || v_withdrawal.bank_account_number,
      v_withdrawal.id,
      'customer_withdrawal'
    );
    
    -- Update withdrawal status
    UPDATE customer_withdrawals
    SET 
      status = 'approved',
      processed_by = v_admin_id,
      processed_at = NOW(),
      admin_notes = p_admin_notes
    WHERE id = p_withdrawal_id;
    
    -- Notify customer
    INSERT INTO user_notifications (
      user_id, type, title, message, data
    ) VALUES (
      v_withdrawal.user_id,
      'withdrawal_approved',
      'คำขอถอนเงินได้รับการอนุมัติ',
      'คำขอถอนเงิน ' || v_withdrawal.amount || ' บาท รหัส ' || v_withdrawal.withdrawal_uid || ' ได้รับการอนุมัติแล้ว',
      json_build_object(
        'withdrawal_id', v_withdrawal.id,
        'withdrawal_uid', v_withdrawal.withdrawal_uid,
        'amount', v_withdrawal.amount
      )
    );
    
  ELSIF p_action = 'reject' THEN
    IF v_withdrawal.status != 'pending' THEN
      RETURN json_build_object('success', false, 'error', 'สถานะไม่ถูกต้องสำหรับการปฏิเสธ');
    END IF;
    
    UPDATE customer_withdrawals
    SET 
      status = 'rejected',
      reason = p_reason,
      processed_by = v_admin_id,
      processed_at = NOW(),
      admin_notes = p_admin_notes
    WHERE id = p_withdrawal_id;
    
    -- Notify customer
    INSERT INTO user_notifications (
      user_id, type, title, message, data
    ) VALUES (
      v_withdrawal.user_id,
      'withdrawal_rejected',
      'คำขอถอนเงินถูกปฏิเสธ',
      'คำขอถอนเงิน ' || v_withdrawal.amount || ' บาท รหัส ' || v_withdrawal.withdrawal_uid || ' ถูกปฏิเสธ เหตุผล: ' || COALESCE(p_reason, 'ไม่ระบุ'),
      json_build_object(
        'withdrawal_id', v_withdrawal.id,
        'withdrawal_uid', v_withdrawal.withdrawal_uid,
        'amount', v_withdrawal.amount,
        'reason', p_reason
      )
    );
    
  ELSIF p_action = 'complete' THEN
    IF v_withdrawal.status != 'approved' THEN
      RETURN json_build_object('success', false, 'error', 'สถานะไม่ถูกต้องสำหรับการเสร็จสิ้น');
    END IF;
    
    UPDATE customer_withdrawals
    SET 
      status = 'completed',
      completed_at = NOW(),
      admin_notes = p_admin_notes
    WHERE id = p_withdrawal_id;
    
    -- Notify customer
    INSERT INTO user_notifications (
      user_id, type, title, message, data
    ) VALUES (
      v_withdrawal.user_id,
      'withdrawal_completed',
      'การถอนเงินเสร็จสิ้น',
      'การถอนเงิน ' || v_withdrawal.amount || ' บาท รหัส ' || v_withdrawal.withdrawal_uid || ' เสร็จสิ้นแล้ว',
      json_build_object(
        'withdrawal_id', v_withdrawal.id,
        'withdrawal_uid', v_withdrawal.withdrawal_uid,
        'amount', v_withdrawal.amount
      )
    );
    
  ELSE
    RETURN json_build_object('success', false, 'error', 'การดำเนินการไม่ถูกต้อง');
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'ดำเนินการเรียบร้อยแล้ว');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create admin function to get customer withdrawals
CREATE OR REPLACE FUNCTION admin_get_customer_withdrawals(
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  withdrawal_uid TEXT,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  amount DECIMAL,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  status TEXT,
  reason TEXT,
  admin_notes TEXT,
  processed_by UUID,
  processed_by_name TEXT,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cw.id,
    cw.withdrawal_uid,
    cw.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_name,
    u.email as user_email,
    u.phone_number as user_phone,
    cw.amount,
    cw.bank_name,
    cw.bank_account_number,
    cw.bank_account_name,
    cw.status,
    cw.reason,
    cw.admin_notes,
    cw.processed_by,
    CASE 
      WHEN cw.processed_by IS NOT NULL THEN 
        COALESCE(admin_user.first_name || ' ' || admin_user.last_name, admin_user.email)
      ELSE NULL
    END as processed_by_name,
    cw.processed_at,
    cw.completed_at,
    cw.created_at,
    cw.updated_at
  FROM customer_withdrawals cw
  JOIN users u ON cw.user_id = u.id
  LEFT JOIN users admin_user ON cw.processed_by = admin_user.id
  WHERE (p_status IS NULL OR cw.status = p_status)
  ORDER BY cw.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create function to count customer withdrawals for admin
CREATE OR REPLACE FUNCTION admin_count_customer_withdrawals(
  p_status TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM customer_withdrawals
  WHERE (p_status IS NULL OR status = p_status);
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ROLLBACK COMMANDS (for reference):
-- DROP TABLE IF EXISTS customer_withdrawals CASCADE;
-- DROP FUNCTION IF EXISTS generate_withdrawal_uid();
-- DROP FUNCTION IF EXISTS set_withdrawal_uid();
-- DROP FUNCTION IF EXISTS customer_withdrawals_updated_at();
-- DROP FUNCTION IF EXISTS request_customer_withdrawal(DECIMAL, TEXT, TEXT, TEXT);
-- DROP FUNCTION IF EXISTS cancel_customer_withdrawal(UUID);
-- DROP FUNCTION IF EXISTS admin_process_withdrawal(UUID, TEXT, TEXT, TEXT);
-- DROP FUNCTION IF EXISTS admin_get_customer_withdrawals(TEXT, INTEGER, INTEGER);
-- DROP FUNCTION IF EXISTS admin_count_customer_withdrawals(TEXT);