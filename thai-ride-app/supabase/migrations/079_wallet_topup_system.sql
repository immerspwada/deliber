-- =====================================================
-- Migration: 079_wallet_topup_system.sql
-- Feature: F05 - Complete Wallet Top-up System with Admin Approval
-- 
-- ระบบเติมเงินครบวงจร:
-- 1. ลูกค้าสร้างคำขอเติมเงิน (pending)
-- 2. Admin อนุมัติ/ปฏิเสธ
-- 3. เงินเข้า wallet เมื่ออนุมัติ
-- 4. หักเงินอัตโนมัติเมื่อใช้บริการ
-- =====================================================

-- =====================================================
-- 1. TOPUP REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id VARCHAR(25) UNIQUE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 20),
  payment_method VARCHAR(30) NOT NULL DEFAULT 'promptpay',
  payment_reference VARCHAR(100), -- เลขอ้างอิงการโอน
  slip_image_url TEXT, -- รูปสลิป
  status VARCHAR(20) NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
  admin_id UUID REFERENCES public.users(id),
  admin_note TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_topup_requests_user ON public.topup_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_topup_requests_status ON public.topup_requests(status);
CREATE INDEX IF NOT EXISTS idx_topup_requests_created ON public.topup_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topup_requests_tracking ON public.topup_requests(tracking_id);

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================

ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all topup_requests" ON public.topup_requests;
CREATE POLICY "Allow all topup_requests" ON public.topup_requests FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 4. REALTIME
-- =====================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.topup_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 5. TRACKING ID TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION set_topup_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := 'TOP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_topup_tracking_id ON public.topup_requests;
CREATE TRIGGER trigger_topup_tracking_id
  BEFORE INSERT ON public.topup_requests
  FOR EACH ROW EXECUTE FUNCTION set_topup_tracking_id();

-- =====================================================
-- 6. CREATE TOPUP REQUEST FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION create_topup_request(
  p_user_id UUID,
  p_amount DECIMAL(12,2),
  p_payment_method VARCHAR(30) DEFAULT 'promptpay',
  p_payment_reference VARCHAR(100) DEFAULT NULL,
  p_slip_image_url TEXT DEFAULT NULL
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
BEGIN
  -- Check for too many pending requests
  SELECT COUNT(*) INTO v_pending_count
  FROM public.topup_requests
  WHERE user_id = p_user_id AND status = 'pending';
  
  IF v_pending_count >= 3 THEN
    RETURN QUERY SELECT false, 'คุณมีคำขอเติมเงินที่รอดำเนินการอยู่แล้ว กรุณารอการอนุมัติ'::TEXT, NULL::UUID, NULL::VARCHAR(25);
    RETURN;
  END IF;
  
  -- Validate amount
  IF p_amount < 20 THEN
    RETURN QUERY SELECT false, 'จำนวนเงินขั้นต่ำ 20 บาท'::TEXT, NULL::UUID, NULL::VARCHAR(25);
    RETURN;
  END IF;
  
  IF p_amount > 50000 THEN
    RETURN QUERY SELECT false, 'จำนวนเงินสูงสุด 50,000 บาท'::TEXT, NULL::UUID, NULL::VARCHAR(25);
    RETURN;
  END IF;
  
  -- Create request
  INSERT INTO public.topup_requests (
    user_id, amount, payment_method, payment_reference, slip_image_url
  ) VALUES (
    p_user_id, p_amount, p_payment_method, p_payment_reference, p_slip_image_url
  ) RETURNING id, topup_requests.tracking_id INTO v_request_id, v_tracking_id;
  
  -- Send notification to user
  PERFORM send_notification(
    p_user_id,
    'payment',
    'คำขอเติมเงินถูกสร้างแล้ว',
    'คำขอเติมเงิน ฿' || p_amount::TEXT || ' รอการอนุมัติ รหัส: ' || v_tracking_id,
    jsonb_build_object('request_id', v_request_id, 'amount', p_amount),
    '/customer/wallet'
  );
  
  RETURN QUERY SELECT true, 'สร้างคำขอเติมเงินสำเร็จ รอการอนุมัติ'::TEXT, v_request_id, v_tracking_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. APPROVE TOPUP REQUEST FUNCTION (Admin)
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
) AS $$
DECLARE
  v_request RECORD;
  v_txn_result RECORD;
