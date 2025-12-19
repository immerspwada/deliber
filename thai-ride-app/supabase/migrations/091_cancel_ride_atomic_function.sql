-- Feature: Multi-Role Ride Booking System V3
-- Migration: 091_cancel_ride_atomic_function.sql
-- Description: Atomic ride cancellation with smart refund policy

-- ============================================================================
-- cancel_ride_atomic() - Atomic Ride Cancellation
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_ride_atomic(
  p_ride_id UUID,
  p_cancelled_by UUID,
  p_cancelled_by_role TEXT,
  p_cancel_reason TEXT
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_provider_id UUID;
  v_estimated_fare DECIMAL;
  v_current_status TEXT;
  v_cancellation_fee DECIMAL := 0;
  v_refund_amount DECIMAL;
BEGIN
  BEGIN
    -- 1. Get and lock ride details
    SELECT user_id, provider_id, estimated_fare, status
    INTO v_user_id, v_provider_id, v_estimated_fare, v_current_status
    FROM ride_requests
    WHERE id = p_ride_id
    FOR UPDATE;
    
    -- Validate ride exists
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'RIDE_NOT_FOUND';
    END IF;
    
    -- Validate not already completed or cancelled
    IF v_current_status IN ('completed', 'cancelled') THEN
      RAISE EXCEPTION 'RIDE_ALREADY_FINALIZED';
    END IF;
    
    -- 2. Calculate cancellation fee based on canceller and status
    IF p_cancelled_by_role = 'customer' AND v_current_status IN ('matched', 'arriving') THEN
      -- Customer cancels after match: 20% fee
      v_cancellation_fee := v_estimated_fare * 0.20;
    ELSIF p_cancelled_by_role = 'provider' AND v_current_status IN ('matched', 'arriving', 'picked_up') THEN
      -- Provider cancels: no fee to customer, but log for provider penalty
      v_cancellation_fee := 0;
      
      -- Log provider cancellation
      INSERT INTO provider_cancellation_log (
        provider_id,
        ride_id,
        cancelled_at,
        reason,
        created_at
      ) VALUES (
        v_provider_id,
        p_ride_id,
        NOW(),
        p_cancel_reason,
        NOW()
      );
    ELSE
      -- Admin/System cancels or customer cancels before match: no fee
      v_cancellation_fee := 0;
    END IF;
    
    v_refund_amount := v_estimated_fare - v_cancellation_fee;
    
    -- 3. Update ride status
    UPDATE ride_requests
    SET
      status = 'cancelled',
      cancelled_at = NOW(),
      cancelled_by = p_cancelled_by,
      cancelled_by_role = p_cancelled_by_role,
      cancel_reason = p_cancel_reason,
      cancellation_fee = v_cancellation_fee,
      updated_at = NOW()
    WHERE id = p_ride_id;
    
    -- 4. Process refund to customer wallet
    UPDATE user_wallets
    SET
      held_balance = held_balance - v_estimated_fare,
      balance = balance + v_refund_amount,
      updated_at = NOW()
    WHERE user_id = v_user_id;
    
    -- Update wallet hold status
    UPDATE wallet_holds
    SET
      status = 'released',
      released_at = NOW()
    WHERE ride_id = p_ride_id;
    
    -- Log refund transaction
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
      'Cancellation refund (Fee: ' || v_cancellation_fee || ' THB)',
      NOW()
    );
    
    -- 5. Release provider if assigned
    IF v_provider_id IS NOT NULL THEN
      UPDATE service_providers
      SET
        status = 'available',
        current_ride_id = NULL,
        updated_at = NOW()
      WHERE id = v_provider_id;
      
      -- Notify provider
      PERFORM send_notification(
        v_provider_id,
        'ride_cancelled',
        'งานถูกยกเลิก',
        CASE 
          WHEN p_cancelled_by_role = 'customer' THEN 'ลูกค้ายกเลิกการเดินทาง'
          WHEN p_cancelled_by_role = 'admin' THEN 'Admin ยกเลิกการเดินทาง'
          ELSE 'การเดินทางถูกยกเลิก'
        END,
        json_build_object('ride_id', p_ride_id, 'reason', p_cancel_reason)
      );
    END IF;
    
    -- 6. Notify customer
    PERFORM send_notification(
      v_user_id,
      'ride_cancelled',
      'ยกเลิกเรียบร้อย',
      'เงินจำนวน ' || v_refund_amount || ' บาทถูกคืนแล้ว',
      json_build_object(
        'ride_id', p_ride_id,
        'refund', v_refund_amount,
        'cancellation_fee', v_cancellation_fee
      )
    );
    
    -- 7. Log audit trail
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
      'cancelled',
      p_cancelled_by,
      p_cancelled_by_role,
      json_build_object(
        'reason', p_cancel_reason,
        'cancellation_fee', v_cancellation_fee,
        'refund_amount', v_refund_amount
      ),
      NOW()
    );
    
    -- Return success
    RETURN json_build_object(
      'success', true,
      'ride_id', p_ride_id,
      'refund_amount', v_refund_amount,
      'cancellation_fee', v_cancellation_fee,
      'cancelled_by_role', p_cancelled_by_role
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cancel_ride_atomic TO authenticated;

-- Add comment
COMMENT ON FUNCTION cancel_ride_atomic IS 'Atomically cancels a ride with smart refund policy based on canceller and status';
