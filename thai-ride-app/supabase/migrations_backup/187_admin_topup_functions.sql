-- =====================================================
-- Migration: 187_admin_topup_functions.sql
-- Feature: F05 - Admin functions for topup management
-- STATUS: APPLIED VIA MCP (December 27, 2025)
-- =====================================================

-- Admin approve topup request
CREATE OR REPLACE FUNCTION admin_approve_topup_request(
  p_request_id UUID,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_admin_id UUID;
  v_request RECORD;
  v_wallet_id UUID;
BEGIN
  v_admin_id := auth.uid();
  
  -- Check admin permission
  IF NOT EXISTS (SELECT 1 FROM public.users usr WHERE usr.id = v_admin_id AND usr.role = 'admin') THEN
    RETURN QUERY SELECT false, 'ไม่มีสิทธิ์ดำเนินการ'::TEXT;
    RETURN;
  END IF;
  
  -- Get request
  SELECT * INTO v_request
  FROM public.topup_requests
  WHERE topup_requests.id = p_request_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบคำขอเติมเงิน'::TEXT;
    RETURN;
  END IF;
  
  IF v_request.status != 'pending' THEN
    RETURN QUERY SELECT false, 'คำขอนี้ดำเนินการแล้ว'::TEXT;
    RETURN;
  END IF;
  
  -- Update request status
  UPDATE public.topup_requests
  SET status = 'approved',
      admin_id = v_admin_id,
      admin_note = COALESCE(p_admin_note, topup_requests.admin_note),
      approved_at = NOW(),
      updated_at = NOW()
  WHERE topup_requests.id = p_request_id;
  
  -- Add wallet transaction
  PERFORM add_wallet_transaction(
    v_request.user_id,
    'topup',
    v_request.amount,
    'เติมเงินผ่าน ' || v_request.payment_method || ' (รหัส: ' || v_request.tracking_id || ')',
    'topup_request',
    p_request_id
  );
  
  -- Send notification to user
  BEGIN
    PERFORM send_notification(
      v_request.user_id,
      'payment',
      'เติมเงินสำเร็จ',
      'คำขอเติมเงิน ฿' || v_request.amount::TEXT || ' ได้รับการอนุมัติแล้ว',
      jsonb_build_object('request_id', p_request_id, 'amount', v_request.amount),
      '/customer/wallet'
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  
  RETURN QUERY SELECT true, 'อนุมัติคำขอเติมเงินสำเร็จ'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin reject topup request
CREATE OR REPLACE FUNCTION admin_reject_topup_request(
  p_request_id UUID,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_admin_id UUID;
  v_request RECORD;
BEGIN
  v_admin_id := auth.uid();
  
  -- Check admin permission
  IF NOT EXISTS (SELECT 1 FROM public.users usr WHERE usr.id = v_admin_id AND usr.role = 'admin') THEN
    RETURN QUERY SELECT false, 'ไม่มีสิทธิ์ดำเนินการ'::TEXT;
    RETURN;
  END IF;
  
  -- Get request
  SELECT * INTO v_request
  FROM public.topup_requests
  WHERE topup_requests.id = p_request_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบคำขอเติมเงิน'::TEXT;
    RETURN;
  END IF;
  
  IF v_request.status != 'pending' THEN
    RETURN QUERY SELECT false, 'คำขอนี้ดำเนินการแล้ว'::TEXT;
    RETURN;
  END IF;
  
  -- Update request status
  UPDATE public.topup_requests
  SET status = 'rejected',
      admin_id = v_admin_id,
      admin_note = COALESCE(p_admin_note, topup_requests.admin_note),
      rejected_at = NOW(),
      updated_at = NOW()
  WHERE topup_requests.id = p_request_id;
  
  -- Send notification to user
  BEGIN
    PERFORM send_notification(
      v_request.user_id,
      'payment',
      'คำขอเติมเงินถูกปฏิเสธ',
      'คำขอเติมเงิน ฿' || v_request.amount::TEXT || ' ถูกปฏิเสธ' || COALESCE(': ' || p_admin_note, ''),
      jsonb_build_object('request_id', p_request_id, 'amount', v_request.amount, 'reason', p_admin_note),
      '/customer/wallet'
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  
  RETURN QUERY SELECT true, 'ปฏิเสธคำขอเติมเงินสำเร็จ'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin get all topup requests
CREATE OR REPLACE FUNCTION admin_get_topup_requests(
  p_status VARCHAR(20) DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  tracking_id VARCHAR(25),
  user_id UUID,
  user_name TEXT,
  user_phone VARCHAR(20),
  amount DECIMAL(12,2),
  payment_method VARCHAR(30),
  payment_reference VARCHAR(100),
  slip_url TEXT,
  status VARCHAR(20),
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  v_admin_id := auth.uid();
  
  -- Check admin permission
  IF NOT EXISTS (SELECT 1 FROM public.users usr WHERE usr.id = v_admin_id AND usr.role = 'admin') THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    t.id,
    t.tracking_id,
    t.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, 'ไม่ระบุชื่อ')::TEXT,
    u.phone_number,
    t.amount,
    t.payment_method,
    t.payment_reference,
    COALESCE(t.slip_url, t.slip_image_url),
    t.status,
    t.admin_note,
    t.created_at,
    t.updated_at,
    t.approved_at,
    t.rejected_at
  FROM public.topup_requests t
  LEFT JOIN public.users u ON u.id = t.user_id
  WHERE (p_status IS NULL OR t.status = p_status)
  ORDER BY 
    CASE WHEN t.status = 'pending' THEN 0 ELSE 1 END,
    t.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_approve_topup_request TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reject_topup_request TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_topup_requests TO authenticated;
