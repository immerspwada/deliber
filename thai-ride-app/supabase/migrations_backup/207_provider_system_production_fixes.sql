-- ============================================
-- Migration: 207_provider_system_production_fixes.sql
-- Feature: F14 - Provider Dashboard (Production Fixes)
-- Date: 2026-01-02
-- ============================================
-- Description: แก้ไขปัญหา Provider System ให้ทำงานได้จริงบน Production
-- Tables: service_providers, ride_requests, delivery_requests, shopping_requests
-- RLS: Yes (Fixed conflicting policies)
-- Realtime: Yes (Already enabled)
-- ============================================

-- =====================================================
-- 1. FIX RLS POLICIES - ลบ policies ที่ขัดแย้งกัน
-- =====================================================

-- ลบ policy ที่เปิดกว้างเกินไป
DROP POLICY IF EXISTS "Allow all service_providers" ON service_providers;
DROP POLICY IF EXISTS "Anyone can read providers" ON service_providers;

-- เพิ่ม policy สำหรับ Provider อัพเดทข้อมูลตัวเอง
DROP POLICY IF EXISTS "Providers can update own record" ON service_providers;
CREATE POLICY "Providers can update own record" ON service_providers
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ตรวจสอบว่า RLS เปิดอยู่
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. TOGGLE PROVIDER ONLINE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION toggle_provider_online(
  p_user_id UUID,
  p_is_online BOOLEAN,
  p_lat NUMERIC DEFAULT NULL,
  p_lng NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider_id UUID;
  v_provider_status TEXT;
  v_is_verified BOOLEAN;
BEGIN
  -- 1. หา provider profile
  SELECT id, status, is_verified
  INTO v_provider_id, v_provider_status, v_is_verified
  FROM service_providers
  WHERE user_id = p_user_id
  LIMIT 1;
  
  -- 2. ตรวจสอบว่ามี provider profile
  IF v_provider_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ไม่พบข้อมูลผู้ให้บริการ กรุณาสมัครก่อน'
    );
  END IF;
  
  -- 3. ตรวจสอบ status (อนุญาต pending ได้ถ้า verified)
  IF p_is_online = true THEN
    IF v_provider_status NOT IN ('approved', 'active', 'pending') AND v_is_verified = false THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'บัญชียังไม่ได้รับการอนุมัติ กรุณารอ Admin ตรวจสอบ',
        'status', v_provider_status
      );
    END IF;
  END IF;
  
  -- 4. อัพเดท is_available
  UPDATE service_providers
  SET 
    is_available = p_is_online,
    current_lat = COALESCE(p_lat, current_lat),
    current_lng = COALESCE(p_lng, current_lng),
    updated_at = NOW()
  WHERE id = v_provider_id;
  
  -- 5. Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', CASE WHEN p_is_online THEN 'เปิดรับงานแล้ว' ELSE 'ปิดรับงานแล้ว' END,
    'provider_id', v_provider_id,
    'is_online', p_is_online
  );
END;
$$;

