-- Production Provider System Migration
-- Feature: F14 - Provider Dashboard (Production Ready)
-- 
-- This migration adds:
-- 1. Atomic ride acceptance function (prevents race conditions)
-- 2. Provider status management functions
-- 3. Proper RLS policies for production
-- 4. Ride assignment locking mechanism

-- =====================================================
-- 1. ATOMIC RIDE ACCEPTANCE FUNCTION
-- Prevents race conditions when multiple drivers accept same ride
-- =====================================================

CREATE OR REPLACE FUNCTION accept_ride_request(
  p_ride_id UUID,
  p_provider_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  ride_data JSONB
) AS $$
DECLARE
  v_ride RECORD;
  v_provider RECORD;
  v_result JSONB;
BEGIN
  -- Lock the ride row for update (prevents race condition)
  SELECT * INTO v_ride
  FROM public.ride_requests
  WHERE id = p_ride_id
  FOR UPDATE NOWAIT;  -- Fail immediately if locked
  
  -- Check if ride exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบคำขอเรียกรถนี้'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check if ride is still pending
  IF v_ride.status != 'pending' THEN
    RETURN QUERY SELECT false, 'งานนี้ไม่อยู่ในสถานะรอรับแล้ว'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check if ride already has a provider
  IF v_ride.provider_id IS NOT NULL THEN
    RETURN QUERY SELECT false, 'งานนี้ถูกรับไปแล้ว'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Verify provider exists and is available
  SELECT * INTO v_provider
  FROM public.service_providers
  WHERE id = p_provider_id
  AND is_available = true
  AND is_verified = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ผู้ให้บริการไม่พร้อมรับงาน'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Update ride with provider assignment
  UPDATE public.ride_requests
  SET 
    provider_id = p_provider_id,
    status = 'matched',
    updated_at = NOW()
  WHERE id = p_ride_id;
  
  -- Build result with ride and passenger info
  SELECT jsonb_build_object(
    'id', r.id,
    'tracking_id', r.tracking_id,
    'user_id', r.user_id,
    'pickup_lat', r.pickup_lat,
    'pickup_lng', r.pickup_lng,
    'pickup_address', r.pickup_address,
    'destination_lat', r.destination_lat,
    'destination_lng', r.destination_lng,
    'destination_address', r.destination_address,
    'ride_type', r.ride_type,
    'estimated_fare', r.estimated_fare,
    'status', 'matched',
    'created_at', r.created_at,
    'passenger', jsonb_build_object(
      'id', u.id,
      'name', COALESCE(u.name, 'ผู้โดยสาร'),
      'phone', COALESCE(u.phone, ''),
      'avatar_url', u.avatar_url
    )
  ) INTO v_result
  FROM public.ride_requests r
  LEFT JOIN public.users u ON u.id = r.user_id
  WHERE r.id = p_ride_id;
  
  RETURN QUERY SELECT true, 'รับงานสำเร็จ'::TEXT, v_result;
  
EXCEPTION
  WHEN lock_not_available THEN
    -- Another transaction is processing this ride
    RETURN QUERY SELECT false, 'งานนี้กำลังถูกประมวลผล กรุณาลองใหม่'::TEXT, NULL::JSONB;
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('เกิดข้อผิดพลาด: ' || SQLERRM)::TEXT, NULL::JSONB;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. UPDATE RIDE STATUS FUNCTION
-- Validates status transitions
-- =====================================================

