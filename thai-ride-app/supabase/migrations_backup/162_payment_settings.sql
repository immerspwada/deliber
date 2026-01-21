-- =====================================================
-- Migration: 162_payment_settings.sql
-- Feature: Payment Settings - PromptPay ID Management
-- 
-- Admin สามารถเปลี่ยน PromptPay ID และข้อมูลบัญชีธนาคารได้
-- =====================================================

-- =====================================================
-- 1. PAYMENT SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(50) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_label VARCHAR(100),
  setting_label_th VARCHAR(100),
  setting_type VARCHAR(20) DEFAULT 'text', -- text, number, boolean, json
  is_active BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. INSERT DEFAULT SETTINGS
-- =====================================================

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

-- =====================================================
-- 3. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_payment_settings_key ON public.payment_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_payment_settings_active ON public.payment_settings(is_active);

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read active settings (for displaying payment info to customers)
DROP POLICY IF EXISTS "Anyone can read active payment settings" ON public.payment_settings;
CREATE POLICY "Anyone can read active payment settings" ON public.payment_settings
  FOR SELECT USING (is_active = true);

-- Only admins can update payment settings
DROP POLICY IF EXISTS "Admin can update payment settings" ON public.payment_settings;
CREATE POLICY "Admin can update payment settings" ON public.payment_settings
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Only admins can insert new payment settings
DROP POLICY IF EXISTS "Admin can insert payment settings" ON public.payment_settings;
CREATE POLICY "Admin can insert payment settings" ON public.payment_settings
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Only admins can delete payment settings
DROP POLICY IF EXISTS "Admin can delete payment settings" ON public.payment_settings;
CREATE POLICY "Admin can delete payment settings" ON public.payment_settings
  FOR DELETE TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 5. GET PAYMENT SETTING FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_payment_setting(p_key VARCHAR(50))
RETURNS TEXT AS $$
DECLARE
  v_value TEXT;
BEGIN
  SELECT setting_value INTO v_value
  FROM public.payment_settings
  WHERE setting_key = p_key AND is_active = true;
  
  RETURN v_value;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 6. GET ALL PAYMENT SETTINGS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_all_payment_settings()
RETURNS TABLE (
  id UUID,
  setting_key VARCHAR(50),
  setting_value TEXT,
  setting_label VARCHAR(100),
  setting_label_th VARCHAR(100),
  setting_type VARCHAR(20),
  is_active BOOLEAN,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.setting_key,
    ps.setting_value,
    ps.setting_label,
    ps.setting_label_th,
    ps.setting_type,
    ps.is_active,
    ps.updated_at
  FROM public.payment_settings ps
  WHERE ps.is_active = true
  ORDER BY ps.created_at;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 7. UPDATE PAYMENT SETTING FUNCTION (Admin)
-- =====================================================

CREATE OR REPLACE FUNCTION update_payment_setting(
  p_key VARCHAR(50),
  p_value TEXT,
  p_admin_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_old_value TEXT;
BEGIN
  -- Get old value for audit
  SELECT setting_value INTO v_old_value
  FROM public.payment_settings
  WHERE setting_key = p_key;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบการตั้งค่านี้'::TEXT;
    RETURN;
  END IF;
  
  -- Update setting
  UPDATE public.payment_settings
  SET setting_value = p_value,
      updated_by = p_admin_id,
      updated_at = NOW()
  WHERE setting_key = p_key;
  
  -- Log to audit (if table exists)
  BEGIN
    INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (p_admin_id, 'update_payment_setting', 'payment_settings', p_key, v_old_value, p_value);
  EXCEPTION WHEN undefined_table THEN
    -- Audit table doesn't exist, skip
    NULL;
  END;
  
  RETURN QUERY SELECT true, 'อัพเดทการตั้งค่าสำเร็จ'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. GET TOPUP PAYMENT INFO FUNCTION (For Customer)
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
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 9. UPDATED_AT TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS update_payment_settings_updated_at ON public.payment_settings;
CREATE TRIGGER update_payment_settings_updated_at
  BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON public.payment_settings TO anon;
GRANT SELECT, UPDATE ON public.payment_settings TO authenticated;
GRANT EXECUTE ON FUNCTION get_payment_setting TO anon;
GRANT EXECUTE ON FUNCTION get_payment_setting TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_payment_settings TO authenticated;
GRANT EXECUTE ON FUNCTION update_payment_setting TO authenticated;
GRANT EXECUTE ON FUNCTION get_topup_payment_info TO anon;
GRANT EXECUTE ON FUNCTION get_topup_payment_info TO authenticated;
