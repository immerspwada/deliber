-- =============================================
-- PROVIDER WALLET SYSTEM V2 (for providers_v2)
-- =============================================
-- Migration: 292_provider_wallet_system_v2.sql
-- Date: 2026-01-16
-- 
-- Role Impact (3 บริบท):
-- 👤 Customer: ไม่เกี่ยวข้องโดยตรง (แยกจาก customer wallet)
-- 🚗 Provider: ดูยอดเงิน, ถอนเงิน, จัดการบัญชีธนาคาร
-- 👑 Admin: อนุมัติ/ปฏิเสธการถอนเงิน, ดูสถิติ
-- =============================================

BEGIN;

-- 1. Provider Bank Accounts V2 (for providers_v2)
CREATE TABLE IF NOT EXISTS provider_bank_accounts_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers_v2(id) ON DELETE CASCADE,
  bank_code VARCHAR(10) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, account_number)
);

-- 2. Provider Withdrawals V2 (for providers_v2)
CREATE TABLE IF NOT EXISTS provider_withdrawals_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_uid VARCHAR(20) UNIQUE,
  provider_id UUID NOT NULL REFERENCES providers_v2(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES provider_bank_accounts_v2(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 100),
  fee DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  transaction_ref VARCHAR(100),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  failed_reason TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Provider Online Sessions V2 (for providers_v2)
CREATE TABLE IF NOT EXISTS provider_online_sessions_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers_v2(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  trips_completed INTEGER DEFAULT 0,
  earnings DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Provider Daily Stats V2 (for providers_v2)
CREATE TABLE IF NOT EXISTS provider_daily_stats_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers_v2(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  online_minutes INTEGER DEFAULT 0,
  trips_completed INTEGER DEFAULT 0,
  earnings DECIMAL(10,2) DEFAULT 0,
  withdrawals DECIMAL(10,2) DEFAULT 0,
  rating_avg DECIMAL(3,2),
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, stat_date)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_bank_accounts_v2_provider ON provider_bank_accounts_v2(provider_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_v2_provider ON provider_withdrawals_v2(provider_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_v2_status ON provider_withdrawals_v2(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_v2_created ON provider_withdrawals_v2(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_online_sessions_v2_provider ON provider_online_sessions_v2(provider_id);
CREATE INDEX IF NOT EXISTS idx_online_sessions_v2_date ON provider_online_sessions_v2(started_at);
CREATE INDEX IF NOT EXISTS idx_daily_stats_v2_provider ON provider_daily_stats_v2(provider_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_v2_date ON provider_daily_stats_v2(stat_date);

-- =============================================
-- ENABLE RLS
-- =============================================
ALTER TABLE provider_bank_accounts_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_withdrawals_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_online_sessions_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_daily_stats_v2 ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES (Dual-Role System)
-- =============================================

-- Provider Bank Accounts: Provider can manage own accounts
DROP POLICY IF EXISTS "provider_bank_accounts_v2_select" ON provider_bank_accounts_v2;
CREATE POLICY "provider_bank_accounts_v2_select" ON provider_bank_accounts_v2
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.id = provider_bank_accounts_v2.provider_id
      AND p.user_id = (SELECT auth.uid())
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "provider_bank_accounts_v2_insert" ON provider_bank_accounts_v2;
CREATE POLICY "provider_bank_accounts_v2_insert" ON provider_bank_accounts_v2
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.id = provider_bank_accounts_v2.provider_id
      AND p.user_id = (SELECT auth.uid())
      AND p.status IN ('approved', 'active')
    )
  );

DROP POLICY IF EXISTS "provider_bank_accounts_v2_update" ON provider_bank_accounts_v2;
CREATE POLICY "provider_bank_accounts_v2_update" ON provider_bank_accounts_v2
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.id = provider_bank_accounts_v2.provider_id
      AND p.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.id = provider_bank_accounts_v2.provider_id
      AND p.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "provider_bank_accounts_v2_delete" ON provider_bank_accounts_v2;
CREATE POLICY "provider_bank_accounts_v2_delete" ON provider_bank_accounts_v2
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.id = provider_bank_accounts_v2.provider_id
      AND p.user_id = (SELECT auth.uid())
    )
  );

-- Provider Withdrawals: Provider can view own, Admin can manage all
DROP POLICY IF EXISTS "provider_withdrawals_v2_select" ON provider_withdrawals_v2;
CREATE POLICY "provider_withdrawals_v2_select" ON provider_withdrawals_v2
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.id = provider_withdrawals_v2.provider_id
      AND p.user_id = (SELECT auth.uid())
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "provider_withdrawals_v2_insert" ON provider_withdrawals_v2;
CREATE POLICY "provider_withdrawals_v2_insert" ON provider_withdrawals_v2
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.id = provider_withdrawals_v2.provider_id
      AND p.user_id = (SELECT auth.uid())
      AND p.status IN ('approved', 'active')
    )
  );

DROP POLICY IF EXISTS "provider_withdrawals_v2_update" ON provider_withdrawals_v2;
CREATE POLICY "provider_withdrawals_v2_update" ON provider_withdrawals_v2
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin'))
  );

