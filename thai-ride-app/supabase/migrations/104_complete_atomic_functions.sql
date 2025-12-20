-- Feature: System Decoupling Architecture
-- Migration: 104_complete_atomic_functions.sql
-- Description: Atomic completion functions for all service types (delivery, shopping, queue, moving, laundry)
-- Task: 4.4 - Complete complete_*_atomic() functions for remaining services
-- Requirements: 8.3

-- ============================================================================
-- complete_delivery_atomic() - Atomic Delivery Completion
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_delivery_atomic(
  p_delivery_id UUID,
  p_provider_id UUID,
  p_actual_fare DECIMAL DEFAULT NULL
) RETURNS JSON AS $
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
    -- 1. Get and lock delivery details
    SELECT user_id, estimated_fare, status
    INTO v_user_id, v_estimated_fare, v_current_status
    FROM delivery_requests
    WHERE id = p_delivery_id AND provider_id = p_provider_id
    FOR UPDATE;
    
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'DELIVERY_NOT_FOUND_OR_UNAUTHORIZED';
    END IF;
    
    IF v_current_status NOT IN ('picked_up', 'in_progress', 'delivering') THEN
      RAISE EXCEPTION 'INVALID_STATUS_FOR_COMPLETION';
    END IF;
    
    -- 2. Calculate final amounts
    v_final_fare := COALESCE(p_actual_fare, v_estimated_fare);
    v_platform_fee := v_final_fare * 0.20;
    v_provider_earnings := v_final_fare - v_platform_fee;
    
    IF v_final_fare < v_estimated_fare THEN
      v_refund_amount := v_estimated_fare - v_final_fare;
    END IF;
    
    -- 3. Update delivery status
    UPDATE delivery_requests
    SET
      status = 'completed',
      actual_fare = v_final_fare,
      platform_fee = v_platform_fee,
      provider_earnings = v_provider_earnings,
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_delivery_id;
    
    -- 4. Release wallet hold and process refund
    UPDATE user_wallets
    SET
      held_balance = held_balance - v_estimated_fare,
      balance = balance + v_refund_amount,
      updated_at = NOW()
    WHERE user_id = v_user_id;
    
    UPDATE wallet_holds
    SET status = 'settled', released_at = NOW()
    WHERE delivery_id = p_delivery_id OR (request_id = p_delivery_id AND request_type = 'delivery');
    
    IF v_refund_amount > 0 THEN
      INSERT INTO wallet_transactions (user_id, amount, type, status, reference_type, reference_id, description, created_at)
      VALUES (v_user_id, v_refund_amount, 'delivery_refund', 'completed', 'delivery_request', p_delivery_id, 'Fare adjustment refund', NOW());
    END IF;
    
    -- 5. Add provider earnings
    UPDATE service_providers
    SET
      total_earnings = COALESCE(total_earnings, 0) + v_provider_earnings,
      pending_balance = COALESCE(pending_balance, 0) + v_provider_earnings,
      status = 'available',
      updated_at = NOW()
    WHERE id = p_provider_id;
    
    INSERT INTO wallet_transactions (user_id, amount, type, status, reference_type, reference_id, description, created_at)
    VALUES (p_provider_id, v_provider_earnings, 'delivery_earnings', 'completed', 'delivery_request', p_delivery_id, 'Delivery earnings', NOW());
    
    -- 6. Award loyalty points
    v_loyalty_points := FLOOR(v_final_fare / 10);
    IF v_loyalty_points > 0 THEN
      PERFORM add_loyalty_points(v_user_id, v_loyalty_points, 'delivery_completed', p_delivery_id);
    END IF;
    
    -- 7. Request rating
    PERFORM send_notification(v_user_id, 'delivery_completed', 'ส่งของเสร็จสิ้น', 'ให้คะแนนการส่งของของคุณ',
      json_build_object('delivery_id', p_delivery_id, 'action', 'rate', 'final_fare', v_final_fare));
    
    -- 8. Log audit trail
    INSERT INTO status_audit_log (entity_type, entity_id, old_status, new_status, changed_by, changed_by_role, metadata, created_at)
    VALUES ('delivery_request', p_delivery_id, v_current_status, 'completed', p_provider_id, 'provider',
      json_build_object('final_fare', v_final_fare, 'platform_fee', v_platform_fee, 'provider_earnings', v_provider_earnings), NOW());
    
    RETURN json_build_object(
      'success', true, 'delivery_id', p_delivery_id, 'final_fare', v_final_fare,
      'platform_fee', v_platform_fee, 'provider_earnings', v_provider_earnings,
      'refund_amount', v_refund_amount, 'loyalty_points_awarded', v_loyalty_points
    );
  EXCEPTION
    WHEN OTHERS THEN RAISE;
  END;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION complete_delivery_atomic TO authenticated;
