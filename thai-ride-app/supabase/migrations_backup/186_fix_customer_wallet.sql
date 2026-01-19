-- =====================================================
-- Migration: 186_fix_customer_wallet.sql
-- Feature: F05 - Fix Customer Wallet to work properly
-- 
-- STATUS: APPLIED VIA MCP (December 27, 2025)
-- 
-- แก้ไข:
-- 1. เพิ่ม slip_url column alias
-- 2. Auto-create wallet สำหรับ user ใหม่
-- 3. Fix RLS policies ให้ user เข้าถึงข้อมูลตัวเองได้
-- 4. เพิ่ม function สำหรับ customer wallet operations
-- 
-- Note: Most of this was applied via MCP in parts.
-- The admin functions are in 187_admin_topup_functions.sql
-- =====================================================

-- =====================================================
-- 1. ADD SLIP_URL COLUMN (alias for slip_image_url)
-- =====================================================

-- Add slip_url column if not exists (for backward compatibility)
ALTER TABLE public.topup_requests 
ADD COLUMN IF NOT EXISTS slip_url TEXT;

-- Sync data from slip_image_url to slip_url
UPDATE public.topup_requests 
SET slip_url = slip_image_url 
WHERE slip_url IS NULL AND slip_image_url IS NOT NULL;

-- =====================================================
-- 2. AUTO-CREATE WALLET TRIGGER
-- =====================================================

