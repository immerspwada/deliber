-- Migration: 059_realtime_tracking_v2.sql
-- Feature: F33 - Enhanced Real-time Tracking
-- Description: Improved location tracking, ETA updates, and route optimization

-- =====================================================
-- 1. Provider Location History (for route replay)
-- =====================================================
CREATE TABLE IF NOT EXISTS provider_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  request_id UUID, -- ride/delivery/etc request
  request_type TEXT,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  accuracy NUMERIC(6,2),
  speed NUMERIC(6,2), -- km/h
  heading NUMERIC(5,2), -- degrees
  altitude NUMERIC(8,2),
  battery_level INTEGER,
  is_charging BOOLEAN,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partitioning by date for performance
CREATE INDEX IF NOT EXISTS idx_location_history_provider ON provider_location_history(provider_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_history_request ON provider_location_history(request_id);
CREATE INDEX IF NOT EXISTS idx_location_history_date ON provider_location_history(recorded_at);

-- =====================================================
-- 2. ETA Tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS eta_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  request_type TEXT NOT NULL,
  provider_id UUID REFERENCES service_providers(id),
  eta_minutes INTEGER NOT NULL,
  distance_km NUMERIC(8,2),
  traffic_condition TEXT CHECK (traffic_condition IN ('light', 'moderate', 'heavy', 'severe')),
  route_polyline TEXT,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eta_request ON eta_updates(request_id, calculated_at DESC);

-- =====================================================
-- 3. Geofence Events
-- =====================================================
CREATE TABLE IF NOT EXISTS geofence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  request_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('enter', 'exit', 'dwell')),
  geofence_type TEXT NOT NULL CHECK (geofence_type IN ('pickup', 'destination', 'service_area', 'hotspot', 'restricted')),
  geofence_name TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  radius_meters INTEGER,
  dwell_time_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofence_provider ON geofence_events(provider_id);
CREATE INDEX IF NOT EXISTS idx_geofence_request ON geofence_events(request_id);

-- =====================================================
-- 4. Route Optimization Cache
-- =====================================================
CREATE TABLE IF NOT EXISTS route_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_lat NUMERIC(10,7) NOT NULL,
  origin_lng NUMERIC(10,7) NOT NULL,
  dest_lat NUMERIC(10,7) NOT NULL,
  dest_lng NUMERIC(10,7) NOT NULL,
  route_polyline TEXT,
  distance_meters INTEGER,
  duration_seconds INTEGER,
  traffic_duration_seconds INTEGER,
  waypoints JSONB,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour'
);

CREATE INDEX IF NOT EXISTS idx_route_cache_coords ON route_cache(origin_lat, origin_lng, dest_lat, dest_lng);
CREATE INDEX IF NOT EXISTS idx_route_cache_expires ON route_cache(expires_at);

-- =====================================================
-- 5. Enable RLS
-- =====================================================
ALTER TABLE provider_location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE eta_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Provider insert own location" ON provider_location_history
  FOR INSERT TO authenticated
  WITH CHECK (provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid()));

CREATE POLICY "Admin read all locations" ON provider_location_history
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Customer read active ride location" ON provider_location_history
  FOR SELECT TO authenticated
  USING (
    request_id IN (
      SELECT id FROM ride_requests WHERE user_id = auth.uid() AND status IN ('matched', 'pickup', 'in_progress')
    )
  );

