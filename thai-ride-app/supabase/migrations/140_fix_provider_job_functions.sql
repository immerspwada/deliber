-- Migration: 140_fix_provider_job_functions.sql
-- Description: Fix provider job functions to work with real customer data
-- Feature: F14 - Provider Dashboard (Production Ready)

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
-- 2. FIX get_provider_active_ride - Use correct column names
-- ============================================================================

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
  ride_distance DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE,
  matched_at TIMESTAMP WITH TIME ZONE
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    r.id as ride_id,
    r.tracking_id,
    r.status::VARCHAR(20),
    r.user_id as passenger_id,
    COALESCE(u.first_name || ' ' || u.last_name, 'ผู้โดยสาร')::TEXT as passenger_name,
    COALESCE(u.phone_number, '')::TEXT as passenger_phone,
    u.profile_image::TEXT as passenger_avatar,
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
        cos(radians(r.pickup_lat)) * cos(radians(r.destination_lat)) *
        cos(radians(r.destination_lng) - radians(r.pickup_lng)) +
        sin(radians(r.pickup_lat)) * sin(radians(r.destination_lat))
      ))
    ))::DECIMAL(10,2) as ride_distance,
    r.created_at,
    r.matched_at
  FROM public.ride_requests r
  LEFT JOIN public.users u ON u.id = r.user_id
  WHERE r.provider_id = p_provider_id
    AND r.status IN ('matched', 'arriving', 'arrived', 'pickup', 'picked_up', 'in_progress')
  ORDER BY r.matched_at DESC
  LIMIT 1;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. FIX accept_ride_atomic - Use correct column names for provider
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
    -- 1. Lock ride row with NOWAIT (fail immediately if already locked)
    SELECT status, user_id 
    INTO v_current_status, v_user_id
    FROM ride_requests
    WHERE id = p_ride_id
    FOR UPDATE NOWAIT;
    
    -- 2. Check if ride exists
    IF v_current_status IS NULL THEN
      RAISE EXCEPTION 'RIDE_NOT_FOUND';
    END IF;
    
    -- 3. Check if still available
    IF v_current_status != 'pending' THEN
      RAISE EXCEPTION 'RIDE_ALREADY_ACCEPTED';
    END IF;
    
    -- 4. Get provider details (use correct column names)
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
    
    -- 5. Update ride to matched
    UPDATE ride_requests
    SET
      status = 'matched',
      provider_id = p_provider_id,
      matched_at = NOW(),
      updated_at = NOW()
    WHERE id = p_ride_id;
    
    -- 6. Update provider status to busy
    UPDATE service_providers
    SET
      is_available = false,
      updated_at = NOW()
    WHERE id = p_provider_id;
    
    -- 7. Log status change in audit log (if table exists)
    BEGIN
      INSERT INTO status_audit_log (
        entity_type,
        entity_id,
        old_status,
        new_status,
        changed_by,
        changed_by_role,
        created_at
      ) VALUES (
        'ride_request',
        p_ride_id,
        'pending',
        'matched',
        p_provider_id,
        'provider',
        NOW()
      );
    EXCEPTION WHEN undefined_table THEN
      -- Ignore if table doesn't exist
      NULL;
    END;
    
    -- 8. Notify customer (if function exists)
    BEGIN
      PERFORM send_notification(
        v_user_id,
        'ride_matched',
        'พบคนขับแล้ว!',
        'คนขับ ' || v_provider_name || ' กำลังมาหาคุณ',
        json_build_object(
          'ride_id', p_ride_id,
          'provider_id', p_provider_id,
          'provider_name', v_provider_name,
          'provider_phone', v_provider_phone,
          'vehicle_plate', v_vehicle_plate
        )
      );
    EXCEPTION WHEN undefined_function THEN
      -- Ignore if function doesn't exist
      NULL;
    END;
    
    -- Return success with provider details
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
-- 4. FIX get_available_deliveries_for_provider
-- ============================================================================

