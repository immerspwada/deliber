-- Migration: 022_service_areas.sql
-- Feature: F42 - Service Area Management
-- ระบบจัดการพื้นที่ให้บริการ

-- =============================================
-- 1. Create service_areas table
-- =============================================
CREATE TABLE IF NOT EXISTS service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  polygon JSONB NOT NULL, -- Array of {lat, lng} points
  is_active BOOLEAN DEFAULT TRUE,
  surge_multiplier DECIMAL(3,2) DEFAULT 1.00,
  min_fare DECIMAL(10,2) DEFAULT 35.00,
  base_fare DECIMAL(10,2) DEFAULT 35.00,
  per_km_rate DECIMAL(10,2) DEFAULT 6.50,
  color TEXT DEFAULT '#22c55e',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. Create indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_service_areas_is_active ON service_areas(is_active);
CREATE INDEX IF NOT EXISTS idx_service_areas_name ON service_areas(name);

-- =============================================
-- 3. Enable RLS
-- =============================================
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;

-- Everyone can view active service areas
CREATE POLICY "Anyone can view active service areas"
  ON service_areas FOR SELECT
  USING (is_active = TRUE);

-- Admin can view all service areas
CREATE POLICY "Admin can view all service areas"
  ON service_areas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admin can manage service areas
CREATE POLICY "Admin can manage service areas"
  ON service_areas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =============================================
-- 4. Create updated_at trigger
-- =============================================
CREATE OR REPLACE FUNCTION update_service_areas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_service_areas_updated_at ON service_areas;
CREATE TRIGGER trigger_service_areas_updated_at
  BEFORE UPDATE ON service_areas
  FOR EACH ROW
  EXECUTE FUNCTION update_service_areas_updated_at();

-- =============================================
-- 5. Insert default Bangkok service areas
-- =============================================
INSERT INTO service_areas (name, polygon, is_active, surge_multiplier, min_fare, base_fare, per_km_rate, color, description)
VALUES 
  (
    'กรุงเทพฯ ชั้นใน',
    '[{"lat": 13.78, "lng": 100.48}, {"lat": 13.78, "lng": 100.58}, {"lat": 13.70, "lng": 100.58}, {"lat": 13.70, "lng": 100.48}]'::jsonb,
    TRUE,
    1.00,
    35.00,
    35.00,
    6.50,
    '#22c55e',
    'พื้นที่ใจกลางกรุงเทพฯ - สยาม, สีลม, สุขุมวิท'
  ),
  (
    'กรุงเทพฯ รอบนอก',
    '[{"lat": 13.85, "lng": 100.40}, {"lat": 13.85, "lng": 100.65}, {"lat": 13.65, "lng": 100.65}, {"lat": 13.65, "lng": 100.40}]'::jsonb,
    TRUE,
    1.00,
    40.00,
    40.00,
    7.00,
    '#3b82f6',
    'พื้นที่รอบนอกกรุงเทพฯ - ลาดพร้าว, รัชดา, บางนา'
  ),
  (
    'ปริมณฑล',
    '[{"lat": 13.95, "lng": 100.30}, {"lat": 13.95, "lng": 100.75}, {"lat": 13.55, "lng": 100.75}, {"lat": 13.55, "lng": 100.30}]'::jsonb,
    TRUE,
    1.20,
    50.00,
    50.00,
    8.00,
    '#f59e0b',
    'นนทบุรี, ปทุมธานี, สมุทรปราการ'
  )
ON CONFLICT DO NOTHING;

-- =============================================
-- 6. Function to check if point is in service area
-- =============================================
CREATE OR REPLACE FUNCTION is_point_in_service_area(
  p_lat DECIMAL,
  p_lng DECIMAL
)
RETURNS TABLE (
  area_id UUID,
  area_name TEXT,
  surge_multiplier DECIMAL,
  min_fare DECIMAL,
  base_fare DECIMAL,
  per_km_rate DECIMAL
) AS $$
DECLARE
  area RECORD;
  polygon JSONB;
  n INTEGER;
  i INTEGER;
  j INTEGER;
  xi DECIMAL;
  yi DECIMAL;
  xj DECIMAL;
  yj DECIMAL;
  inside BOOLEAN;
BEGIN
  FOR area IN SELECT * FROM service_areas WHERE is_active = TRUE
  LOOP
    polygon := area.polygon;
    n := jsonb_array_length(polygon);
    inside := FALSE;
    j := n - 1;
    
    FOR i IN 0..n-1
    LOOP
      xi := (polygon->i->>'lng')::DECIMAL;
      yi := (polygon->i->>'lat')::DECIMAL;
      xj := (polygon->j->>'lng')::DECIMAL;
      yj := (polygon->j->>'lat')::DECIMAL;
      
      IF ((yi > p_lng) != (yj > p_lng)) AND 
         (p_lat < (xj - xi) * (p_lng - yi) / (yj - yi) + xi) THEN
        inside := NOT inside;
      END IF;
      
      j := i;
    END LOOP;
    
    IF inside THEN
      area_id := area.id;
      area_name := area.name;
      surge_multiplier := area.surge_multiplier;
      min_fare := area.min_fare;
      base_fare := area.base_fare;
      per_km_rate := area.per_km_rate;
      RETURN NEXT;
      RETURN;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. Function to get area statistics
-- =============================================
CREATE OR REPLACE FUNCTION get_area_stats()
RETURNS TABLE (
  area_id UUID,
  area_name TEXT,
  total_rides BIGINT,
  total_revenue DECIMAL,
  avg_wait_time DECIMAL,
  active_providers BIGINT,
  demand_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.id AS area_id,
    sa.name AS area_name,
    COALESCE(COUNT(rr.id), 0)::BIGINT AS total_rides,
    COALESCE(SUM(rr.final_fare), 0)::DECIMAL AS total_revenue,
    COALESCE(AVG(EXTRACT(EPOCH FROM (rr.matched_at - rr.created_at)) / 60), 0)::DECIMAL AS avg_wait_time,
    (
      SELECT COUNT(*)::BIGINT 
      FROM service_providers sp 
      WHERE sp.is_available = TRUE 
      AND sp.current_lat IS NOT NULL
    ) AS active_providers,
    CASE 
      WHEN COUNT(rr.id) > 100 THEN 'high'
      WHEN COUNT(rr.id) > 50 THEN 'medium'
      ELSE 'low'
    END AS demand_level
  FROM service_areas sa
  LEFT JOIN ride_requests rr ON rr.created_at >= NOW() - INTERVAL '24 hours'
  WHERE sa.is_active = TRUE
  GROUP BY sa.id, sa.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. Grant permissions
-- =============================================
GRANT SELECT ON service_areas TO authenticated;
GRANT SELECT ON service_areas TO anon;
GRANT EXECUTE ON FUNCTION is_point_in_service_area TO authenticated;
GRANT EXECUTE ON FUNCTION is_point_in_service_area TO anon;
GRANT EXECUTE ON FUNCTION get_area_stats TO authenticated;
