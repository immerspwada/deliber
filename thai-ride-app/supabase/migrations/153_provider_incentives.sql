-- Migration: 153_provider_incentives.sql - Provider Incentives System

CREATE TABLE IF NOT EXISTS provider_incentives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  name_th VARCHAR(100) NOT NULL,
  description TEXT,
  incentive_type VARCHAR(20) NOT NULL CHECK (incentive_type IN ('trips', 'hours', 'rating', 'streak', 'referral')),
  target_value DECIMAL(10,2) NOT NULL,
  reward_amount DECIMAL(10,2) NOT NULL,
  reward_type VARCHAR(20) NOT NULL DEFAULT 'cash',
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  provider_types TEXT[] DEFAULT '{}',
  zones UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provider_incentive_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL,
  incentive_id UUID NOT NULL REFERENCES provider_incentives(id) ON DELETE CASCADE,
  current_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  target_value DECIMAL(10,2) NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, incentive_id)
);

CREATE INDEX IF NOT EXISTS idx_incentives_active ON provider_incentives(is_active);
CREATE INDEX IF NOT EXISTS idx_incentive_progress_provider ON provider_incentive_progress(provider_id);

ALTER TABLE provider_incentives ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_incentive_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incentives_all" ON provider_incentives FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "progress_all" ON provider_incentive_progress FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO provider_incentives (name, name_th, description, incentive_type, target_value, reward_amount, reward_type) VALUES
  ('Complete 50 Trips', 'ทำครบ 50 เที่ยว', 'รับโบนัสเมื่อทำครบ 50 เที่ยว', 'trips', 50, 500, 'cash'),
  ('Online 40 Hours', 'ออนไลน์ 40 ชั่วโมง', 'รับโบนัสเมื่อออนไลน์ครบ 40 ชม.', 'hours', 40, 300, 'cash'),
  ('7 Day Streak', 'ทำงานต่อเนื่อง 7 วัน', 'รับโบนัสเมื่อทำงานต่อเนื่อง 7 วัน', 'streak', 7, 400, 'cash')
ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON provider_incentives TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON provider_incentive_progress TO anon, authenticated;
