-- =====================================================
-- Migration: 205_refund_approval_system.sql
-- Feature: F05 - Refund Approval System (Admin Required)
-- Description: ระบบคืนเงินที่ต้องรอ Admin อนุมัติก่อนเสมอ
-- 
-- Flow:
-- 1. ลูกค้ายกเลิก Order → สร้าง refund_request (status: pending)
-- 2. Admin อนุมัติ → คืนเงินเข้า wallet
-- 3. Admin ปฏิเสธ → ไม่คืนเงิน
-- =====================================================

-- =====================================================
-- 1. CANCELLATION REFUND REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.cancellation_refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id VARCHAR(30) UNIQUE,
  
  -- User info
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Request info
  request_id UUID NOT NULL,
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('ride', 'delivery', 'shopping', 'queue', 'moving', 'laundry')),
  request_tracking_id VARCHAR(30),
  
  -- Amount info
  original_amount DECIMAL(12,2) NOT NULL,
  cancellation_fee DECIMAL(12,2) DEFAULT 0,
  refund_amount DECIMAL(12,2) NOT NULL,
  
  -- Cancellation info
  cancelled_by UUID NOT NULL,
  cancelled_by_role VARCHAR(20) NOT NULL CHECK (cancelled_by_role IN ('customer', 'provider', 'admin', 'system')),
  cancel_reason TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  
  -- Admin processing
  admin_id UUID REFERENCES public.users(id),
  admin_note TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Wallet transaction reference (after approval)
  wallet_transaction_id UUID,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_cancellation_refund_user ON public.cancellation_refund_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_refund_status ON public.cancellation_refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_cancellation_refund_request ON public.cancellation_refund_requests(request_id, request_type);
CREATE INDEX IF NOT EXISTS idx_cancellation_refund_created ON public.cancellation_refund_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cancellation_refund_pending ON public.cancellation_refund_requests(status) WHERE status = 'pending';

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================

ALTER TABLE public.cancellation_refund_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "customers_view_own_refund_requests" ON public.cancellation_refund_requests;
DROP POLICY IF EXISTS "admins_full_access_refund_requests" ON public.cancellation_refund_requests;
DROP POLICY IF EXISTS "system_insert_refund_requests" ON public.cancellation_refund_requests;

-- Customers can view their own refund requests
CREATE POLICY "customers_view_own_refund_requests" ON public.cancellation_refund_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Admins have full access
CREATE POLICY "admins_full_access_refund_requests" ON public.cancellation_refund_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- System can insert (for atomic functions)
CREATE POLICY "system_insert_refund_requests" ON public.cancellation_refund_requests
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 4. TRACKING ID TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION set_cancellation_refund_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := 'RFD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cancellation_refund_tracking_id ON public.cancellation_refund_requests;
CREATE TRIGGER trigger_cancellation_refund_tracking_id
  BEFORE INSERT ON public.cancellation_refund_requests
  FOR EACH ROW EXECUTE FUNCTION set_cancellation_refund_tracking_id();

-- =====================================================
-- 5. UPDATED_AT TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS update_cancellation_refund_updated_at ON public.cancellation_refund_requests;
CREATE TRIGGER update_cancellation_refund_updated_at
  BEFORE UPDATE ON public.cancellation_refund_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. REALTIME
-- =====================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.cancellation_refund_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;



-- =====================================================
-- 7. CANCEL REQUEST WITH PENDING REFUND (แทนที่ function เดิม)
-- =====================================================

