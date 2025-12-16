-- =============================================
-- PROVIDER EARNINGS & WITHDRAWAL SYSTEM
-- =============================================
-- Feature: F27 - Provider Earnings Withdrawal
-- Feature: F28 - Provider Online Hours Tracking
-- =============================================

-- 1. Provider Bank Accounts
CREATE TABLE IF NOT EXISTS provider_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  bank_code VARCHAR(10) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider_id, account_number)
);

-- 2. Provider Withdrawals
CREATE TABLE IF NOT EXISTS provider_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES provider_bank_accounts(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 100), -- Minimum 100 THB
  fee DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  transaction_ref VARCHAR(100),
  processed_at TIMESTAMPTZ,
  failed_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Provider Online Sessions (for hours tracking)
CREATE TABLE IF NOT EXISTS provider_online_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER, -- Calculated on end
  trips_completed INTEGER DEFAULT 0,
  earnings DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Provider Daily Stats (aggregated)
CREATE TABLE IF NOT EXISTS provider_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  online_minutes INTEGER DEFAULT 0,
  trips_completed INTEGER DEFAULT 0,
  earnings DECIMAL(10,2) DEFAULT 0,
  withdrawals DECIMAL(10,2) DEFAULT 0,
  rating_avg DECIMAL(3,2),
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider_id, stat_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bank_accounts_provider ON provider_bank_accounts(provider_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_provider ON provider_withdrawals(provider_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON provider_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_online_sessions_provider ON provider_online_sessions(provider_id);
CREATE INDEX IF NOT EXISTS idx_online_sessions_date ON provider_online_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_daily_stats_provider ON provider_daily_stats(provider_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON provider_daily_stats(stat_date);

-- Enable RLS
ALTER TABLE provider_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_online_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_daily_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for dev)
CREATE POLICY "Allow all provider_bank_accounts" ON provider_bank_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all provider_withdrawals" ON provider_withdrawals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all provider_online_sessions" ON provider_online_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all provider_daily_stats" ON provider_daily_stats FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Start online session
CREATE OR REPLACE FUNCTION start_provider_session(p_provider_id UUID)
RETURNS UUID AS $func$
DECLARE
  v_session_id UUID;
BEGIN
  -- End any existing open session first
  UPDATE provider_online_sessions
  SET ended_at = now(),
      duration_minutes = EXTRACT(EPOCH FROM (now() - started_at)) / 60
  WHERE provider_id = p_provider_id AND ended_at IS NULL;
  
  -- Create new session
  INSERT INTO provider_online_sessions (provider_id, started_at)
  VALUES (p_provider_id, now())
  RETURNING id INTO v_session_id;
  
  RETURN v_session_id;
END;
$func$ LANGUAGE plpgsql;

-- End online session
CREATE OR REPLACE FUNCTION end_provider_session(p_provider_id UUID)
RETURNS INTEGER AS $func$
DECLARE
  v_duration INTEGER;
BEGIN
  UPDATE provider_online_sessions
  SET ended_at = now(),
      duration_minutes = EXTRACT(EPOCH FROM (now() - started_at)) / 60
  WHERE provider_id = p_provider_id AND ended_at IS NULL
  RETURNING duration_minutes INTO v_duration;
  
  -- Update daily stats
  INSERT INTO provider_daily_stats (provider_id, stat_date, online_minutes)
  VALUES (p_provider_id, CURRENT_DATE, COALESCE(v_duration, 0))
  ON CONFLICT (provider_id, stat_date)
  DO UPDATE SET 
    online_minutes = provider_daily_stats.online_minutes + COALESCE(v_duration, 0),
    updated_at = now();
  
  RETURN COALESCE(v_duration, 0);
END;
$func$ LANGUAGE plpgsql;

-- Get provider balance (total earnings - withdrawals)
CREATE OR REPLACE FUNCTION get_provider_balance(p_provider_id UUID)
RETURNS DECIMAL(12,2) AS $func$
DECLARE
  v_total_earnings DECIMAL(12,2);
  v_total_withdrawals DECIMAL(12,2);
BEGIN
  -- Get total earnings from completed rides
  SELECT COALESCE(SUM(COALESCE(final_fare, estimated_fare) * 0.8), 0) -- 80% to provider
  INTO v_total_earnings
  FROM ride_requests
  WHERE provider_id = p_provider_id AND status = 'completed';
  
  -- Get total completed withdrawals
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_withdrawals
  FROM provider_withdrawals
  WHERE provider_id = p_provider_id AND status = 'completed';
  
  RETURN v_total_earnings - v_total_withdrawals;
END;
$func$ LANGUAGE plpgsql;

-- Request withdrawal
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
BEGIN
  -- Check minimum amount
  IF p_amount < 100 THEN
    RETURN QUERY SELECT false, NULL::UUID, 'จำนวนเงินขั้นต่ำ 100 บาท'::TEXT;
    RETURN;
  END IF;
  
  -- Check balance
  v_balance := get_provider_balance(p_provider_id);
  IF v_balance < p_amount THEN
    RETURN QUERY SELECT false, NULL::UUID, ('ยอดเงินไม่เพียงพอ (คงเหลือ ' || v_balance || ' บาท)')::TEXT;
    RETURN;
  END IF;
  
  -- Calculate net amount
  v_net_amount := p_amount - v_fee;
  
  -- Create withdrawal request
  INSERT INTO provider_withdrawals (provider_id, bank_account_id, amount, fee, net_amount, status)
  VALUES (p_provider_id, p_bank_account_id, p_amount, v_fee, v_net_amount, 'pending')
  RETURNING id INTO v_withdrawal_id;
  
  RETURN QUERY SELECT true, v_withdrawal_id, 'ส่งคำขอถอนเงินสำเร็จ'::TEXT;
END;
$func$ LANGUAGE plpgsql;

-- Get provider earnings summary
CREATE OR REPLACE FUNCTION get_provider_earnings_summary(p_provider_id UUID)
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
) AS $func$
BEGIN
  RETURN QUERY
  SELECT
    get_provider_balance(p_provider_id) as available_balance,
    COALESCE((SELECT SUM(amount) FROM provider_withdrawals WHERE provider_id = p_provider_id AND status = 'pending'), 0)::DECIMAL(12,2) as pending_withdrawals,
    COALESCE((SELECT SUM(COALESCE(final_fare, estimated_fare) * 0.8) FROM ride_requests WHERE provider_id = p_provider_id AND status = 'completed'), 0)::DECIMAL(12,2) as total_earnings,
    COALESCE((SELECT SUM(amount) FROM provider_withdrawals WHERE provider_id = p_provider_id AND status = 'completed'), 0)::DECIMAL(12,2) as total_withdrawn,
    COALESCE((SELECT SUM(COALESCE(final_fare, estimated_fare) * 0.8) FROM ride_requests WHERE provider_id = p_provider_id AND status = 'completed' AND DATE(completed_at) = CURRENT_DATE), 0)::DECIMAL(10,2) as today_earnings,
    COALESCE((SELECT COUNT(*) FROM ride_requests WHERE provider_id = p_provider_id AND status = 'completed' AND DATE(completed_at) = CURRENT_DATE), 0)::INTEGER as today_trips,
    COALESCE((SELECT online_minutes FROM provider_daily_stats WHERE provider_id = p_provider_id AND stat_date = CURRENT_DATE), 0)::INTEGER as today_online_minutes,
    COALESCE((SELECT SUM(COALESCE(final_fare, estimated_fare) * 0.8) FROM ride_requests WHERE provider_id = p_provider_id AND status = 'completed' AND completed_at >= CURRENT_DATE - INTERVAL '7 days'), 0)::DECIMAL(10,2) as week_earnings,
    COALESCE((SELECT COUNT(*) FROM ride_requests WHERE provider_id = p_provider_id AND status = 'completed' AND completed_at >= CURRENT_DATE - INTERVAL '7 days'), 0)::INTEGER as week_trips,
    COALESCE((SELECT SUM(COALESCE(final_fare, estimated_fare) * 0.8) FROM ride_requests WHERE provider_id = p_provider_id AND status = 'completed' AND completed_at >= DATE_TRUNC('month', CURRENT_DATE)), 0)::DECIMAL(10,2) as month_earnings,
    COALESCE((SELECT COUNT(*) FROM ride_requests WHERE provider_id = p_provider_id AND status = 'completed' AND completed_at >= DATE_TRUNC('month', CURRENT_DATE)), 0)::INTEGER as month_trips;
END;
$func$ LANGUAGE plpgsql;

-- Get weekly online hours
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
$func$ LANGUAGE plpgsql;

-- Trigger to update daily stats when ride completes
CREATE OR REPLACE FUNCTION update_provider_daily_stats_on_ride()
RETURNS TRIGGER AS $func$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.provider_id IS NOT NULL THEN
    INSERT INTO provider_daily_stats (provider_id, stat_date, trips_completed, earnings)
    VALUES (NEW.provider_id, CURRENT_DATE, 1, COALESCE(NEW.final_fare, NEW.estimated_fare) * 0.8)
    ON CONFLICT (provider_id, stat_date)
    DO UPDATE SET 
      trips_completed = provider_daily_stats.trips_completed + 1,
      earnings = provider_daily_stats.earnings + COALESCE(NEW.final_fare, NEW.estimated_fare) * 0.8,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_provider_stats ON ride_requests;
CREATE TRIGGER trigger_update_provider_stats
  AFTER UPDATE ON ride_requests
  FOR EACH ROW EXECUTE FUNCTION update_provider_daily_stats_on_ride();

-- Grant permissions
GRANT ALL ON provider_bank_accounts TO anon, authenticated;
GRANT ALL ON provider_withdrawals TO anon, authenticated;
GRANT ALL ON provider_online_sessions TO anon, authenticated;
GRANT ALL ON provider_daily_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION start_provider_session TO anon, authenticated;
GRANT EXECUTE ON FUNCTION end_provider_session TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_provider_balance TO anon, authenticated;
GRANT EXECUTE ON FUNCTION request_withdrawal TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_provider_earnings_summary TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_provider_weekly_hours TO anon, authenticated;