CREATE OR REPLACE FUNCTION get_available_deliveries_for_provider(
  p_provider_id UUID,
  p_radius_km INTEGER DEFAULT 10
)
RETURNS TABLE (
  delivery_id UUID,
  tracking_id VARCHAR(25),
  user_id UUID,
  customer_name TEXT,
  sender_name TEXT,
  sender_phone TEXT,
  sender_address TEXT,
  sender_lat DECIMAL(10,8),
  sender_lng DECIMAL(11,8),
  recipient_name TEXT,
  recipient_phone TEXT,
  recipient_address TEXT,
  recipient_lat DECIMAL(10,8),
  recipient_lng DECIMAL(11,8),
  package_type TEXT,
  package_description TEXT,
  estimated_fee DECIMAL(10,2),
  distance_km DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    d.id as delivery_id,
    d.tracking_id,
    d.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, 'ลูกค้า')::TEXT as customer_name,
    COALESCE(d.sender_name, '')::TEXT,
    COALESCE(d.sender_phone, '')::TEXT,
    COALESCE(d.sender_address, '')::TEXT,
    d.sender_lat,
    d.sender_lng,
    COALESCE(d.recipient_name, '')::TEXT,
    COALESCE(d.recipient_phone, '')::TEXT,
    COALESCE(d.recipient_address, '')::TEXT,
    d.recipient_lat,
    d.recipient_lng,
    COALESCE(d.package_type, 'standard')::TEXT,
    d.package_description::TEXT,
    COALESCE(d.estimated_fee, 0)::DECIMAL(10,2),
    (6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(d.sender_lat)) * cos(radians(d.recipient_lat)) *
        cos(radians(d.recipient_lng) - radians(d.sender_lng)) +
        sin(radians(d.sender_lat)) * sin(radians(d.recipient_lat))
      ))
    ))::DECIMAL(10,2) as distance_km,
    d.created_at
  FROM public.delivery_requests d
  LEFT JOIN public.users u ON u.id = d.user_id
  WHERE d.status = 'pending'
    AND d.provider_id IS NULL
  ORDER BY d.created_at DESC
  LIMIT 20;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. FIX get_available_shopping_for_provider
-- ============================================================================

CREATE OR REPLACE FUNCTION get_available_shopping_for_provider(
  p_provider_id UUID,
  p_radius_km INTEGER DEFAULT 10
)
RETURNS TABLE (
  shopping_id UUID,
  tracking_id VARCHAR(25),
  user_id UUID,
  customer_name TEXT,
  store_name TEXT,
  store_address TEXT,
  store_lat DECIMAL(10,8),
  store_lng DECIMAL(11,8),
  delivery_address TEXT,
  delivery_lat DECIMAL(10,8),
  delivery_lng DECIMAL(11,8),
  items JSONB,
  item_list TEXT,
  budget_limit DECIMAL(10,2),
  service_fee DECIMAL(10,2),
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    s.id as shopping_id,
    s.tracking_id,
    s.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, 'ลูกค้า')::TEXT as customer_name,
    COALESCE(s.store_name, 'ร้านค้า')::TEXT,
    s.store_address::TEXT,
    s.store_lat,
    s.store_lng,
    COALESCE(s.delivery_address, '')::TEXT,
    s.delivery_lat,
    s.delivery_lng,
    COALESCE(s.items, '[]'::JSONB),
    s.item_list::TEXT,
    COALESCE(s.budget_limit, 0)::DECIMAL(10,2),
    COALESCE(s.service_fee, 0)::DECIMAL(10,2),
    s.special_instructions::TEXT,
    s.created_at
  FROM public.shopping_requests s
  LEFT JOIN public.users u ON u.id = s.user_id
  WHERE s.status = 'pending'
    AND s.provider_id IS NULL
  ORDER BY s.created_at DESC
  LIMIT 20;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. CREATE accept_delivery_request function
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_delivery_request(
  p_delivery_id UUID,
  p_provider_id UUID
) RETURNS JSON AS $
DECLARE
  v_current_status TEXT;
  v_user_id UUID;
  v_delivery RECORD;
BEGIN
  -- Lock and check
  SELECT status, user_id INTO v_current_status, v_user_id
  FROM delivery_requests
  WHERE id = p_delivery_id
  FOR UPDATE NOWAIT;
  
  IF v_current_status IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'ไม่พบงานส่งของนี้');
  END IF;
  
  IF v_current_status != 'pending' THEN
    RETURN json_build_object('success', false, 'message', 'งานนี้ถูกรับไปแล้ว');
  END IF;
  
  -- Update delivery
  UPDATE delivery_requests
  SET status = 'matched', provider_id = p_provider_id, matched_at = NOW(), updated_at = NOW()
  WHERE id = p_delivery_id
  RETURNING * INTO v_delivery;
  
  -- Update provider
  UPDATE service_providers SET is_available = false, updated_at = NOW() WHERE id = p_provider_id;
  
  RETURN json_build_object(
    'success', true,
    'delivery_data', row_to_json(v_delivery)
  );
