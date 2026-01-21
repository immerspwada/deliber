-- Migration: 158_advanced_features.sql - Geo-Fencing, Training, Emergency, Revenue Share

-- Geo-Fences
CREATE TABLE IF NOT EXISTS geo_fences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  name_th VARCHAR(100) NOT NULL,
  fence_type VARCHAR(20) NOT NULL DEFAULT 'polygon',
  coordinates JSONB NOT NULL,
  zone_type VARCHAR(30) NOT NULL,
  properties JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Training Courses
CREATE TABLE IF NOT EXISTS training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  title_th VARCHAR(200) NOT NULL,
  description TEXT,
  course_type VARCHAR(30) NOT NULL DEFAULT 'onboarding',
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  passing_score INTEGER NOT NULL DEFAULT 70,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  content_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Provider Certifications
CREATE TABLE IF NOT EXISTS provider_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES training_courses(id),
  status VARCHAR(20) NOT NULL DEFAULT 'not_started',
  score INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  UNIQUE(provider_id, course_id)
);

-- Emergency Incidents
CREATE TABLE IF NOT EXISTS emergency_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID,
  reporter_id UUID NOT NULL,
  reporter_type VARCHAR(20) NOT NULL,
  incident_type VARCHAR(30) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  description TEXT,
  location JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'reported',
  responder_id UUID,
  response_notes TEXT,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

-- Commission Rules
CREATE TABLE IF NOT EXISTS commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  name_th VARCHAR(100) NOT NULL,
  service_type VARCHAR(30) NOT NULL,
  commission_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
  commission_value DECIMAL(10,2) NOT NULL,
  min_commission DECIMAL(10,2),
  max_commission DECIMAL(10,2),
  provider_types TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Revenue Records
CREATE TABLE IF NOT EXISTS revenue_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  commission_rule_id UUID REFERENCES commission_rules(id),
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_geo_fences_active ON geo_fences(is_active);
CREATE INDEX IF NOT EXISTS idx_certifications_provider ON provider_certifications(provider_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON emergency_incidents(status);
CREATE INDEX IF NOT EXISTS idx_commission_rules_service ON commission_rules(service_type);
CREATE INDEX IF NOT EXISTS idx_revenue_records_provider ON revenue_records(provider_id);

-- Enable RLS
ALTER TABLE geo_fences ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "geo_fences_all" ON geo_fences FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "training_courses_all" ON training_courses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "certifications_all" ON provider_certifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "incidents_all" ON emergency_incidents FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "commission_rules_all" ON commission_rules FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "revenue_records_all" ON revenue_records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Seed default commission rules
INSERT INTO commission_rules (name, name_th, service_type, commission_type, commission_value) VALUES
  ('Ride Commission', 'ค่าคอมมิชชั่นเรียกรถ', 'ride', 'percentage', 20),
  ('Delivery Commission', 'ค่าคอมมิชชั่นส่งของ', 'delivery', 'percentage', 15),
  ('Shopping Commission', 'ค่าคอมมิชชั่นช้อปปิ้ง', 'shopping', 'percentage', 15)
ON CONFLICT DO NOTHING;

-- Seed sample training courses
INSERT INTO training_courses (title, title_th, course_type, duration_minutes, passing_score, is_required) VALUES
  ('Driver Onboarding', 'การเริ่มต้นสำหรับคนขับ', 'onboarding', 60, 80, true),
  ('Safety Training', 'การฝึกอบรมความปลอดภัย', 'safety', 45, 70, true),
  ('Customer Service', 'การบริการลูกค้า', 'service', 30, 70, false)
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON geo_fences TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON training_courses TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON provider_certifications TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON emergency_incidents TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON commission_rules TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON revenue_records TO anon, authenticated;
