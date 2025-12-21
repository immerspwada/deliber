-- ============================================================================
-- PROVIDER TOGGLE ONLINE FIX - Run this in Supabase SQL Editor
-- ============================================================================
-- This script fixes the provider toggle online functionality
-- Run migrations 140 and 141 together
-- ============================================================================

-- ============================================================================
-- PART 1: FIX PROVIDER JOB FUNCTIONS (Migration 140)
-- ============================================================================

-- 1.1 FIX get_available_rides_for_provider
CREATE OR REPLACE FUNCTION get_available_rides_for_provider(
  p_provider_id UUID,
  p_radius_km INTEGER DEFAULT 10
)
RETURNS TABLE (
  ride_id UUID,
  tracking_id VARCHAR(25),
  user_id UUID,
  passenger_name TEXT,
  passenger_phone TEXT,
  passenger_rating DECIMAL(3,2),
  pickup_lat DECIMAL(10,8),
  pickup_lng DECIMAL(11,8),
  pickup_address TEXT,
  destination_lat DECIMAL(10,8),
  destination_lng DECIMAL(11,8),
  destination_address TEXT,
  ride_type VARCHAR(20),
  estimated_fare DECIMAL(10,2),
  distance_to_pickup DECIMAL(10,2),
  ride_distance DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE
) AS $func$
DECLARE
  v_provider RECORD;
BEGIN
  -- Get provider location
  SELECT current_lat, current_lng INTO v_provider
  FROM public.service_providers
  WHERE id = p_provider_id;
  
  -- If no location, return all pending rides
  IF v_provider.current_lat IS NULL OR v_provider.current_lng IS NULL THEN
    RETURN QUERY
    SELECT 
      r.id as ride_id,
      r.tracking_id,
      r.user_id,
      COALESCE(u.first_name || ' ' || u.last_name, 'ผู้โดยสาร')::TEXT as passenger_name,
      COALESCE(u.phone_number, '')::TEXT as passenger_phone,
      4.5::DECIMAL(3,2) as passenger_rating,
      r.pickup_lat,
      r.pickup_lng,
      r.pickup_address,
      r.destination_lat,
      r.destination_lng,
      r.destination_address,
      COALESCE(r.ride_type, 'standard')::VARCHAR(20),
      COALESCE(r.estimated_fare, 0)::DECIMAL(10,2),
      0::DECIMAL(10,2) as distance_to_pickup,
      (6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(r.pickup_lat)) * cos(radians(r.destination_lat)) *
          cos(radians(r.destination_lng) - radians(r.pickup_lng)) +
          sin(radians(r.pickup_lat)) * sin(radians(r.destination_lat))
        ))
      ))::DECIMAL(10,2) as ride_distance,
      r.created_at
    FROM public.ride_requests r
    LEFT JOIN public.users u ON u.id = r.user_id
    WHERE r.status = 'pending'
      AND r.provider_id IS NULL
    ORDER BY r.created_at DESC
    LIMIT 20;
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    r.id as ride_id,
    r.tracking_id,
    r.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, 'ผู้โดยสาร')::TEXT as passenger_name,
    COALESCE(u.phone_number, '')::TEXT as passenger_phone,
    4.5::DECIMAL(3,2) as passenger_rating,
    r.pickup_lat,
    r.pickup_lng,
    r.pickup_address,
    r.destination_lat,
    r.destination_lng,
    r.destination_address,
    COALESCE(r.ride_type, 'standard')::VARCHAR(20),
    COALESCE(r.estimated_fare, 0)::DECIMAL(10,2),
    (6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(v_provider.current_lat)) * cos(radians(r.pickup_lat)) *
        cos(radians(r.pickup_lng) - radians(v_provider.current_lng)) +
        sin(radians(v_provider.current_lat)) * sin(radians(r.pickup_lat))
      ))
    ))::DECIMAL(10,2) as distance_to_pickup,
    (6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(r.pickup_lat)) * cos(radians(r.destination_lat)) *
        cos(radians(r.destination_lng) - radians(r.pickup_lng)) +
        sin(radians(r.pickup_lat)) * sin(radians(r.destination_lat))
      ))
    ))::DECIMAL(10,2) as ride_distance,
    r.created_at
  FROM public.ride_requests r
  LEFT JOIN public.users u ON u.id = r.user_id
  WHERE r.status = 'pending'
    AND r.provider_id IS NULL
    AND (6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(v_provider.current_lat)) * cos(radians(r.pickup_lat)) *
        cos(radians(r.pickup_lng) - radians(v_provider.current_lng)) +
        sin(radians(v_provider.current_lat)) * sin(radians(r.pickup_lat))
      ))
    )) <= p_radius_km
  ORDER BY distance_to_pickup ASC, r.created_at DESC
  LIMIT 20;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 2: FIX PROVIDER TOGGLE ONLINE (Migration 141)
