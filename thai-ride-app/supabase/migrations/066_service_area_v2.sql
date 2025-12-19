-- Migration: 066_service_area_v2.sql
-- Feature: F42 - Service Area Expansion V2
-- Description: Enhanced service areas with zones, pricing tiers, and provider coverage

-- =====================================================
-- 1. Service Zones (Sub-areas within service areas)
-- =====================================================
CREATE TABLE IF NOT EXISTS service_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_area_id UUID REFERENCES service_areas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_th TEXT NOT NULL,
  zone_type TEXT CHECK (zone_type IN ('urban', 'suburban', 'rural', 'airport', 'tourist', 'industrial')),
  
  -- Boundaries (GeoJSON polygon)
  boundaries JSONB,
  center_lat NUMERIC(10,7),
  center_lng NUMERIC(10,7),
  
  -- Pricing modifiers
  base_fare_multiplier NUMERIC(3,2) DEFAULT 1.0,
  per_km_multiplier NUMERIC(3,2) DEFAULT 1.0,
  min_fare_override NUMERIC(10,2),
  
  -- Availability
  is_active BOOLEAN DEFAULT TRUE,
  operating_hours JSONB, -- {"mon": {"start": "06:00", "end": "22:00"}, ...}
  
  -- Stats
  total_rides INTEGER DEFAULT 0,
  avg_wait_time_minutes INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_zones_area ON service_zones(service_area_id);
CREATE INDEX IF NOT EXISTS idx_service_zones_active ON service_zones(is_active);

-- =====================================================
-- 2. Zone Pricing Rules
-- =====================================================
CREATE TABLE IF NOT EXISTS zone_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES service_zones(id) ON DELETE CASCADE,
  
  rule_type TEXT NOT NULL CHECK (rule_type IN ('time_based', 'demand_based', 'weather', 'event', 'holiday')),
  rule_name TEXT NOT NULL,
  rule_name_th TEXT NOT NULL,
  
  -- Conditions
  conditions JSONB NOT NULL, -- {"time_start": "07:00", "time_end": "09:00", "days": ["mon", "tue"]}
  
  -- Pricing
  fare_multiplier NUMERIC(3,2) DEFAULT 1.0,
  flat_surcharge NUMERIC(10,2) DEFAULT 0,
  
  -- Priority (higher = applied first)
  priority INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT TRUE,
  valid_from DATE,
  valid_until DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zone_pricing_zone ON zone_pricing_rules(zone_id);

-- =====================================================
-- 3. Provider Zone Coverage
-- =====================================================
CREATE TABLE IF NOT EXISTS provider_zone_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES service_zones(id) ON DELETE CASCADE,
  
  -- Preferences
  is_preferred BOOLEAN DEFAULT FALSE,
  priority_level INTEGER DEFAULT 0, -- Higher = more likely to get jobs
  
  -- Stats
  total_trips_in_zone INTEGER DEFAULT 0,
  avg_rating_in_zone NUMERIC(3,2),
  last_trip_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(provider_id, zone_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_zone_provider ON provider_zone_coverage(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_zone_zone ON provider_zone_coverage(zone_id);

-- =====================================================
-- 4. Zone Demand Tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS zone_demand_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES service_zones(id) ON DELETE CASCADE,
  
  tracked_at TIMESTAMPTZ DEFAULT NOW(),
  hour_of_day INTEGER CHECK (hour_of_day >= 0 AND hour_of_day < 24),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week < 7),
  
  -- Demand metrics
  pending_requests INTEGER DEFAULT 0,
  available_providers INTEGER DEFAULT 0,
  demand_ratio NUMERIC(5,2), -- pending/available
  
  -- Calculated surge
  surge_multiplier NUMERIC(3,2) DEFAULT 1.0,
  
  -- Weather conditions
  weather_condition TEXT,
  temperature NUMERIC(4,1)
);

