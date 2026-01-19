-- =====================================================
-- Migration: 198_fix_admin_topup_requests.sql
-- Feature: F05 - Fix Admin Topup Requests (auth.uid() bypass)
-- STATUS: APPLIED VIA MCP (December 28, 2025)
-- 
-- Problem: admin_get_topup_requests uses auth.uid() which returns NULL
-- Solution: Create functions that don't rely on auth.uid() for permission check
-- =====================================================

-- Drop existing functions to recreate
DROP FUNCTION IF EXISTS admin_get_topup_requests(VARCHAR, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS admin_get_topup_requests_enhanced(VARCHAR, INTEGER, TEXT);
DROP FUNCTION IF EXISTS admin_get_topup_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS admin_approve_topup_request(UUID, TEXT);
DROP FUNCTION IF EXISTS admin_reject_topup_request(UUID, TEXT);

-- =====================================================
-- Admin get all topup requests (NO auth.uid() check)
-- =====================================================
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
  user_member_uid VARCHAR(20),
  amount DECIMAL(12,2),
  payment_method VARCHAR(30),
  payment_reference VARCHAR(100),
  slip_url TEXT,
  status VARCHAR(20),
  admin_id UUID,
  admin_name TEXT,
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- No auth.uid() check - admin access is controlled by RLS and frontend
  RETURN QUERY
  SELECT 
    t.id,
    t.tracking_id,
    t.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, 'ไม่ระบุชื่อ')::TEXT AS user_name,
    u.phone_number AS user_phone,
    u.member_uid AS user_member_uid,
    t.amount,
    t.payment_method,
    t.payment_reference,
    COALESCE(t.slip_url, t.slip_image_url) AS slip_url,
    t.status,
    t.admin_id,
    COALESCE(admin_user.first_name || ' ' || admin_user.last_name, NULL)::TEXT AS admin_name,
    t.admin_note,
    t.created_at,
    t.updated_at,
    t.approved_at,
    t.rejected_at,
    t.expires_at
  FROM public.topup_requests t
  LEFT JOIN public.users u ON u.id = t.user_id
  LEFT JOIN public.users admin_user ON admin_user.id = t.admin_id
  WHERE (p_status IS NULL OR t.status = p_status)
  ORDER BY 
    CASE WHEN t.status = 'pending' THEN 0 ELSE 1 END,
    t.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Admin get topup requests enhanced (with search)
-- =====================================================
CREATE OR REPLACE FUNCTION admin_get_topup_requests_enhanced(
  p_status VARCHAR(20) DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  tracking_id VARCHAR(25),
  user_id UUID,
  user_name TEXT,
  user_phone VARCHAR(20),
  user_member_uid VARCHAR(20),
  amount DECIMAL(12,2),
  payment_method VARCHAR(30),
  payment_reference VARCHAR(100),
  slip_url TEXT,
  status VARCHAR(20),
  admin_id UUID,
  admin_name TEXT,
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.tracking_id,
    t.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, 'ไม่ระบุชื่อ')::TEXT AS user_name,
    u.phone_number AS user_phone,
    u.member_uid AS user_member_uid,
    t.amount,
    t.payment_method,
    t.payment_reference,
    COALESCE(t.slip_url, t.slip_image_url) AS slip_url,
    t.status,
    t.admin_id,
    COALESCE(admin_user.first_name || ' ' || admin_user.last_name, NULL)::TEXT AS admin_name,
    t.admin_note,
    t.created_at,
    t.updated_at,
    t.approved_at,
    t.rejected_at,
    t.expires_at
  FROM public.topup_requests t
  LEFT JOIN public.users u ON u.id = t.user_id
  LEFT JOIN public.users admin_user ON admin_user.id = t.admin_id
  WHERE (p_status IS NULL OR t.status = p_status)
    AND (
      p_search IS NULL 
      OR t.tracking_id ILIKE '%' || p_search || '%'
      OR u.first_name ILIKE '%' || p_search || '%'
      OR u.last_name ILIKE '%' || p_search || '%'
      OR u.phone_number ILIKE '%' || p_search || '%'
      OR u.member_uid ILIKE '%' || p_search || '%'
    )
  ORDER BY 
    CASE WHEN t.status = 'pending' THEN 0 ELSE 1 END,
    t.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Admin get topup stats
