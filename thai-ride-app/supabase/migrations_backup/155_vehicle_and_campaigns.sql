-- Migration: 155_vehicle_and_campaigns.sql - Vehicle Management & Promo Campaigns

-- Vehicle Types
CREATE TABLE IF NOT EXISTS vehicle_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  name_th VARCHAR(50) NOT NULL,
  icon VARCHAR(50),
  base_fare DECIMAL(10,2) NOT NULL DEFAULT 25,
  per_km_rate DECIMAL(10,2) NOT NULL DEFAULT 7,
  per_minute_rate DECIMAL(10,2) NOT NULL DEFAULT 1,
  min_fare DECIMAL(10,2) NOT NULL DEFAULT 35,
  max_passengers INTEGER NOT NULL DEFAULT 4,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Provider Vehicles
CREATE TABLE IF NOT EXISTS provider_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL,
  vehicle_type_id UUID REFERENCES vehicle_types(id),
  license_plate VARCHAR(20) NOT NULL,
  brand VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  year INTEGER,
  color VARCHAR(30),
  photo_url TEXT,
  insurance_expiry DATE,
  registration_expiry DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Promo Campaigns
CREATE TABLE IF NOT EXISTS promo_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  name_th VARCHAR(100) NOT NULL,
  description TEXT,
  campaign_type VARCHAR(20) NOT NULL CHECK (campaign_type IN ('discount', 'cashback', 'free_ride', 'referral')),
  discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
  discount_value DECIMAL(10,2) NOT NULL,
  max_discount DECIMAL(10,2),
  min_order_value DECIMAL(10,2),
  budget DECIMAL(12,2) NOT NULL DEFAULT 0,
  spent DECIMAL(12,2) NOT NULL DEFAULT 0,
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  target_segments TEXT[],
  service_types TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customer Segments
CREATE TABLE IF NOT EXISTS customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  name_th VARCHAR(100) NOT NULL,
  description TEXT,
  segment_type VARCHAR(20) NOT NULL DEFAULT 'static',
  criteria JSONB,
  member_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_segment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES customer_segments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(segment_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_provider ON provider_vehicles(provider_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON provider_vehicles(vehicle_type_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON promo_campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_segments_active ON customer_segments(is_active);
CREATE INDEX IF NOT EXISTS idx_segment_members_segment ON customer_segment_members(segment_id);

-- Enable RLS
ALTER TABLE vehicle_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segment_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "vehicle_types_all" ON vehicle_types FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "vehicles_all" ON provider_vehicles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "campaigns_all" ON promo_campaigns FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "segments_all" ON customer_segments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "segment_members_all" ON customer_segment_members FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Seed vehicle types
INSERT INTO vehicle_types (name, name_th, icon, base_fare, per_km_rate, per_minute_rate, min_fare, max_passengers) VALUES
  ('Standard', 'มาตรฐาน', 'car', 25, 7, 1, 35, 4),
  ('Premium', 'พรีเมียม', 'car-premium', 40, 12, 2, 60, 4),
  ('SUV', 'SUV', 'suv', 50, 15, 2.5, 80, 6),
  ('Motorcycle', 'มอเตอร์ไซค์', 'motorcycle', 15, 5, 0.5, 25, 1)
ON CONFLICT DO NOTHING;

-- Seed sample segments
INSERT INTO customer_segments (name, name_th, segment_type, criteria) VALUES
  ('VIP Customers', 'ลูกค้า VIP', 'dynamic', '{"min_rides": 50, "min_spending": 10000}'),
  ('New Users', 'ผู้ใช้ใหม่', 'dynamic', '{"registration_days": 30}'),
  ('Inactive Users', 'ผู้ใช้ไม่แอคทีฟ', 'dynamic', '{"last_active_days": 60}')
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON vehicle_types TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON provider_vehicles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON promo_campaigns TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON customer_segments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON customer_segment_members TO anon, authenticated;
