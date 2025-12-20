-- Feature: System Decoupling Architecture
-- Migration: 103_accept_atomic_functions.sql
-- Description: Atomic acceptance functions for all service types (delivery, shopping, queue, moving, laundry)
-- Task: 4.3 - Complete accept_*_atomic() functions for remaining services
-- Requirements: 2.3, 6.3, 8.1

-- ============================================================================
-- accept_delivery_atomic() - Race-Safe Delivery Acceptance
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_delivery_atomic(
  p_delivery_id UUID,
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
    -- 1. Lock delivery row with NOWAIT (fail immediately if already locked)
    SELECT status, user_id 
    INTO v_current_status, v_user_id
    FROM delivery_requests
    WHERE id = p_delivery_id
    FOR UPDATE NOWAIT;
    
    -- 2. Check if delivery exists
    IF v_current_status IS NULL THEN
      RAISE EXCEPTION 'DELIVERY_NOT_FOUND';
    END IF;
    
    -- 3. Check if still available
    IF v_current_status != 'pending' THEN
      RAISE EXCEPTION 'DELIVERY_ALREADY_ACCEPTED';
    END IF;
    
    -- 4. Get provider details
    SELECT 
      COALESCE(first_name || ' ' || last_name, 'Rider') as name,
      phone_number,
      vehicle_plate_number
    INTO v_provider_name, v_provider_phone, v_vehicle_plate
    FROM service_providers
    WHERE id = p_provider_id;
    
    IF v_provider_name IS NULL THEN
      RAISE EXCEPTION 'PROVIDER_NOT_FOUND';
    END IF;
    
    -- 5. Update delivery to matched
    UPDATE delivery_requests
    SET
      status = 'matched',
      provider_id = p_provider_id,
      matched_at = NOW(),
      updated_at = NOW()
    WHERE id = p_delivery_id;
    
    -- 6. Update provider status to busy
    UPDATE service_providers
    SET
      status = 'busy',
      updated_at = NOW()
    WHERE id = p_provider_id;
    
    -- 7. Log status change in audit log
    INSERT INTO status_audit_log (
      entity_type,
      entity_id,
      old_status,
      new_status,
      changed_by,
      changed_by_role,
      created_at
    ) VALUES (
      'delivery_request',
      p_delivery_id,
      'pending',
      'matched',
      p_provider_id,
      'provider',
      NOW()
    );
    
    -- 8. Notify customer
    PERFORM send_notification(
      v_user_id,
      'delivery_matched',
      'พบไรเดอร์แล้ว!',
      'ไรเดอร์ ' || v_provider_name || ' กำลังมารับพัสดุ',
      json_build_object(
        'delivery_id', p_delivery_id,
        'provider_id', p_provider_id,
        'provider_name', v_provider_name,
        'provider_phone', v_provider_phone,
        'vehicle_plate', v_vehicle_plate
      )
    );
    
    -- Return success with provider details
    RETURN json_build_object(
      'success', true,
      'delivery_id', p_delivery_id,
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
      RAISE EXCEPTION 'DELIVERY_ALREADY_ACCEPTED';
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION accept_delivery_atomic TO authenticated;
COMMENT ON FUNCTION accept_delivery_atomic IS 'Atomically accepts a delivery with race condition prevention using FOR UPDATE NOWAIT lock';


-- ============================================================================
-- accept_shopping_atomic() - Race-Safe Shopping Acceptance
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_shopping_atomic(
  p_shopping_id UUID,
  p_provider_id UUID
) RETURNS JSON AS $
DECLARE
  v_current_status TEXT;
  v_user_id UUID;
  v_provider_name TEXT;
  v_provider_phone TEXT;
BEGIN
  BEGIN
    -- 1. Lock shopping row with NOWAIT
    SELECT status, user_id 
    INTO v_current_status, v_user_id
    FROM shopping_requests
    WHERE id = p_shopping_id
    FOR UPDATE NOWAIT;
    
    -- 2. Check if shopping request exists
    IF v_current_status IS NULL THEN
      RAISE EXCEPTION 'SHOPPING_NOT_FOUND';
    END IF;
    
    -- 3. Check if still available
    IF v_current_status != 'pending' THEN
      RAISE EXCEPTION 'SHOPPING_ALREADY_ACCEPTED';
    END IF;
    
    -- 4. Get provider details
    SELECT 
      COALESCE(first_name || ' ' || last_name, 'Shopper') as name,
      phone_number
    INTO v_provider_name, v_provider_phone
    FROM service_providers
    WHERE id = p_provider_id;
    
    IF v_provider_name IS NULL THEN
      RAISE EXCEPTION 'PROVIDER_NOT_FOUND';
    END IF;
    
    -- 5. Update shopping to matched
    UPDATE shopping_requests
    SET
      status = 'matched',
      provider_id = p_provider_id,
      matched_at = NOW(),
      updated_at = NOW()
    WHERE id = p_shopping_id;
    
    -- 6. Update provider status to busy
    UPDATE service_providers
    SET
      status = 'busy',
      updated_at = NOW()
    WHERE id = p_provider_id;
    
    -- 7. Log status change in audit log
    INSERT INTO status_audit_log (
      entity_type,
      entity_id,
      old_status,
      new_status,
      changed_by,
      changed_by_role,
      created_at
    ) VALUES (
      'shopping_request',
      p_shopping_id,
      'pending',
      'matched',
      p_provider_id,
      'provider',
      NOW()
    );
    
    -- 8. Notify customer
    PERFORM send_notification(
      v_user_id,
      'shopping_matched',
      'พบผู้ช่วยซื้อแล้ว!',
      v_provider_name || ' กำลังไปซื้อของให้คุณ',
      json_build_object(
        'shopping_id', p_shopping_id,
        'provider_id', p_provider_id,
        'provider_name', v_provider_name,
        'provider_phone', v_provider_phone
      )
    );
    
    -- Return success
    RETURN json_build_object(
      'success', true,
      'shopping_id', p_shopping_id,
      'status', 'matched',
      'provider', json_build_object(
        'id', p_provider_id,
        'name', v_provider_name,
        'phone', v_provider_phone
      )
    );
    
  EXCEPTION
    WHEN lock_not_available THEN
      RAISE EXCEPTION 'SHOPPING_ALREADY_ACCEPTED';
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION accept_shopping_atomic TO authenticated;
COMMENT ON FUNCTION accept_shopping_atomic IS 'Atomically accepts a shopping request with race condition prevention';

-- ============================================================================
-- accept_queue_atomic() - Race-Safe Queue Booking Acceptance
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_queue_atomic(
  p_queue_id UUID,
  p_provider_id UUID
) RETURNS JSON AS $
DECLARE
  v_current_status TEXT;
  v_user_id UUID;
  v_provider_name TEXT;
  v_provider_phone TEXT;
  v_place_name TEXT;
BEGIN
  BEGIN
    -- 1. Lock queue row with NOWAIT
    SELECT status, user_id, place_name
    INTO v_current_status, v_user_id, v_place_name
    FROM queue_bookings
    WHERE id = p_queue_id
    FOR UPDATE NOWAIT;
    
    -- 2. Check if queue booking exists
    IF v_current_status IS NULL THEN
      RAISE EXCEPTION 'QUEUE_NOT_FOUND';
    END IF;
    
    -- 3. Check if still available
    IF v_current_status != 'pending' THEN
      RAISE EXCEPTION 'QUEUE_ALREADY_ACCEPTED';
    END IF;
    
    -- 4. Get provider details
    SELECT 
      COALESCE(first_name || ' ' || last_name, 'Provider') as name,
      phone_number
    INTO v_provider_name, v_provider_phone
    FROM service_providers
    WHERE id = p_provider_id;
    
    IF v_provider_name IS NULL THEN
      RAISE EXCEPTION 'PROVIDER_NOT_FOUND';
    END IF;
    
    -- 5. Update queue to matched
    UPDATE queue_bookings
    SET
      status = 'matched',
      provider_id = p_provider_id,
      matched_at = NOW(),
      updated_at = NOW()
    WHERE id = p_queue_id;
    
    -- 6. Update provider status to busy
    UPDATE service_providers
    SET
      status = 'busy',
      updated_at = NOW()
    WHERE id = p_provider_id;
    
    -- 7. Log status change in audit log
    INSERT INTO status_audit_log (
      entity_type,
      entity_id,
      old_status,
      new_status,
      changed_by,
      changed_by_role,
      created_at
    ) VALUES (
      'queue_booking',
      p_queue_id,
      'pending',
      'matched',
      p_provider_id,
      'provider',
      NOW()
    );
    
    -- 8. Notify customer
    PERFORM send_notification(
      v_user_id,
      'queue_matched',
      'พบผู้รับจองคิวแล้ว!',
      v_provider_name || ' จะไปต่อคิวที่ ' || COALESCE(v_place_name, 'สถานที่') || ' ให้คุณ',
      json_build_object(
        'queue_id', p_queue_id,
        'provider_id', p_provider_id,
        'provider_name', v_provider_name,
        'provider_phone', v_provider_phone,
        'place_name', v_place_name
      )
    );
    
    -- Return success
    RETURN json_build_object(
      'success', true,
      'queue_id', p_queue_id,
      'status', 'matched',
      'provider', json_build_object(
        'id', p_provider_id,
        'name', v_provider_name,
        'phone', v_provider_phone
      )
    );
    
  EXCEPTION
    WHEN lock_not_available THEN
      RAISE EXCEPTION 'QUEUE_ALREADY_ACCEPTED';
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION accept_queue_atomic TO authenticated;
COMMENT ON FUNCTION accept_queue_atomic IS 'Atomically accepts a queue booking with race condition prevention';


-- ============================================================================
-- accept_moving_atomic() - Race-Safe Moving Request Acceptance
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_moving_atomic(
  p_moving_id UUID,
  p_provider_id UUID
) RETURNS JSON AS $
DECLARE
  v_current_status TEXT;
  v_user_id UUID;
  v_provider_name TEXT;
  v_provider_phone TEXT;
  v_vehicle_plate TEXT;
  v_service_type TEXT;
BEGIN
  BEGIN
    -- 1. Lock moving row with NOWAIT
    SELECT status, user_id, service_type
    INTO v_current_status, v_user_id, v_service_type
    FROM moving_requests
    WHERE id = p_moving_id
    FOR UPDATE NOWAIT;
    
    -- 2. Check if moving request exists
    IF v_current_status IS NULL THEN
      RAISE EXCEPTION 'MOVING_NOT_FOUND';
    END IF;
    
    -- 3. Check if still available
    IF v_current_status != 'pending' THEN
      RAISE EXCEPTION 'MOVING_ALREADY_ACCEPTED';
    END IF;
    
    -- 4. Get provider details
    SELECT 
      COALESCE(first_name || ' ' || last_name, 'Mover') as name,
      phone_number,
      vehicle_plate_number
    INTO v_provider_name, v_provider_phone, v_vehicle_plate
    FROM service_providers
    WHERE id = p_provider_id;
    
    IF v_provider_name IS NULL THEN
      RAISE EXCEPTION 'PROVIDER_NOT_FOUND';
    END IF;
    
    -- 5. Update moving to matched
    UPDATE moving_requests
    SET
      status = 'matched',
      provider_id = p_provider_id,
      matched_at = NOW(),
      updated_at = NOW()
    WHERE id = p_moving_id;
    
    -- 6. Update provider status to busy
    UPDATE service_providers
    SET
      status = 'busy',
      updated_at = NOW()
    WHERE id = p_provider_id;
    
    -- 7. Log status change in audit log
    INSERT INTO status_audit_log (
      entity_type,
      entity_id,
      old_status,
      new_status,
      changed_by,
      changed_by_role,
      created_at
    ) VALUES (
      'moving_request',
      p_moving_id,
      'pending',
      'matched',
      p_provider_id,
      'provider',
      NOW()
    );
    
    -- 8. Notify customer
    PERFORM send_notification(
      v_user_id,
      'moving_matched',
      'พบทีมขนย้ายแล้ว!',
      v_provider_name || ' กำลังเตรียมมาขนย้ายให้คุณ',
      json_build_object(
        'moving_id', p_moving_id,
        'provider_id', p_provider_id,
        'provider_name', v_provider_name,
        'provider_phone', v_provider_phone,
        'vehicle_plate', v_vehicle_plate,
        'service_type', v_service_type
      )
    );
    
    -- Return success
    RETURN json_build_object(
      'success', true,
      'moving_id', p_moving_id,
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
      RAISE EXCEPTION 'MOVING_ALREADY_ACCEPTED';
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION accept_moving_atomic TO authenticated;
COMMENT ON FUNCTION accept_moving_atomic IS 'Atomically accepts a moving request with race condition prevention';

-- ============================================================================
-- accept_laundry_atomic() - Race-Safe Laundry Request Acceptance
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_laundry_atomic(
  p_laundry_id UUID,
  p_provider_id UUID
) RETURNS JSON AS $
DECLARE
  v_current_status TEXT;
  v_user_id UUID;
  v_provider_name TEXT;
  v_provider_phone TEXT;
  v_service_type TEXT;
BEGIN
  BEGIN
    -- 1. Lock laundry row with NOWAIT
    SELECT status, user_id, service_type
    INTO v_current_status, v_user_id, v_service_type
    FROM laundry_requests
    WHERE id = p_laundry_id
    FOR UPDATE NOWAIT;
    
    -- 2. Check if laundry request exists
    IF v_current_status IS NULL THEN
      RAISE EXCEPTION 'LAUNDRY_NOT_FOUND';
    END IF;
    
    -- 3. Check if still available
    IF v_current_status != 'pending' THEN
      RAISE EXCEPTION 'LAUNDRY_ALREADY_ACCEPTED';
    END IF;
    
    -- 4. Get provider details
    SELECT 
      COALESCE(first_name || ' ' || last_name, 'Laundry Provider') as name,
      phone_number
    INTO v_provider_name, v_provider_phone
    FROM service_providers
    WHERE id = p_provider_id;
    
    IF v_provider_name IS NULL THEN
      RAISE EXCEPTION 'PROVIDER_NOT_FOUND';
    END IF;
    
    -- 5. Update laundry to matched
    UPDATE laundry_requests
    SET
      status = 'matched',
      provider_id = p_provider_id,
      matched_at = NOW(),
      updated_at = NOW()
    WHERE id = p_laundry_id;
    
    -- 6. Update provider status to busy
    UPDATE service_providers
    SET
      status = 'busy',
      updated_at = NOW()
    WHERE id = p_provider_id;
    
    -- 7. Log status change in audit log
    INSERT INTO status_audit_log (
      entity_type,
      entity_id,
      old_status,
      new_status,
      changed_by,
      changed_by_role,
      created_at
    ) VALUES (
      'laundry_request',
      p_laundry_id,
      'pending',
      'matched',
      p_provider_id,
      'provider',
      NOW()
    );
    
    -- 8. Notify customer
    PERFORM send_notification(
      v_user_id,
      'laundry_matched',
      'พบร้านซักรีดแล้ว!',
      v_provider_name || ' จะมารับผ้าของคุณ',
      json_build_object(
        'laundry_id', p_laundry_id,
        'provider_id', p_provider_id,
        'provider_name', v_provider_name,
        'provider_phone', v_provider_phone,
        'service_type', v_service_type
      )
    );
    
    -- Return success
    RETURN json_build_object(
      'success', true,
      'laundry_id', p_laundry_id,
      'status', 'matched',
      'provider', json_build_object(
        'id', p_provider_id,
        'name', v_provider_name,
        'phone', v_provider_phone
      )
    );
    
  EXCEPTION
    WHEN lock_not_available THEN
      RAISE EXCEPTION 'LAUNDRY_ALREADY_ACCEPTED';
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION accept_laundry_atomic TO authenticated;
COMMENT ON FUNCTION accept_laundry_atomic IS 'Atomically accepts a laundry request with race condition prevention';
