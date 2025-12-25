-- =====================================================
-- Fix All Errors - Comprehensive Database Fix
-- =====================================================

-- =====================================================
-- 1. Fix analytics_events RLS (401 Unauthorized)
-- =====================================================

-- Enable RLS
ALTER TABLE IF EXISTS public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "analytics_events_insert_policy" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_select_own" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_select_admin" ON public.analytics_events;
DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.analytics_events;
DROP POLICY IF EXISTS "Users can insert own events" ON public.analytics_events;

-- Allow ANYONE (including anon) to insert analytics events
CREATE POLICY "Allow all inserts for analytics" ON public.analytics_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Allow users to read their own events
CREATE POLICY "Users read own analytics" ON public.analytics_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Allow admins to read all events
CREATE POLICY "Admins read all analytics" ON public.analytics_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Grant permissions
GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT SELECT ON public.analytics_events TO authenticated;

-- =====================================================
-- 2. Ensure topup_requests table exists with proper RLS
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

-- RLS
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own topup requests" ON public.topup_requests;
CREATE POLICY "Users view own topup requests" ON public.topup_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own topup requests" ON public.topup_requests;
CREATE POLICY "Users insert own topup requests" ON public.topup_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own pending requests" ON public.topup_requests;
CREATE POLICY "Users update own pending requests" ON public.topup_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Admins full access topup requests" ON public.topup_requests;
CREATE POLICY "Admins full access topup requests" ON public.topup_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

GRANT SELECT, INSERT, UPDATE ON public.topup_requests TO authenticated;

-- =====================================================
-- 3. Ensure payment_settings table exists
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
  ('max_topup_amount', '50000', 'Maximum Top-up Amount', 'ยอดเติมเงินสูงสุด', 'number')
ON CONFLICT (setting_key) DO NOTHING;

-- RLS
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone read active payment settings" ON public.payment_settings;
CREATE POLICY "Anyone read active payment settings" ON public.payment_settings
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins update payment settings" ON public.payment_settings;
CREATE POLICY "Admins update payment settings" ON public.payment_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

GRANT SELECT ON public.payment_settings TO anon, authenticated;
GRANT UPDATE ON public.payment_settings TO authenticated;

-- =====================================================
-- 4. Create get_topup_payment_info function
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
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION get_topup_payment_info TO anon, authenticated;

-- =====================================================
-- 5. Verify and report
-- =====================================================

DO $$
DECLARE
  v_analytics_exists BOOLEAN;
  v_topup_exists BOOLEAN;
  v_payment_exists BOOLEAN;
BEGIN
  -- Check tables
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_events') INTO v_analytics_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'topup_requests') INTO v_topup_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_settings') INTO v_payment_exists;
  
  RAISE NOTICE '=== Fix Complete ===';
  RAISE NOTICE 'analytics_events: %', CASE WHEN v_analytics_exists THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE 'topup_requests: %', CASE WHEN v_topup_exists THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE 'payment_settings: %', CASE WHEN v_payment_exists THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE 'Function get_topup_payment_info: ✓ CREATED';
  RAISE NOTICE '===================';
END $$;
