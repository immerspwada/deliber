-- Feature: Multi-Role Ride Booking System V3
-- Migration: 090_complete_ride_atomic_function.sql
-- Description: Atomic ride completion with payment settlement and loyalty points

-- ============================================================================
-- complete_ride_atomic() - Atomic Ride Completion
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_ride_atomic(
  p_ride_id UUID,
  p_provider_id UUID,
  p_actual_fare DECIMAL DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_estimated_fare DECIMAL;
  v_final_fare DECIMAL;
  v_platform_fee DECIMAL;
  v_provider_earnings DECIMAL;
  v_refund_amount DECIMAL := 0;
  v_current_status TEXT;
  v_loyalty_points INTEGER;
BEGIN
  BEGIN
    -- 1. Get and lock ride details
    SELECT user_id, estimated_fare, status
    INTO v_user_id, v_estimated_fare, v_current_status
    FROM ride_requests
    WHERE id = p_ride_id AND provider_id = p_provider_id
    FOR UPDATE;
    
    -- Validate ride exists and belongs to provider
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'RIDE_NOT_FOUND_OR_UNAUTHORIZED';
    END IF;
    
    -- Validate current status
    IF v_current_status NOT IN ('picked_up', 'in_progress') THEN
      RAISE EXCEPTION 'INVALID_STATUS_FOR_COMPLETION';
    END IF;
    
    -- 2. Calculate final amounts
    v_final_fare := COALESCE(p_actual_fare, v_estimated_fare);
    v_platform_fee := v_final_fare * 0.20; -- 20% platform fee
    v_provider_earnings := v_final_fare - v_platform_fee;
    
    -- Calculate refund if actual < estimated
    IF v_final_fare < v_estimated_fare THEN
      v_refund_amount := v_estimated_fare - v_final_fare;
    END IF;
    
    -- 3. Update ride status
    UPDATE ride_requests
    SET
      status = 'completed',
      actual_fare = v_final_fare,
      platform_fee = v_platform_fee,
      provider_earnings = v_provider_earnings,
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_ride_id;
    
    -- 4. Release wallet hold and process refund
    UPDATE user_wallets
    SET
      held_balance = held_balance - v_estimated_fare,
      balance = balance + v_refund_amount,
      updated_at = NOW()
    WHERE user_id = v_user_id;
    
    -- Update wallet hold status
    UPDATE wallet_holds
    SET
      status = 'settled',
      released_at = NOW()
    WHERE ride_id = p_ride_id;
    
    -- Log refund transaction if applicable
    IF v_refund_amount > 0 THEN
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
        v_user_id,
        v_refund_amount,
        'ride_refund',
        'completed',
        'ride_request',
        p_ride_id,
        'Fare adjustment refund',
        NOW()
      );
    END IF;
    
    -- 5. Add provider earnings
    UPDATE service_providers
    SET
      total_earnings = COALESCE(total_earnings, 0) + v_provider_earnings,
      pending_balance = COALESCE(pending_balance, 0) + v_provider_earnings,
      total_rides = COALESCE(total_rides, 0) + 1,
      status = 'available',
      current_ride_id = NULL,
      updated_at = NOW()
    WHERE id = p_provider_id;
    
    -- Log provider earnings transaction
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
      p_provider_id,
      v_provider_earnings,
      'ride_earnings',
      'completed',
      'ride_request',
      p_ride_id,
      'Ride earnings',
      NOW()
    );
    
    -- 6. Award loyalty points (1 point per 10 THB)
    v_loyalty_points := FLOOR(v_final_fare / 10);
    
    IF v_loyalty_points > 0 THEN
      PERFORM add_loyalty_points(
        v_user_id,
        v_loyalty_points,
        'ride_completed',
        p_ride_id
      );
    END IF;
    
    -- 7. Request rating from customer
    PERFORM send_notification(
      v_user_id,
      'ride_completed',
      'เดินทางเสร็จสิ้น',
      'ให้คะแนนการเดินทางของคุณ',
      json_build_object(
        'ride_id', p_ride_id,
        'action', 'rate',
        'final_fare', v_final_fare
      )
    );
    
    -- 8. Log audit trail
    INSERT INTO status_audit_log (
      entity_type,
      entity_id,
      old_status,
      new_status,
      changed_by,
      changed_by_role,
      metadata,
      created_at
    ) VALUES (
      'ride_request',
      p_ride_id,
      v_current_status,
      'completed',
      p_provider_id,
      'provider',
      json_build_object(
        'final_fare', v_final_fare,
        'platform_fee', v_platform_fee,
        'provider_earnings', v_provider_earnings,
        'refund_amount', v_refund_amount
      ),
      NOW()
    );
    
    -- Return success
    RETURN json_build_object(
      'success', true,
      'ride_id', p_ride_id,
      'final_fare', v_final_fare,
      'platform_fee', v_platform_fee,
      'provider_earnings', v_provider_earnings,
      'refund_amount', v_refund_amount,
      'loyalty_points_awarded', v_loyalty_points
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION complete_ride_atomic TO authenticated;

-- Add comment
COMMENT ON FUNCTION complete_ride_atomic IS 'Atomically completes a ride with payment settlement, provider earnings, and loyalty points';