COMMENT ON FUNCTION complete_delivery_atomic IS 'Atomically completes a delivery with payment settlement and loyalty points';


-- ============================================================================
-- complete_shopping_atomic() - Atomic Shopping Completion
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_shopping_atomic(
  p_shopping_id UUID,
  p_provider_id UUID,
  p_actual_fare DECIMAL DEFAULT NULL,
  p_items_total DECIMAL DEFAULT NULL
) RETURNS JSON AS $
DECLARE
  v_user_id UUID;
  v_estimated_fare DECIMAL;
  v_estimated_items_total DECIMAL;
  v_final_fare DECIMAL;
  v_final_items_total DECIMAL;
  v_platform_fee DECIMAL;
  v_provider_earnings DECIMAL;
  v_refund_amount DECIMAL := 0;
  v_current_status TEXT;
  v_loyalty_points INTEGER;
  v_total_amount DECIMAL;
BEGIN
  BEGIN
    -- 1. Get and lock shopping details
    SELECT user_id, estimated_fare, items_total, status
    INTO v_user_id, v_estimated_fare, v_estimated_items_total, v_current_status
    FROM shopping_requests
    WHERE id = p_shopping_id AND provider_id = p_provider_id
    FOR UPDATE;
    
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'SHOPPING_NOT_FOUND_OR_UNAUTHORIZED';
    END IF;
    
    IF v_current_status NOT IN ('shopping', 'in_progress', 'delivering') THEN
      RAISE EXCEPTION 'INVALID_STATUS_FOR_COMPLETION';
    END IF;
    
    -- 2. Calculate final amounts
    v_final_fare := COALESCE(p_actual_fare, v_estimated_fare);
    v_final_items_total := COALESCE(p_items_total, v_estimated_items_total, 0);
    v_total_amount := v_final_fare + v_final_items_total;
    v_platform_fee := v_final_fare * 0.20;
    v_provider_earnings := v_final_fare - v_platform_fee;
    
    -- Calculate refund based on estimated total
    IF v_total_amount < (COALESCE(v_estimated_fare, 0) + COALESCE(v_estimated_items_total, 0)) THEN
      v_refund_amount := (COALESCE(v_estimated_fare, 0) + COALESCE(v_estimated_items_total, 0)) - v_total_amount;
    END IF;
    
    -- 3. Update shopping status
    UPDATE shopping_requests
    SET
      status = 'completed',
      actual_fare = v_final_fare,
      actual_items_total = v_final_items_total,
      platform_fee = v_platform_fee,
      provider_earnings = v_provider_earnings,
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_shopping_id;
    
    -- 4. Release wallet hold and process refund
    UPDATE user_wallets
    SET
      held_balance = held_balance - (COALESCE(v_estimated_fare, 0) + COALESCE(v_estimated_items_total, 0)),
      balance = balance + v_refund_amount,
      updated_at = NOW()
    WHERE user_id = v_user_id;
    
    UPDATE wallet_holds
    SET status = 'settled', released_at = NOW()
    WHERE shopping_id = p_shopping_id OR (request_id = p_shopping_id AND request_type = 'shopping');
    
    IF v_refund_amount > 0 THEN
      INSERT INTO wallet_transactions (user_id, amount, type, status, reference_type, reference_id, description, created_at)
      VALUES (v_user_id, v_refund_amount, 'shopping_refund', 'completed', 'shopping_request', p_shopping_id, 'Shopping adjustment refund', NOW());
    END IF;
    
    -- 5. Add provider earnings
    UPDATE service_providers
    SET
      total_earnings = COALESCE(total_earnings, 0) + v_provider_earnings,
      pending_balance = COALESCE(pending_balance, 0) + v_provider_earnings,
      status = 'available',
      updated_at = NOW()
    WHERE id = p_provider_id;
    
    INSERT INTO wallet_transactions (user_id, amount, type, status, reference_type, reference_id, description, created_at)
    VALUES (p_provider_id, v_provider_earnings, 'shopping_earnings', 'completed', 'shopping_request', p_shopping_id, 'Shopping service earnings', NOW());
    
    -- 6. Award loyalty points (based on total amount)
    v_loyalty_points := FLOOR(v_total_amount / 10);
    IF v_loyalty_points > 0 THEN
      PERFORM add_loyalty_points(v_user_id, v_loyalty_points, 'shopping_completed', p_shopping_id);
    END IF;
    
    -- 7. Request rating
    PERFORM send_notification(v_user_id, 'shopping_completed', 'ซื้อของเสร็จสิ้น', 'ให้คะแนนบริการซื้อของของคุณ',
      json_build_object('shopping_id', p_shopping_id, 'action', 'rate', 'final_fare', v_final_fare, 'items_total', v_final_items_total));
    
    -- 8. Log audit trail
    INSERT INTO status_audit_log (entity_type, entity_id, old_status, new_status, changed_by, changed_by_role, metadata, created_at)
    VALUES ('shopping_request', p_shopping_id, v_current_status, 'completed', p_provider_id, 'provider',
      json_build_object('final_fare', v_final_fare, 'items_total', v_final_items_total, 'platform_fee', v_platform_fee, 'provider_earnings', v_provider_earnings), NOW());
    
    RETURN json_build_object(
      'success', true, 'shopping_id', p_shopping_id, 'final_fare', v_final_fare,
      'items_total', v_final_items_total, 'total_amount', v_total_amount,
      'platform_fee', v_platform_fee, 'provider_earnings', v_provider_earnings,
      'refund_amount', v_refund_amount, 'loyalty_points_awarded', v_loyalty_points
    );
  EXCEPTION
    WHEN OTHERS THEN RAISE;
  END;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION complete_shopping_atomic TO authenticated;
