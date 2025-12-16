-- =============================================
-- FIX PROVIDER COLUMNS MIGRATION
-- =============================================
-- แก้ไข columns ใน service_providers ให้ตรงกับ code
-- เปลี่ยนจาก is_online -> is_available
-- เพิ่ม is_verified, vehicle_color
-- =============================================

-- 1. Add missing columns if not exist
ALTER TABLE public.service_providers 
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT false;

ALTER TABLE public.service_providers 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

ALTER TABLE public.service_providers 
ADD COLUMN IF NOT EXISTS vehicle_color VARCHAR(50);

ALTER TABLE public.service_providers 
ADD COLUMN IF NOT EXISTS vehicle_brand VARCHAR(50);

ALTER TABLE public.service_providers 
ADD COLUMN IF NOT EXISTS vehicle_model VARCHAR(50);

ALTER TABLE public.service_providers 
ADD COLUMN IF NOT EXISTS vehicle_year INTEGER;

ALTER TABLE public.service_providers 
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(12,2) DEFAULT 0;

ALTER TABLE public.service_providers 
ADD COLUMN IF NOT EXISTS id_card_photo TEXT;

ALTER TABLE public.service_providers 
ADD COLUMN IF NOT EXISTS license_photo TEXT;

ALTER TABLE public.service_providers 
ADD COLUMN IF NOT EXISTS vehicle_photo TEXT;

-- 2. Migrate data from is_online to is_available (if is_online exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'is_online'
  ) THEN
    UPDATE public.service_providers 
    SET is_available = is_online 
    WHERE is_available IS NULL OR is_available = false;
  END IF;
END $$;

-- 3. Set is_verified based on background_check_status
UPDATE public.service_providers 
SET is_verified = true 
WHERE background_check_status = 'approved' AND (is_verified IS NULL OR is_verified = false);

-- 4. Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_providers_available ON public.service_providers(is_available);
CREATE INDEX IF NOT EXISTS idx_providers_verified ON public.service_providers(is_verified);

-- 5. Update find_nearby_providers function to use correct columns
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
) AS $func$
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
$func$ LANGUAGE plpgsql;

-- 6. Update get_ride_with_driver function
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
) AS $func$
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
  FROM public.ride_requests r
  LEFT JOIN public.service_providers sp ON sp.id = r.provider_id
  LEFT JOIN public.users u ON u.id = sp.user_id
  WHERE r.id = p_ride_id;
END;
$func$ LANGUAGE plpgsql;

-- 7. Update get_pending_rides_for_provider function
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
) AS $func$
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
$func$ LANGUAGE plpgsql;

-- 8. Add tracking_id to ride_requests if not exists
ALTER TABLE public.ride_requests 
ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(25) UNIQUE;

-- 9. Add started_at and completed_at to ride_requests
ALTER TABLE public.ride_requests 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

ALTER TABLE public.ride_requests 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 10. Trigger to auto-set tracking_id
CREATE OR REPLACE FUNCTION set_ride_tracking_id()
RETURNS TRIGGER AS $func$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := 'RID-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ride_tracking_id ON public.ride_requests;
CREATE TRIGGER trigger_ride_tracking_id
  BEFORE INSERT ON public.ride_requests
  FOR EACH ROW EXECUTE FUNCTION set_ride_tracking_id();

-- 11. Enable Realtime for key tables
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.service_providers;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 12. Permissive RLS policies for development
DROP POLICY IF EXISTS "Allow all service_providers" ON public.service_providers;
CREATE POLICY "Allow all service_providers" ON public.service_providers 
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all ride_requests" ON public.ride_requests;
CREATE POLICY "Allow all ride_requests" ON public.ride_requests 
  FOR ALL USING (true) WITH CHECK (true);

-- 13. Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