CREATE OR REPLACE FUNCTION cancel_request_with_pending_refund(
  p_request_id UUID,
  p_request_type TEXT,
  p_cancelled_by UUID,
  p_cancelled_by_role TEXT,
  p_cancel_reason TEXT DEFAULT NULL
) RETURNS JSON AS $$
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
  v_refund_request_id UUID;
  v_refund_tracking_id TEXT;
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
    -- 1. Get and lock request details
    EXECUTE format(
      'SELECT user_id, provider_id, status, estimated_fare, tracking_id, matched_at
       FROM %I WHERE id = $1 FOR UPDATE',
      v_table_name
    ) INTO v_user_id, v_provider_id, v_current_status, v_estimated_fare, v_tracking_id, v_matched_at
    USING p_request_id;
    
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'REQUEST_NOT_FOUND';
    END IF;
    
    IF v_current_status IN ('cancelled', 'completed') THEN
      RAISE EXCEPTION 'REQUEST_ALREADY_FINALIZED';
    END IF;
    
    -- 2. Calculate cancellation fee based on status and time
    IF v_current_status = 'pending' THEN
      v_cancellation_fee := 0;
    ELSIF v_current_status = 'matched' THEN
      v_minutes_since_match := EXTRACT(EPOCH FROM (NOW() - v_matched_at)) / 60;
      
      IF p_cancelled_by_role = 'customer' THEN
        IF v_minutes_since_match > 5 THEN
          v_cancellation_fee := LEAST(50, v_estimated_fare * 0.20);
        ELSE
          v_cancellation_fee := 0;
        END IF;
      ELSE
        v_cancellation_fee := 0;
      END IF;
    ELSIF v_current_status IN ('arriving', 'picked_up', 'in_progress') THEN
      IF p_cancelled_by_role = 'customer' THEN
        v_cancellation_fee := LEAST(100, v_estimated_fare * 0.30);
      ELSE
        v_cancellation_fee := 0;
      END IF;
    END IF;
    
    -- 3. Calculate refund amount
    v_refund_amount := v_estimated_fare - v_cancellation_fee;
    
    -- 4. Update request status to cancelled
    EXECUTE format(
      'UPDATE %I SET
        status = ''cancelled'',
        cancelled_at = NOW(),
        cancelled_by = $1,
        cancelled_by_role = $2,
        cancel_reason = $3,
        cancellation_fee = $4,
        refund_status = ''pending'',
        updated_at = NOW()
       WHERE id = $5',
      v_table_name
    ) USING p_cancelled_by, p_cancelled_by_role, p_cancel_reason, v_cancellation_fee, p_request_id;
    
    -- 5. Release wallet hold (but DON'T refund yet - wait for admin approval)
    IF v_estimated_fare > 0 THEN
      UPDATE user_wallets
      SET
        held_balance = held_balance - v_estimated_fare,
        updated_at = NOW()
      WHERE user_id = v_user_id;
      
      UPDATE wallet_holds
      SET status = 'released', released_at = NOW()
      WHERE request_id = p_request_id AND request_type = p_request_type;
    END IF;
    
    -- 6. Create refund request (PENDING - requires admin approval)
    IF v_refund_amount > 0 THEN
      INSERT INTO cancellation_refund_requests (
        user_id, request_id, request_type, request_tracking_id,
        original_amount, cancellation_fee, refund_amount,
        cancelled_by, cancelled_by_role, cancel_reason, cancelled_at,
        status
      ) VALUES (
        v_user_id, p_request_id, p_request_type, v_tracking_id,
        v_estimated_fare, v_cancellation_fee, v_refund_amount,
        p_cancelled_by, p_cancelled_by_role, p_cancel_reason, NOW(),
        'pending'
      ) RETURNING id, tracking_id INTO v_refund_request_id, v_refund_tracking_id;
      
      -- Notify customer about pending refund
      PERFORM send_notification(
        v_user_id,
        'refund_pending',
        'คำขอคืนเงินรอดำเนินการ',
        'คำขอคืนเงิน ฿' || v_refund_amount::TEXT || ' สำหรับ ' || v_tracking_id || ' รอการอนุมัติจาก Admin',
        jsonb_build_object(
          'refund_request_id', v_refund_request_id,
          'refund_tracking_id', v_refund_tracking_id,
          'request_id', p_request_id,
          'request_type', p_request_type,
          'refund_amount', v_refund_amount
        ),
        '/customer/wallet'
      );
      
      -- Notify admins about new refund request
      INSERT INTO user_notifications (user_id, type, title, message, data, action_url)
      SELECT u.id, 'admin_refund_request', 'คำขอคืนเงินใหม่',
        'มีคำขอคืนเงิน ฿' || v_refund_amount::TEXT || ' รอการอนุมัติ',
        jsonb_build_object(
          'refund_request_id', v_refund_request_id,
          'user_id', v_user_id,
          'amount', v_refund_amount
        ),
        '/admin/refunds'
      FROM users u WHERE u.role = 'admin';
    END IF;
    
    -- 7. Update provider status if matched
    IF v_provider_id IS NOT NULL THEN
      UPDATE service_providers
      SET
        status = 'available',
        current_ride_id = NULL,
        updated_at = NOW()
      WHERE id = v_provider_id;
      
      PERFORM send_notification(
        v_provider_id,
        p_request_type || '_cancelled',
        'งานถูกยกเลิก',
        'งาน ' || v_tracking_id || ' ถูกยกเลิก: ' || COALESCE(p_cancel_reason, 'ไม่ระบุเหตุผล'),
        jsonb_build_object(
          'request_id', p_request_id,
          'request_type', p_request_type,
          'tracking_id', v_tracking_id,
          'cancelled_by_role', p_cancelled_by_role
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
      jsonb_build_object(
        'cancel_reason', p_cancel_reason,
        'cancellation_fee', v_cancellation_fee,
        'refund_amount', v_refund_amount,
        'refund_status', 'pending_admin_approval',
        'refund_request_id', v_refund_request_id
      ),
      NOW()
    );
    
    RETURN json_build_object(
      'success', true,
      'request_id', p_request_id,
      'request_type', p_request_type,
      'tracking_id', v_tracking_id,
      'previous_status', v_current_status,
      'cancelled_by_role', p_cancelled_by_role,
      'cancellation_fee', v_cancellation_fee,
      'refund_amount', v_refund_amount,
      'refund_status', 'pending_admin_approval',
      'refund_request_id', v_refund_request_id,
      'refund_tracking_id', v_refund_tracking_id,
      'message', 'ยกเลิกสำเร็จ คำขอคืนเงินรอการอนุมัติจาก Admin'
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- =====================================================
-- 8. ADMIN APPROVE REFUND FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION admin_approve_cancellation_refund(
  p_refund_request_id UUID,
  p_admin_id UUID,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_balance DECIMAL(12,2),
  transaction_id UUID
) AS $$
DECLARE
  v_refund RECORD;
  v_txn_id UUID;
  v_new_balance DECIMAL(12,2);
  v_table_name TEXT;
BEGIN
  -- Get and lock refund request
  SELECT * INTO v_refund
  FROM cancellation_refund_requests
  WHERE id = p_refund_request_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบคำขอคืนเงิน'::TEXT, 0::DECIMAL(12,2), NULL::UUID;
    RETURN;
  END IF;
  
  IF v_refund.status != 'pending' THEN
    RETURN QUERY SELECT false, 'คำขอนี้ถูกดำเนินการแล้ว'::TEXT, 0::DECIMAL(12,2), NULL::UUID;
    RETURN;
  END IF;
  
  -- Ensure user wallet exists
  PERFORM ensure_user_wallet(v_refund.user_id);
  
  -- Add refund to wallet
  INSERT INTO wallet_transactions (
    user_id, type, amount, balance_before, balance_after,
    description, reference_type, reference_id, status, created_at
  )
  SELECT 
    v_refund.user_id,
    'refund',
    v_refund.refund_amount,
    w.balance,
    w.balance + v_refund.refund_amount,
    'คืนเงินจากการยกเลิก ' || v_refund.request_tracking_id || ' (อนุมัติโดย Admin)',
    v_refund.request_type || '_cancellation',
    v_refund.request_id,
    'completed',
    NOW()
  FROM user_wallets w
  WHERE w.user_id = v_refund.user_id
  RETURNING id INTO v_txn_id;
  
  -- Update wallet balance
  UPDATE user_wallets
  SET 
    balance = balance + v_refund.refund_amount,
    total_earned = total_earned + v_refund.refund_amount,
    updated_at = NOW()
  WHERE user_id = v_refund.user_id
  RETURNING balance INTO v_new_balance;
  
  -- Update refund request status
  UPDATE cancellation_refund_requests
  SET 
    status = 'approved',
    admin_id = p_admin_id,
    admin_note = p_admin_note,
    processed_at = NOW(),
    wallet_transaction_id = v_txn_id,
    updated_at = NOW()
  WHERE id = p_refund_request_id;
  
  -- Update original request refund status
  v_table_name := CASE v_refund.request_type
    WHEN 'ride' THEN 'ride_requests'
    WHEN 'delivery' THEN 'delivery_requests'
    WHEN 'shopping' THEN 'shopping_requests'
    WHEN 'queue' THEN 'queue_bookings'
    WHEN 'moving' THEN 'moving_requests'
    WHEN 'laundry' THEN 'laundry_requests'
  END;
  
  EXECUTE format(
    'UPDATE %I SET refund_status = ''completed'', refunded_at = NOW(), updated_at = NOW() WHERE id = $1',
    v_table_name
  ) USING v_refund.request_id;
  
  -- Notify customer
  PERFORM send_notification(
    v_refund.user_id,
    'refund_approved',
    'คืนเงินสำเร็จ!',
    'คืนเงิน ฿' || v_refund.refund_amount::TEXT || ' เข้ากระเป๋าเรียบร้อยแล้ว',
    jsonb_build_object(
      'refund_request_id', p_refund_request_id,
      'refund_amount', v_refund.refund_amount,
      'new_balance', v_new_balance,
      'transaction_id', v_txn_id
    ),
    '/customer/wallet'
  );
  
  -- Log admin action
  INSERT INTO admin_audit_log (admin_id, action, entity_type, entity_id, metadata, created_at)
  VALUES (
    p_admin_id, 'approve_refund', 'cancellation_refund_request', p_refund_request_id,
    jsonb_build_object(
      'user_id', v_refund.user_id,
      'refund_amount', v_refund.refund_amount,
      'request_type', v_refund.request_type,
      'admin_note', p_admin_note
    ),
    NOW()
  );
  
  RETURN QUERY SELECT true, 'อนุมัติคืนเงินสำเร็จ'::TEXT, v_new_balance, v_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. ADMIN REJECT REFUND FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION admin_reject_cancellation_refund(
  p_refund_request_id UUID,
  p_admin_id UUID,
  p_admin_note TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_refund RECORD;
  v_table_name TEXT;
BEGIN
  -- Validate admin note is provided
  IF p_admin_note IS NULL OR TRIM(p_admin_note) = '' THEN
    RETURN QUERY SELECT false, 'กรุณาระบุเหตุผลในการปฏิเสธ'::TEXT;
    RETURN;
  END IF;
  
  -- Get and lock refund request
  SELECT * INTO v_refund
  FROM cancellation_refund_requests
  WHERE id = p_refund_request_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบคำขอคืนเงิน'::TEXT;
    RETURN;
  END IF;
  
  IF v_refund.status != 'pending' THEN
    RETURN QUERY SELECT false, 'คำขอนี้ถูกดำเนินการแล้ว'::TEXT;
    RETURN;
  END IF;
  
  -- Update refund request status
  UPDATE cancellation_refund_requests
  SET 
    status = 'rejected',
    admin_id = p_admin_id,
    admin_note = p_admin_note,
    processed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_refund_request_id;
  
  -- Update original request refund status
  v_table_name := CASE v_refund.request_type
    WHEN 'ride' THEN 'ride_requests'
    WHEN 'delivery' THEN 'delivery_requests'
    WHEN 'shopping' THEN 'shopping_requests'
    WHEN 'queue' THEN 'queue_bookings'
    WHEN 'moving' THEN 'moving_requests'
    WHEN 'laundry' THEN 'laundry_requests'
  END;
  
  EXECUTE format(
    'UPDATE %I SET refund_status = ''rejected'', updated_at = NOW() WHERE id = $1',
    v_table_name
  ) USING v_refund.request_id;
  
  -- Notify customer
  PERFORM send_notification(
    v_refund.user_id,
    'refund_rejected',
    'คำขอคืนเงินถูกปฏิเสธ',
    'คำขอคืนเงิน ฿' || v_refund.refund_amount::TEXT || ' ถูกปฏิเสธ เหตุผล: ' || p_admin_note,
    jsonb_build_object(
      'refund_request_id', p_refund_request_id,
      'refund_amount', v_refund.refund_amount,
      'reason', p_admin_note
    ),
    '/customer/wallet'
  );
  
  -- Log admin action
  INSERT INTO admin_audit_log (admin_id, action, entity_type, entity_id, metadata, created_at)
  VALUES (
    p_admin_id, 'reject_refund', 'cancellation_refund_request', p_refund_request_id,
    jsonb_build_object(
      'user_id', v_refund.user_id,
      'refund_amount', v_refund.refund_amount,
      'request_type', v_refund.request_type,
      'admin_note', p_admin_note
    ),
    NOW()
  );
  
  RETURN QUERY SELECT true, 'ปฏิเสธคำขอคืนเงินสำเร็จ'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- =====================================================
-- 10. GET PENDING REFUND REQUESTS FOR ADMIN
-- =====================================================

CREATE OR REPLACE FUNCTION get_pending_cancellation_refunds()
RETURNS TABLE (
  id UUID,
  tracking_id VARCHAR(30),
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  user_member_uid TEXT,
  request_id UUID,
  request_type VARCHAR(20),
  request_tracking_id VARCHAR(30),
  original_amount DECIMAL(12,2),
  cancellation_fee DECIMAL(12,2),
  refund_amount DECIMAL(12,2),
  cancelled_by_role VARCHAR(20),
  cancel_reason TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.tracking_id,
    r.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.name, 'ไม่ระบุ')::TEXT as user_name,
    COALESCE(u.phone_number, u.phone, '')::TEXT as user_phone,
    COALESCE(u.member_uid, '')::TEXT as user_member_uid,
    r.request_id,
    r.request_type,
    r.request_tracking_id,
    r.original_amount,
    r.cancellation_fee,
    r.refund_amount,
    r.cancelled_by_role,
    r.cancel_reason,
    r.cancelled_at,
    r.created_at,
    r.expires_at
  FROM cancellation_refund_requests r
  LEFT JOIN users u ON u.id = r.user_id
  WHERE r.status = 'pending'
  ORDER BY r.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. GET ALL CANCELLATION REFUNDS FOR ADMIN
-- =====================================================

CREATE OR REPLACE FUNCTION get_all_cancellation_refunds(
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  tracking_id VARCHAR(30),
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  request_type VARCHAR(20),
  request_tracking_id VARCHAR(30),
  original_amount DECIMAL(12,2),
  cancellation_fee DECIMAL(12,2),
  refund_amount DECIMAL(12,2),
  cancelled_by_role VARCHAR(20),
  cancel_reason TEXT,
  status VARCHAR(20),
  admin_note TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.tracking_id,
    r.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.name, 'ไม่ระบุ')::TEXT as user_name,
    COALESCE(u.phone_number, u.phone, '')::TEXT as user_phone,
    r.request_type,
    r.request_tracking_id,
    r.original_amount,
    r.cancellation_fee,
    r.refund_amount,
    r.cancelled_by_role,
    r.cancel_reason,
    r.status,
    r.admin_note,
    r.processed_at,
    r.created_at
  FROM cancellation_refund_requests r
  LEFT JOIN users u ON u.id = r.user_id
  WHERE (p_status IS NULL OR r.status = p_status)
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 12. GET REFUND STATS FOR ADMIN DASHBOARD
-- =====================================================

CREATE OR REPLACE FUNCTION get_cancellation_refund_stats()
RETURNS TABLE (
  total_requests BIGINT,
  pending_requests BIGINT,
  approved_requests BIGINT,
  rejected_requests BIGINT,
  total_pending_amount DECIMAL(12,2),
  total_approved_amount DECIMAL(12,2),
  today_requests BIGINT,
  today_approved_amount DECIMAL(12,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_requests,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_requests,
    COUNT(*) FILTER (WHERE status = 'approved')::BIGINT as approved_requests,
    COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT as rejected_requests,
    COALESCE(SUM(refund_amount) FILTER (WHERE status = 'pending'), 0)::DECIMAL(12,2) as total_pending_amount,
    COALESCE(SUM(refund_amount) FILTER (WHERE status = 'approved'), 0)::DECIMAL(12,2) as total_approved_amount,
    COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE)::BIGINT as today_requests,
    COALESCE(SUM(refund_amount) FILTER (WHERE status = 'approved' AND DATE(processed_at) = CURRENT_DATE), 0)::DECIMAL(12,2) as today_approved_amount
  FROM cancellation_refund_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 13. GET USER'S REFUND REQUESTS
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_cancellation_refunds(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  tracking_id VARCHAR(30),
  request_type VARCHAR(20),
  request_tracking_id VARCHAR(30),
  refund_amount DECIMAL(12,2),
  status VARCHAR(20),
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.tracking_id,
    r.request_type,
    r.request_tracking_id,
    r.refund_amount,
    r.status,
    r.admin_note,
    r.created_at,
    r.processed_at
  FROM cancellation_refund_requests r
  WHERE r.user_id = p_user_id
  ORDER BY r.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 14. AUTO-EXPIRE OLD PENDING REFUNDS
-- =====================================================

CREATE OR REPLACE FUNCTION expire_old_cancellation_refunds()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE cancellation_refund_requests
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at < NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 15. GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON public.cancellation_refund_requests TO anon;
GRANT ALL ON public.cancellation_refund_requests TO authenticated;

GRANT EXECUTE ON FUNCTION cancel_request_with_pending_refund TO authenticated;
GRANT EXECUTE ON FUNCTION admin_approve_cancellation_refund TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reject_cancellation_refund TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_cancellation_refunds TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_cancellation_refunds TO authenticated;
GRANT EXECUTE ON FUNCTION get_cancellation_refund_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_cancellation_refunds TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_cancellation_refunds TO authenticated;

-- =====================================================
-- 16. COMMENTS
-- =====================================================

COMMENT ON TABLE cancellation_refund_requests IS 'คำขอคืนเงินจากการยกเลิก Order - ต้องรอ Admin อนุมัติก่อนคืนเงิน';
COMMENT ON FUNCTION cancel_request_with_pending_refund IS 'ยกเลิก Order และสร้างคำขอคืนเงินที่รอ Admin อนุมัติ';
COMMENT ON FUNCTION admin_approve_cancellation_refund IS 'Admin อนุมัติคำขอคืนเงิน - เงินจะเข้า wallet ทันที';
COMMENT ON FUNCTION admin_reject_cancellation_refund IS 'Admin ปฏิเสธคำขอคืนเงิน - ต้องระบุเหตุผล';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 205 Complete:';
  RAISE NOTICE '  - Created cancellation_refund_requests table';
  RAISE NOTICE '  - Created cancel_request_with_pending_refund() function';
  RAISE NOTICE '  - Created admin_approve_cancellation_refund() function';
  RAISE NOTICE '  - Created admin_reject_cancellation_refund() function';
  RAISE NOTICE '  - Created get_pending_cancellation_refunds() function';
  RAISE NOTICE '  - Created get_cancellation_refund_stats() function';
  RAISE NOTICE '  - All refunds now require Admin approval!';
END $$;