-- Provider Online Sessions: Provider can manage own
DROP POLICY IF EXISTS "provider_online_sessions_v2_all" ON provider_online_sessions_v2;
CREATE POLICY "provider_online_sessions_v2_all" ON provider_online_sessions_v2
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.id = provider_online_sessions_v2.provider_id
      AND p.user_id = (SELECT auth.uid())
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.id = provider_online_sessions_v2.provider_id
      AND p.user_id = (SELECT auth.uid())
    )
  );

-- Provider Daily Stats: Provider can view own, Admin can view all
DROP POLICY IF EXISTS "provider_daily_stats_v2_all" ON provider_daily_stats_v2;
CREATE POLICY "provider_daily_stats_v2_all" ON provider_daily_stats_v2
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.id = provider_daily_stats_v2.provider_id
      AND p.user_id = (SELECT auth.uid())
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.id = provider_daily_stats_v2.provider_id
      AND p.user_id = (SELECT auth.uid())
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin'))
  );

-- =============================================
-- FUNCTIONS
-- =============================================

-- Generate withdrawal UID
CREATE OR REPLACE FUNCTION generate_withdrawal_uid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.withdrawal_uid IS NULL THEN
    NEW.withdrawal_uid := 'WD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                          UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_withdrawal_uid ON provider_withdrawals_v2;
CREATE TRIGGER trigger_generate_withdrawal_uid
  BEFORE INSERT ON provider_withdrawals_v2
  FOR EACH ROW EXECUTE FUNCTION generate_withdrawal_uid();

-- Get provider balance V2 (for providers_v2)
CREATE OR REPLACE FUNCTION get_provider_balance_v2(p_provider_id UUID)
RETURNS DECIMAL(12,2) AS $$
DECLARE
  v_total_earnings DECIMAL(12,2);
  v_total_withdrawals DECIMAL(12,2);
  v_pending_withdrawals DECIMAL(12,2);
BEGIN
  -- Get total earnings from completed rides (80% to provider)
  SELECT COALESCE(SUM(COALESCE(final_fare, estimated_fare) * 0.8), 0)
  INTO v_total_earnings
  FROM ride_requests
  WHERE provider_id = p_provider_id AND status = 'completed';
  
  -- Get total completed withdrawals
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_withdrawals
  FROM provider_withdrawals_v2
  WHERE provider_id = p_provider_id AND status = 'completed';
  
  -- Get pending withdrawals
  SELECT COALESCE(SUM(amount), 0)
  INTO v_pending_withdrawals
  FROM provider_withdrawals_v2
  WHERE provider_id = p_provider_id AND status IN ('pending', 'processing');
  
  RETURN v_total_earnings - v_total_withdrawals - v_pending_withdrawals;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Request withdrawal V2
