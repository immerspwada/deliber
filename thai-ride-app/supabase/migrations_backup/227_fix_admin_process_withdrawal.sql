-- ============================================
-- Migration: 227_fix_admin_process_withdrawal.sql
-- Feature: F05 - Fix Admin Process Withdrawal for Money Reservation
-- Date: 2026-01-10
-- ============================================
-- Description: Update admin_process_withdrawal to work with money reservation system
-- Money is now deducted immediately when customer requests withdrawal (reserved)
-- Admin approval should just change status, not deduct money again
-- Admin rejection should return money to wallet (refund)
-- ============================================

-- Drop existing function
DROP FUNCTION IF EXISTS admin_process_withdrawal(UUID, TEXT, TEXT, TEXT);

-- Recreate with money reservation logic
CREATE OR REPLACE FUNCTION admin_process_withdrawal(
  p_withdrawal_id UUID,
  p_action TEXT, -- 'completed', 'rejected'
  p_reason TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
  v_withdrawal RECORD;
BEGIN
  v_admin_id := auth.uid();
  
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = v_admin_id AND role IN ('admin', 'super_admin')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'ไม่มีสิทธิ์ดำเนินการ');
  END IF;
  
  -- Get withdrawal details with row lock
  SELECT * INTO v_withdrawal
  FROM customer_withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;
  
  IF v_withdrawal IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'ไม่พบคำขอถอนเงิน');
  END IF;
  
  -- Process based on action
  IF p_action = 'completed' THEN
    -- Money already deducted when requested, just update status
    IF v_withdrawal.status != 'pending' THEN
      RETURN json_build_object('success', false, 'error', 'สถานะไม่ถูกต้องสำหรับการอนุมัติ');
    END IF;
    
    UPDATE customer_withdrawals
    SET 
      status = 'completed',
      completed_at = NOW(),
      processed_by = v_admin_id,
      processed_at = NOW(),
      admin_notes = p_admin_notes
    WHERE id = p_withdrawal_id;
    
    -- Notify customer
    INSERT INTO user_notifications (
      user_id, type, title, message, data
    ) VALUES (
      v_withdrawal.user_id,
      'withdrawal',
      'การถอนเงินเสร็จสิ้น',
      'การถอนเงิน ' || v_withdrawal.amount || ' บาท รหัส ' || v_withdrawal.withdrawal_uid || ' เสร็จสิ้นแล้ว',
      json_build_object(
        'withdrawal_id', v_withdrawal.id,
        'withdrawal_uid', v_withdrawal.withdrawal_uid,
        'amount', v_withdrawal.amount
      )
    );
    
  ELSIF p_action = 'rejected' THEN
    -- Return money to wallet (refund)
    IF v_withdrawal.status != 'pending' THEN
      RETURN json_build_object('success', false, 'error', 'สถานะไม่ถูกต้องสำหรับการปฏิเสธ');
    END IF;
    
    -- Return money to wallet
    UPDATE user_wallets
    SET 
      balance = balance + v_withdrawal.amount,
      updated_at = NOW()
    WHERE user_id = v_withdrawal.user_id;
    
    -- Create refund transaction
    INSERT INTO wallet_transactions (
      user_id, 
      type, 
      amount, 
      description, 
      reference_id, 
      reference_type,
      created_at
    ) VALUES (
      v_withdrawal.user_id,
      'refund',
      v_withdrawal.amount,
      'คืนเงินจากการปฏิเสธถอนเงิน ' || v_withdrawal.withdrawal_uid,
      v_withdrawal.id,
      'customer_withdrawal_refund',
      NOW()
    );
    
    -- Update withdrawal status
    UPDATE customer_withdrawals
    SET 
      status = 'rejected',
      reason = p_reason,
      processed_by = v_admin_id,
      processed_at = NOW(),
      admin_notes = p_admin_notes,
      released_at = NOW()
    WHERE id = p_withdrawal_id;
    
    -- Notify customer
    INSERT INTO user_notifications (
      user_id, type, title, message, data
    ) VALUES (
      v_withdrawal.user_id,
      'withdrawal',
      'คำขอถอนเงินถูกปฏิเสธ',
      'คำขอถอนเงิน ' || v_withdrawal.amount || ' บาท รหัส ' || v_withdrawal.withdrawal_uid || ' ถูกปฏิเสธ เหตุผล: ' || COALESCE(p_reason, 'ไม่ระบุ'),
      json_build_object(
        'withdrawal_id', v_withdrawal.id,
        'withdrawal_uid', v_withdrawal.withdrawal_uid,
        'amount', v_withdrawal.amount,
        'reason', p_reason
      )
    );
    
  ELSE
    RETURN json_build_object('success', false, 'error', 'การดำเนินการไม่ถูกต้อง (ใช้ completed หรือ rejected)');
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'ดำเนินการเรียบร้อยแล้ว');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_process_withdrawal(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

-- Add comment
COMMENT ON FUNCTION admin_process_withdrawal(UUID, TEXT, TEXT, TEXT) IS 
  'Admin process customer withdrawal with money reservation support. Actions: completed (approve), rejected (refund money).';

-- ROLLBACK COMMANDS (for reference):
-- DROP FUNCTION IF EXISTS admin_process_withdrawal(UUID, TEXT, TEXT, TEXT);