CREATE OR REPLACE FUNCTION update_ride_status(
  p_ride_id UUID,
  p_provider_id UUID,
  p_new_status VARCHAR(20)
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_ride RECORD;
  v_valid_transitions TEXT[];
BEGIN
  -- Get current ride
  SELECT * INTO v_ride
  FROM public.ride_requests
  WHERE id = p_ride_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบคำขอเรียกรถนี้'::TEXT;
    RETURN;
  END IF;
  
  -- Verify provider owns this ride
  IF v_ride.provider_id != p_provider_id THEN
    RETURN QUERY SELECT false, 'คุณไม่ได้รับมอบหมายงานนี้'::TEXT;
    RETURN;
  END IF;
  
  -- Define valid status transitions
  CASE v_ride.status
    WHEN 'matched' THEN v_valid_transitions := ARRAY['pickup', 'cancelled'];
    WHEN 'pickup' THEN v_valid_transitions := ARRAY['in_progress', 'cancelled'];
    WHEN 'in_progress' THEN v_valid_transitions := ARRAY['completed', 'cancelled'];
    ELSE v_valid_transitions := ARRAY[]::TEXT[];
  END CASE;
  
  -- Check if transition is valid
  IF NOT (p_new_status = ANY(v_valid_transitions)) THEN
    RETURN QUERY SELECT false, ('ไม่สามารถเปลี่ยนสถานะจาก ' || v_ride.status || ' เป็น ' || p_new_status)::TEXT;
    RETURN;
  END IF;
  
  -- Update status with appropriate timestamps
  UPDATE public.ride_requests
  SET 
    status = p_new_status,
    started_at = CASE WHEN p_new_status = 'in_progress' THEN NOW() ELSE started_at END,
    completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END,
    updated_at = NOW()
  WHERE id = p_ride_id;
  
  RETURN QUERY SELECT true, 'อัพเดทสถานะสำเร็จ'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CANCEL RIDE BY PROVIDER FUNCTION
-- Releases ride back to pending pool
-- =====================================================

CREATE OR REPLACE FUNCTION cancel_ride_by_provider(
  p_ride_id UUID,
  p_provider_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_ride RECORD;
BEGIN
  -- Get current ride
  SELECT * INTO v_ride
  FROM public.ride_requests
  WHERE id = p_ride_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบคำขอเรียกรถนี้'::TEXT;
    RETURN;
  END IF;
  
  -- Verify provider owns this ride
  IF v_ride.provider_id != p_provider_id THEN
    RETURN QUERY SELECT false, 'คุณไม่ได้รับมอบหมายงานนี้'::TEXT;
    RETURN;
  END IF;
  
  -- Can only cancel if not completed
  IF v_ride.status IN ('completed', 'cancelled') THEN
    RETURN QUERY SELECT false, 'ไม่สามารถยกเลิกงานที่เสร็จสิ้นแล้ว'::TEXT;
    RETURN;
  END IF;
  
  -- Release ride back to pending (so another driver can pick it up)
  UPDATE public.ride_requests
  SET 
    provider_id = NULL,
    status = 'pending',
    updated_at = NOW()
  WHERE id = p_ride_id;
  
  -- Log cancellation (optional - could insert into audit log)
  -- INSERT INTO ride_cancellations (ride_id, provider_id, reason, cancelled_at)
  -- VALUES (p_ride_id, p_provider_id, p_reason, NOW());
  
  RETURN QUERY SELECT true, 'ยกเลิกงานสำเร็จ'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. PROVIDER GO ONLINE/OFFLINE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION set_provider_availability(
  p_provider_id UUID,
  p_is_available BOOLEAN,
  p_lat DECIMAL(10,8) DEFAULT NULL,
  p_lng DECIMAL(11,8) DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
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
  
  -- Check if verified before going online
  IF p_is_available AND NOT v_provider.is_verified THEN
    RETURN QUERY SELECT false, 'บัญชียังไม่ได้รับการยืนยัน'::TEXT;
    RETURN;
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
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. GET AVAILABLE RIDES FOR PROVIDER
-- Returns rides within radius, sorted by distance
-- =====================================================

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
) AS $$
DECLARE
  v_provider RECORD;
BEGIN
  -- Get provider location
  SELECT current_lat, current_lng INTO v_provider
  FROM public.service_providers
  WHERE id = p_provider_id;
  
  IF v_provider.current_lat IS NULL OR v_provider.current_lng IS NULL THEN
    -- Return empty if no location
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    r.id as ride_id,
    r.tracking_id,
    r.user_id,
    COALESCE(u.name, 'ผู้โดยสาร')::TEXT as passenger_name,
    COALESCE(u.phone, '')::TEXT as passenger_phone,
    4.5::DECIMAL(3,2) as passenger_rating, -- Could be calculated from ratings table
    r.pickup_lat,
    r.pickup_lng,
    r.pickup_address,
    r.destination_lat,
    r.destination_lng,
    r.destination_address,
    r.ride_type::VARCHAR(20),
    r.estimated_fare,
    -- Distance from provider to pickup
    (6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(v_provider.current_lat)) * cos(radians(r.pickup_lat)) *
        cos(radians(r.pickup_lng) - radians(v_provider.current_lng)) +
        sin(radians(v_provider.current_lat)) * sin(radians(r.pickup_lat))
      ))
    ))::DECIMAL(10,2) as distance_to_pickup,
    -- Distance of the ride itself
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
  ORDER BY distance_to_pickup ASC, r.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. GET PROVIDER ACTIVE RIDE
