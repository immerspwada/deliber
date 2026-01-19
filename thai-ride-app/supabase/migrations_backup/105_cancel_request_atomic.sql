-- Feature: System Decoupling Architecture
-- Migration: 105_cancel_request_atomic.sql
-- Description: Unified cancellation function for all service types
-- Task: 5 - Implement unified cancel_request_atomic() function
-- Requirements: 7.3, 8.2

-- ============================================================================
-- cancel_request_atomic() - Unified Cancellation for All Service Types
-- ============================================================================
-- Supports: ride, delivery, shopping, queue, moving, laundry
-- Cancellation by: customer, provider, admin, system

CREATE OR REPLACE FUNCTION cancel_request_atomic(
  p_request_id UUID,
  p_request_type TEXT,
  p_cancelled_by UUID,
  p_cancelled_by_role TEXT,
  p_cancel_reason TEXT DEFAULT NULL,
  p_issue_refund BOOLEAN DEFAULT TRUE
) RETURNS JSON AS $
DECLARE
  v_user_id UUID;
  v_provider_id UUID;
  v_current_status TEXT;
  v_estimated_fare DECIMAL;
  v_cancellation_fee DECIMAL := 0;
  v_refund_amount DECIMAL := 0;
  v_table_name TEXT;
  v_tracking_id TEXT;
  v_matched_at TIMESTAMPTZ;
  v_minutes_since_match INTEGER;