-- Function to auto-create wallet when user is created
CREATE OR REPLACE FUNCTION auto_create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_wallets (user_id, balance, total_earned, total_spent)
  VALUES (NEW.id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_create_wallet ON public.users;

-- Create trigger
CREATE TRIGGER trigger_auto_create_wallet
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION auto_create_user_wallet();

-- =====================================================
-- 3. CREATE WALLETS FOR EXISTING USERS
-- =====================================================

-- Create wallets for all existing users who don't have one
INSERT INTO public.user_wallets (user_id, balance, total_earned, total_spent)
SELECT id, 0, 0, 0 FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.user_wallets WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 4. FIX RLS POLICIES FOR CUSTOMER ACCESS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all user_wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can view own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can update own wallet" ON public.user_wallets;

-- Create proper RLS policies for user_wallets
CREATE POLICY "Users can view own wallet" ON public.user_wallets
  FOR SELECT USING (
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert own wallet" ON public.user_wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update wallets" ON public.user_wallets
  FOR UPDATE USING (true) WITH CHECK (true);

-- Drop existing policies for wallet_transactions
DROP POLICY IF EXISTS "Allow all wallet_transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;

-- Create proper RLS policies for wallet_transactions
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions
  FOR SELECT USING (
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can insert transactions" ON public.wallet_transactions
  FOR INSERT WITH CHECK (true);

-- Drop existing policies for topup_requests
DROP POLICY IF EXISTS "Allow all topup_requests" ON public.topup_requests;
DROP POLICY IF EXISTS "Users can view own topup requests" ON public.topup_requests;
DROP POLICY IF EXISTS "Users can create topup requests" ON public.topup_requests;

-- Create proper RLS policies for topup_requests
CREATE POLICY "Users can view own topup requests" ON public.topup_requests
  FOR SELECT USING (
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can create topup requests" ON public.topup_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending topup requests" ON public.topup_requests
  FOR UPDATE USING (
    (auth.uid() = user_id AND status = 'pending')
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 5. IMPROVED GET WALLET BALANCE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_customer_wallet(p_user_id UUID)
RETURNS TABLE (
  wallet_id UUID,
  balance DECIMAL(12,2),
  total_earned DECIMAL(12,2),
  total_spent DECIMAL(12,2),
  pending_topup_amount DECIMAL(12,2),
  pending_topup_count INTEGER
) AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  -- Ensure wallet exists
  v_wallet_id := ensure_user_wallet(p_user_id);
  
  RETURN QUERY
  SELECT 
    w.id,
    w.balance,
    w.total_earned,
    w.total_spent,
    COALESCE((
      SELECT SUM(amount) FROM public.topup_requests 
      WHERE user_id = p_user_id AND status = 'pending'
    ), 0)::DECIMAL(12,2),
    COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.topup_requests 
      WHERE user_id = p_user_id AND status = 'pending'
    ), 0)
  FROM public.user_wallets w
  WHERE w.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. IMPROVED CREATE TOPUP REQUEST FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION customer_create_topup_request(
  p_amount DECIMAL(12,2),
  p_payment_method VARCHAR(30) DEFAULT 'promptpay',
  p_payment_reference VARCHAR(100) DEFAULT NULL,
  p_slip_url TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  request_id UUID,
  tracking_id VARCHAR(25)
) AS $$
DECLARE
  v_user_id UUID;
  v_request_id UUID;
  v_tracking_id VARCHAR(25);
  v_pending_count INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'กรุณาเข้าสู่ระบบ'::TEXT, NULL::UUID, NULL::VARCHAR(25);
    RETURN;
  END IF;
  
  -- Check for too many pending requests
  SELECT COUNT(*) INTO v_pending_count
  FROM public.topup_requests
  WHERE user_id = v_user_id AND status = 'pending';
  
  IF v_pending_count >= 3 THEN
    RETURN QUERY SELECT false, 'คุณมีคำขอเติมเงินที่รอดำเนินการอยู่แล้ว 3 รายการ'::TEXT, NULL::UUID, NULL::VARCHAR(25);
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
  
  -- Generate tracking ID
  v_tracking_id := 'TOP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  
  -- Create request
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
    v_user_id, 
    v_tracking_id,
    p_amount, 
    p_payment_method, 
    p_payment_reference, 
    p_slip_url,
    p_slip_url,
    'pending'
  ) RETURNING id INTO v_request_id;
  
  -- Send notification
  BEGIN
    PERFORM send_notification(
      v_user_id,
      'payment',
      'คำขอเติมเงินถูกสร้างแล้ว',
      'คำขอเติมเงิน ฿' || p_amount::TEXT || ' รอการอนุมัติ รหัส: ' || v_tracking_id,
      jsonb_build_object('request_id', v_request_id, 'amount', p_amount),
      '/customer/wallet'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignore notification errors
    NULL;
  END;
  
  RETURN QUERY SELECT true, 'สร้างคำขอเติมเงินสำเร็จ รอการอนุมัติ'::TEXT, v_request_id, v_tracking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. CUSTOMER CANCEL TOPUP REQUEST FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION customer_cancel_topup_request(p_request_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_request RECORD;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'กรุณาเข้าสู่ระบบ'::TEXT;
    RETURN;
  END IF;
  
  -- Get request
  SELECT * INTO v_request
  FROM public.topup_requests
  WHERE id = p_request_id AND user_id = v_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบคำขอเติมเงิน'::TEXT;
    RETURN;
  END IF;
  
  IF v_request.status != 'pending' THEN
    RETURN QUERY SELECT false, 'ไม่สามารถยกเลิกคำขอที่ดำเนินการแล้ว'::TEXT;
    RETURN;
  END IF;
  
  -- Update status
  UPDATE public.topup_requests
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN QUERY SELECT true, 'ยกเลิกคำขอเติมเงินสำเร็จ'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. GET CUSTOMER TRANSACTIONS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_customer_transactions(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  type VARCHAR(20),
  amount DECIMAL(12,2),
  balance_before DECIMAL(12,2),
  balance_after DECIMAL(12,2),
  description TEXT,
  reference_type VARCHAR(50),
  reference_id UUID,
  status VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    t.id,
    t.type,
    t.amount,
    t.balance_before,
    t.balance_after,
    t.description,
    t.reference_type,
    t.reference_id,
    t.status,
    t.created_at
  FROM public.wallet_transactions t
  WHERE t.user_id = v_user_id
  ORDER BY t.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. GET CUSTOMER TOPUP REQUESTS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_customer_topup_requests(
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  tracking_id VARCHAR(25),
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
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    t.id,
    t.tracking_id,
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
  WHERE t.user_id = v_user_id
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_customer_wallet TO authenticated;
GRANT EXECUTE ON FUNCTION customer_create_topup_request TO authenticated;
GRANT EXECUTE ON FUNCTION customer_cancel_topup_request TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_topup_requests TO authenticated;

-- =====================================================
-- 11. ENABLE REALTIME FOR WALLET TABLES
-- =====================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_wallets;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.topup_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
