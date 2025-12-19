-- Feature: Multi-Role Ride Booking System V3
-- Migration: 089_accept_ride_atomic_function.sql
-- Description: Atomic ride acceptance with race condition handling using database locks

-- ============================================================================
-- accept_ride_atomic() - Race-Safe Ride Acceptance
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_ride_atomic(
  p_ride_id UUID,
  p_provider_id UUID
) RETURNS JSON AS $$
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
    FOR UPDATE NOWAIT; -- Critical: prevents race condition
    
    -- 2. Check if ride exists
    IF v_current_status IS NULL THEN
      RAISE EXCEPTION 'RIDE_NOT_FOUND';
    END IF;
    
    -- 3. Check if still available
    IF v_current_status != 'pending' THEN
      RAISE EXCEPTION 'RIDE_ALREADY_ACCEPTED';
    END IF;
    
    -- 4. Get provider details
    SELECT 
      COALESCE(first_name || ' ' || last_name, 'Provider') as name,
      phone_number,
      vehicle_plate_number
    INTO v_provider_name, v_provider_phone, v_vehicle_plate
    FROM service_providers
    WHERE id = p_provider_id;
    
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
      status = 'busy',
      current_ride_id = p_ride_id,
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
      'ride_request',
      p_ride_id,
      'pending',
      'matched',
      p_provider_id,
      'provider',
      NOW()
    );
    
    -- 8. Notify customer
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
      -- Another provider is accepting right now
      RAISE EXCEPTION 'RIDE_ALREADY_ACCEPTED';
    WHEN OTHERS THEN
      -- Re-raise other exceptions
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION accept_ride_atomic TO authenticated;

-- Add comment
COMMENT ON FUNCTION accept_ride_atomic IS 'Atomically accepts a ride with race condition prevention using FOR UPDATE NOWAIT lock';