COMMENT ON FUNCTION complete_shopping_atomic IS 'Atomically completes a shopping request with payment settlement and loyalty points';


-- ============================================================================
-- complete_queue_atomic() - Atomic Queue Booking Completion
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_queue_atomic(
  p_queue_id UUID,
  p_provider_id UUID,
  p_actual_fare DECIMAL DEFAULT NULL,
  p_queue_position INTEGER DEFAULT NULL,
  p_wait_time_minutes INTEGER DEFAULT NULL
) RETURNS JSON AS $
DECLARE
  v_user_id UUID;
  v_estimated_fare DECIMAL;
  v_final_fare DECIMAL;
  v_platform_fee DECIMAL;
  v_provider_earnings DECIMAL;
  v_refund_amount DECIMAL := 0;
  v_current_status TEXT;
  v_loyalty_points INTEGER;
  v_place_name TEXT;
BEGIN
  BEGIN
    -- 1. Get and lock queue details
    SELECT user_id, estimated_fare, status, place_name
    INTO v_user_id, v_estimated_fare, v_current_status, v_place_name
    FROM queue_bookings
    WHERE id = p_queue_id AND provider_id = p_provider_id
    FOR UPDATE;
    
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'QUEUE_NOT_FOUND_OR_UNAUTHORIZED';
    END IF;
    
    IF v_current_status NOT IN ('in_queue', 'in_progress', 'waiting') THEN
      RAISE EXCEPTION 'INVALID_STATUS_FOR_COMPLETION';
    END IF;
    
    -- 2. Calculate final amounts
    v_final_fare := COALESCE(p_actual_fare, v_estimated_fare);
    v_platform_fee := v_final_fare * 0.20;
    v_provider_earnings := v_final_fare - v_platform_fee;
    
    IF v_final_fare < v_estimated_fare THEN
      v_refund_amount := v_estimated_fare - v_final_fare;
    END IF;
    
    -- 3. Update queue status
    UPDATE queue_bookings
    SET
      status = 'completed',
      actual_fare = v_final_fare,
      platform_fee = v_platform_fee,
      provider_earnings = v_provider_earnings,
      final_queue_position = p_queue_position,
      actual_wait_time = p_wait_time_minutes,
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_queue_id;
    
    -- 4. Release wallet hold and process refund
    UPDATE user_wallets
    SET
      held_balance = held_balance - v_estimated_fare,
      balance = balance + v_refund_amount,
      updated_at = NOW()
    WHERE user_id = v_user_id;
    
    UPDATE wallet_holds
    SET status = 'settled', released_at = NOW()
    WHERE queue_id = p_queue_id OR (request_id = p_queue_id AND request_type = 'queue');
    
    IF v_refund_amount > 0 THEN
      INSERT INTO wallet_transactions (user_id, amount, type, status, reference_type, reference_id, description, created_at)
      VALUES (v_user_id, v_refund_amount, 'queue_refund', 'completed', 'queue_booking', p_queue_id, 'Queue service refund', NOW());
    END IF;
    
    -- 5. Add provider earnings
    UPDATE service_providers
    SET
      total_earnings = COALESCE(total_earnings, 0) + v_provider_earnings,
      pending_balance = COALESCE(pending_balance, 0) + v_provider_earnings,
      status = 'available',
      updated_at = NOW()
    WHERE id = p_provider_id;
    
    INSERT INTO wallet_transactions (user_id, amount, type, status, reference_type, reference_id, description, created_at)
    VALUES (p_provider_id, v_provider_earnings, 'queue_earnings', 'completed', 'queue_booking', p_queue_id, 'Queue service earnings', NOW());
    
    -- 6. Award loyalty points
    v_loyalty_points := FLOOR(v_final_fare / 10);
    IF v_loyalty_points > 0 THEN
      PERFORM add_loyalty_points(v_user_id, v_loyalty_points, 'queue_completed', p_queue_id);
    END IF;
    
    -- 7. Request rating
    PERFORM send_notification(v_user_id, 'queue_completed', 'จองคิวเสร็จสิ้น', 'ให้คะแนนบริการจองคิวที่ ' || COALESCE(v_place_name, 'สถานที่'),
      json_build_object('queue_id', p_queue_id, 'action', 'rate', 'final_fare', v_final_fare, 'place_name', v_place_name));
    
    -- 8. Log audit trail
    INSERT INTO status_audit_log (entity_type, entity_id, old_status, new_status, changed_by, changed_by_role, metadata, created_at)
    VALUES ('queue_booking', p_queue_id, v_current_status, 'completed', p_provider_id, 'provider',
      json_build_object('final_fare', v_final_fare, 'platform_fee', v_platform_fee, 'provider_earnings', v_provider_earnings, 'wait_time', p_wait_time_minutes), NOW());
    
    RETURN json_build_object(
      'success', true, 'queue_id', p_queue_id, 'final_fare', v_final_fare,
      'platform_fee', v_platform_fee, 'provider_earnings', v_provider_earnings,
      'refund_amount', v_refund_amount, 'loyalty_points_awarded', v_loyalty_points,
      'queue_position', p_queue_position, 'wait_time_minutes', p_wait_time_minutes
    );
  EXCEPTION
    WHEN OTHERS THEN RAISE;
  END;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION complete_queue_atomic TO authenticated;