BEGIN
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
  SET status = 'approved',
      admin_id = p_admin_id,
      admin_note = p_admin_note,
      approved_at = NOW(),
      updated_at = NOW()
  WHERE id = p_request_id;
  
  -- Add money to wallet
  SELECT * INTO v_txn_result
  FROM add_wallet_transaction(
    v_request.user_id,
    'topup',
    v_request.amount,
    'เติมเงินผ่าน ' || v_request.payment_method || ' (อนุมัติแล้ว) รหัส: ' || v_request.tracking_id,
    'topup_request',
    p_request_id
  );
  
  -- Send notification to user
  PERFORM send_notification(
    v_request.user_id,
    'payment',
    'เติมเงินสำเร็จ!',
    'เติมเงิน ฿' || v_request.amount::TEXT || ' เข้ากระเป๋าเรียบร้อยแล้ว',
    jsonb_build_object('request_id', p_request_id, 'amount', v_request.amount, 'new_balance', v_txn_result.new_balance),
    '/customer/wallet'
  );
  
  RETURN QUERY SELECT true, 'อนุมัติคำขอเติมเงินสำเร็จ'::TEXT, v_txn_result.new_balance;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. REJECT TOPUP REQUEST FUNCTION (Admin)
-- =====================================================

CREATE OR REPLACE FUNCTION reject_topup_request(
  p_request_id UUID,
  p_admin_id UUID,
  p_admin_note TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_request RECORD;
BEGIN
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
  SET status = 'rejected',
      admin_id = p_admin_id,
      admin_note = p_admin_note,
      rejected_at = NOW(),
      updated_at = NOW()
  WHERE id = p_request_id;
  
  -- Send notification to user
  PERFORM send_notification(
    v_request.user_id,
    'payment',
    'คำขอเติมเงินถูกปฏิเสธ',
    'คำขอเติมเงิน ฿' || v_request.amount::TEXT || ' ถูกปฏิเสธ เหตุผล: ' || COALESCE(p_admin_note, 'ไม่ระบุ'),
    jsonb_build_object('request_id', p_request_id, 'reason', p_admin_note),
    '/customer/wallet'
  );
  
  RETURN QUERY SELECT true, 'ปฏิเสธคำขอเติมเงินสำเร็จ'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. CANCEL TOPUP REQUEST FUNCTION (User)
-- =====================================================

CREATE OR REPLACE FUNCTION cancel_topup_request(
  p_request_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_request RECORD;
BEGIN
  SELECT * INTO v_request
  FROM public.topup_requests
  WHERE id = p_request_id AND user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบคำขอเติมเงิน'::TEXT;
    RETURN;
  END IF;
  
  IF v_request.status != 'pending' THEN
    RETURN QUERY SELECT false, 'ไม่สามารถยกเลิกคำขอที่ดำเนินการแล้ว'::TEXT;
    RETURN;
  END IF;
  
  UPDATE public.topup_requests
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN QUERY SELECT true, 'ยกเลิกคำขอเติมเงินสำเร็จ'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. PAY FROM WALLET FUNCTION (with validation)
-- =====================================================

CREATE OR REPLACE FUNCTION pay_from_wallet(
  p_user_id UUID,
  p_amount DECIMAL(12,2),
  p_description TEXT,
  p_reference_type VARCHAR(50) DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  transaction_id UUID,
  new_balance DECIMAL(12,2)
) AS $$
DECLARE
  v_wallet RECORD;
  v_txn_result RECORD;
BEGIN
  -- Get wallet balance
  SELECT * INTO v_wallet
  FROM public.user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    -- Create wallet if not exists
    PERFORM ensure_user_wallet(p_user_id);
    SELECT * INTO v_wallet FROM public.user_wallets WHERE user_id = p_user_id FOR UPDATE;
  END IF;
  
  -- Check balance
  IF v_wallet.balance < p_amount THEN
    RETURN QUERY SELECT 
      false, 
      'ยอดเงินไม่เพียงพอ (คงเหลือ ฿' || v_wallet.balance::TEXT || ')'::TEXT,
      NULL::UUID,
      v_wallet.balance;
    RETURN;
  END IF;
  
  -- Process payment
  SELECT * INTO v_txn_result
  FROM add_wallet_transaction(
    p_user_id,
    'payment',
    p_amount,
    p_description,
    p_reference_type,
    p_reference_id
  );
  
  RETURN QUERY SELECT 
    true, 
    'ชำระเงินสำเร็จ'::TEXT,
    v_txn_result.transaction_id,
    v_txn_result.new_balance;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. GET TOPUP REQUESTS FOR USER
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_topup_requests(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  tracking_id VARCHAR(25),
  amount DECIMAL(12,2),
  payment_method VARCHAR(30),
  status VARCHAR(20),
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.tracking_id,
    t.amount,
    t.payment_method,
    t.status,
    t.admin_note,
    t.created_at,
    t.approved_at,
    t.rejected_at
  FROM public.topup_requests t
  WHERE t.user_id = p_user_id
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. GET PENDING TOPUP REQUESTS FOR ADMIN
-- =====================================================

CREATE OR REPLACE FUNCTION get_pending_topup_requests()
RETURNS TABLE (
  id UUID,
  tracking_id VARCHAR(25),
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  amount DECIMAL(12,2),
  payment_method VARCHAR(30),
  payment_reference VARCHAR(100),
  slip_image_url TEXT,
  status VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.tracking_id,
    t.user_id,
    u.name::TEXT,
    u.email::TEXT,
    u.phone::TEXT,
    t.amount,
    t.payment_method,
    t.payment_reference,
    t.slip_image_url,
    t.status,
    t.created_at,
    t.expires_at
  FROM public.topup_requests t
  JOIN public.users u ON u.id = t.user_id
  WHERE t.status = 'pending'
  ORDER BY t.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 13. AUTO-EXPIRE OLD REQUESTS (can be called by cron)
-- =====================================================

CREATE OR REPLACE FUNCTION expire_old_topup_requests()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.topup_requests
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at < NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 14. WALLET STATS FOR ADMIN
-- =====================================================

CREATE OR REPLACE FUNCTION get_wallet_admin_stats()
RETURNS TABLE (
  total_wallets BIGINT,
  total_balance DECIMAL(12,2),
  total_earned DECIMAL(12,2),
  total_spent DECIMAL(12,2),
  pending_topups BIGINT,
  pending_topup_amount DECIMAL(12,2),
  today_topups BIGINT,
  today_topup_amount DECIMAL(12,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.user_wallets)::BIGINT,
    (SELECT COALESCE(SUM(balance), 0) FROM public.user_wallets),
    (SELECT COALESCE(SUM(total_earned), 0) FROM public.user_wallets),
    (SELECT COALESCE(SUM(total_spent), 0) FROM public.user_wallets),
    (SELECT COUNT(*) FROM public.topup_requests WHERE status = 'pending')::BIGINT,
    (SELECT COALESCE(SUM(amount), 0) FROM public.topup_requests WHERE status = 'pending'),
    (SELECT COUNT(*) FROM public.topup_requests WHERE status = 'approved' AND DATE(approved_at) = CURRENT_DATE)::BIGINT,
    (SELECT COALESCE(SUM(amount), 0) FROM public.topup_requests WHERE status = 'approved' AND DATE(approved_at) = CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 15. UPDATED_AT TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS update_topup_requests_updated_at ON public.topup_requests;
CREATE TRIGGER update_topup_requests_updated_at
  BEFORE UPDATE ON public.topup_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 16. GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON public.topup_requests TO anon;
GRANT ALL ON public.topup_requests TO authenticated;
GRANT EXECUTE ON FUNCTION create_topup_request TO authenticated;
GRANT EXECUTE ON FUNCTION approve_topup_request TO authenticated;
GRANT EXECUTE ON FUNCTION reject_topup_request TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_topup_request TO authenticated;
GRANT EXECUTE ON FUNCTION pay_from_wallet TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_topup_requests TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_topup_requests TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_topup_requests TO authenticated;
GRANT EXECUTE ON FUNCTION get_wallet_admin_stats TO authenticated;
