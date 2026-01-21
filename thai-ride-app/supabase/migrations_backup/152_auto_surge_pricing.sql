-- =====================================================
-- Migration: 152_auto_surge_pricing.sql
-- Feature: F178 - Auto Surge Pricing System
-- =====================================================

-- Surge Pricing Rules Table
CREATE TABLE IF NOT EXISTS surge_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES service_zones(id) ON DELETE CASCADE,
  rule_name VARCHAR(100) NOT NULL,
  rule_name_th VARCHAR(100) NOT NULL,
  rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('demand', 'time', 'weather', 'event', 'manual')),
  conditions JSONB NOT NULL DEFAULT '{}',
  multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  max_multiplier DECIMAL(3,2) NOT NULL DEFAULT 2.5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Surge Pricing History Table
CREATE TABLE IF NOT EXISTS surge_pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES service_zones(id) ON DELETE CASCADE,
  applied_multiplier DECIMAL(3,2) NOT NULL,
  base_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  demand_ratio DECIMAL(5,2),
  pending_requests INTEGER,
  available_providers INTEGER,
  triggered_rules UUID[] DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_surge_rules_zone ON surge_pricing_rules(zone_id);
CREATE INDEX IF NOT EXISTS idx_surge_rules_active ON surge_pricing_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_surge_history_zone ON surge_pricing_history(zone_id);
CREATE INDEX IF NOT EXISTS idx_surge_history_recorded ON surge_pricing_history(recorded_at);

-- RLS Policies
ALTER TABLE surge_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE surge_pricing_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_surge_rules_all" ON surge_pricing_rules;
CREATE POLICY "admin_surge_rules_all" ON surge_pricing_rules FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_surge_history_all" ON surge_pricing_history;
CREATE POLICY "admin_surge_history_all" ON surge_pricing_history FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Insert default surge rules
INSERT INTO surge_pricing_rules (rule_name, rule_name_th, rule_type, conditions, multiplier, max_multiplier, priority) VALUES
  ('Morning Rush Hour', 'ชั่วโมงเร่งด่วนเช้า', 'time', '{"time_start": "07:00", "time_end": "09:00", "days_of_week": [1,2,3,4,5]}', 1.3, 1.5, 10),
  ('Evening Rush Hour', 'ชั่วโมงเร่งด่วนเย็น', 'time', '{"time_start": "17:00", "time_end": "20:00", "days_of_week": [1,2,3,4,5]}', 1.3, 1.5, 10),
  ('Late Night', 'ดึก', 'time', '{"time_start": "23:00", "time_end": "05:00"}', 1.2, 1.5, 5),
  ('High Demand', 'Demand สูง', 'demand', '{"demand_ratio_min": 3.0, "demand_ratio_max": 5.0}', 1.5, 2.0, 20),
  ('Very High Demand', 'Demand สูงมาก', 'demand', '{"demand_ratio_min": 5.0}', 2.0, 2.5, 25)
ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON surge_pricing_rules TO anon, authenticated;
GRANT SELECT, INSERT ON surge_pricing_history TO anon, authenticated;