BEGIN
  -- Validate request type
  IF p_request_type NOT IN ('ride', 'delivery', 'shopping', 'queue', 'moving', 'laundry') THEN
    RAISE EXCEPTION 'INVALID_REQUEST_TYPE';
  END IF;
  
  -- Validate cancelled_by_role
  IF p_cancelled_by_role NOT IN ('customer', 'provider', 'admin', 'system') THEN
    RAISE EXCEPTION 'INVALID_CANCELLATION_ROLE';
  END IF;
  
  -- Set table name
  v_table_name := CASE p_request_type
    WHEN 'ride' THEN 'ride_requests'
    WHEN 'delivery' THEN 'delivery_requests'
    WHEN 'shopping' THEN 'shopping_requests'
    WHEN 'queue' THEN 'queue_bookings'
    WHEN 'moving' THEN 'moving_requests'
    WHEN 'laundry' THEN 'laundry_requests'
  END;
  
  BEGIN
    -- 1. Get and lock request details based on type
    EXECUTE format(
      'SELECT user_id, provider_id, status, estimated_fare, tracking_id, matched_at
       FROM %I WHERE id = $1 FOR UPDATE',
      v_table_name
    ) INTO v_user_id, v_provider_id, v_current_status, v_estimated_fare, v_tracking_id, v_matched_at
    USING p_request_id;
    
    -- Check if request exists
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'REQUEST_NOT_FOUND';
    END IF;
    
    -- Check if already cancelled or completed
    IF v_current_status IN ('cancelled', 'completed') THEN
      RAISE EXCEPTION 'REQUEST_ALREADY_FINALIZED';
    END IF;
    
    -- 2. Calculate cancellation fee based on status and time
    IF v_current_status = 'pending' THEN
      -- No fee for pending requests
      v_cancellation_fee := 0;
    ELSIF v_current_status = 'matched' THEN
      -- Calculate minutes since match
      v_minutes_since_match := EXTRACT(EPOCH FROM (NOW() - v_matched_at)) / 60;
      
      IF p_cancelled_by_role = 'customer' THEN
        -- Customer cancellation fee after match
        IF v_minutes_since_match > 5 THEN
          v_cancellation_fee := LEAST(50, v_estimated_fare * 0.20); -- 20% or max 50 THB
        ELSE
          v_cancellation_fee := 0; -- Free cancellation within 5 minutes
        END IF;
      ELSIF p_cancelled_by_role = 'provider' THEN
        -- Provider cancellation - no fee to customer, but track for provider
        v_cancellation_fee := 0;
      ELSIF p_cancelled_by_role IN ('admin', 'system') THEN
        -- Admin/System cancellation - no fee
        v_cancellation_fee := 0;
      END IF;
    ELSIF v_current_status IN ('arriving', 'picked_up', 'in_progress') THEN
      -- Higher fee for in-progress cancellation
      IF p_cancelled_by_role = 'customer' THEN
        v_cancellation_fee := LEAST(100, v_estimated_fare * 0.30); -- 30% or max 100 THB
      ELSE
        v_cancellation_fee := 0;
      END IF;
    END IF;
    
    -- 3. Calculate refund amount
    IF p_issue_refund THEN
      v_refund_amount := v_estimated_fare - v_cancellation_fee;
    ELSE
      v_refund_amount := 0;
    END IF;
    
    -- 4. Update request status
    EXECUTE format(
      'UPDATE %I SET
        status = ''cancelled'',
        cancelled_at = NOW(),
        cancelled_by = $1,
        cancelled_by_role = $2,
        cancel_reason = $3,
        cancellation_fee = $4,
        updated_at = NOW()
       WHERE id = $5',
      v_table_name
    ) USING p_cancelled_by, p_cancelled_by_role, p_cancel_reason, v_cancellation_fee, p_request_id;
    
    -- 5. Release wallet hold and process refund
    IF v_estimated_fare > 0 THEN
      UPDATE user_wallets
      SET
        held_balance = held_balance - v_estimated_fare,
        balance = balance + v_refund_amount,
        updated_at = NOW()
      WHERE user_id = v_user_id;
      
      -- Update wallet hold status
      UPDATE wallet_holds
      SET status = 'released', released_at = NOW()
      WHERE request_id = p_request_id AND request_type = p_request_type;
      
      -- Log refund transaction
      IF v_refund_amount > 0 THEN
        INSERT INTO wallet_transactions (
          user_id, amount, type, status, reference_type, reference_id, description, created_at
        ) VALUES (
          v_user_id, v_refund_amount, p_request_type || '_refund', 'completed',
          p_request_type || '_request', p_request_id,
          'Cancellation refund - ' || COALESCE(p_cancel_reason, 'No reason provided'),
          NOW()
        );
      END IF;
      
      -- Log cancellation fee if applicable
      IF v_cancellation_fee > 0 THEN
        INSERT INTO wallet_transactions (
          user_id, amount, type, status, reference_type, reference_id, description, created_at
        ) VALUES (
          v_user_id, -v_cancellation_fee, 'cancellation_fee', 'completed',
          p_request_type || '_request', p_request_id,
          'Cancellation fee',
          NOW()
        );
      END IF;
    END IF;
    
    -- 6. Update provider status if matched
    IF v_provider_id IS NOT NULL THEN
      UPDATE service_providers
      SET
        status = 'available',
        current_ride_id = NULL,
        updated_at = NOW()
      WHERE id = v_provider_id;
      
      -- Notify provider about cancellation
      PERFORM send_notification(
        v_provider_id,
        p_request_type || '_cancelled',
        'งานถูกยกเลิก',
        'งาน ' || v_tracking_id || ' ถูกยกเลิก: ' || COALESCE(p_cancel_reason, 'ไม่ระบุเหตุผล'),
        json_build_object(
          'request_id', p_request_id,
          'request_type', p_request_type,
          'tracking_id', v_tracking_id,
          'cancelled_by_role', p_cancelled_by_role,
          'reason', p_cancel_reason
        )
      );
    END IF;
    
    -- 7. Notify customer (if not cancelled by customer)
    IF p_cancelled_by_role != 'customer' THEN
      PERFORM send_notification(
        v_user_id,
        p_request_type || '_cancelled',
        'คำสั่งถูกยกเลิก',
        'คำสั่ง ' || v_tracking_id || ' ถูกยกเลิก' || 
          CASE WHEN v_refund_amount > 0 THEN ' - คืนเงิน ฿' || v_refund_amount::TEXT ELSE '' END,
        json_build_object(
          'request_id', p_request_id,
          'request_type', p_request_type,
          'tracking_id', v_tracking_id,
          'refund_amount', v_refund_amount,
          'reason', p_cancel_reason
        )
      );
    END IF;
    
    -- 8. Log audit trail
    INSERT INTO status_audit_log (
      entity_type, entity_id, old_status, new_status,
      changed_by, changed_by_role, metadata, created_at
    ) VALUES (
      p_request_type || '_request', p_request_id, v_current_status, 'cancelled',
      p_cancelled_by, p_cancelled_by_role,
      json_build_object(
        'cancel_reason', p_cancel_reason,
        'cancellation_fee', v_cancellation_fee,
        'refund_amount', v_refund_amount,
        'refund_issued', p_issue_refund,
        'minutes_since_match', v_minutes_since_match
      ),
      NOW()
    );
    
    -- 9. Track provider cancellation if cancelled by provider
    IF p_cancelled_by_role = 'provider' AND v_provider_id IS NOT NULL THEN
      INSERT INTO provider_cancellation_log (
        provider_id, request_id, request_type, cancel_reason, created_at
      ) VALUES (
        v_provider_id, p_request_id, p_request_type, p_cancel_reason, NOW()
      );
    END IF;
    
    RETURN json_build_object(
      'success', true,
      'request_id', p_request_id,
      'request_type', p_request_type,
      'tracking_id', v_tracking_id,
      'previous_status', v_current_status,
      'cancelled_by_role', p_cancelled_by_role,
      'cancellation_fee', v_cancellation_fee,
      'refund_amount', v_refund_amount,
      'refund_issued', p_issue_refund
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cancel_request_atomic TO authenticated;
COMMENT ON FUNCTION cancel_request_atomic IS 'Unified atomic cancellation for all service types with fee calculation and refund processing';


-- ============================================================================
-- Provider Cancellation Log Table (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS provider_cancellation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES service_providers(id) ON DELETE CASCADE NOT NULL,
  request_id UUID NOT NULL,
  request_type TEXT NOT NULL,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for provider cancellation tracking
CREATE INDEX IF NOT EXISTS idx_provider_cancellation_log_provider 
  ON provider_cancellation_log(provider_id, created_at DESC);

-- RLS for provider_cancellation_log
ALTER TABLE provider_cancellation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers_view_own_cancellations" ON provider_cancellation_log
  FOR SELECT USING (auth.uid() = provider_id);

CREATE POLICY "admins_view_all_cancellations" ON provider_cancellation_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- issue_refund_atomic() - Admin Refund Function
-- ============================================================================

CREATE OR REPLACE FUNCTION issue_refund_atomic(
  p_request_id UUID,
  p_request_type TEXT,
  p_refund_amount DECIMAL,
  p_admin_id UUID,
  p_reason TEXT
) RETURNS JSON AS $
DECLARE
  v_user_id UUID;
  v_current_status TEXT;
  v_table_name TEXT;
  v_tracking_id TEXT;
BEGIN
  -- Validate request type
  IF p_request_type NOT IN ('ride', 'delivery', 'shopping', 'queue', 'moving', 'laundry') THEN
    RAISE EXCEPTION 'INVALID_REQUEST_TYPE';
  END IF;
  
  -- Validate refund amount
  IF p_refund_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_REFUND_AMOUNT';
  END IF;
  
  -- Set table name
  v_table_name := CASE p_request_type
    WHEN 'ride' THEN 'ride_requests'
    WHEN 'delivery' THEN 'delivery_requests'
    WHEN 'shopping' THEN 'shopping_requests'
    WHEN 'queue' THEN 'queue_bookings'
    WHEN 'moving' THEN 'moving_requests'
    WHEN 'laundry' THEN 'laundry_requests'
  END;
  
  BEGIN
    -- 1. Get request details
    EXECUTE format(
      'SELECT user_id, status, tracking_id FROM %I WHERE id = $1 FOR UPDATE',
      v_table_name
    ) INTO v_user_id, v_current_status, v_tracking_id
    USING p_request_id;
    
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'REQUEST_NOT_FOUND';
    END IF;
    
    -- 2. Add refund to user wallet
    UPDATE user_wallets
    SET
      balance = balance + p_refund_amount,
      updated_at = NOW()
    WHERE user_id = v_user_id;
    
    -- 3. Log refund transaction
    INSERT INTO wallet_transactions (
      user_id, amount, type, status, reference_type, reference_id, description, created_at
    ) VALUES (
      v_user_id, p_refund_amount, 'admin_refund', 'completed',
      p_request_type || '_request', p_request_id,
      'Admin refund: ' || p_reason,
      NOW()
    );
    
    -- 4. Create refund record
    INSERT INTO refunds (
      user_id, request_id, request_type, amount, reason, status, processed_by, processed_at, created_at
    ) VALUES (
      v_user_id, p_request_id, p_request_type, p_refund_amount, p_reason, 'completed', p_admin_id, NOW(), NOW()
    );
    
    -- 5. Notify customer
    PERFORM send_notification(
      v_user_id,
      'refund_issued',
      'คืนเงินสำเร็จ',
      'คุณได้รับเงินคืน ฿' || p_refund_amount::TEXT || ' สำหรับคำสั่ง ' || v_tracking_id,
      json_build_object(
        'request_id', p_request_id,
        'request_type', p_request_type,
        'tracking_id', v_tracking_id,
        'refund_amount', p_refund_amount,
        'reason', p_reason
      )
    );
    
    -- 6. Log admin action
    INSERT INTO admin_audit_log (
      admin_id, action, entity_type, entity_id, metadata, created_at
    ) VALUES (
      p_admin_id, 'issue_refund', p_request_type, p_request_id,
      json_build_object(
        'refund_amount', p_refund_amount,
        'reason', p_reason,
        'tracking_id', v_tracking_id
      ),
      NOW()
    );
    
    RETURN json_build_object(
      'success', true,
      'request_id', p_request_id,
      'request_type', p_request_type,
      'tracking_id', v_tracking_id,
      'refund_amount', p_refund_amount,
      'user_id', v_user_id
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION issue_refund_atomic TO authenticated;
COMMENT ON FUNCTION issue_refund_atomic IS 'Admin function to issue refunds for any service type';
