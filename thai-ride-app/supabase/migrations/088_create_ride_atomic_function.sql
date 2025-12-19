-- Feature: Multi-Role Ride Booking System V3
-- Migration: 088_create_ride_atomic_function.sql
-- Description: Atomic ride creation with wallet hold and rollback guarantee

-- ============================================================================
-- create_ride_atomic() - Atomic Ride Creation
-- ============================================================================

CREATE OR REPLACE FUNCTION create_ride_atomic(
  p_user_id UUID,
  p_pickup_lat DECIMAL,
  p_pickup_lng DECIMAL,
  p_pickup_address TEXT,
  p_destination_lat DECIMAL,
  p_destination_lng DECIMAL,
  p_destination_address TEXT,
  p_vehicle_type TEXT,
  p_estimated_fare DECIMAL,
  p_promo_code TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_ride_id UUID;
  v_tracking_id TEXT;
  v_wallet_balance DECIMAL;
  v_final_fare DECIMAL;
  v_discount DECIMAL := 0;
BEGIN
  -- Start atomic transaction
  BEGIN
    -- 1. Check and lock wallet
    SELECT balance INTO v_wallet_balance
    FROM user_wallets
    WHERE user_id = p_user_id
    FOR UPDATE; -- Lock the row to prevent concurrent modifications
    
    -- Handle case where wallet doesn't exist
    IF v_wallet_balance IS NULL THEN
      RAISE EXCEPTION 'WALLET_NOT_FOUND';
    END IF;
    
    -- 2. Apply promo code if provided
    IF p_promo_code IS NOT NULL THEN
      -- Validate and apply promo
      SELECT discount_amount INTO v_discount
      FROM promo_codes
      WHERE code = p_promo_code
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (usage_limit IS NULL OR usage_count < usage_limit);
      
      IF v_discount IS NULL THEN
        v_discount := 0; -- Invalid promo, proceed without discount
      END IF;
    END IF;
    
    v_final_fare := GREATEST(p_estimated_fare - v_discount, 0);
    
    -- 3. Check sufficient balance
    IF v_wallet_balance < v_final_fare THEN
      RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
    END IF;
    
    -- 4. Hold credit
    UPDATE user_wallets
    SET 
      balance = balance - v_final_fare,
      held_balance = held_balance + v_final_fare,
      updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- 5. Create ride request
    v_ride_id := gen_random_uuid();
    v_tracking_id := generate_tracking_id('RID');
    
    INSERT INTO ride_requests (
      id,
      tracking_id,
      user_id,
      pickup_lat,
      pickup_lng,
      pickup_address,
      destination_lat,
      destination_lng,
      destination_address,
      vehicle_type,
      estimated_fare,
      actual_fare,
      status,
      created_at
    ) VALUES (
      v_ride_id,
      v_tracking_id,
      p_user_id,
      p_pickup_lat,
      p_pickup_lng,
      p_pickup_address,
      p_destination_lat,
      p_destination_lng,
      p_destination_address,
      p_vehicle_type,
      v_final_fare,
      NULL,
      'pending',
      NOW()
    );
    
    -- 6. Create wallet hold record
    INSERT INTO wallet_holds (
      user_id,
      ride_id,
      amount,
      status,
      created_at
    ) VALUES (
      p_user_id,
      v_ride_id,
      v_final_fare,
      'held',
      NOW()
    );
    
    -- 7. Log wallet transaction
    INSERT INTO wallet_transactions (
      user_id,
      amount,
      type,
      status,
      reference_type,
      reference_id,
      description,
      created_at
    ) VALUES (
      p_user_id,
      -v_final_fare,
      'ride_hold',
      'held',
      'ride_request',
      v_ride_id,
      'Credit hold for ride ' || v_tracking_id,
      NOW()
    );
    
    -- 8. Update promo usage if applied
    IF p_promo_code IS NOT NULL AND v_discount > 0 THEN
      UPDATE promo_codes
      SET usage_count = usage_count + 1
      WHERE code = p_promo_code;
      
      INSERT INTO user_promo_usage (user_id, promo_code_id, ride_id, discount_amount)
      SELECT p_user_id, id, v_ride_id, v_discount
      FROM promo_codes
      WHERE code = p_promo_code;
    END IF;
    
    -- 9. Trigger notification to nearby providers
    PERFORM notify_nearby_providers_new_ride(v_ride_id);
    
    -- 10. Log audit trail
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
      v_ride_id,
      NULL,
      'pending',
      p_user_id,
      'customer',
      NOW()
    );
    
    -- Return success
    RETURN json_build_object(
      'success', true,
      'ride_id', v_ride_id,
      'tracking_id', v_tracking_id,
      'status', 'pending',
      'estimated_fare', v_final_fare,
      'discount_applied', v_discount,
      'wallet_held', v_final_fare
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Automatic rollback on any error
      -- PostgreSQL automatically rolls back the transaction
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_ride_atomic TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_ride_atomic IS 'Atomically creates a ride request with wallet hold. Rolls back completely on any failure.';