COMMENT ON FUNCTION complete_queue_atomic IS 'Atomically completes a queue booking with payment settlement and loyalty points';


-- ============================================================================
-- complete_moving_atomic() - Atomic Moving Request Completion
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_moving_atomic(
  p_moving_id UUID,
  p_provider_id UUID,
  p_actual_fare DECIMAL DEFAULT NULL,
  p_helpers_count INTEGER DEFAULT NULL
) RETURNS JSON AS $
DECLARE
  v_user_id UUID;
  v_estimated_fare DECIMAL;
  v_final_fare DECIMAL;
  v_platform_fee DECIMAL;
  v_provider_earnings DECIMAL;
  v_refund_amount DECIMAL := 0;
  v_current_status TEXT;
  v_loyalty_points INTEGER;
  v_service_type TEXT;
BEGIN
  BEGIN
    -- 1. Get and lock moving details
    SELECT user_id, estimated_fare, status, service_type
    INTO v_user_id, v_estimated_fare, v_current_status, v_service_type
    FROM moving_requests
    WHERE id = p_moving_id AND provider_id = p_provider_id
    FOR UPDATE;
    
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'MOVING_NOT_FOUND_OR_UNAUTHORIZED';
    END IF;
    
    IF v_current_status NOT IN ('loading', 'in_transit', 'in_progress', 'unloading') THEN
      RAISE EXCEPTION 'INVALID_STATUS_FOR_COMPLETION';
    END IF;
    
    -- 2. Calculate final amounts
    v_final_fare := COALESCE(p_actual_fare, v_estimated_fare);
    v_platform_fee := v_final_fare * 0.20;
    v_provider_earnings := v_final_fare - v_platform_fee;
    
    IF v_final_fare < v_estimated_fare THEN
      v_refund_amount := v_estimated_fare - v_final_fare;
    END IF;
    
    -- 3. Update moving status
    UPDATE moving_requests
    SET
      status = 'completed',
      actual_fare = v_final_fare,
      platform_fee = v_platform_fee,
      provider_earnings = v_provider_earnings,
      actual_helpers_count = COALESCE(p_helpers_count, helpers_count),
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_moving_id;
    
    -- 4. Release wallet hold and process refund
    UPDATE user_wallets
    SET
      held_balance = held_balance - v_estimated_fare,
      balance = balance + v_refund_amount,
      updated_at = NOW()
    WHERE user_id = v_user_id;
    
    UPDATE wallet_holds
    SET status = 'settled', released_at = NOW()
    WHERE moving_id = p_moving_id OR (request_id = p_moving_id AND request_type = 'moving');
    
    IF v_refund_amount > 0 THEN
      INSERT INTO wallet_transactions (user_id, amount, type, status, reference_type, reference_id, description, created_at)
      VALUES (v_user_id, v_refund_amount, 'moving_refund', 'completed', 'moving_request', p_moving_id, 'Moving service refund', NOW());
    END IF;
    
    -- 5. Add provider earnings
    UPDATE service_providers
    SET
      total_earnings = COALESCE(total_earnings, 0) + v_provider_earnings,
      pending_balance = COALESCE(pending_balance, 0) + v_provider_earnings,
      status = 'available',
      updated_at = NOW()
    WHERE id = p_provider_id;
    
    INSERT INTO wallet_transactions (user_id, amount, type, status, reference_type, reference_id, description, created_at)
    VALUES (p_provider_id, v_provider_earnings, 'moving_earnings', 'completed', 'moving_request', p_moving_id, 'Moving service earnings', NOW());
    
    -- 6. Award loyalty points (higher for moving service)
    v_loyalty_points := FLOOR(v_final_fare / 8); -- More points for moving
    IF v_loyalty_points > 0 THEN
      PERFORM add_loyalty_points(v_user_id, v_loyalty_points, 'moving_completed', p_moving_id);
    END IF;
    
    -- 7. Request rating
    PERFORM send_notification(v_user_id, 'moving_completed', 'ขนย้ายเสร็จสิ้น', 'ให้คะแนนบริการขนย้ายของคุณ',
      json_build_object('moving_id', p_moving_id, 'action', 'rate', 'final_fare', v_final_fare, 'service_type', v_service_type));
    
    -- 8. Log audit trail
    INSERT INTO status_audit_log (entity_type, entity_id, old_status, new_status, changed_by, changed_by_role, metadata, created_at)
    VALUES ('moving_request', p_moving_id, v_current_status, 'completed', p_provider_id, 'provider',
      json_build_object('final_fare', v_final_fare, 'platform_fee', v_platform_fee, 'provider_earnings', v_provider_earnings, 'helpers_count', p_helpers_count), NOW());
    
    RETURN json_build_object(
      'success', true, 'moving_id', p_moving_id, 'final_fare', v_final_fare,
      'platform_fee', v_platform_fee, 'provider_earnings', v_provider_earnings,
      'refund_amount', v_refund_amount, 'loyalty_points_awarded', v_loyalty_points,
      'service_type', v_service_type
    );
  EXCEPTION
    WHEN OTHERS THEN RAISE;
  END;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION complete_moving_atomic TO authenticated;
