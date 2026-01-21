-- ============================================
-- Migration: 211_wallet_audit_security.sql
-- Feature: F05 - Wallet Audit & Security Enhancement
-- Date: 2026-01-08
-- ============================================
-- Description: เพิ่มระบบ audit log และ security สำหรับ wallet
-- - Audit log สำหรับทุก transaction
-- - Balance reconciliation checks
-- - Fraud detection triggers
-- - Admin action logging
-- ============================================

-- =====================================================
-- 1. WALLET AUDIT LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS wallet_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  -- topup_request, topup_approved, topup_rejected, payment, refund, withdrawal_request, withdrawal_approved, withdrawal_rejected
  amount DECIMAL(12,2) NOT NULL,
  balance_before DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  performed_by UUID REFERENCES users(id), -- admin who performed action (null for user actions)
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_wallet_audit_user ON wallet_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_audit_action ON wallet_audit_log(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_audit_reference ON wallet_audit_log(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_wallet_audit_admin ON wallet_audit_log(performed_by) WHERE performed_by IS NOT NULL;

-- Enable RLS
ALTER TABLE wallet_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "admin_view_audit_log" ON wallet_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "user_view_own_audit" ON wallet_audit_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- 2. BALANCE RECONCILIATION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS wallet_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_balance DECIMAL(12,2) NOT NULL,
  calculated_balance DECIMAL(12,2) NOT NULL,
  discrepancy DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
  resolved_by UUID REFERENCES users(id),
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_status ON wallet_reconciliation(status, created_at DESC);

-- Enable RLS
ALTER TABLE wallet_reconciliation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_reconciliation" ON wallet_reconciliation
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- =====================================================
-- 3. AUDIT LOG TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION log_wallet_audit(
  p_user_id UUID,
  p_action_type VARCHAR(50),
  p_amount DECIMAL(12,2),
  p_balance_before DECIMAL(12,2),
  p_balance_after DECIMAL(12,2),
  p_reference_type VARCHAR(50) DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_performed_by UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO wallet_audit_log (
    user_id, action_type, amount, balance_before, balance_after,
    reference_type, reference_id, performed_by, metadata
  )
  VALUES (
    p_user_id, p_action_type, p_amount, p_balance_before, p_balance_after,
    p_reference_type, p_reference_id, COALESCE(p_performed_by, auth.uid()), p_metadata
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. ENHANCED ADD_WALLET_TRANSACTION WITH AUDIT
-- =====================================================

CREATE OR REPLACE FUNCTION add_wallet_transaction_with_audit(
  p_user_id UUID,
  p_type VARCHAR(20),
  p_amount DECIMAL(12,2),
  p_description TEXT DEFAULT NULL,
  p_reference_type VARCHAR(50) DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  transaction_id UUID,
  new_balance DECIMAL(12,2),
  message TEXT
) AS $$
DECLARE
  v_wallet_id UUID;
  v_balance_before DECIMAL(12,2);
  v_balance_after DECIMAL(12,2);
  v_transaction_id UUID;
  v_is_credit BOOLEAN;
BEGIN
  -- Determine if credit or debit
  v_is_credit := p_type IN ('topup', 'refund', 'cashback', 'referral', 'promo');
  
  -- Get current balance with lock
  SELECT id, balance INTO v_wallet_id, v_balance_before
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Auto-create wallet if not exists
  IF v_wallet_id IS NULL THEN
    INSERT INTO user_wallets (user_id, balance, total_earned, total_spent)
    VALUES (p_user_id, 0, 0, 0)
    RETURNING id, balance INTO v_wallet_id, v_balance_before;
  END IF;
  
  -- Check sufficient balance for debit
  IF NOT v_is_credit AND v_balance_before < p_amount THEN
    RETURN QUERY SELECT false, NULL::UUID, v_balance_before, 'ยอดเงินไม่เพียงพอ'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate new balance
  IF v_is_credit THEN
    v_balance_after := v_balance_before + p_amount;
  ELSE
    v_balance_after := v_balance_before - p_amount;
  END IF;
  
  -- Update wallet balance
  UPDATE user_wallets
  SET balance = v_balance_after,
      total_earned = CASE WHEN v_is_credit THEN total_earned + p_amount ELSE total_earned END,
      total_spent = CASE WHEN NOT v_is_credit THEN total_spent + p_amount ELSE total_spent END,
      updated_at = NOW()
  WHERE id = v_wallet_id;
  
  -- Create transaction record
  INSERT INTO wallet_transactions (
    user_id, type, amount, balance_before, balance_after,
    description, reference_type, reference_id, status
  )
  VALUES (
    p_user_id, p_type, 
    CASE WHEN v_is_credit THEN p_amount ELSE -p_amount END,
    v_balance_before, v_balance_after,
    p_description, p_reference_type, p_reference_id, 'completed'
  )
  RETURNING id INTO v_transaction_id;
  
  -- Log to audit
  PERFORM log_wallet_audit(
    p_user_id,
    p_type,
    p_amount,
    v_balance_before,
    v_balance_after,
    p_reference_type,
    p_reference_id,
    NULL,
    jsonb_build_object('transaction_id', v_transaction_id, 'description', p_description)
  );
  
  RETURN QUERY SELECT true, v_transaction_id, v_balance_after, 'สำเร็จ'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. BALANCE RECONCILIATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION check_wallet_balance_integrity(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  wallet_balance DECIMAL(12,2),
  calculated_balance DECIMAL(12,2),
  discrepancy DECIMAL(12,2),
  has_issue BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH calculated AS (
    SELECT 
      wt.user_id,
      SUM(wt.amount) as calc_balance
    FROM wallet_transactions wt
    WHERE wt.status = 'completed'
      AND (p_user_id IS NULL OR wt.user_id = p_user_id)
    GROUP BY wt.user_id
  )
  SELECT 
    uw.user_id,
    uw.balance as wallet_balance,
    COALESCE(c.calc_balance, 0) as calculated_balance,
    uw.balance - COALESCE(c.calc_balance, 0) as discrepancy,
    ABS(uw.balance - COALESCE(c.calc_balance, 0)) > 0.01 as has_issue
  FROM user_wallets uw
  LEFT JOIN calculated c ON uw.user_id = c.user_id
  WHERE p_user_id IS NULL OR uw.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. DAILY RECONCILIATION JOB (to be called by cron)
-- =====================================================

CREATE OR REPLACE FUNCTION run_daily_wallet_reconciliation()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_record RECORD;
BEGIN
  FOR v_record IN 
    SELECT * FROM check_wallet_balance_integrity()
    WHERE has_issue = true
  LOOP
    INSERT INTO wallet_reconciliation (
      user_id, wallet_balance, calculated_balance, discrepancy
    )
    VALUES (
      v_record.user_id, v_record.wallet_balance, 
      v_record.calculated_balance, v_record.discrepancy
    )
    ON CONFLICT DO NOTHING;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. FRAUD DETECTION - SUSPICIOUS ACTIVITY ALERTS
-- =====================================================

CREATE TABLE IF NOT EXISTS wallet_fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  -- rapid_topup, large_withdrawal, unusual_pattern, balance_manipulation
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
  resolved_by UUID REFERENCES users(id),
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON wallet_fraud_alerts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user ON wallet_fraud_alerts(user_id);

-- Enable RLS
ALTER TABLE wallet_fraud_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_fraud_alerts" ON wallet_fraud_alerts
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- =====================================================
-- 8. FRAUD DETECTION TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION detect_wallet_fraud()
RETURNS TRIGGER AS $$
DECLARE
  v_recent_topups INTEGER;
  v_daily_total DECIMAL(12,2);
BEGIN
  -- Check for rapid topup requests (more than 5 in 1 hour)
  IF TG_TABLE_NAME = 'topup_requests' AND NEW.status = 'pending' THEN
    SELECT COUNT(*) INTO v_recent_topups
    FROM topup_requests
    WHERE user_id = NEW.user_id
      AND created_at > NOW() - INTERVAL '1 hour';
    
    IF v_recent_topups > 5 THEN
      INSERT INTO wallet_fraud_alerts (user_id, alert_type, severity, description, metadata)
      VALUES (
        NEW.user_id, 'rapid_topup', 'high',
        'มีคำขอเติมเงินมากกว่า 5 ครั้งใน 1 ชั่วโมง',
        jsonb_build_object('count', v_recent_topups, 'latest_request_id', NEW.id)
      );
    END IF;
  END IF;
  
  -- Check for large withdrawal (more than 50,000 THB)
  IF TG_TABLE_NAME = 'customer_withdrawals' AND NEW.amount > 50000 THEN
    INSERT INTO wallet_fraud_alerts (user_id, alert_type, severity, description, metadata)
    VALUES (
      NEW.user_id, 'large_withdrawal', 'medium',
      'คำขอถอนเงินจำนวนมาก: ' || NEW.amount || ' บาท',
      jsonb_build_object('amount', NEW.amount, 'withdrawal_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_detect_topup_fraud ON topup_requests;
CREATE TRIGGER trigger_detect_topup_fraud
  AFTER INSERT ON topup_requests
  FOR EACH ROW EXECUTE FUNCTION detect_wallet_fraud();

DROP TRIGGER IF EXISTS trigger_detect_withdrawal_fraud ON customer_withdrawals;
CREATE TRIGGER trigger_detect_withdrawal_fraud
  AFTER INSERT ON customer_withdrawals
  FOR EACH ROW EXECUTE FUNCTION detect_wallet_fraud();

-- =====================================================
-- 9. ADMIN WALLET STATISTICS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_wallet_admin_stats()
RETURNS TABLE (
  total_wallets BIGINT,
  total_balance DECIMAL(14,2),
  pending_topups BIGINT,
  pending_topup_amount DECIMAL(14,2),
  pending_withdrawals BIGINT,
  pending_withdrawal_amount DECIMAL(14,2),
  today_transactions BIGINT,
  today_volume DECIMAL(14,2),
  open_fraud_alerts BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM user_wallets)::BIGINT,
    (SELECT COALESCE(SUM(balance), 0) FROM user_wallets)::DECIMAL(14,2),
    (SELECT COUNT(*) FROM topup_requests WHERE status = 'pending')::BIGINT,
    (SELECT COALESCE(SUM(amount), 0) FROM topup_requests WHERE status = 'pending')::DECIMAL(14,2),
    (SELECT COUNT(*) FROM customer_withdrawals WHERE status = 'pending')::BIGINT,
    (SELECT COALESCE(SUM(amount), 0) FROM customer_withdrawals WHERE status = 'pending')::DECIMAL(14,2),
    (SELECT COUNT(*) FROM wallet_transactions WHERE created_at >= CURRENT_DATE)::BIGINT,
    (SELECT COALESCE(SUM(ABS(amount)), 0) FROM wallet_transactions WHERE created_at >= CURRENT_DATE)::DECIMAL(14,2),
    (SELECT COUNT(*) FROM wallet_fraud_alerts WHERE status = 'open')::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. CUSTOMER WALLET SUMMARY FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_customer_wallet_summary(p_user_id UUID)
RETURNS TABLE (
  balance DECIMAL(12,2),
  total_earned DECIMAL(12,2),
  total_spent DECIMAL(12,2),
  pending_topup DECIMAL(12,2),
  pending_withdrawal DECIMAL(12,2),
  available_balance DECIMAL(12,2),
  recent_transactions JSON,
  pending_requests JSON
) AS $$
DECLARE
  v_balance DECIMAL(12,2);
  v_earned DECIMAL(12,2);
  v_spent DECIMAL(12,2);
  v_pending_topup DECIMAL(12,2);
  v_pending_withdrawal DECIMAL(12,2);
BEGIN
  -- Get wallet balance
  SELECT COALESCE(uw.balance, 0), COALESCE(uw.total_earned, 0), COALESCE(uw.total_spent, 0)
  INTO v_balance, v_earned, v_spent
  FROM user_wallets uw
  WHERE uw.user_id = p_user_id;
  
  -- Get pending topup amount
  SELECT COALESCE(SUM(amount), 0) INTO v_pending_topup
  FROM topup_requests
  WHERE user_id = p_user_id AND status = 'pending';
  
  -- Get pending withdrawal amount
  SELECT COALESCE(SUM(amount), 0) INTO v_pending_withdrawal
  FROM customer_withdrawals
  WHERE user_id = p_user_id AND status IN ('pending', 'processing');
  
  RETURN QUERY
  SELECT
    COALESCE(v_balance, 0),
    COALESCE(v_earned, 0),
    COALESCE(v_spent, 0),
    v_pending_topup,
    v_pending_withdrawal,
    GREATEST(COALESCE(v_balance, 0) - v_pending_withdrawal, 0),
    (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT id, type, amount, description, created_at
        FROM wallet_transactions
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 10
      ) t
    ),
    (
      SELECT json_agg(row_to_json(r))
      FROM (
        SELECT id, 'topup' as request_type, amount, status, created_at
        FROM topup_requests
        WHERE user_id = p_user_id AND status = 'pending'
        UNION ALL
        SELECT id, 'withdrawal' as request_type, amount, status, created_at
        FROM customer_withdrawals
        WHERE user_id = p_user_id AND status IN ('pending', 'processing')
        ORDER BY created_at DESC
      ) r
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION log_wallet_audit TO authenticated;
GRANT EXECUTE ON FUNCTION add_wallet_transaction_with_audit TO authenticated;
GRANT EXECUTE ON FUNCTION check_wallet_balance_integrity TO authenticated;
GRANT EXECUTE ON FUNCTION run_daily_wallet_reconciliation TO authenticated;
GRANT EXECUTE ON FUNCTION get_wallet_admin_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_wallet_summary TO authenticated;

-- Enable realtime for audit tables
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_audit_log;
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_fraud_alerts;

-- =====================================================
-- 12. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE wallet_audit_log IS 'บันทึก audit log ทุก transaction ของ wallet เพื่อความโปร่งใสและตรวจสอบได้';
COMMENT ON TABLE wallet_reconciliation IS 'บันทึกการตรวจสอบความถูกต้องของยอดเงินใน wallet';
COMMENT ON TABLE wallet_fraud_alerts IS 'แจ้งเตือนกิจกรรมที่น่าสงสัยเกี่ยวกับ wallet';
COMMENT ON FUNCTION log_wallet_audit IS 'บันทึก audit log สำหรับทุก action ที่เกี่ยวกับ wallet';
COMMENT ON FUNCTION check_wallet_balance_integrity IS 'ตรวจสอบความถูกต้องของยอดเงินใน wallet เทียบกับ transactions';
COMMENT ON FUNCTION detect_wallet_fraud IS 'ตรวจจับกิจกรรมที่น่าสงสัยและสร้าง alert';