CREATE POLICY "Anyone read eta_updates for own requests" ON eta_updates
  FOR SELECT TO authenticated
  USING (
    request_id IN (SELECT id FROM ride_requests WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System insert eta_updates" ON eta_updates
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Provider read own geofence" ON geofence_events
  FOR SELECT TO authenticated
  USING (provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid()));

CREATE POLICY "Admin read all geofence" ON geofence_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Anyone read route_cache" ON route_cache
  FOR SELECT TO authenticated USING (expires_at > NOW());

CREATE POLICY "System manage route_cache" ON route_cache
  FOR ALL TO authenticated WITH CHECK (true);

-- =====================================================
-- 6. Functions
-- =====================================================

-- Record provider location
CREATE OR REPLACE FUNCTION record_provider_location(
  p_provider_id UUID,
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_accuracy NUMERIC DEFAULT NULL,
  p_speed NUMERIC DEFAULT NULL,
  p_heading NUMERIC DEFAULT NULL,
  p_request_id UUID DEFAULT NULL,
  p_request_type TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Insert location history
  INSERT INTO provider_location_history (
    provider_id, request_id, request_type,
    latitude, longitude, accuracy, speed, heading
  ) VALUES (
    p_provider_id, p_request_id, p_request_type,
    p_lat, p_lng, p_accuracy, p_speed, p_heading
  );
  
  -- Update provider current location
  UPDATE service_providers
  SET 
    current_lat = p_lat,
    current_lng = p_lng,
    last_location_update = NOW()
  WHERE id = p_provider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate and store ETA
CREATE OR REPLACE FUNCTION update_eta(
  p_request_id UUID,
  p_request_type TEXT,
  p_provider_id UUID,
  p_eta_minutes INTEGER,
  p_distance_km NUMERIC,
  p_traffic TEXT DEFAULT 'moderate'
) RETURNS VOID AS $$
BEGIN
  INSERT INTO eta_updates (
    request_id, request_type, provider_id,
    eta_minutes, distance_km, traffic_condition
  ) VALUES (
    p_request_id, p_request_type, p_provider_id,
    p_eta_minutes, p_distance_km, p_traffic
  );
  
  -- Update ride request ETA if applicable
  IF p_request_type = 'ride' THEN
    UPDATE ride_requests
    SET eta_minutes = p_eta_minutes
    WHERE id = p_request_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log geofence event
CREATE OR REPLACE FUNCTION log_geofence_event(
  p_provider_id UUID,
  p_event_type TEXT,
  p_geofence_type TEXT,
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_request_id UUID DEFAULT NULL,
  p_geofence_name TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO geofence_events (
    provider_id, request_id, event_type, geofence_type,
    geofence_name, latitude, longitude
  ) VALUES (
    p_provider_id, p_request_id, p_event_type, p_geofence_type,
    p_geofence_name, p_lat, p_lng
  )
  RETURNING id INTO v_event_id;
  
  -- Trigger notification if entering pickup zone
  IF p_event_type = 'enter' AND p_geofence_type = 'pickup' AND p_request_id IS NOT NULL THEN
    -- Notify customer
    INSERT INTO user_notifications (user_id, type, title, message, action_url)
    SELECT 
      user_id,
      'ride',
      'คนขับใกล้ถึงแล้ว',
      'คนขับกำลังเข้าใกล้จุดรับ',
      '/ride/track/' || p_request_id
    FROM ride_requests WHERE id = p_request_id;
  END IF;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get route from cache or return null
CREATE OR REPLACE FUNCTION get_cached_route(
  p_origin_lat NUMERIC,
  p_origin_lng NUMERIC,
  p_dest_lat NUMERIC,
  p_dest_lng NUMERIC
) RETURNS TABLE (
  route_polyline TEXT,
  distance_meters INTEGER,
  duration_seconds INTEGER,
  traffic_duration_seconds INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rc.route_polyline,
    rc.distance_meters,
    rc.duration_seconds,
    rc.traffic_duration_seconds
  FROM route_cache rc
  WHERE ABS(rc.origin_lat - p_origin_lat) < 0.001
    AND ABS(rc.origin_lng - p_origin_lng) < 0.001
    AND ABS(rc.dest_lat - p_dest_lat) < 0.001
    AND ABS(rc.dest_lng - p_dest_lng) < 0.001
    AND rc.expires_at > NOW()
  ORDER BY rc.calculated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cache route
CREATE OR REPLACE FUNCTION cache_route(
  p_origin_lat NUMERIC,
  p_origin_lng NUMERIC,
  p_dest_lat NUMERIC,
  p_dest_lng NUMERIC,
  p_polyline TEXT,
  p_distance INTEGER,
  p_duration INTEGER,
  p_traffic_duration INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO route_cache (
    origin_lat, origin_lng, dest_lat, dest_lng,
    route_polyline, distance_meters, duration_seconds, traffic_duration_seconds
  ) VALUES (
    p_origin_lat, p_origin_lng, p_dest_lat, p_dest_lng,
    p_polyline, p_distance, p_duration, p_traffic_duration
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get provider location trail for request
CREATE OR REPLACE FUNCTION get_location_trail(
  p_request_id UUID,
  p_limit INTEGER DEFAULT 100
) RETURNS TABLE (
  latitude NUMERIC,
  longitude NUMERIC,
  speed NUMERIC,
  recorded_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    plh.latitude,
    plh.longitude,
    plh.speed,
    plh.recorded_at
  FROM provider_location_history plh
  WHERE plh.request_id = p_request_id
  ORDER BY plh.recorded_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old location history (run daily)
CREATE OR REPLACE FUNCTION cleanup_location_history()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM provider_location_history
  WHERE recorded_at < NOW() - INTERVAL '7 days'
    AND request_id IS NULL;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  -- Also cleanup expired route cache
  DELETE FROM route_cache WHERE expires_at < NOW();
  
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE eta_updates;

-- Comments
COMMENT ON TABLE provider_location_history IS 'Historical location data for providers';
COMMENT ON TABLE eta_updates IS 'ETA calculations and updates';
COMMENT ON TABLE geofence_events IS 'Geofence entry/exit events';
COMMENT ON TABLE route_cache IS 'Cached route calculations';
