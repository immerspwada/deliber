-- Migration: 064_provider_earnings_v2.sql
-- Feature: F27/F28 - Enhanced Provider Earnings Management
-- Description: Detailed earnings tracking, bonuses, and payout management

-- =====================================================
-- 1. Provider Earnings Details
-- =====================================================
CREATE TABLE IF NOT EXISTS provider_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  request_id UUID,
  request_type TEXT CHECK (request_type IN ('ride', 'delivery', 'shopping', 'queue', 'moving', 'laundry')),
  
  -- Earnings breakdown
  base_fare NUMERIC(10,2) DEFAULT 0,
  distance_fare NUMERIC(10,2) DEFAULT 0,
  time_fare NUMERIC(10,2) DEFAULT 0,
  surge_amount NUMERIC(10,2) DEFAULT 0,
  tip_amount NUMERIC(10,2) DEFAULT 0,
  bonus_amount NUMERIC(10,2) DEFAULT 0,
  
  -- Deductions
  platform_fee NUMERIC(10,2) DEFAULT 0,
  platform_fee_pct NUMERIC(5,4) DEFAULT 0.20,
  other_deductions NUMERIC(10,2) DEFAULT 0,
  
  -- Net
  gross_earnings NUMERIC(10,2) DEFAULT 0,
  net_earnings NUMERIC(10,2) DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'withdrawn', 'held')),
  available_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_earnings_provider ON provider_earnings(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_earnings_date ON provider_earnings(created_at);
CREATE INDEX IF NOT EXISTS idx_provider_earnings_status ON provider_earnings(status);

-- =====================================================
-- 2. Provider Bonuses
-- =====================================================
CREATE TABLE IF NOT EXISTS provider_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  bonus_type TEXT NOT NULL CHECK (bonus_type IN ('signup', 'referral', 'quest', 'streak', 'peak_hour', 'rating', 'loyalty', 'special')),
  bonus_name TEXT NOT NULL,
  bonus_name_th TEXT,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  
  -- Requirements
  requirements JSONB DEFAULT '{}',
  progress JSONB DEFAULT '{}',
  is_completed BOOLEAN DEFAULT FALSE,
  
  -- Validity
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
  completed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_bonuses_provider ON provider_bonuses(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_bonuses_type ON provider_bonuses(bonus_type);
CREATE INDEX IF NOT EXISTS idx_provider_bonuses_status ON provider_bonuses(status);

-- =====================================================
-- 3. Payout Schedules
-- =====================================================
CREATE TABLE IF NOT EXISTS payout_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'biweekly', 'monthly', 'instant')),
  day_of_week INTEGER, -- 0-6 for weekly
  day_of_month INTEGER, -- 1-31 for monthly
  min_amount NUMERIC(10,2) DEFAULT 100,
  fee_amount NUMERIC(10,2) DEFAULT 0,
  fee_percentage NUMERIC(5,4) DEFAULT 0,
  processing_days INTEGER DEFAULT 1,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default schedules
INSERT INTO payout_schedules (name, schedule_type, min_amount, fee_amount, is_default, is_active) VALUES
('ถอนทันที', 'instant', 100, 15, false, true),
('ถอนรายวัน', 'daily', 100, 0, true, true),
('ถอนรายสัปดาห์', 'weekly', 500, 0, false, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. Provider Payout Preferences
-- =====================================================
CREATE TABLE IF NOT EXISTS provider_payout_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE UNIQUE,
  schedule_id UUID REFERENCES payout_schedules(id),
  auto_withdraw BOOLEAN DEFAULT FALSE,
  auto_withdraw_threshold NUMERIC(10,2) DEFAULT 1000,
  preferred_bank_account_id UUID REFERENCES provider_bank_accounts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. Earnings Summary View
-- =====================================================
CREATE OR REPLACE VIEW provider_earnings_summary AS
SELECT 
  pe.provider_id,
  DATE(pe.created_at) as date,
  COUNT(*) as total_trips,
  SUM(pe.gross_earnings) as gross_earnings,
  SUM(pe.platform_fee) as platform_fees,
  SUM(pe.tip_amount) as tips,
  SUM(pe.bonus_amount) as bonuses,
  SUM(pe.net_earnings) as net_earnings,
  SUM(pe.net_earnings) FILTER (WHERE pe.status = 'available') as available_balance,
  SUM(pe.net_earnings) FILTER (WHERE pe.status = 'pending') as pending_balance
FROM provider_earnings pe
GROUP BY pe.provider_id, DATE(pe.created_at);

-- =====================================================
-- 6. Enable RLS
-- =====================================================
ALTER TABLE provider_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_payout_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Provider read own earnings" ON provider_earnings
  FOR SELECT TO authenticated
  USING (provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid()));