-- Returns current active ride for provider
-- =====================================================

CREATE OR REPLACE FUNCTION get_provider_active_ride(
  p_provider_id UUID
)
RETURNS TABLE (
  ride_id UUID,
  tracking_id VARCHAR(25),
  status VARCHAR(20),
  passenger_id UUID,
  passenger_name TEXT,
  passenger_phone TEXT,
  passenger_avatar TEXT,
  pickup_lat DECIMAL(10,8),
  pickup_lng DECIMAL(11,8),
  pickup_address TEXT,
  destination_lat DECIMAL(10,8),
  destination_lng DECIMAL(11,8),
  destination_address TEXT,
  ride_type VARCHAR(20),
  estimated_fare DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as ride_id,
    r.tracking_id,
    r.status::VARCHAR(20),
    r.user_id as passenger_id,
    COALESCE(u.name, 'ผู้โดยสาร')::TEXT as passenger_name,
    COALESCE(u.phone, '')::TEXT as passenger_phone,
    u.avatar_url::TEXT as passenger_avatar,
    r.pickup_lat,
    r.pickup_lng,
    r.pickup_address,
    r.destination_lat,
    r.destination_lng,
    r.destination_address,
    r.ride_type::VARCHAR(20),
    r.estimated_fare,
    r.created_at
  FROM public.ride_requests r
  LEFT JOIN public.users u ON u.id = r.user_id
  WHERE r.provider_id = p_provider_id
    AND r.status IN ('matched', 'pickup', 'in_progress')
  ORDER BY r.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. PRODUCTION RLS POLICIES
-- Uncomment these for production use
-- =====================================================

-- For production, replace the "Allow all" policies with these:

-- DROP POLICY IF EXISTS "Allow all ride_requests" ON public.ride_requests;

-- Customers can view their own rides
-- CREATE POLICY "Customers view own rides" ON public.ride_requests
--   FOR SELECT USING (auth.uid()::text = user_id::text);

-- Customers can create rides
-- CREATE POLICY "Customers create rides" ON public.ride_requests
--   FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Providers can view pending rides (for accepting)
-- CREATE POLICY "Providers view pending rides" ON public.ride_requests
--   FOR SELECT USING (
--     status = 'pending' AND provider_id IS NULL
--     AND EXISTS (
--       SELECT 1 FROM public.service_providers sp 
--       WHERE sp.user_id::text = auth.uid()::text 
--       AND sp.is_available = true 
--       AND sp.is_verified = true
--     )
--   );

-- Providers can view/update their assigned rides
-- CREATE POLICY "Providers manage assigned rides" ON public.ride_requests
--   FOR ALL USING (
--     EXISTS (
--       SELECT 1 FROM public.service_providers sp 
--       WHERE sp.id = provider_id 
--       AND sp.user_id::text = auth.uid()::text
--     )
--   );

-- =====================================================
-- 8. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ride_requests_pending 
  ON public.ride_requests(status, provider_id) 
  WHERE status = 'pending' AND provider_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_ride_requests_provider_active 
  ON public.ride_requests(provider_id, status) 
  WHERE status IN ('matched', 'pickup', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_providers_available 
  ON public.service_providers(is_available, is_verified, current_lat, current_lng) 
  WHERE is_available = true AND is_verified = true;

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION accept_ride_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_ride_status(UUID, UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_ride_by_provider(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_provider_availability(UUID, BOOLEAN, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_rides_for_provider(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_active_ride(UUID) TO authenticated;

-- Also grant to anon for demo mode
GRANT EXECUTE ON FUNCTION accept_ride_request(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION update_ride_status(UUID, UUID, VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION cancel_ride_by_provider(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION set_provider_availability(UUID, BOOLEAN, DECIMAL, DECIMAL) TO anon;
GRANT EXECUTE ON FUNCTION get_available_rides_for_provider(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_provider_active_ride(UUID) TO anon;
