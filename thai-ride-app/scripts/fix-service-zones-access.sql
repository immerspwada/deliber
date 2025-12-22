-- Fix Service Zones Admin Access
-- Run this in Supabase SQL Editor to fix /admin/service-zones NETWORK error

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone read active zones" ON service_zones;
DROP POLICY IF EXISTS "Anyone read active pricing rules" ON zone_pricing_rules;
DROP POLICY IF EXISTS "Admin full access to zones" ON service_zones;
DROP POLICY IF EXISTS "Users read active zones" ON service_zones;
DROP POLICY IF EXISTS "Admin full access to pricing rules" ON zone_pricing_rules;
DROP POLICY IF EXISTS "Users read active pricing rules" ON zone_pricing_rules;

-- 2. Create helper function
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR is_admin = true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Create service_zones table if not exists
CREATE TABLE IF NOT EXISTS service_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_area_id UUID,
  name TEXT NOT NULL,
  name_th TEXT NOT NULL,
  zone_type TEXT DEFAULT 'urban' CHECK (zone_type IN ('urban', 'suburban', 'rural', 'airport', 'tourist', 'industrial')),
  boundaries JSONB,
  center_lat NUMERIC(10,7) DEFAULT 13.7563,
  center_lng NUMERIC(10,7) DEFAULT 100.5018,
  base_fare_multiplier NUMERIC(3,2) DEFAULT 1.0,
  per_km_multiplier NUMERIC(3,2) DEFAULT 1.0,
  min_fare_override NUMERIC(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  operating_hours JSONB,
  total_rides INTEGER DEFAULT 0,
  avg_wait_time_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create zone_pricing_rules table if not exists
CREATE TABLE IF NOT EXISTS zone_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES service_zones(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL DEFAULT 'time_based' CHECK (rule_type IN ('time_based', 'demand_based', 'weather', 'event', 'holiday')),
  rule_name TEXT NOT NULL,
  rule_name_th TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}',
  fare_multiplier NUMERIC(3,2) DEFAULT 1.0,
  flat_surcharge NUMERIC(10,2) DEFAULT 0,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable RLS
ALTER TABLE service_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_pricing_rules ENABLE ROW LEVEL SECURITY;

-- 6. Create new policies - Admin full access
CREATE POLICY "Admin full access to zones" ON service_zones
  FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "Users read active zones" ON service_zones
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admin full access to pricing rules" ON zone_pricing_rules
  FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "Users read active pricing rules" ON zone_pricing_rules
  FOR SELECT TO authenticated
  USING (is_active = true);

-- 7. Seed demo zones if empty
INSERT INTO service_zones (name, name_th, zone_type, center_lat, center_lng, is_active)
SELECT * FROM (VALUES
  ('Bangkok Central', 'กรุงเทพฯ กลาง', 'urban', 13.7563, 100.5018, true),
  ('Sukhumvit', 'สุขุมวิท', 'urban', 13.7380, 100.5600, true),
  ('Silom-Sathorn', 'สีลม-สาทร', 'urban', 13.7250, 100.5300, true),
  ('Chatuchak', 'จตุจักร', 'suburban', 13.8200, 100.5600, true),
  ('Suvarnabhumi Airport', 'สนามบินสุวรรณภูมิ', 'airport', 13.6900, 100.7501, true),
  ('Don Mueang Airport', 'สนามบินดอนเมือง', 'airport', 13.9126, 100.6067, true),
  ('Pattaya', 'พัทยา', 'tourist', 12.9236, 100.8825, true),
  ('Nonthaburi', 'นนทบุรี', 'suburban', 13.8621, 100.5144, true)
) AS v(name, name_th, zone_type, center_lat, center_lng, is_active)
WHERE NOT EXISTS (SELECT 1 FROM service_zones LIMIT 1);

-- 8. Grant permissions
GRANT ALL ON service_zones TO authenticated;
GRANT ALL ON zone_pricing_rules TO authenticated;

-- Done!
SELECT 'Service zones access fixed!' as result, count(*) as zones_count FROM service_zones;