CREATE OR REPLACE FUNCTION request_withdrawal_v2(
  p_provider_id UUID,
  p_bank_account_id UUID,
  p_amount DECIMAL(12,2)
)
RETURNS TABLE (
  success BOOLEAN,
  withdrawal_id UUID,
  message TEXT
) AS $$
DECLARE
  v_balance DECIMAL(12,2);
  v_fee DECIMAL(10,2) := 0;
  v_net_amount DECIMAL(12,2);
  v_withdrawal_id UUID;
  v_user_id UUID;
BEGIN
  -- Verify provider owns this request (dual-role check)
  SELECT user_id INTO v_user_id FROM providers_v2 WHERE id = p_provider_id;
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RETURN QUERY SELECT false, NULL::UUID, 'ไม่มีสิทธิ์ดำเนินการ'::TEXT;
    RETURN;
  END IF;

  -- Check minimum amount
  IF p_amount < 100 THEN
    RETURN QUERY SELECT false, NULL::UUID, 'จำนวนเงินขั้นต่ำ 100 บาท'::TEXT;
    RETURN;
  END IF;
  
  -- Check balance
  v_balance := get_provider_balance_v2(p_provider_id);
  IF v_balance < p_amount THEN
    RETURN QUERY SELECT false, NULL::UUID, ('ยอดเงินไม่เพียงพอ (คงเหลือ ' || v_balance || ' บาท)')::TEXT;
    RETURN;
  END IF;
  
  -- Verify bank account belongs to provider
  IF NOT EXISTS (SELECT 1 FROM provider_bank_accounts_v2 WHERE id = p_bank_account_id AND provider_id = p_provider_id) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'บัญชีธนาคารไม่ถูกต้อง'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate net amount
  v_net_amount := p_amount - v_fee;
  
  -- Create withdrawal request
  INSERT INTO provider_withdrawals_v2 (provider_id, bank_account_id, amount, fee, net_amount, status)
  VALUES (p_provider_id, p_bank_account_id, p_amount, v_fee, v_net_amount, 'pending')
  RETURNING id INTO v_withdrawal_id;
  
  RETURN QUERY SELECT true, v_withdrawal_id, 'ส่งคำขอถอนเงินสำเร็จ'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get provider earnings summary V2
