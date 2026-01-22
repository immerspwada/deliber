-- Migration: 316_topup_requests_system.sql
-- Description: Customer Topup Request Management System
-- Author: Admin Panel Enhancement
-- Date: 2026-01-22
-- Dependencies: wallets, wallet_transactions, users tables

-- =====================================================
-- 1. TOPUP REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer', 'promptpay', 'mobile_banking', 'cash', 'other')),
  payment_reference TEXT NOT NULL,
  payment_proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_topup_requests_user_id ON public.topup_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_topup_requests_status ON public.topup_requests(status);
CREATE INDEX IF NOT EXISTS idx_topup_requests_requested_at ON public.topup_requests(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_topup_requests_processed_by ON public.topup_requests(processed_by);

-- RLS Policies
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "users_view_own_topup_requests" ON public.topup_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "users_create_own_topup_requests" ON public.topup_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "admins_view_all_topup_requests" ON public.topup_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can update requests
CREATE POLICY "admins_update_topup_requests" ON public.topup_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_topup_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_topup_requests_updated_at ON public.topup_requests;
CREATE TRIGGER trigger_update_topup_requests_updated_at
  BEFORE UPDATE ON public.topup_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_topup_requests_updated_at();

-- =====================================================
-- 2. GET TOPUP REQUESTS (Admin)
-- =====================================================

CREATE OR REPLACE FUNCTION get_topup_requests_admin(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  amount NUMERIC,
  payment_method TEXT,
  payment_reference TEXT,
  payment_proof_url TEXT,
  status TEXT,
  requested_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  rejection_reason TEXT,
  wallet_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Admin role check
  SELECT auth.uid() INTO v_admin_id;
  
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = v_admin_id
    AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Return topup requests with customer details
  RETURN QUERY
  SELECT 
    tr.id,
    tr.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email)::TEXT as user_name,
    u.email::TEXT as user_email,
    COALESCE(u.phone_number, '')::TEXT as user_phone,
    tr.amount,
    tr.payment_method::TEXT,
    tr.payment_reference::TEXT,
    tr.payment_proof_url::TEXT,
    tr.status::TEXT,
    tr.requested_at,
    tr.processed_at,
    tr.processed_by,
    tr.rejection_reason::TEXT,
    COALESCE(w.balance, 0) as wallet_balance
  FROM public.topup_requests tr
  INNER JOIN public.users u ON tr.user_id = u.id
  LEFT JOIN public.wallets w ON tr.user_id = w.user_id
  WHERE 
    (p_status IS NULL OR tr.status = p_status)
  ORDER BY 
    CASE WHEN tr.status = 'pending' THEN 0 ELSE 1 END,
    tr.requested_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- 3. COUNT TOPUP REQUESTS (Admin)
-- =====================================================

CREATE OR REPLACE FUNCTION count_topup_requests_admin(
  p_status TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_count INT;
BEGIN
  -- Admin role check
  SELECT auth.uid() INTO v_admin_id;
  
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = v_admin_id
    AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Count requests
  SELECT COUNT(*)::INT INTO v_count
  FROM public.topup_requests
  WHERE (p_status IS NULL OR status = p_status);

  RETURN v_count;
END;
$$;

-- =====================================================
-- 4. APPROVE TOPUP REQUEST (Admin)
-- =====================================================

CREATE OR REPLACE FUNCTION approve_topup_request(
  p_request_id UUID,
  p_admin_id UUID,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_balance DECIMAL(12,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_wallet RECORD;
  v_new_balance DECIMAL(12,2);
BEGIN
  -- Admin role check
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = p_admin_id
    AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Get and lock the request
  SELECT * INTO v_request
  FROM public.topup_requests
  WHERE id = p_request_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบคำขอเติมเงิน'::TEXT, 0::DECIMAL(12,2);
    RETURN;
  END IF;
  
  IF v_request.status != 'pending' THEN
    RETURN QUERY SELECT false, 'คำขอนี้ถูกดำเนินการแล้ว'::TEXT, 0::DECIMAL(12,2);
    RETURN;
  END IF;
  
  -- Update request status
  UPDATE public.topup_requests
  SET 
    status = 'approved',
    processed_by = p_admin_id,
    processed_at = NOW(),
    notes = p_admin_note,
    updated_at = NOW()
  WHERE id = p_request_id;
  
  -- Get or create wallet
  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = v_request.user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, balance)
    VALUES (v_request.user_id, 0)
    RETURNING * INTO v_wallet;
  END IF;
  
  -- Update wallet balance
  UPDATE public.wallets
  SET 
    balance = balance + v_request.amount,
    updated_at = NOW()
  WHERE user_id = v_request.user_id
  RETURNING balance INTO v_new_balance;
  
  -- Create wallet transaction
  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    balance_before,
    balance_after,
    reference_type,
    reference_id,
    description,
    created_at
  ) VALUES (
    v_request.user_id,
    'topup',
    v_request.amount,
    v_wallet.balance,
    v_new_balance,
    'topup_request',
    p_request_id,
    'เติมเงินผ่าน ' || v_request.payment_method || ' (อนุมัติแล้ว)',
    NOW()
  );
  
  RETURN QUERY SELECT true, 'อนุมัติคำขอเติมเงินสำเร็จ'::TEXT, v_new_balance;
END;
$$;

-- =====================================================
-- 5. REJECT TOPUP REQUEST (Admin)
-- =====================================================

CREATE OR REPLACE FUNCTION reject_topup_request(
  p_request_id UUID,
  p_admin_id UUID,
  p_admin_note TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Admin role check
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = p_admin_id
    AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Get and lock the request
  SELECT * INTO v_request
  FROM public.topup_requests
  WHERE id = p_request_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบคำขอเติมเงิน'::TEXT;
    RETURN;
  END IF;
  
  IF v_request.status != 'pending' THEN
    RETURN QUERY SELECT false, 'คำขอนี้ถูกดำเนินการแล้ว'::TEXT;
    RETURN;
  END IF;
  
  -- Update request status
  UPDATE public.topup_requests
  SET 
    status = 'rejected',
    processed_by = p_admin_id,
    processed_at = NOW(),
    rejection_reason = p_admin_note,
    updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN QUERY SELECT true, 'ปฏิเสธคำขอเติมเงินสำเร็จ'::TEXT;
END;
$$;

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT ON public.topup_requests TO authenticated;
GRANT EXECUTE ON FUNCTION get_topup_requests_admin(TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION count_topup_requests_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_topup_request(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_topup_request(UUID, UUID, TEXT) TO authenticated;

-- =====================================================
-- 7. COMMENTS
-- =====================================================

COMMENT ON TABLE public.topup_requests IS 'Customer topup requests with payment proof';
COMMENT ON FUNCTION get_topup_requests_admin IS 'Get customer topup requests - SECURITY DEFINER with admin role check';
COMMENT ON FUNCTION count_topup_requests_admin IS 'Count customer topup requests for pagination - SECURITY DEFINER with admin role check';
COMMENT ON FUNCTION approve_topup_request IS 'Approve topup request and credit wallet - SECURITY DEFINER with admin role check';
COMMENT ON FUNCTION reject_topup_request IS 'Reject topup request - SECURITY DEFINER with admin role check';