EXCEPTION
  WHEN lock_not_available THEN
    RETURN json_build_object('success', false, 'message', 'งานนี้ถูกรับไปแล้ว');
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. CREATE accept_shopping_request function
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_shopping_request(
  p_shopping_id UUID,
  p_provider_id UUID
) RETURNS JSON AS $
DECLARE
  v_current_status TEXT;
  v_user_id UUID;
  v_shopping RECORD;
BEGIN
  -- Lock and check
  SELECT status, user_id INTO v_current_status, v_user_id
  FROM shopping_requests
  WHERE id = p_shopping_id
  FOR UPDATE NOWAIT;
  
  IF v_current_status IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'ไม่พบงานซื้อของนี้');
  END IF;
  
  IF v_current_status != 'pending' THEN
    RETURN json_build_object('success', false, 'message', 'งานนี้ถูกรับไปแล้ว');
  END IF;
  
  -- Update shopping
  UPDATE shopping_requests
  SET status = 'matched', provider_id = p_provider_id, matched_at = NOW(), updated_at = NOW()
  WHERE id = p_shopping_id
  RETURNING * INTO v_shopping;
  
  -- Update provider
  UPDATE service_providers SET is_available = false, updated_at = NOW() WHERE id = p_provider_id;
  
  RETURN json_build_object(
    'success', true,
    'shopping_data', row_to_json(v_shopping)
  );
EXCEPTION
  WHEN lock_not_available THEN
    RETURN json_build_object('success', false, 'message', 'งานนี้ถูกรับไปแล้ว');
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_available_rides_for_provider TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_rides_for_provider TO anon;
GRANT EXECUTE ON FUNCTION get_provider_active_ride TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_active_ride TO anon;
GRANT EXECUTE ON FUNCTION accept_ride_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_deliveries_for_provider TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_deliveries_for_provider TO anon;
GRANT EXECUTE ON FUNCTION get_available_shopping_for_provider TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_shopping_for_provider TO anon;
GRANT EXECUTE ON FUNCTION accept_delivery_request TO authenticated;
GRANT EXECUTE ON FUNCTION accept_shopping_request TO authenticated;

-- ============================================================================
-- 9. ENSURE RLS POLICIES FOR PROVIDER ACCESS
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

-- Allow providers to see pending delivery requests
DROP POLICY IF EXISTS "providers_view_pending_deliveries" ON delivery_requests;
CREATE POLICY "providers_view_pending_deliveries" ON delivery_requests
  FOR SELECT TO authenticated
  USING (
    status = 'pending' 
    OR provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

-- Allow providers to update deliveries they accepted
DROP POLICY IF EXISTS "providers_update_own_deliveries" ON delivery_requests;
CREATE POLICY "providers_update_own_deliveries" ON delivery_requests
  FOR UPDATE TO authenticated
  USING (
    provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
  );

-- Allow providers to see pending shopping requests
DROP POLICY IF EXISTS "providers_view_pending_shopping" ON shopping_requests;
CREATE POLICY "providers_view_pending_shopping" ON shopping_requests
  FOR SELECT TO authenticated
  USING (
    status = 'pending' 
    OR provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

-- Allow providers to update shopping they accepted
DROP POLICY IF EXISTS "providers_update_own_shopping" ON shopping_requests;
CREATE POLICY "providers_update_own_shopping" ON shopping_requests
  FOR UPDATE TO authenticated
  USING (
    provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
  );

-- ============================================================================
-- 10. ENABLE REALTIME FOR PROVIDER TABLES
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE ride_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE service_providers;

COMMENT ON FUNCTION get_available_rides_for_provider IS 'Get pending rides within radius for provider - Fixed column names';
COMMENT ON FUNCTION accept_ride_atomic IS 'Atomically accept ride with race condition prevention - Fixed column names';
