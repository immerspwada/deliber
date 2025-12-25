-- =====================================================
-- Fix Wallet Top-up System
-- Ensures all tables, functions, and RLS policies exist
-- =====================================================

-- =====================================================
-- 1. Ensure topup_requests table exists
-- =====================================================

CREATE TABLE IF NOT EXISTS public.topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id VARCHAR(25) UNIQUE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 20),
  payment_method VARCHAR(30) NOT NULL DEFAULT 'promptpay',
  payment_reference VARCHAR(100),
  slip_url TEXT,
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_topup_requests_user ON public.topup_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_topup_requests_status ON public.topup_requests(status);
CREATE INDEX IF NOT EXISTS idx_topup_requests_created ON public.topup_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topup_requests_tracking ON public.topup_requests(tracking_id);

-- RLS
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own topup requests" ON public.topup_requests;
CREATE POLICY "Users can view own topup requests" ON public.topup_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own topup requests" ON public.topup_requests;
CREATE POLICY "Users can insert own topup requests" ON public.topup_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pending topup requests" ON public.topup_requests;
CREATE POLICY "Users can update own pending topup requests" ON public.topup_requests
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Admins can view all topup requests" ON public.topup_requests;
CREATE POLICY "Admins can view all topup requests" ON public.topup_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update all topup requests" ON public.topup_requests;
CREATE POLICY "Admins can update all topup requests" ON public.topup_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.topup_requests;

-- =====================================================
-- 2. Ensure payment_settings table exists
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(50) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_label VARCHAR(100),
  setting_label_th VARCHAR(100),
  setting_type VARCHAR(20) DEFAULT 'text',
  is_active BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.payment_settings (setting_key, setting_value, setting_label, setting_label_th, setting_type) VALUES
  ('promptpay_id', '0812345678', 'PromptPay ID', 'หมายเลขพร้อมเพย์', 'text'),
  ('promptpay_name', 'บริษัท ไทยไรด์ จำกัด', 'PromptPay Account Name', 'ชื่อบัญชีพร้อมเพย์', 'text'),
  ('bank_name', 'ธนาคารกสิกรไทย', 'Bank Name', 'ชื่อธนาคาร', 'text'),
  ('bank_account_number', '123-4-56789-0', 'Bank Account Number', 'เลขบัญชีธนาคาร', 'text'),
  ('bank_account_name', 'บริษัท ไทยไรด์ จำกัด', 'Bank Account Name', 'ชื่อบัญชีธนาคาร', 'text'),
  ('min_topup_amount', '20', 'Minimum Top-up Amount', 'ยอดเติมเงินขั้นต่ำ', 'number'),
  ('max_topup_amount', '50000', 'Maximum Top-up Amount', 'ยอดเติมเงินสูงสุด', 'number'),
  ('topup_expiry_hours', '24', 'Top-up Request Expiry (hours)', 'คำขอเติมเงินหมดอายุ (ชั่วโมง)', 'number')
ON CONFLICT (setting_key) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_settings_key ON public.payment_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_payment_settings_active ON public.payment_settings(is_active);

-- RLS
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active payment settings" ON public.payment_settings;
CREATE POLICY "Anyone can read active payment settings" ON public.payment_settings
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admin can update payment settings" ON public.payment_settings;
CREATE POLICY "Admin can update payment settings" ON public.payment_settings
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 3. Create get_topup_payment_info function
-- =====================================================

CREATE OR REPLACE FUNCTION get_topup_payment_info()
RETURNS TABLE (
  promptpay_id TEXT,
  promptpay_name TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  min_amount DECIMAL(12,2),
  max_amount DECIMAL(12,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT setting_value FROM public.payment_settings WHERE setting_key = 'promptpay_id' AND is_active = true),
    (SELECT setting_value FROM public.payment_settings WHERE setting_key = 'promptpay_name' AND is_active = true),
    (SELECT setting_value FROM public.payment_settings WHERE setting_key = 'bank_name' AND is_active = true),
    (SELECT setting_value FROM public.payment_settings WHERE setting_key = 'bank_account_number' AND is_active = true),
    (SELECT setting_value FROM public.payment_settings WHERE setting_key = 'bank_account_name' AND is_active = true),
    (SELECT setting_value::DECIMAL(12,2) FROM public.payment_settings WHERE setting_key = 'min_topup_amount' AND is_active = true),
    (SELECT setting_value::DECIMAL(12,2) FROM public.payment_settings WHERE setting_key = 'max_topup_amount' AND is_active = true);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- 4. Grant permissions
-- =====================================================

GRANT SELECT ON public.topup_requests TO anon, authenticated;
GRANT INSERT, UPDATE ON public.topup_requests TO authenticated;
GRANT SELECT ON public.payment_settings TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_topup_payment_info TO anon, authenticated;

-- =====================================================
-- 5. Verify setup
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Wallet top-up system setup complete!';
  RAISE NOTICE 'Tables: topup_requests, payment_settings';
  RAISE NOTICE 'Function: get_topup_payment_info()';
END $$;