CREATE INDEX IF NOT EXISTS idx_zone_demand_zone ON zone_demand_tracking(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_demand_time ON zone_demand_tracking(tracked_at);

-- =====================================================
-- 5. Service Area Expansion Requests
-- =====================================================
CREATE TABLE IF NOT EXISTS area_expansion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Requested location
  requested_lat NUMERIC(10,7) NOT NULL,
  requested_lng NUMERIC(10,7) NOT NULL,
  requested_address TEXT,
  
  -- Requester
  user_id UUID REFERENCES users(id),
  provider_id UUID REFERENCES service_providers(id),
  
  -- Details
  request_type TEXT CHECK (request_type IN ('customer_request', 'provider_request', 'business_request')),
  reason TEXT,
  expected_demand TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'implemented')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Implementation
  implemented_zone_id UUID REFERENCES service_zones(id),
  implemented_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expansion_status ON area_expansion_requests(status);

-- =====================================================
-- 6. Enable RLS
-- =====================================================
ALTER TABLE service_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_zone_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_demand_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE area_expansion_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone read active zones" ON service_zones
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Anyone read active pricing rules" ON zone_pricing_rules
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Providers manage own zone coverage" ON provider_zone_coverage
  FOR ALL TO authenticated USING (provider_id IN (
    SELECT id FROM service_providers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Anyone read zone demand" ON zone_demand_tracking
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users create expansion requests" ON area_expansion_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read own expansion requests" ON area_expansion_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- =====================================================
-- 7. Functions
-- =====================================================

-- Get zone for coordinates
CREATE OR REPLACE FUNCTION get_zone_for_location(
  p_lat NUMERIC,
  p_lng NUMERIC
) RETURNS UUID AS $$
DECLARE
  v_zone_id UUID;
BEGIN
  -- Find zone containing the point (simplified - uses center distance)
  SELECT id INTO v_zone_id
  FROM service_zones
  WHERE is_active = true
  ORDER BY 
    SQRT(POWER(center_lat - p_lat, 2) + POWER(center_lng - p_lng, 2))
  LIMIT 1;
  
  RETURN v_zone_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate zone-based fare
CREATE OR REPLACE FUNCTION calculate_zone_fare(
  p_pickup_lat NUMERIC,
  p_pickup_lng NUMERIC,
  p_dest_lat NUMERIC,
  p_dest_lng NUMERIC,
  p_base_fare NUMERIC,
  p_per_km_rate NUMERIC,
  p_distance_km NUMERIC
) RETURNS TABLE (
  final_fare NUMERIC,
  surge_multiplier NUMERIC,
  zone_multiplier NUMERIC,
  surcharges NUMERIC,
  breakdown JSONB
) AS $$
DECLARE
  v_pickup_zone service_zones%ROWTYPE;
  v_dest_zone service_zones%ROWTYPE;
  v_zone_mult NUMERIC := 1.0;
  v_surge_mult NUMERIC := 1.0;
  v_surcharges NUMERIC := 0;
  v_base NUMERIC;
  v_distance_cost NUMERIC;
  v_final NUMERIC;
  v_breakdown JSONB;
BEGIN
  -- Get pickup zone
  SELECT * INTO v_pickup_zone FROM service_zones 
  WHERE id = get_zone_for_location(p_pickup_lat, p_pickup_lng);
  
  -- Get destination zone
  SELECT * INTO v_dest_zone FROM service_zones 
  WHERE id = get_zone_for_location(p_dest_lat, p_dest_lng);
  
  -- Apply zone multipliers (use higher of the two)
  IF v_pickup_zone.id IS NOT NULL THEN
    v_zone_mult := GREATEST(v_zone_mult, v_pickup_zone.base_fare_multiplier);
  END IF;
  IF v_dest_zone.id IS NOT NULL THEN
    v_zone_mult := GREATEST(v_zone_mult, v_dest_zone.base_fare_multiplier);
  END IF;
  
  -- Check for active pricing rules
  SELECT COALESCE(MAX(zpr.fare_multiplier), 1.0), COALESCE(SUM(zpr.flat_surcharge), 0)
  INTO v_surge_mult, v_surcharges
  FROM zone_pricing_rules zpr
  WHERE zpr.zone_id IN (v_pickup_zone.id, v_dest_zone.id)
    AND zpr.is_active = true
    AND (zpr.valid_from IS NULL OR zpr.valid_from <= CURRENT_DATE)
    AND (zpr.valid_until IS NULL OR zpr.valid_until >= CURRENT_DATE);
  
  -- Calculate fare
  v_base := p_base_fare * v_zone_mult;
  v_distance_cost := p_per_km_rate * p_distance_km * v_zone_mult;
  v_final := (v_base + v_distance_cost) * v_surge_mult + v_surcharges;
  
  -- Build breakdown
  v_breakdown := jsonb_build_object(
    'base_fare', v_base,
    'distance_cost', v_distance_cost,
    'zone_multiplier', v_zone_mult,
    'surge_multiplier', v_surge_mult,
    'surcharges', v_surcharges,
    'pickup_zone', v_pickup_zone.name_th,
    'dest_zone', v_dest_zone.name_th
  );
  
  RETURN QUERY SELECT v_final, v_surge_mult, v_zone_mult, v_surcharges, v_breakdown;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get providers in zone
CREATE OR REPLACE FUNCTION get_providers_in_zone(
  p_zone_id UUID,
  p_provider_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
  provider_id UUID,
  user_name TEXT,
  vehicle_type TEXT,
  rating NUMERIC,
  distance_km NUMERIC,
  is_preferred BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id as provider_id,
    u.first_name || ' ' || u.last_name as user_name,
    sp.vehicle_type,
    sp.rating,
    SQRT(POWER(sp.current_lat - sz.center_lat, 2) + POWER(sp.current_lng - sz.center_lng, 2)) * 111 as distance_km,
    COALESCE(pzc.is_preferred, false) as is_preferred
  FROM service_providers sp
  JOIN users u ON sp.user_id = u.id
  JOIN service_zones sz ON sz.id = p_zone_id
  LEFT JOIN provider_zone_coverage pzc ON pzc.provider_id = sp.id AND pzc.zone_id = p_zone_id
  WHERE sp.is_available = true
    AND sp.is_verified = true
    AND (p_provider_type IS NULL OR sp.provider_type = p_provider_type)
  ORDER BY pzc.is_preferred DESC NULLS LAST, distance_km
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Track zone demand
CREATE OR REPLACE FUNCTION track_zone_demand(p_zone_id UUID)
RETURNS void AS $$
DECLARE
  v_pending INTEGER;
  v_available INTEGER;
  v_ratio NUMERIC;
  v_surge NUMERIC;
BEGIN
  -- Count pending requests in zone
  SELECT COUNT(*) INTO v_pending
  FROM ride_requests rr
  WHERE rr.status = 'pending'
    AND get_zone_for_location(rr.pickup_lat, rr.pickup_lng) = p_zone_id;
  
  -- Count available providers in zone
  SELECT COUNT(*) INTO v_available
  FROM service_providers sp
  JOIN provider_zone_coverage pzc ON pzc.provider_id = sp.id
  WHERE pzc.zone_id = p_zone_id
    AND sp.is_available = true;
  
  -- Calculate ratio and surge
  v_ratio := CASE WHEN v_available > 0 THEN v_pending::NUMERIC / v_available ELSE v_pending END;
  v_surge := CASE 
    WHEN v_ratio > 3 THEN 2.0
    WHEN v_ratio > 2 THEN 1.5
    WHEN v_ratio > 1 THEN 1.25
    ELSE 1.0
  END;
  
  -- Insert tracking record
  INSERT INTO zone_demand_tracking (
    zone_id, hour_of_day, day_of_week,
    pending_requests, available_providers, demand_ratio, surge_multiplier
  ) VALUES (
    p_zone_id, EXTRACT(HOUR FROM NOW()), EXTRACT(DOW FROM NOW()),
    v_pending, v_available, v_ratio, v_surge
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Submit expansion request
CREATE OR REPLACE FUNCTION submit_expansion_request(
  p_user_id UUID,
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_address TEXT,
  p_reason TEXT
) RETURNS UUID AS $$
DECLARE
  v_request_id UUID;
BEGIN
  INSERT INTO area_expansion_requests (
    user_id, requested_lat, requested_lng, requested_address,
    request_type, reason
  ) VALUES (
    p_user_id, p_lat, p_lng, p_address,
    'customer_request', p_reason
  ) RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE service_zones IS 'Sub-areas within service areas with specific pricing';
COMMENT ON TABLE zone_pricing_rules IS 'Dynamic pricing rules for zones';
COMMENT ON TABLE provider_zone_coverage IS 'Provider preferences for zones';
COMMENT ON TABLE zone_demand_tracking IS 'Real-time demand tracking per zone';
COMMENT ON TABLE area_expansion_requests IS 'Requests to expand service to new areas';