CREATE POLICY "Admin read all earnings" ON provider_earnings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Provider read own bonuses" ON provider_bonuses
  FOR SELECT TO authenticated
  USING (provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid()));

CREATE POLICY "Admin manage bonuses" ON provider_bonuses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Anyone read payout_schedules" ON payout_schedules
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Provider manage own payout_preferences" ON provider_payout_preferences
  FOR ALL TO authenticated
  USING (provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid()));

-- =====================================================
-- 7. Functions
-- =====================================================

-- Record earnings from completed trip
CREATE OR REPLACE FUNCTION record_provider_earnings(
  p_provider_id UUID,
  p_request_id UUID,
  p_request_type TEXT,
  p_base_fare NUMERIC,
  p_distance_fare NUMERIC DEFAULT 0,
  p_time_fare NUMERIC DEFAULT 0,
  p_surge_amount NUMERIC DEFAULT 0,
  p_tip_amount NUMERIC DEFAULT 0,
  p_platform_fee_pct NUMERIC DEFAULT 0.20
) RETURNS UUID AS $$
DECLARE
  v_earnings_id UUID;
  v_gross NUMERIC;
  v_platform_fee NUMERIC;
  v_net NUMERIC;
BEGIN
  v_gross := p_base_fare + p_distance_fare + p_time_fare + p_surge_amount + p_tip_amount;
  v_platform_fee := (p_base_fare + p_distance_fare + p_time_fare + p_surge_amount) * p_platform_fee_pct;
  v_net := v_gross - v_platform_fee;
  
  INSERT INTO provider_earnings (
    provider_id, request_id, request_type,
    base_fare, distance_fare, time_fare, surge_amount, tip_amount,
    platform_fee, platform_fee_pct,
    gross_earnings, net_earnings,
    status, available_at
  ) VALUES (
    p_provider_id, p_request_id, p_request_type,
    p_base_fare, p_distance_fare, p_time_fare, p_surge_amount, p_tip_amount,
    v_platform_fee, p_platform_fee_pct,
    v_gross, v_net,
    'pending', NOW() + INTERVAL '24 hours'
  )
  RETURNING id INTO v_earnings_id;
  
  RETURN v_earnings_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get provider earnings summary