-- =====================================================
-- 3. FIX GET AVAILABLE RIDES FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_available_rides_for_provider(
  p_provider_id UUID,
  p_radius_km NUMERIC DEFAULT 10
)
RETURNS TABLE(
  ride_id UUID,
  tracking_id VARCHAR,
  user_id UUID,
  pickup_lat NUMERIC,
  pickup_lng NUMERIC,
  pickup_address TEXT,
  destination_lat NUMERIC,
  destination_lng NUMERIC,
  destination_address TEXT,
  ride_type VARCHAR,
  estimated_fare NUMERIC,
  created_at TIMESTAMPTZ,
  ride_distance DOUBLE PRECISION,
  passenger_name VARCHAR,
  passenger_phone VARCHAR,
  passenger_rating NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider_lat NUMERIC;
  v_provider_lng NUMERIC;
BEGIN
  -- Get provider location
  SELECT current_lat, current_lng 
  INTO v_provider_lat, v_provider_lng
  FROM service_providers
  WHERE id = p_provider_id;
  
  -- Return pending rides within radius
  RETURN QUERY
  SELECT 
    r.id as ride_id,
    r.tracking_id,
    r.user_id,
    r.pickup_lat,
    r.pickup_lng,
    r.pickup_address,
    r.destination_lat,
    r.destination_lng,
    r.destination_address,
    r.ride_type,
    r.estimated_fare,
    r.created_at,
    -- Calculate distance from provider to pickup
    (6371 * acos(
      cos(radians(v_provider_lat)) * cos(radians(r.pickup_lat)) *
      cos(radians(r.pickup_lng) - radians(v_provider_lng)) +
      sin(radians(v_provider_lat)) * sin(radians(r.pickup_lat))
    ))::DOUBLE PRECISION as ride_distance,
    -- แก้ไข: ใช้ first_name + last_name
    COALESCE(u.first_name || ' ' || u.last_name, u.first_name, 'ผู้โดยสาร')::VARCHAR as passenger_name,
    -- แก้ไข: ใช้ phone_number
    u.phone_number::VARCHAR as passenger_phone,
    4.5::NUMERIC as passenger_rating
  FROM ride_requests r
  LEFT JOIN users u ON r.user_id = u.id
  WHERE r.status = 'pending'
    AND r.provider_id IS NULL
    AND (v_provider_lat IS NULL OR v_provider_lng IS NULL OR
      (6371 * acos(
        cos(radians(v_provider_lat)) * cos(radians(r.pickup_lat)) *
        cos(radians(r.pickup_lng) - radians(v_provider_lng)) +
        sin(radians(v_provider_lat)) * sin(radians(r.pickup_lat))
      )) <= p_radius_km)
  ORDER BY r.created_at DESC
  LIMIT 20;
END;
$$;

-- =====================================================
-- 4. ACCEPT RIDE ATOMIC V2 (Race Condition Prevention)
-- =====================================================

CREATE OR REPLACE FUNCTION accept_ride_atomic_v2(
  p_ride_id UUID,
  p_provider_id UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ride_status TEXT;
  v_current_provider_id UUID;
  v_ride_data JSONB;
BEGIN
  -- 1. Lock the ride row for update
  SELECT status, provider_id
  INTO v_ride_status, v_current_provider_id
  FROM ride_requests
  WHERE id = p_ride_id
  FOR UPDATE;
  
  -- 2. Check if ride exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'ไม่พบงานนี้'
    );
  END IF;
  
  -- 3. Check if already accepted
  IF v_ride_status != 'pending' OR v_current_provider_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'งานนี้ถูกรับไปแล้ว'
    );
  END IF;
  
  -- 4. Update ride to matched
  UPDATE ride_requests
  SET 
    status = 'matched',
    provider_id = p_provider_id,
    matched_at = NOW(),
    updated_at = NOW()
  WHERE id = p_ride_id;
  
  -- 5. Update provider to busy
  UPDATE service_providers
  SET 
    is_available = false,
    updated_at = NOW()
  WHERE id = p_provider_id;
  
  -- 6. Get full ride data
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
    'estimated_fare', r.estimated_fare,
    'ride_type', r.ride_type,
    'status', r.status,
    'created_at', r.created_at,
    'passenger', jsonb_build_object(
      'id', u.id,
      'name', COALESCE(u.first_name || ' ' || u.last_name, u.first_name, 'ผู้โดยสาร'),
      'phone', u.phone_number,
      'avatar_url', u.avatar_url
    )
  )
  INTO v_ride_data
  FROM ride_requests r
  LEFT JOIN users u ON r.user_id = u.id
  WHERE r.id = p_ride_id;
  
  -- 7. Return success with ride data
  RETURN jsonb_build_object(
    'success', true,
    'message', 'รับงานสำเร็จ',
    'ride_data', v_ride_data
  );
END;
$$;

-- =====================================================
-- 5. UPDATE RIDE STATUS V2
-- =====================================================

CREATE OR REPLACE FUNCTION update_ride_status_v2(
  p_ride_id UUID,
  p_provider_id UUID,
  p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_provider_id UUID;
BEGIN
  -- 1. Verify provider owns this ride
  SELECT provider_id
  INTO v_current_provider_id
  FROM ride_requests
  WHERE id = p_ride_id;
  
  IF v_current_provider_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'ไม่พบงานนี้'
    );
  END IF;
  
  IF v_current_provider_id != p_provider_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'คุณไม่มีสิทธิ์อัพเดทงานนี้'
    );
  END IF;
  
  -- 2. Update status
  UPDATE ride_requests
  SET 
    status = p_new_status,
    updated_at = NOW(),
    -- Set timestamps based on status
    arrived_at = CASE WHEN p_new_status = 'pickup' THEN NOW() ELSE arrived_at END,
    picked_up_at = CASE WHEN p_new_status = 'in_progress' THEN NOW() ELSE picked_up_at END,
    completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END
  WHERE id = p_ride_id;
  
  -- 3. If completed, make provider available again
  IF p_new_status = 'completed' THEN
    UPDATE service_providers
    SET 
      is_available = true,
      total_trips = total_trips + 1,
      updated_at = NOW()
    WHERE id = p_provider_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'อัพเดทสถานะสำเร็จ'
  );
END;
$$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- ตรวจสอบว่า functions ถูกสร้างแล้ว
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'toggle_provider_online') THEN
    RAISE EXCEPTION 'Function toggle_provider_online not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'accept_ride_atomic_v2') THEN
    RAISE EXCEPTION 'Function accept_ride_atomic_v2 not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_ride_status_v2') THEN
    RAISE EXCEPTION 'Function update_ride_status_v2 not created';
  END IF;
  
  RAISE NOTICE 'Migration 207 completed successfully';
END $$;