CREATE OR REPLACE FUNCTION get_provider_earnings_summary_v2(p_provider_id UUID)
RETURNS TABLE (
  available_balance DECIMAL(12,2),
  pending_withdrawals DECIMAL(12,2),
  total_earnings DECIMAL(12,2),
  total_withdrawn DECIMAL(12,2),
  today_earnings DECIMAL(10,2),
  today_trips INTEGER,
  today_online_minutes INTEGER,
  week_earnings DECIMAL(10,2),
  week_trips INTEGER,
  month_earnings DECIMAL(10,2),
  month_trips INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    get_provider_balance_v2(p_provider_id) as available_balance,
    COALESCE((SELECT SUM(amount) FROM provider_withdrawals_v2 WHERE provider_id = p_provider_id AND status IN ('pending', 'processing')), 0)::DECIMAL(12,2) as pending_withdrawals,
    COALESCE((SELECT SUM(COALESCE(final_fare, estimated_fare) * 0.8) FROM ride_requests WHERE provider_id = p_provider_id AND status = 'completed'), 0)::DECIMAL(12,2) as total_earnings,
    COALESCE((SELECT SUM(amount) FROM provider_withdrawals_v2 WHERE provider_id = p_provider_id AND status = 'completed'), 0)::DECIMAL(12,2) as total_withdrawn,
    COALESCE((SELECT SUM(COALESCE(final_fare, estimated_fare) * 0.8) FROM ride_requests WHERE provider_id = p_provider_id AND status = 'completed' AND DATE(completed_at) = CURRENT_DATE), 0)::DECIMAL(10,2) as today_earnings,
    COALESCE((SELECT COUNT(*) FROM ride_requests WHERE provider_id = p_provider_id AND status = 'completed' AND DATE(completed_at) = CURRENT_DATE), 0)::INTEGER as today_trips,
    COALESCE((SELECT online_minutes FROM provider_daily_stats_v2 WHERE provider_id = p_provider_id AND stat_date = CURRENT_DATE), 0)::INTEGER as today_online_minutes,
    COALESCE((SELECT SUM(COALESCE(final_fare, estimated_fare) * 0.8) FROM ride_requests WHERE provider_id = p_provider_id AND status = 'completed' AND completed_at >= CURRENT_DATE - INTERVAL '7 days'), 0)::DECIMAL(10,2) as week_earnings,
    COALESCE((SELECT COUNT(*) FROM ride_requests WHERE provider_id = p_provider_id AND status = 'completed' AND completed_at >= CURRENT_DATE - INTERVAL '7 days'), 0)::INTEGER as week_trips,
    COALESCE((SELECT SUM(COALESCE(final_fare, estimated_fare) * 0.8) FROM ride_requests WHERE provider_id = p_provider_id AND status = 'completed' AND completed_at >= DATE_TRUNC('month', CURRENT_DATE)), 0)::DECIMAL(10,2) as month_earnings,
    COALESCE((SELECT COUNT(*) FROM ride_requests WHERE provider_id = p_provider_id AND status = 'completed' AND completed_at >= DATE_TRUNC('month', CURRENT_DATE)), 0)::INTEGER as month_trips;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get provider weekly hours V2
CREATE OR REPLACE FUNCTION get_provider_weekly_hours_v2(p_provider_id UUID)
RETURNS TABLE (
  stat_date DATE,
  day_name VARCHAR(10),
  online_minutes INTEGER,
  trips INTEGER,
  earnings DECIMAL(10,2)
) AS $$
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
  LEFT JOIN provider_daily_stats_v2 s ON s.provider_id = p_provider_id AND s.stat_date = d.stat_date
  ORDER BY d.stat_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Start online session V2
CREATE OR REPLACE FUNCTION start_provider_session_v2(p_provider_id UUID)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
  v_user_id UUID;
BEGIN
  -- Verify provider owns this request
  SELECT user_id INTO v_user_id FROM providers_v2 WHERE id = p_provider_id;
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RETURN NULL;
  END IF;

  -- End any existing open session first
  UPDATE provider_online_sessions_v2
  SET ended_at = NOW(),
      duration_minutes = EXTRACT(EPOCH FROM (NOW() - started_at)) / 60
  WHERE provider_id = p_provider_id AND ended_at IS NULL;
  
  -- Create new session
  INSERT INTO provider_online_sessions_v2 (provider_id, started_at)
  VALUES (p_provider_id, NOW())
  RETURNING id INTO v_session_id;
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- End online session V2
CREATE OR REPLACE FUNCTION end_provider_session_v2(p_provider_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_duration INTEGER;
  v_user_id UUID;
BEGIN
  -- Verify provider owns this request
  SELECT user_id INTO v_user_id FROM providers_v2 WHERE id = p_provider_id;
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RETURN 0;
  END IF;

  UPDATE provider_online_sessions_v2
  SET ended_at = NOW(),
      duration_minutes = EXTRACT(EPOCH FROM (NOW() - started_at)) / 60
  WHERE provider_id = p_provider_id AND ended_at IS NULL
  RETURNING duration_minutes INTO v_duration;
  
  -- Update daily stats
  INSERT INTO provider_daily_stats_v2 (provider_id, stat_date, online_minutes)
  VALUES (p_provider_id, CURRENT_DATE, COALESCE(v_duration, 0))
  ON CONFLICT (provider_id, stat_date)
  DO UPDATE SET 
    online_minutes = provider_daily_stats_v2.online_minutes + COALESCE(v_duration, 0),
    updated_at = NOW();
  
  RETURN COALESCE(v_duration, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ADMIN FUNCTIONS
-- =============================================

-- Admin: Get all provider withdrawals
CREATE OR REPLACE FUNCTION admin_get_provider_withdrawals_v2(
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  withdrawal_uid VARCHAR(20),
  provider_id UUID,
  provider_name TEXT,
  provider_phone TEXT,
  provider_uid TEXT,
  amount DECIMAL(12,2),
  fee DECIMAL(10,2),
  net_amount DECIMAL(12,2),
  status VARCHAR(20),
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(20),
  bank_account_name VARCHAR(200),
  transaction_ref VARCHAR(100),
  admin_notes TEXT,
  failed_reason TEXT,
  created_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  processed_by_name TEXT
) AS $$
BEGIN
  -- Check admin access
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    w.id,
    w.withdrawal_uid,
    w.provider_id,
    (p.first_name || ' ' || p.last_name)::TEXT as provider_name,
    p.phone_number::TEXT as provider_phone,
    p.provider_uid::TEXT,
    w.amount,
    w.fee,
    w.net_amount,
    w.status,
    ba.bank_name,
    ba.account_number as bank_account_number,
    ba.account_name as bank_account_name,
    w.transaction_ref,
    w.admin_notes,
    w.failed_reason,
    w.created_at,
    w.processed_at,
    (SELECT (first_name || ' ' || last_name) FROM users WHERE id = w.processed_by)::TEXT as processed_by_name
  FROM provider_withdrawals_v2 w
  JOIN providers_v2 p ON w.provider_id = p.id
  LEFT JOIN provider_bank_accounts_v2 ba ON w.bank_account_id = ba.id
  WHERE (p_status IS NULL OR w.status = p_status)
  ORDER BY w.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: Count provider withdrawals
CREATE OR REPLACE FUNCTION admin_count_provider_withdrawals_v2(p_status TEXT DEFAULT NULL)
RETURNS BIGINT AS $$
DECLARE
  v_count BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM provider_withdrawals_v2 w
  WHERE (p_status IS NULL OR w.status = p_status);
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: Get withdrawal stats
CREATE OR REPLACE FUNCTION admin_get_provider_withdrawal_stats_v2()
RETURNS TABLE (
  total_count BIGINT,
  total_amount DECIMAL(14,2),
  pending_count BIGINT,
  pending_amount DECIMAL(14,2),
  completed_count BIGINT,
  completed_amount DECIMAL(14,2),
  failed_count BIGINT,
  failed_amount DECIMAL(14,2),
  today_count BIGINT,
  today_amount DECIMAL(14,2)
) AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_count,
    COALESCE(SUM(w.amount), 0)::DECIMAL(14,2) as total_amount,
    COUNT(*) FILTER (WHERE w.status = 'pending')::BIGINT as pending_count,
    COALESCE(SUM(w.amount) FILTER (WHERE w.status = 'pending'), 0)::DECIMAL(14,2) as pending_amount,
    COUNT(*) FILTER (WHERE w.status = 'completed')::BIGINT as completed_count,
    COALESCE(SUM(w.amount) FILTER (WHERE w.status = 'completed'), 0)::DECIMAL(14,2) as completed_amount,
    COUNT(*) FILTER (WHERE w.status = 'failed')::BIGINT as failed_count,
    COALESCE(SUM(w.amount) FILTER (WHERE w.status = 'failed'), 0)::DECIMAL(14,2) as failed_amount,
    COUNT(*) FILTER (WHERE w.created_at >= CURRENT_DATE)::BIGINT as today_count,
    COALESCE(SUM(w.amount) FILTER (WHERE w.created_at >= CURRENT_DATE), 0)::DECIMAL(14,2) as today_amount
  FROM provider_withdrawals_v2 w;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: Approve withdrawal
CREATE OR REPLACE FUNCTION admin_approve_provider_withdrawal_v2(
  p_withdrawal_id UUID,
  p_transaction_ref TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_withdrawal RECORD;
BEGIN
  -- Check admin access
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) THEN
    RETURN json_build_object('success', false, 'error', 'ไม่มีสิทธิ์ดำเนินการ');
  END IF;

  -- Get withdrawal
  SELECT * INTO v_withdrawal FROM provider_withdrawals_v2 WHERE id = p_withdrawal_id;
  
  IF v_withdrawal IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'ไม่พบคำขอถอนเงิน');
  END IF;
  
  IF v_withdrawal.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'คำขอนี้ไม่อยู่ในสถานะรอดำเนินการ');
  END IF;
  
  -- Update withdrawal
  UPDATE provider_withdrawals_v2
  SET 
    status = 'completed',
    transaction_ref = COALESCE(p_transaction_ref, 'TXN-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS')),
    admin_notes = p_admin_notes,
    processed_at = NOW(),
    processed_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_withdrawal_id;
  
  RETURN json_build_object('success', true, 'message', 'อนุมัติการถอนเงินสำเร็จ');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: Reject withdrawal
