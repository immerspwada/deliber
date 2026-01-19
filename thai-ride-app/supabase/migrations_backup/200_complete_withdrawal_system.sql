-- =============================================
-- COMPLETE WITHDRAWAL SYSTEM
-- =============================================
-- Fix missing functions and complete the withdrawal flow
-- for Provider → Admin → Provider notification
-- =============================================

-- 0. Add 'withdrawal' and 'topup' to notification types
ALTER TABLE user_notifications DROP CONSTRAINT IF EXISTS user_notifications_type_check;
ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_type_check CHECK (
  type IN ('promo', 'ride', 'delivery', 'shopping', 'payment', 'system', 'sos', 'referral', 'subscription', 'rating', 'success', 'warning', 'error', 'info', 'provider_approved', 'provider_rejected', 'provider_suspended', 'provider_pending', 'withdrawal', 'topup')
);

-- 0b. Fix withdrawal status audit trigger
CREATE OR REPLACE FUNCTION trigger_withdrawal_status_audit()
RETURNS TRIGGER AS $func$
DECLARE
  v_user_id UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get user_id from provider
    SELECT user_id INTO v_user_id FROM service_providers WHERE id = NEW.provider_id;
    
    PERFORM log_status_change(
      'withdrawal',
      NEW.id,
      OLD.status,
      NEW.status,
      v_user_id,
      CASE 
        WHEN NEW.status IN ('completed', 'failed') THEN 'admin'
        ELSE 'provider'
      END,
      NEW.failed_reason,
      jsonb_build_object(
        'amount', NEW.amount,
        'bank_account_id', NEW.bank_account_id
      )
    );
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- 1. Recreate request_withdrawal function (was missing)
CREATE OR REPLACE FUNCTION request_withdrawal(
  p_provider_id UUID,
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
  
  -- Check balance
  v_balance := get_provider_balance(p_provider_id);
  
  -- Get pending withdrawals
  SELECT COALESCE(SUM(amount), 0) INTO v_pending_amount
  FROM provider_withdrawals
  WHERE provider_id = p_provider_id AND status IN ('pending', 'processing');
  
  -- Available balance = total balance - pending withdrawals
  IF (v_balance - v_pending_amount) < p_amount THEN
    RETURN QUERY SELECT false, NULL::UUID, ('ยอดเงินไม่เพียงพอ (คงเหลือ ' || (v_balance - v_pending_amount) || ' บาท)')::TEXT;
    RETURN;
  END IF;
  
  -- Verify bank account belongs to provider
  IF NOT EXISTS (SELECT 1 FROM provider_bank_accounts WHERE id = p_bank_account_id AND provider_id = p_provider_id) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'บัญชีธนาคารไม่ถูกต้อง'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate net amount
  v_net_amount := p_amount - v_fee;
  
  -- Create withdrawal request
  INSERT INTO provider_withdrawals (provider_id, bank_account_id, amount, fee, net_amount, status)
  VALUES (p_provider_id, p_bank_account_id, p_amount, v_fee, v_net_amount, 'pending')
  RETURNING id INTO v_withdrawal_id;
  
  -- Create notification for provider
  INSERT INTO user_notifications (user_id, type, title, message, data)
  SELECT sp.user_id, 'withdrawal', 'คำขอถอนเงิน', 
         'คำขอถอนเงิน ฿' || p_amount || ' ถูกส่งแล้ว รอการอนุมัติ',
         jsonb_build_object('withdrawal_id', v_withdrawal_id, 'amount', p_amount)
  FROM service_providers sp WHERE sp.id = p_provider_id;
  
  RETURN QUERY SELECT true, v_withdrawal_id, 'ส่งคำขอถอนเงินสำเร็จ'::TEXT;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recreate get_provider_weekly_hours function (was missing)
CREATE OR REPLACE FUNCTION get_provider_weekly_hours(p_provider_id UUID)
RETURNS TABLE (
  stat_date DATE,
  day_name VARCHAR(10),
  online_minutes INTEGER,
  trips INTEGER,
  earnings DECIMAL(10,2)
) AS $func$
BEGIN
  RETURN QUERY
  SELECT 
    d.stat_date,
    TO_CHAR(d.stat_date, 'Dy')::VARCHAR(10) as day_name,
    COALESCE(s.online_minutes, 0) as online_minutes,
    COALESCE(s.trips_completed, 0) as trips,
    COALESCE(s.earnings, 0)::DECIMAL(10,2) as earnings
  FROM (
    SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::DATE as stat_date
  ) d
  LEFT JOIN provider_daily_stats s ON s.provider_id = p_provider_id AND s.stat_date = d.stat_date
  ORDER BY d.stat_date;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update admin_approve_withdrawal to send notification
CREATE OR REPLACE FUNCTION admin_approve_withdrawal(
  p_withdrawal_id UUID,
  p_transaction_ref TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $func$
DECLARE
  v_provider_id UUID;
  v_user_id UUID;
  v_amount DECIMAL(12,2);
  v_current_status TEXT;
BEGIN
  -- Get withdrawal info
  SELECT pw.provider_id, pw.amount, pw.status, sp.user_id
  INTO v_provider_id, v_amount, v_current_status, v_user_id
  FROM provider_withdrawals pw
  JOIN service_providers sp ON pw.provider_id = sp.id
  WHERE pw.id = p_withdrawal_id;
  
  IF v_provider_id IS NULL THEN
    RETURN QUERY SELECT false, 'ไม่พบรายการถอนเงิน'::TEXT;
    RETURN;
  END IF;
  
  IF v_current_status != 'pending' AND v_current_status != 'processing' THEN
    RETURN QUERY SELECT false, ('ไม่สามารถอนุมัติได้ สถานะปัจจุบัน: ' || v_current_status)::TEXT;
    RETURN;
  END IF;
  
  -- Update withdrawal status
  UPDATE provider_withdrawals
  SET status = 'completed',
      transaction_ref = COALESCE(p_transaction_ref, 'TXN-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS')),
      processed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_withdrawal_id;
  
  -- Send notification to provider
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

-- 4. Update admin_reject_withdrawal to refund and send notification
CREATE OR REPLACE FUNCTION admin_reject_withdrawal(
  p_withdrawal_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $func$
DECLARE
  v_provider_id UUID;
  v_user_id UUID;
  v_amount DECIMAL(12,2);
  v_current_status TEXT;
BEGIN
  -- Get withdrawal info
  SELECT pw.provider_id, pw.amount, pw.status, sp.user_id
  INTO v_provider_id, v_amount, v_current_status, v_user_id
  FROM provider_withdrawals pw
  JOIN service_providers sp ON pw.provider_id = sp.id
  WHERE pw.id = p_withdrawal_id;
  
  IF v_provider_id IS NULL THEN
    RETURN QUERY SELECT false, 'ไม่พบรายการถอนเงิน'::TEXT;
    RETURN;
  END IF;
  
  IF v_current_status != 'pending' AND v_current_status != 'processing' THEN
    RETURN QUERY SELECT false, ('ไม่สามารถปฏิเสธได้ สถานะปัจจุบัน: ' || v_current_status)::TEXT;
    RETURN;
  END IF;
  
  -- Update withdrawal status to failed (amount automatically becomes available again)
  -- Since balance is calculated from completed rides - completed withdrawals,
  -- rejecting a withdrawal (not marking it completed) means the amount stays available
  UPDATE provider_withdrawals
  SET status = 'failed',
      failed_reason = COALESCE(p_reason, 'ถูกปฏิเสธโดยผู้ดูแลระบบ'),
      processed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_withdrawal_id;
  
  -- Send notification to provider
  INSERT INTO user_notifications (user_id, type, title, message, data)
  VALUES (
    v_user_id,
    'withdrawal',
    'คำขอถอนเงินถูกปฏิเสธ',
    'คำขอถอนเงิน ฿' || v_amount || ' ถูกปฏิเสธ' || 
    CASE WHEN p_reason IS NOT NULL THEN ': ' || p_reason ELSE '' END ||
    ' ยอดเงินจะกลับคืนสู่บัญชีของคุณ',
    jsonb_build_object('withdrawal_id', p_withdrawal_id, 'amount', v_amount, 'status', 'failed', 'reason', p_reason)
  );
  
  RETURN QUERY SELECT true, 'ปฏิเสธการถอนเงินสำเร็จ ยอดเงินกลับคืนสู่ยอดคงเหลือของ Provider'::TEXT;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to get provider withdrawal history
CREATE OR REPLACE FUNCTION get_provider_withdrawals(
  p_provider_id UUID,
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
    pw.id,
    pw.amount,
    pw.fee,
    pw.net_amount,
    pw.status::TEXT,
    pw.transaction_ref,
    pw.failed_reason,
    ba.bank_name,
    ba.account_number,
    ba.account_name,
    pw.created_at,
    pw.processed_at
  FROM provider_withdrawals pw
  LEFT JOIN provider_bank_accounts ba ON pw.bank_account_id = ba.id
  WHERE pw.provider_id = p_provider_id
  ORDER BY pw.created_at DESC
  LIMIT p_limit;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create trigger to notify admin when new withdrawal request is created
CREATE OR REPLACE FUNCTION notify_admin_new_withdrawal()
RETURNS TRIGGER AS $func$
DECLARE
  v_provider_name TEXT;
BEGIN
  -- Get provider name
  SELECT CONCAT(u.first_name, ' ', u.last_name) INTO v_provider_name
  FROM service_providers sp
  JOIN users u ON sp.user_id = u.id
  WHERE sp.id = NEW.provider_id;
  
  -- Notify via pg_notify for realtime
  PERFORM pg_notify('admin_withdrawals', json_build_object(
    'type', 'new_withdrawal',
    'withdrawal_id', NEW.id,
    'provider_id', NEW.provider_id,
    'provider_name', v_provider_name,
    'amount', NEW.amount,
    'status', NEW.status,
    'created_at', NEW.created_at
  )::text);
  
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_admin_new_withdrawal ON provider_withdrawals;
CREATE TRIGGER trigger_notify_admin_new_withdrawal
  AFTER INSERT ON provider_withdrawals
  FOR EACH ROW EXECUTE FUNCTION notify_admin_new_withdrawal();

-- 7. Create trigger to notify provider when withdrawal status changes
CREATE OR REPLACE FUNCTION notify_provider_withdrawal_status()
RETURNS TRIGGER AS $func$
BEGIN
  IF OLD.status != NEW.status THEN
    PERFORM pg_notify('provider_withdrawals', json_build_object(
      'type', 'status_change',
      'withdrawal_id', NEW.id,
      'provider_id', NEW.provider_id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'amount', NEW.amount
    )::text);
  END IF;
  
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_provider_withdrawal_status ON provider_withdrawals;
CREATE TRIGGER trigger_notify_provider_withdrawal_status
  AFTER UPDATE ON provider_withdrawals
  FOR EACH ROW EXECUTE FUNCTION notify_provider_withdrawal_status();

-- Grant permissions
GRANT EXECUTE ON FUNCTION request_withdrawal TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_provider_weekly_hours TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_approve_withdrawal TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_reject_withdrawal TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_provider_withdrawals TO anon, authenticated;
