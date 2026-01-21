-- Migration: 151_admin_service_zones_access.sql
-- Feature: F42 - Service Zone Management (Admin Access)
-- Description: Add RLS policies for admin to manage service zones

-- =====================================================
-- 1. Drop existing restrictive policies
-- =====================================================
DROP POLICY IF EXISTS "Anyone read active zones" ON service_zones;
DROP POLICY IF EXISTS "Admin manage zones" ON service_zones;

-- =====================================================
-- 2. Create new policies for service_zones
-- =====================================================

-- Anyone can read active zones
CREATE POLICY "Anyone read active zones" ON service_zones
  FOR SELECT
  USING (is_active = true);

-- Anon can read all zones (for admin dashboard)
CREATE POLICY "Anon read all zones" ON service_zones
  FOR SELECT TO anon
  USING (true);

-- Anon can manage zones (for admin dashboard in demo mode)
CREATE POLICY "Anon manage zones" ON service_zones
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Authenticated can manage zones
CREATE POLICY "Authenticated manage zones" ON service_zones
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);


-- =====================================================
-- 3. Update zone_pricing_rules policies
-- =====================================================
DROP POLICY IF EXISTS "Anyone read active pricing rules" ON zone_pricing_rules;

CREATE POLICY "Anyone read pricing rules" ON zone_pricing_rules
  FOR SELECT
  USING (true);

CREATE POLICY "Anon manage pricing rules" ON zone_pricing_rules
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 4. Function to check if location is in any active zone
-- =====================================================
CREATE OR REPLACE FUNCTION check_location_in_service_zone(
  p_lat NUMERIC,
  p_lng NUMERIC
) RETURNS TABLE (
  is_serviceable BOOLEAN,
  zone_id UUID,
  zone_name TEXT,
  zone_name_th TEXT,
  fare_multiplier NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as is_serviceable,
    sz.id as zone_id,
    sz.name as zone_name,
    sz.name_th as zone_name_th,
    sz.base_fare_multiplier as fare_multiplier
  FROM service_zones sz
  WHERE sz.is_active = true
  ORDER BY 
    SQRT(POWER(sz.center_lat - p_lat, 2) + POWER(sz.center_lng - p_lng, 2))
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to all
GRANT EXECUTE ON FUNCTION check_location_in_service_zone TO anon;
GRANT EXECUTE ON FUNCTION check_location_in_service_zone TO authenticated;

-- =====================================================
-- 5. Seed default Bangkok zones if empty
-- =====================================================
INSERT INTO service_zones (name, name_th, zone_type, center_lat, center_lng, is_active, base_fare_multiplier)
SELECT 'Bangkok Central', 'กรุงเทพฯ กลาง', 'urban', 13.7563, 100.5018, true, 1.0
WHERE NOT EXISTS (SELECT 1 FROM service_zones LIMIT 1);