CREATE OR REPLACE FUNCTION admin_reject_provider_withdrawal_v2(
  p_withdrawal_id UUID,
  p_reason TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_withdrawal RECORD;
BEGIN
  -- Check admin access
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) THEN
    RETURN json_build_object('success', false, 'error', 'ไม่มีสิทธิ์ดำเนินการ');
  END IF;

  -- Get withdrawal
  SELECT * INTO v_withdrawal FROM provider_withdrawals_v2 WHERE id = p_withdrawal_id;
  
  IF v_withdrawal IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'ไม่พบคำขอถอนเงิน');
  END IF;
  
  IF v_withdrawal.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'คำขอนี้ไม่อยู่ในสถานะรอดำเนินการ');
  END IF;
  
  -- Update withdrawal
  UPDATE provider_withdrawals_v2
  SET 
    status = 'failed',
    failed_reason = COALESCE(p_reason, 'ถูกปฏิเสธโดยผู้ดูแลระบบ'),
    admin_notes = p_admin_notes,
    processed_at = NOW(),
    processed_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_withdrawal_id;
  
  RETURN json_build_object('success', true, 'message', 'ปฏิเสธการถอนเงินสำเร็จ');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update daily stats when ride completes (for providers_v2)
CREATE OR REPLACE FUNCTION update_provider_daily_stats_v2_on_ride()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.provider_id IS NOT NULL THEN
    -- Check if provider exists in providers_v2
    IF EXISTS (SELECT 1 FROM providers_v2 WHERE id = NEW.provider_id) THEN
      INSERT INTO provider_daily_stats_v2 (provider_id, stat_date, trips_completed, earnings)
      VALUES (NEW.provider_id, CURRENT_DATE, 1, COALESCE(NEW.final_fare, NEW.estimated_fare) * 0.8)
      ON CONFLICT (provider_id, stat_date)
      DO UPDATE SET 
        trips_completed = provider_daily_stats_v2.trips_completed + 1,
        earnings = provider_daily_stats_v2.earnings + COALESCE(NEW.final_fare, NEW.estimated_fare) * 0.8,
        updated_at = NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_provider_stats_v2 ON ride_requests;
CREATE TRIGGER trigger_update_provider_stats_v2
  AFTER UPDATE ON ride_requests
  FOR EACH ROW EXECUTE FUNCTION update_provider_daily_stats_v2_on_ride();

-- =============================================
-- GRANTS
-- =============================================
GRANT ALL ON provider_bank_accounts_v2 TO anon, authenticated;
GRANT ALL ON provider_withdrawals_v2 TO anon, authenticated;
GRANT ALL ON provider_online_sessions_v2 TO anon, authenticated;
GRANT ALL ON provider_daily_stats_v2 TO anon, authenticated;

GRANT EXECUTE ON FUNCTION get_provider_balance_v2 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION request_withdrawal_v2 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_provider_earnings_summary_v2 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_provider_weekly_hours_v2 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION start_provider_session_v2 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION end_provider_session_v2 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_provider_withdrawals_v2 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_count_provider_withdrawals_v2 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_provider_withdrawal_stats_v2 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_approve_provider_withdrawal_v2 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_reject_provider_withdrawal_v2 TO anon, authenticated;

COMMIT;