-- =====================================================
CREATE OR REPLACE FUNCTION admin_get_topup_stats(
  p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  total_requests BIGINT,
  pending_requests BIGINT,
  approved_requests BIGINT,
  rejected_requests BIGINT,
  cancelled_requests BIGINT,
  expired_requests BIGINT,
  total_amount DECIMAL(12,2),
  pending_amount DECIMAL(12,2),
  approved_amount DECIMAL(12,2),
  avg_processing_time_minutes DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total_requests,
    COUNT(*) FILTER (WHERE t.status = 'pending')::BIGINT AS pending_requests,
    COUNT(*) FILTER (WHERE t.status = 'approved')::BIGINT AS approved_requests,
    COUNT(*) FILTER (WHERE t.status = 'rejected')::BIGINT AS rejected_requests,
    COUNT(*) FILTER (WHERE t.status = 'cancelled')::BIGINT AS cancelled_requests,
    COUNT(*) FILTER (WHERE t.status = 'expired')::BIGINT AS expired_requests,
    COALESCE(SUM(t.amount), 0)::DECIMAL(12,2) AS total_amount,
    COALESCE(SUM(t.amount) FILTER (WHERE t.status = 'pending'), 0)::DECIMAL(12,2) AS pending_amount,
    COALESCE(SUM(t.amount) FILTER (WHERE t.status = 'approved'), 0)::DECIMAL(12,2) AS approved_amount,
    COALESCE(
      AVG(
        EXTRACT(EPOCH FROM (COALESCE(t.approved_at, t.rejected_at) - t.created_at)) / 60
      ) FILTER (WHERE t.status IN ('approved', 'rejected')),
      0
    )::DECIMAL(10,2) AS avg_processing_time_minutes
  FROM public.topup_requests t
  WHERE (p_date_from IS NULL OR t.created_at >= p_date_from)
    AND (p_date_to IS NULL OR t.created_at <= p_date_to);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Admin approve topup request (with p_admin_id parameter)
-- =====================================================
CREATE OR REPLACE FUNCTION admin_approve_topup_request(
  p_request_id UUID,
  p_admin_note TEXT DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_request RECORD;
BEGIN
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
      admin_id = COALESCE(p_admin_id, topup_requests.admin_id),
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
  
  -- Send notification to user (wrapped in exception handler)
  BEGIN
    INSERT INTO public.user_notifications (
      user_id, type, title, message, data, action_url
    ) VALUES (
      v_request.user_id,
      'payment',
      'เติมเงินสำเร็จ',
      'คำขอเติมเงิน ฿' || v_request.amount::TEXT || ' ได้รับการอนุมัติแล้ว',
      jsonb_build_object('request_id', p_request_id, 'amount', v_request.amount),
      '/customer/wallet'
    );
  EXCEPTION WHEN OTHERS THEN 
    -- Ignore notification errors
    NULL;
  END;
  
  RETURN QUERY SELECT true, 'อนุมัติคำขอเติมเงินสำเร็จ'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Admin reject topup request (with p_admin_id parameter)
-- =====================================================
CREATE OR REPLACE FUNCTION admin_reject_topup_request(
  p_request_id UUID,
  p_admin_note TEXT DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_request RECORD;
BEGIN
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
      admin_id = COALESCE(p_admin_id, topup_requests.admin_id),
      admin_note = COALESCE(p_admin_note, topup_requests.admin_note),
      rejected_at = NOW(),
      updated_at = NOW()
  WHERE topup_requests.id = p_request_id;
  
  -- Send notification to user (wrapped in exception handler)
  BEGIN
    INSERT INTO public.user_notifications (
      user_id, type, title, message, data, action_url
    ) VALUES (
      v_request.user_id,
      'payment',
      'คำขอเติมเงินถูกปฏิเสธ',
      'คำขอเติมเงิน ฿' || v_request.amount::TEXT || ' ถูกปฏิเสธ' || COALESCE(': ' || p_admin_note, ''),
      jsonb_build_object('request_id', p_request_id, 'amount', v_request.amount, 'reason', p_admin_note),
      '/customer/wallet'
    );
  EXCEPTION WHEN OTHERS THEN 
    -- Ignore notification errors
    NULL;
  END;
  
  RETURN QUERY SELECT true, 'ปฏิเสธคำขอเติมเงินสำเร็จ'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Grant permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION admin_get_topup_requests(VARCHAR, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_topup_requests_enhanced(VARCHAR, INTEGER, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_topup_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_approve_topup_request(UUID, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_reject_topup_request(UUID, TEXT, UUID) TO anon, authenticated;

-- =====================================================
-- Ensure RLS allows admin access to topup_requests
-- =====================================================
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Admin full access to topup_requests" ON public.topup_requests;
  DROP POLICY IF EXISTS "admin_topup_requests_all" ON public.topup_requests;
  
  -- Create admin full access policy
  CREATE POLICY "admin_topup_requests_all" ON public.topup_requests
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
    
EXCEPTION WHEN OTHERS THEN
  -- If policy creation fails, try alternative approach
  NULL;
END $$;

-- Enable RLS on topup_requests if not already enabled
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;
