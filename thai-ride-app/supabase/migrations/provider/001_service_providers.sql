-- =============================================
-- PROVIDER MODULE: Service Providers
-- =============================================
-- Feature: F14 - Provider Dashboard
-- Used by: Provider App (Driver, Rider)
-- Depends on: core/001_users_auth.sql
-- =============================================

-- Service providers table
CREATE TABLE IF NOT EXISTS service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Provider type
  provider_type VARCHAR(20) NOT NULL CHECK (provider_type IN ('driver', 'delivery', 'shopper')),
  
  -- Vehicle info
  license_number VARCHAR(50),
  vehicle_type VARCHAR(50),
  vehicle_plate VARCHAR(20),
  vehicle_color VARCHAR(50),
  vehicle_brand VARCHAR(50),
  vehicle_model VARCHAR(50),
  vehicle_year INTEGER,
  
  -- Status
  is_available BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  background_check_status VARCHAR(20) DEFAULT 'pending' CHECK (background_check_status IN ('pending', 'approved', 'rejected')),
  
  -- Stats
  rating DECIMAL(3,2) DEFAULT 5.0,
  total_trips INTEGER DEFAULT 0,
  total_earnings DECIMAL(12,2) DEFAULT 0,
  
  -- Location
  current_lat DECIMAL(10,8),
  current_lng DECIMAL(11,8),
  service_radius INTEGER DEFAULT 5,
  
  -- Documents
  id_card_photo TEXT,
  license_photo TEXT,
  vehicle_photo TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for dev)
CREATE POLICY "Allow all service_providers" ON service_providers 
  FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_providers_user ON service_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_providers_type ON service_providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_providers_available ON service_providers(is_available);
CREATE INDEX IF NOT EXISTS idx_providers_verified ON service_providers(is_verified);
CREATE INDEX IF NOT EXISTS idx_providers_location ON service_providers(current_lat, current_lng);
CREATE INDEX IF NOT EXISTS idx_providers_rating ON service_providers(rating DESC);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE service_providers;

-- Find nearby providers function
CREATE OR REPLACE FUNCTION find_nearby_providers(
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  radius_km INTEGER DEFAULT 5,
  provider_type_filter VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE (
  provider_id UUID,
  user_id UUID,
  provider_type VARCHAR(20),
  rating DECIMAL(3,2),
  distance_km DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id as provider_id,
    sp.user_id,
    sp.provider_type::VARCHAR(20),
    COALESCE(sp.rating, 4.5)::DECIMAL(3,2) as rating,
    (6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(lat)) * cos(radians(sp.current_lat)) *
        cos(radians(sp.current_lng) - radians(lng)) +
        sin(radians(lat)) * sin(radians(sp.current_lat))
      ))
    ))::DECIMAL(10,2) as distance_km
  FROM service_providers sp
  WHERE sp.is_available = true
    AND sp.is_verified = true
    AND (provider_type_filter IS NULL OR sp.provider_type = provider_type_filter)
    AND sp.current_lat IS NOT NULL
    AND sp.current_lng IS NOT NULL
    AND (6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(lat)) * cos(radians(sp.current_lat)) *
        cos(radians(sp.current_lng) - radians(lng)) +
        sin(radians(lat)) * sin(radians(sp.current_lat))
      ))
    )) <= radius_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- Get ride with driver info
CREATE OR REPLACE FUNCTION get_ride_with_driver(p_ride_id UUID)
RETURNS TABLE (
  ride_id UUID,
  ride_status VARCHAR(20),
  pickup_address TEXT,
  destination_address TEXT,
  estimated_fare DECIMAL(10,2),
  provider_id UUID,
  driver_name VARCHAR(200),
  driver_phone VARCHAR(15),
  driver_rating DECIMAL(3,2),
  driver_trips INTEGER,
  vehicle_type VARCHAR(50),
  vehicle_plate VARCHAR(20),
  vehicle_color VARCHAR(50),
  driver_lat DECIMAL(10,8),
  driver_lng DECIMAL(11,8)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as ride_id,
    r.status::VARCHAR(20) as ride_status,
    r.pickup_address,
    r.destination_address,
    r.estimated_fare,
    sp.id as provider_id,
    u.name::VARCHAR(200) as driver_name,
    u.phone::VARCHAR(15) as driver_phone,
    COALESCE(sp.rating, 4.5)::DECIMAL(3,2) as driver_rating,
    COALESCE(sp.total_trips, 0) as driver_trips,
    sp.vehicle_type,
    sp.vehicle_plate,
    sp.vehicle_color,
    sp.current_lat as driver_lat,
    sp.current_lng as driver_lng
  FROM ride_requests r
  LEFT JOIN service_providers sp ON sp.id = r.provider_id
  LEFT JOIN users u ON u.id = sp.user_id
  WHERE r.id = p_ride_id;
END;
$$ LANGUAGE plpgsql;

-- Get pending rides for provider
CREATE OR REPLACE FUNCTION get_pending_rides_for_provider(
  p_provider_lat DECIMAL(10,8),
  p_provider_lng DECIMAL(11,8),
  p_radius_km INTEGER DEFAULT 10
)
RETURNS TABLE (
  ride_id UUID,
  user_id UUID,
  passenger_name VARCHAR(200),
  passenger_phone VARCHAR(15),
  pickup_lat DECIMAL(10,8),
  pickup_lng DECIMAL(11,8),
  pickup_address TEXT,
  destination_lat DECIMAL(10,8),
  destination_lng DECIMAL(11,8),
  destination_address TEXT,
  ride_type VARCHAR(20),
  estimated_fare DECIMAL(10,2),
  distance_to_pickup DECIMAL(10,2),
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as ride_id,
    r.user_id,
    u.name::VARCHAR(200) as passenger_name,
    u.phone::VARCHAR(15) as passenger_phone,
    r.pickup_lat,
    r.pickup_lng,
    r.pickup_address,
    r.destination_lat,
    r.destination_lng,
    r.destination_address,
    r.ride_type::VARCHAR(20),
    r.estimated_fare,
    (6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_provider_lat)) * cos(radians(r.pickup_lat)) *
        cos(radians(r.pickup_lng) - radians(p_provider_lng)) +
        sin(radians(p_provider_lat)) * sin(radians(r.pickup_lat))
      ))
    ))::DECIMAL(10,2) as distance_to_pickup,
    r.created_at
  FROM ride_requests r
  LEFT JOIN users u ON u.id = r.user_id
  WHERE r.status = 'pending'
    AND r.provider_id IS NULL
    AND (6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_provider_lat)) * cos(radians(r.pickup_lat)) *
        cos(radians(r.pickup_lng) - radians(p_provider_lng)) +
        sin(radians(p_provider_lat)) * sin(radians(r.pickup_lat))
      ))
    )) <= p_radius_km
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql;
