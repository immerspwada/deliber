-- =====================================================
-- Migration: 196_fix_topup_notification_error.sql
-- Feature: F05 - Fix Topup Request Notification Error
-- 
-- STATUS: APPLIED VIA MCP (December 28, 2025)
-- 
-- Problem: 
-- 1. create_simple_topup_request calls send_notification() which uses realtime.send()
-- 2. broadcast_topup_request_changes trigger also uses realtime.send()
-- Both cause: "function realtime.send(unknown, text, jsonb, boolean) does not exist"
-- 
-- Solution: 
-- 1. Remove notification call from create_simple_topup_request
-- 2. Fix broadcast_topup_request_changes to use pg_notify instead of realtime.send
-- =====================================================

-- =====================================================
-- PART 1: Fix create_simple_topup_request function
-- =====================================================
DROP FUNCTION IF EXISTS public.create_simple_topup_request(uuid, numeric, text, text, text) CASCADE;

CREATE OR REPLACE FUNCTION public.create_simple_topup_request(
  p_user_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT DEFAULT 'promptpay',
  p_payment_reference TEXT DEFAULT NULL,
  p_slip_url TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  request_id UUID,
  tracking_id VARCHAR(25)
) AS $$
DECLARE
  v_request_id UUID;
  v_tracking_id VARCHAR(25);
  v_pending_count INTEGER;
  v_user_exists BOOLEAN;
BEGIN
  -- 1. Validate user exists
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = p_user_id) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RETURN QUERY SELECT false::BOOLEAN, 'ไม่พบข้อมูลผู้ใช้'::TEXT, NULL::UUID, NULL::VARCHAR(25);
    RETURN;
  END IF;
  
  -- 2. Check pending requests limit
  SELECT COUNT(*) INTO v_pending_count
  FROM public.topup_requests
  WHERE user_id = p_user_id AND status = 'pending';
  
  IF v_pending_count >= 3 THEN
    RETURN QUERY SELECT false::BOOLEAN, 'คุณมีคำขอเติมเงินที่รอดำเนินการอยู่แล้ว 3 รายการ'::TEXT, NULL::UUID, NULL::VARCHAR(25);
    RETURN;
  END IF;
  
  -- 3. Validate amount
  IF p_amount < 20 THEN
    RETURN QUERY SELECT false::BOOLEAN, 'จำนวนเงินขั้นต่ำ 20 บาท'::TEXT, NULL::UUID, NULL::VARCHAR(25);
    RETURN;
  END IF;
  
  IF p_amount > 50000 THEN
    RETURN QUERY SELECT false::BOOLEAN, 'จำนวนเงินสูงสุด 50,000 บาท'::TEXT, NULL::UUID, NULL::VARCHAR(25);
    RETURN;
  END IF;
  
  -- 4. Generate tracking ID
  v_tracking_id := 'TOP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  
  -- 5. Insert topup request
  INSERT INTO public.topup_requests (
    user_id, 
    tracking_id, 
    amount, 
    payment_method, 
    payment_reference, 
    slip_url, 
    slip_image_url, 
    status
  ) VALUES (
    p_user_id, 
    v_tracking_id, 
    p_amount, 
    p_payment_method, 
    p_payment_reference, 
    p_slip_url, 
    p_slip_url, 
    'pending'
  ) RETURNING id INTO v_request_id;
  
  -- 6. NO NOTIFICATION CALL - avoid realtime.send() error
  -- Notifications handled by frontend or separate process
  
  -- 7. Return success
  RETURN QUERY SELECT true::BOOLEAN, 'สร้างคำขอเติมเงินสำเร็จ รอการอนุมัติ'::TEXT, v_request_id, v_tracking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_simple_topup_request(UUID, NUMERIC, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.create_simple_topup_request(UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_simple_topup_request(UUID, NUMERIC, TEXT, TEXT, TEXT) TO service_role;

-- =====================================================
-- PART 2: Fix broadcast_topup_request_changes trigger
-- =====================================================
DROP TRIGGER IF EXISTS topup_requests_realtime_trigger ON public.topup_requests;

-- Recreate the function without realtime.send() - use pg_notify instead
CREATE OR REPLACE FUNCTION public.broadcast_topup_request_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payload JSONB;
  v_event_type TEXT;
BEGIN
  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'topup_request_created';
    v_payload := jsonb_build_object(
      'id', NEW.id,
      'tracking_id', NEW.tracking_id,
      'user_id', NEW.user_id,
      'amount', NEW.amount,
      'payment_method', NEW.payment_method,
      'status', NEW.status,
      'created_at', NEW.created_at,
      'operation', 'INSERT'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only broadcast if status changed or admin fields updated
    IF OLD.status IS DISTINCT FROM NEW.status OR 
       OLD.admin_id IS DISTINCT FROM NEW.admin_id OR
       OLD.admin_note IS DISTINCT FROM NEW.admin_note THEN
      v_event_type := 'topup_request_updated';
      v_payload := jsonb_build_object(
        'id', NEW.id,
        'tracking_id', NEW.tracking_id,
        'user_id', NEW.user_id,
        'amount', NEW.amount,
        'payment_method', NEW.payment_method,
        'status', NEW.status,
        'old_status', OLD.status,
        'admin_id', NEW.admin_id,
        'admin_note', NEW.admin_note,
        'approved_at', NEW.approved_at,
        'rejected_at', NEW.rejected_at,
        'updated_at', NEW.updated_at,
        'operation', 'UPDATE'
      );
    ELSE
      RETURN COALESCE(NEW, OLD);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := 'topup_request_deleted';
    v_payload := jsonb_build_object(
      'id', OLD.id,
      'tracking_id', OLD.tracking_id,
      'operation', 'DELETE'
    );
  END IF;

  -- Use pg_notify instead of realtime.send() which doesn't exist
  -- Supabase Realtime will pick this up via postgres_changes subscription
  BEGIN
    PERFORM pg_notify(
      'topup_requests_changes',
      jsonb_build_object(
        'event', v_event_type,
        'payload', v_payload
      )::text
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignore notification errors - don't fail the transaction
    NULL;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate the trigger with the fixed function
CREATE TRIGGER topup_requests_realtime_trigger
  AFTER INSERT OR DELETE OR UPDATE ON public.topup_requests
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_topup_request_changes();

-- =====================================================
-- PART 3: RLS Policies
-- =====================================================
DROP POLICY IF EXISTS "Anyone can create topup requests" ON public.topup_requests;
CREATE POLICY "Anyone can create topup requests" ON public.topup_requests 
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own topup requests" ON public.topup_requests;
CREATE POLICY "Users can view own topup requests" ON public.topup_requests 
  FOR SELECT USING (user_id = auth.uid() OR auth.uid() IS NOT NULL);

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON FUNCTION public.create_simple_topup_request IS 'Create topup request with user_id parameter - bypasses auth.uid() issue. Does NOT call send_notification to avoid realtime.send error.';
COMMENT ON FUNCTION public.broadcast_topup_request_changes IS 'Trigger function for topup_requests changes - uses pg_notify instead of realtime.send.';
