-- Fix Services Flow Migration
-- Ensures all systems work together smoothly for /services ride booking

-- =====================================================
-- 1. FIX find_nearby_providers FUNCTION
-- Uses correct field names: is_available, is_verified
-- =====================================================

DROP FUNCTION IF EXISTS find_nearby_providers(DECIMAL, DECIMAL, INTEGER, VARCHAR);

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
  FROM public.service_providers sp
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

-- =====================================================
-- 2. ADD MISSING COLUMNS TO ride_requests
-- =====================================================

-- Add tracking_id if not exists
ALTER TABLE public.ride_requests 
ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(25) UNIQUE;

-- Add started_at and completed_at timestamps
ALTER TABLE public.ride_requests 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.ride_requests 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Add final_fare for actual fare after completion
ALTER TABLE public.ride_requests 
ADD COLUMN IF NOT EXISTS final_fare DECIMAL(10,2);

-- =====================================================
-- 3. FIX chat_messages TABLE
-- Add ride_id column for direct ride-based chat
-- =====================================================

ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS ride_id UUID REFERENCES public.ride_requests(id) ON DELETE CASCADE;

-- Update chat_messages to allow ride_id based queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_ride ON public.chat_messages(ride_id);

-- =====================================================
-- 4. DISABLE RLS FOR DEMO/DEVELOPMENT
-- Allow all operations without auth for testing
-- =====================================================

-- Create permissive policies for development
DROP POLICY IF EXISTS "Allow all users" ON public.users;
CREATE POLICY "Allow all users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all service_providers" ON public.service_providers;
CREATE POLICY "Allow all service_providers" ON public.service_providers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all ride_requests" ON public.ride_requests;
CREATE POLICY "Allow all ride_requests" ON public.ride_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all ride_ratings" ON public.ride_ratings;
CREATE POLICY "Allow all ride_ratings" ON public.ride_ratings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all saved_places" ON public.saved_places;
CREATE POLICY "Allow all saved_places" ON public.saved_places FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all recent_places" ON public.recent_places;
CREATE POLICY "Allow all recent_places" ON public.recent_places FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all chat_messages" ON public.chat_messages;
CREATE POLICY "Allow all chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all promo_codes" ON public.promo_codes;
CREATE POLICY "Allow all promo_codes" ON public.promo_codes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all user_promo_usage" ON public.user_promo_usage;
CREATE POLICY "Allow all user_promo_usage" ON public.user_promo_usage FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all emergency_contacts" ON public.emergency_contacts;
CREATE POLICY "Allow all emergency_contacts" ON public.emergency_contacts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all trip_shares" ON public.trip_shares;
CREATE POLICY "Allow all trip_shares" ON public.trip_shares FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 5. ENABLE REALTIME FOR KEY TABLES
-- =====================================================

-- Enable realtime for ride_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_requests;

-- Enable realtime for service_providers (for location updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_providers;

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- =====================================================
-- 6. CREATE DEMO DATA FOR TESTING
-- =====================================================

-- Insert demo customer user if not exists
INSERT INTO public.users (id, email, name, phone, role, is_active)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'customer@demo.com', 'Demo Customer', '0812345678', 'customer', true),
  ('22222222-2222-2222-2222-222222222222', 'rider@demo.com', 'Demo Rider', '0823456789', 'rider', true),
  ('33333333-3333-3333-3333-333333333333', 'admin@demo.com', 'Demo Admin', '0834567890', 'admin', true)
ON CONFLICT (email) DO UPDATE SET 
  name = EXCLUDED.name,
  is_active = true;

-- Insert demo drivers with locations in Bangkok
INSERT INTO public.service_providers (id, user_id, provider_type, vehicle_type, vehicle_plate, vehicle_color, license_number, is_verified, is_available, rating, total_trips, current_lat, current_lng)
VALUES 
  ('aaaa1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'driver', 'Toyota Camry', 'กข 1234', 'สีดำ', 'DL-12345', true, true, 4.85, 523, 13.7563, 100.5018),
  ('aaaa2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'driver', 'Honda City', 'ขค 5678', 'สีขาว', 'DL-67890', true, true, 4.72, 234, 13.7469, 100.5349),
  ('aaaa3333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'driver', 'Nissan Almera', 'คง 9012', 'สีเงิน', 'DL-11111', true, true, 4.91, 892, 13.7380, 100.5608)
ON CONFLICT (id) DO UPDATE SET 
  is_available = true,
  is_verified = true,
  current_lat = EXCLUDED.current_lat,
  current_lng = EXCLUDED.current_lng;

-- Insert demo promo codes
INSERT INTO public.promo_codes (code, description, discount_type, discount_value, max_discount, min_order_amount, is_active, valid_until)
VALUES 
  ('DEMO50', 'Demo discount 50 baht', 'fixed', 50, NULL, 0, true, NOW() + INTERVAL '1 year'),
  ('DEMO10', 'Demo 10% discount', 'percentage', 10, 100, 50, true, NOW() + INTERVAL '1 year')
ON CONFLICT (code) DO UPDATE SET 
  is_active = true,
  valid_until = NOW() + INTERVAL '1 year';

-- =====================================================
-- 7. FUNCTION TO GET RIDE WITH DRIVER INFO
-- =====================================================

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
    u.name as driver_name,
    u.phone as driver_phone,
    COALESCE(sp.rating, 4.5)::DECIMAL(3,2) as driver_rating,
    COALESCE(sp.total_trips, 0) as driver_trips,
    sp.vehicle_type,
    sp.vehicle_plate,
    sp.vehicle_color,
    sp.current_lat as driver_lat,
    sp.current_lng as driver_lng
  FROM public.ride_requests r
  LEFT JOIN public.service_providers sp ON sp.id = r.provider_id
  LEFT JOIN public.users u ON u.id = sp.user_id
  WHERE r.id = p_ride_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. FUNCTION TO GET PENDING RIDES FOR PROVIDER
-- =====================================================

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
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as ride_id,
    r.user_id,
    u.name as passenger_name,
    u.phone as passenger_phone,
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
  FROM public.ride_requests r
  LEFT JOIN public.users u ON u.id = r.user_id
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

-- =====================================================
-- 9. TRIGGER TO AUTO-SET TRACKING ID ON RIDE
-- =====================================================

CREATE OR REPLACE FUNCTION set_ride_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := 'RID-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ride_tracking_id ON public.ride_requests;
CREATE TRIGGER trigger_ride_tracking_id
  BEFORE INSERT ON public.ride_requests
  FOR EACH ROW EXECUTE FUNCTION set_ride_tracking_id();

-- =====================================================
-- 10. GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