COMMENT ON FUNCTION complete_moving_atomic IS 'Atomically completes a moving request with payment settlement and loyalty points';

-- ============================================================================
-- complete_laundry_atomic() - Atomic Laundry Request Completion
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_laundry_atomic(
  p_laundry_id UUID,
  p_provider_id UUID,
  p_actual_fare DECIMAL DEFAULT NULL,
  p_actual_weight DECIMAL DEFAULT NULL
) RETURNS JSON AS $
DECLARE
  v_user_id UUID;
  v_estimated_fare DECIMAL;
  v_final_fare DECIMAL;
  v_platform_fee DECIMAL;
  v_provider_earnings DECIMAL;
  v_refund_amount DECIMAL := 0;
  v_current_status TEXT;
  v_loyalty_points INTEGER;
  v_service_type TEXT;
BEGIN
  BEGIN
    -- 1. Get and lock laundry details
    SELECT user_id, estimated_fare, status, service_type
    INTO v_user_id, v_estimated_fare, v_current_status, v_service_type
    FROM laundry_requests
    WHERE id = p_laundry_id AND provider_id = p_provider_id
    FOR UPDATE;
    
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'LAUNDRY_NOT_FOUND_OR_UNAUTHORIZED';
    END IF;
    
    IF v_current_status NOT IN ('ready', 'delivering', 'in_progress') THEN
      RAISE EXCEPTION 'INVALID_STATUS_FOR_COMPLETION';
    END IF;
    
    -- 2. Calculate final amounts
    v_final_fare := COALESCE(p_actual_fare, v_estimated_fare);
    v_platform_fee := v_final_fare * 0.20;
    v_provider_earnings := v_final_fare - v_platform_fee;
    
    IF v_final_fare < v_estimated_fare THEN
      v_refund_amount := v_estimated_fare - v_final_fare;
    END IF;
    
    -- 3. Update laundry status
    UPDATE laundry_requests
    SET
      status = 'completed',
      actual_fare = v_final_fare,
      platform_fee = v_platform_fee,
      provider_earnings = v_provider_earnings,
      actual_weight = COALESCE(p_actual_weight, estimated_weight),
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_laundry_id;
    
    -- 4. Release wallet hold and process refund
    UPDATE user_wallets
    SET
      held_balance = held_balance - v_estimated_fare,
      balance = balance + v_refund_amount,
      updated_at = NOW()
    WHERE user_id = v_user_id;
    
    UPDATE wallet_holds
    SET status = 'settled', released_at = NOW()
    WHERE laundry_id = p_laundry_id OR (request_id = p_laundry_id AND request_type = 'laundry');
    
    IF v_refund_amount > 0 THEN
      INSERT INTO wallet_transactions (user_id, amount, type, status, reference_type, reference_id, description, created_at)
      VALUES (v_user_id, v_refund_amount, 'laundry_refund', 'completed', 'laundry_request', p_laundry_id, 'Laundry service refund', NOW());
    END IF;
    
    -- 5. Add provider earnings
    UPDATE service_providers
    SET
      total_earnings = COALESCE(total_earnings, 0) + v_provider_earnings,
      pending_balance = COALESCE(pending_balance, 0) + v_provider_earnings,
      status = 'available',
      updated_at = NOW()
    WHERE id = p_provider_id;
    
    INSERT INTO wallet_transactions (user_id, amount, type, status, reference_type, reference_id, description, created_at)
    VALUES (p_provider_id, v_provider_earnings, 'laundry_earnings', 'completed', 'laundry_request', p_laundry_id, 'Laundry service earnings', NOW());
    
    -- 6. Award loyalty points
    v_loyalty_points := FLOOR(v_final_fare / 10);
    IF v_loyalty_points > 0 THEN
      PERFORM add_loyalty_points(v_user_id, v_loyalty_points, 'laundry_completed', p_laundry_id);
    END IF;
    
    -- 7. Request rating
    PERFORM send_notification(v_user_id, 'laundry_completed', 'ซักรีดเสร็จสิ้น', 'ให้คะแนนบริการซักรีดของคุณ',
      json_build_object('laundry_id', p_laundry_id, 'action', 'rate', 'final_fare', v_final_fare, 'service_type', v_service_type));
    
    -- 8. Log audit trail
    INSERT INTO status_audit_log (entity_type, entity_id, old_status, new_status, changed_by, changed_by_role, metadata, created_at)
    VALUES ('laundry_request', p_laundry_id, v_current_status, 'completed', p_provider_id, 'provider',
      json_build_object('final_fare', v_final_fare, 'platform_fee', v_platform_fee, 'provider_earnings', v_provider_earnings, 'actual_weight', p_actual_weight), NOW());
    
    RETURN json_build_object(
      'success', true, 'laundry_id', p_laundry_id, 'final_fare', v_final_fare,
      'platform_fee', v_platform_fee, 'provider_earnings', v_provider_earnings,
      'refund_amount', v_refund_amount, 'loyalty_points_awarded', v_loyalty_points,
      'service_type', v_service_type, 'actual_weight', p_actual_weight
    );
  EXCEPTION
    WHEN OTHERS THEN RAISE;
  END;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION complete_laundry_atomic TO authenticated;
COMMENT ON FUNCTION complete_laundry_atomic IS 'Atomically completes a laundry request with payment settlement and loyalty points';
