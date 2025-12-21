-- Run this SQL in Supabase SQL Editor to fix provider job functions
-- This fixes the column name issues and enables real order acceptance

-- ============================================================================
-- 1. FIX get_available_rides_for_provider - Use correct column names
-- ============================================================================

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
) AS $
DECLARE
  v_provider RECORD;
BEGIN
  -- Get provider location
  SELECT current_lat, current_lng INTO v_provider
  FROM public.service_providers
  WHERE id = p_provider_id;
  
  -- If no location, return all pending rides (for testing/demo)
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
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. FIX accept_ride_atomic - Use correct column names for provider
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_ride_atomic(
  p_ride_id UUID,
  p_provider_id UUID
) RETURNS JSON AS $
DECLARE
  v_current_status TEXT;
  v_user_id UUID;
  v_provider_name TEXT;
  v_provider_phone TEXT;
  v_vehicle_plate TEXT;
BEGIN
  BEGIN
    -- 1. Lock ride row with NOWAIT
    SELECT status, user_id 
    INTO v_current_status, v_user_id
    FROM ride_requests
    WHERE id = p_ride_id
    FOR UPDATE NOWAIT;
    
    IF v_current_status IS NULL THEN
      RAISE EXCEPTION 'RIDE_NOT_FOUND';
    END IF;
    
    IF v_current_status != 'pending' THEN
      RAISE EXCEPTION 'RIDE_ALREADY_ACCEPTED';
    END IF;
    
    -- Get provider details (use correct column names)
    SELECT 
      COALESCE(sp.first_name || ' ' || sp.last_name, u.first_name || ' ' || u.last_name, 'Provider') as name,
      COALESCE(sp.phone_number, u.phone_number, '') as phone,
      COALESCE(sp.vehicle_plate_number, sp.vehicle_plate, '') as plate
    INTO v_provider_name, v_provider_phone, v_vehicle_plate
    FROM service_providers sp
    LEFT JOIN users u ON u.id = sp.user_id
    WHERE sp.id = p_provider_id;
    
    IF v_provider_name IS NULL THEN
      RAISE EXCEPTION 'PROVIDER_NOT_FOUND';
    END IF;
    
    -- Update ride to matched
    UPDATE ride_requests
    SET
      status = 'matched',
      provider_id = p_provider_id,
      matched_at = NOW(),
      updated_at = NOW()
    WHERE id = p_ride_id;
    
    -- Update provider status
    UPDATE service_providers
    SET
      is_available = false,
      updated_at = NOW()
    WHERE id = p_provider_id;
    
    RETURN json_build_object(
      'success', true,
      'ride_id', p_ride_id,
      'status', 'matched',
      'provider', json_build_object(
        'id', p_provider_id,
        'name', v_provider_name,
        'phone', v_provider_phone,
        'vehicle_plate', v_vehicle_plate
      )
    );
    
  EXCEPTION
    WHEN lock_not_available THEN
      RAISE EXCEPTION 'RIDE_ALREADY_ACCEPTED';
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_available_rides_for_provider TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_rides_for_provider TO anon;
GRANT EXECUTE ON FUNCTION accept_ride_atomic TO authenticated;

-- ============================================================================
-- 4. ENSURE RLS POLICIES FOR PROVIDER ACCESS
-- ============================================================================

-- Allow providers to see pending ride requests
DROP POLICY IF EXISTS "providers_view_pending_rides" ON ride_requests;
CREATE POLICY "providers_view_pending_rides" ON ride_requests
  FOR SELECT TO authenticated
  USING (
    status = 'pending' 
    OR provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

-- Allow providers to update rides they accepted
DROP POLICY IF EXISTS "providers_update_own_rides" ON ride_requests;
CREATE POLICY "providers_update_own_rides" ON ride_requests
  FOR UPDATE TO authenticated
  USING (
    provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
  );

-- ============================================================================
-- 5. ENABLE REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE ride_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_requests;

SELECT 'Provider job functions fixed successfully!' as result;