CREATE OR REPLACE FUNCTION get_provider_earnings_summary(
  p_provider_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
) RETURNS TABLE (
  total_trips BIGINT,
  gross_earnings NUMERIC,
  platform_fees NUMERIC,
  tips NUMERIC,
  bonuses NUMERIC,
  net_earnings NUMERIC,
  available_balance NUMERIC,
  pending_balance NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_trips,
    COALESCE(SUM(pe.gross_earnings), 0) as gross_earnings,
    COALESCE(SUM(pe.platform_fee), 0) as platform_fees,
    COALESCE(SUM(pe.tip_amount), 0) as tips,
    COALESCE(SUM(pe.bonus_amount), 0) as bonuses,
    COALESCE(SUM(pe.net_earnings), 0) as net_earnings,
    COALESCE(SUM(pe.net_earnings) FILTER (WHERE pe.status = 'available'), 0) as available_balance,
    COALESCE(SUM(pe.net_earnings) FILTER (WHERE pe.status = 'pending'), 0) as pending_balance
  FROM provider_earnings pe
  WHERE pe.provider_id = p_provider_id
    AND (p_start_date IS NULL OR DATE(pe.created_at) >= p_start_date)
    AND (p_end_date IS NULL OR DATE(pe.created_at) <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get daily earnings breakdown
CREATE OR REPLACE FUNCTION get_daily_earnings(
  p_provider_id UUID,
  p_days INTEGER DEFAULT 7
) RETURNS TABLE (
  date DATE,
  trips BIGINT,
  gross_earnings NUMERIC,
  net_earnings NUMERIC,
  tips NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH dates AS (
    SELECT generate_series(
      CURRENT_DATE - (p_days - 1),
      CURRENT_DATE,
      '1 day'::INTERVAL
    )::DATE as d
  )
  SELECT 
    dates.d as date,
    COALESCE(COUNT(pe.id), 0)::BIGINT as trips,
    COALESCE(SUM(pe.gross_earnings), 0) as gross_earnings,
    COALESCE(SUM(pe.net_earnings), 0) as net_earnings,
    COALESCE(SUM(pe.tip_amount), 0) as tips
  FROM dates
  LEFT JOIN provider_earnings pe ON DATE(pe.created_at) = dates.d AND pe.provider_id = p_provider_id
  GROUP BY dates.d
  ORDER BY dates.d;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create bonus for provider
CREATE OR REPLACE FUNCTION create_provider_bonus(
  p_provider_id UUID,
  p_bonus_type TEXT,
  p_bonus_name TEXT,
  p_amount NUMERIC,
  p_requirements JSONB DEFAULT '{}',
  p_valid_until TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_bonus_id UUID;
BEGIN
  INSERT INTO provider_bonuses (
    provider_id, bonus_type, bonus_name, amount,
    requirements, valid_until
  ) VALUES (
    p_provider_id, p_bonus_type, p_bonus_name, p_amount,
    p_requirements, p_valid_until
  )
  RETURNING id INTO v_bonus_id;
  
  -- Notify provider
  INSERT INTO user_notifications (user_id, type, title, message, action_url)
  SELECT 
    sp.user_id,
    'bonus',
    'โบนัสใหม่!',
    format('คุณได้รับโบนัส %s มูลค่า %.0f บาท', p_bonus_name, p_amount),
    '/provider/earnings'
  FROM service_providers sp WHERE sp.id = p_provider_id;
  
  RETURN v_bonus_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete bonus
CREATE OR REPLACE FUNCTION complete_provider_bonus(p_bonus_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_bonus provider_bonuses%ROWTYPE;
BEGIN
  SELECT * INTO v_bonus FROM provider_bonuses WHERE id = p_bonus_id;
  
  IF v_bonus.id IS NULL OR v_bonus.is_completed THEN
    RETURN FALSE;
  END IF;
  
  -- Mark as completed
  UPDATE provider_bonuses
  SET is_completed = true, status = 'completed', completed_at = NOW()
  WHERE id = p_bonus_id;
  
  -- Add to earnings
  INSERT INTO provider_earnings (
    provider_id, bonus_amount, gross_earnings, net_earnings,
    status, available_at
  ) VALUES (
    v_bonus.provider_id, v_bonus.amount, v_bonus.amount, v_bonus.amount,
    'available', NOW()
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Process pending earnings (make available after 24h)
CREATE OR REPLACE FUNCTION process_pending_earnings()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE provider_earnings
  SET status = 'available'
  WHERE status = 'pending' AND available_at <= NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE provider_earnings IS 'Detailed earnings for each trip/service';
COMMENT ON TABLE provider_bonuses IS 'Bonus programs for providers';
COMMENT ON TABLE payout_schedules IS 'Available payout schedule options';
COMMENT ON TABLE provider_payout_preferences IS 'Provider payout preferences';