-- ============================================================================

-- 2.1 FIX set_provider_availability
CREATE OR REPLACE FUNCTION set_provider_availability(
  p_provider_id UUID,
  p_is_available BOOLEAN,
  p_lat DECIMAL(10,8) DEFAULT NULL,
  p_lng DECIMAL(11,8) DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $func$
DECLARE
  v_provider RECORD;
BEGIN
  -- Get provider
  SELECT * INTO v_provider
  FROM public.service_providers
  WHERE id = p_provider_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบข้อมูลผู้ให้บริการ'::TEXT;
    RETURN;
  END IF;
  
  -- Check if approved before going online
  IF p_is_available THEN
    IF v_provider.status NOT IN ('approved', 'active') AND NOT COALESCE(v_provider.is_verified, false) THEN
      RETURN QUERY SELECT false, 'บัญชียังไม่ได้รับการอนุมัติ กรุณารอ Admin ตรวจสอบ'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Update availability
  UPDATE public.service_providers
  SET 
    is_available = p_is_available,
    current_lat = COALESCE(p_lat, current_lat),
    current_lng = COALESCE(p_lng, current_lng),
    updated_at = NOW()
  WHERE id = p_provider_id;
  
  RETURN QUERY SELECT true, CASE WHEN p_is_available THEN 'เปิดรับงานแล้ว' ELSE 'ปิดรับงานแล้ว' END::TEXT;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.2 CREATE toggle_provider_online function
CREATE OR REPLACE FUNCTION toggle_provider_online(
  p_user_id UUID,
  p_is_online BOOLEAN,
  p_lat DECIMAL(10,8) DEFAULT NULL,
  p_lng DECIMAL(11,8) DEFAULT NULL
)
RETURNS JSON AS $func$
DECLARE
  v_provider RECORD;
BEGIN
  -- Get provider by user_id
  SELECT * INTO v_provider
  FROM public.service_providers
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'ไม่พบข้อมูลผู้ให้บริการ');
  END IF;
  
  -- Check if can go online
  IF p_is_online THEN
    IF v_provider.status NOT IN ('approved', 'active') AND NOT COALESCE(v_provider.is_verified, false) THEN
      RETURN json_build_object('success', false, 'error', 'บัญชียังไม่ได้รับการอนุมัติ');
    END IF;
  END IF;
  
  -- Update
  UPDATE public.service_providers
  SET 
    is_available = p_is_online,
    current_lat = COALESCE(p_lat, current_lat),
    current_lng = COALESCE(p_lng, current_lng),
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'is_online', p_is_online,
    'message', CASE WHEN p_is_online THEN 'เปิดรับงานแล้ว' ELSE 'ปิดรับงานแล้ว' END
  );
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 3: RLS POLICIES
-- ============================================================================

-- 3.1 Allow providers to update their own availability
DROP POLICY IF EXISTS "providers_update_own_availability" ON service_providers;
CREATE POLICY "providers_update_own_availability" ON service_providers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3.2 Allow providers to read their own profile
DROP POLICY IF EXISTS "providers_read_own_profile" ON service_providers;
CREATE POLICY "providers_read_own_profile" ON service_providers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 3.3 Allow providers to see pending ride requests
DROP POLICY IF EXISTS "providers_view_pending_rides" ON ride_requests;
CREATE POLICY "providers_view_pending_rides" ON ride_requests
  FOR SELECT TO authenticated
  USING (
    status = 'pending' 
    OR provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

-- 3.4 Allow providers to update rides they accepted
DROP POLICY IF EXISTS "providers_update_own_rides" ON ride_requests;
CREATE POLICY "providers_update_own_rides" ON ride_requests
  FOR UPDATE TO authenticated
  USING (
    provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
  );

-- ============================================================================
-- PART 4: GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION set_provider_availability TO authenticated;
GRANT EXECUTE ON FUNCTION set_provider_availability TO anon;
GRANT EXECUTE ON FUNCTION toggle_provider_online TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_rides_for_provider TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_rides_for_provider TO anon;

-- ============================================================================
-- PART 5: AUTO-APPROVE PROVIDERS FOR TESTING (Optional)
-- ============================================================================

-- Uncomment this to auto-approve providers with documents
-- UPDATE service_providers
-- SET status = 'approved', is_verified = true
-- WHERE status = 'pending'
--   AND (license_number IS NOT NULL OR vehicle_plate IS NOT NULL OR vehicle_plate_number IS NOT NULL);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check providers status
SELECT id, user_id, status, is_verified, is_available, provider_type
FROM service_providers
ORDER BY created_at DESC
LIMIT 10;

-- Check if functions exist
SELECT proname, proargtypes 
FROM pg_proc 
WHERE proname IN ('set_provider_availability', 'toggle_provider_online', 'get_available_rides_for_provider');

