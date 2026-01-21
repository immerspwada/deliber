-- ============================================
-- Migration: 212_payment_receiving_accounts.sql
-- Feature: F05 - Payment Receiving Accounts (Admin)
-- Date: 2026-01-08
-- ============================================
-- Description: บัญชีรับเงินของ Admin สำหรับการเติมเงิน
-- - QR Code พร้อมเพย์
-- - บัญชีธนาคาร
-- - แสดงให้ลูกค้าเห็นก่อนโอนเงิน
-- ============================================

-- =====================================================
-- 1. PAYMENT RECEIVING ACCOUNTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_receiving_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type VARCHAR(30) NOT NULL CHECK (account_type IN ('promptpay', 'bank_transfer')),
  account_name VARCHAR(100) NOT NULL, -- ชื่อบัญชี
  account_number VARCHAR(50) NOT NULL, -- เลขบัญชี หรือ เบอร์พร้อมเพย์
  bank_code VARCHAR(20), -- รหัสธนาคาร (สำหรับ bank_transfer)
  bank_name VARCHAR(100), -- ชื่อธนาคาร
  qr_code_url TEXT, -- URL รูป QR Code
  display_name VARCHAR(100), -- ชื่อที่แสดง เช่น "GOBEAR Official"
  description TEXT, -- คำอธิบายเพิ่มเติม
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_receiving_accounts_type ON payment_receiving_accounts(account_type, is_active);
CREATE INDEX IF NOT EXISTS idx_receiving_accounts_default ON payment_receiving_accounts(is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE payment_receiving_accounts ENABLE ROW LEVEL SECURITY;

-- Everyone can read active accounts
CREATE POLICY "anyone_read_active_accounts" ON payment_receiving_accounts
  FOR SELECT USING (is_active = true);

-- Only admin can manage
CREATE POLICY "admin_manage_accounts" ON payment_receiving_accounts
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- =====================================================
-- 2. INSERT DEFAULT ACCOUNTS (ตัวอย่าง)
-- =====================================================

INSERT INTO payment_receiving_accounts (account_type, account_name, account_number, display_name, description, qr_code_url, is_active, is_default, sort_order)
VALUES 
  ('promptpay', 'GOBEAR CO., LTD.', '0812345678', 'พร้อมเพย์ GOBEAR', 'โอนเงินผ่านพร้อมเพย์', 'https://promptpay.io/0812345678.png', true, true, 1),
  ('bank_transfer', 'GOBEAR CO., LTD.', '123-4-56789-0', 'ธนาคารกสิกรไทย', 'โอนเงินผ่านธนาคาร', NULL, true, false, 2)
ON CONFLICT DO NOTHING;

-- Update bank info for bank_transfer
UPDATE payment_receiving_accounts 
SET bank_code = 'KBANK', bank_name = 'ธนาคารกสิกรไทย'
WHERE account_type = 'bank_transfer' AND bank_code IS NULL;

-- =====================================================
-- 3. FUNCTION: Get Payment Accounts for Customer
-- =====================================================

CREATE OR REPLACE FUNCTION get_payment_receiving_accounts(p_account_type VARCHAR DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  account_type VARCHAR(30),
  account_name VARCHAR(100),
  account_number VARCHAR(50),
  bank_code VARCHAR(20),
  bank_name VARCHAR(100),
  qr_code_url TEXT,
  display_name VARCHAR(100),
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pra.id,
    pra.account_type,
    pra.account_name,
    pra.account_number,
    pra.bank_code,
    pra.bank_name,
    pra.qr_code_url,
    pra.display_name,
    pra.description
  FROM payment_receiving_accounts pra
  WHERE pra.is_active = true
    AND (p_account_type IS NULL OR pra.account_type = p_account_type)
  ORDER BY pra.is_default DESC, pra.sort_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. FUNCTION: Get Default Account by Type
-- =====================================================

CREATE OR REPLACE FUNCTION get_default_payment_account(p_account_type VARCHAR)
RETURNS TABLE (
  id UUID,
  account_name VARCHAR(100),
  account_number VARCHAR(50),
  bank_code VARCHAR(20),
  bank_name VARCHAR(100),
  qr_code_url TEXT,
  display_name VARCHAR(100)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pra.id,
    pra.account_name,
    pra.account_number,
    pra.bank_code,
    pra.bank_name,
    pra.qr_code_url,
    pra.display_name
  FROM payment_receiving_accounts pra
  WHERE pra.is_active = true
    AND pra.account_type = p_account_type
  ORDER BY pra.is_default DESC, pra.sort_order ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. ADMIN FUNCTIONS
-- =====================================================

-- Add new account
CREATE OR REPLACE FUNCTION admin_add_payment_account(
  p_account_type VARCHAR(30),
  p_account_name VARCHAR(100),
  p_account_number VARCHAR(50),
  p_bank_code VARCHAR(20) DEFAULT NULL,
  p_bank_name VARCHAR(100) DEFAULT NULL,
  p_qr_code_url TEXT DEFAULT NULL,
  p_display_name VARCHAR(100) DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_is_default BOOLEAN DEFAULT false
)
RETURNS TABLE (success BOOLEAN, account_id UUID, message TEXT) AS $$
DECLARE
  v_account_id UUID;
BEGIN
  -- Check admin permission
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'ไม่มีสิทธิ์ดำเนินการ'::TEXT;
    RETURN;
  END IF;
  
  -- If setting as default, unset other defaults of same type
  IF p_is_default THEN
    UPDATE payment_receiving_accounts
    SET is_default = false
    WHERE account_type = p_account_type;
  END IF;
  
  -- Insert new account
  INSERT INTO payment_receiving_accounts (
    account_type, account_name, account_number, bank_code, bank_name,
    qr_code_url, display_name, description, is_default
  )
  VALUES (
    p_account_type, p_account_name, p_account_number, p_bank_code, p_bank_name,
    p_qr_code_url, COALESCE(p_display_name, p_account_name), p_description, p_is_default
  )
  RETURNING id INTO v_account_id;
  
  RETURN QUERY SELECT true, v_account_id, 'เพิ่มบัญชีรับเงินสำเร็จ'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update account
CREATE OR REPLACE FUNCTION admin_update_payment_account(
  p_account_id UUID,
  p_account_name VARCHAR(100) DEFAULT NULL,
  p_account_number VARCHAR(50) DEFAULT NULL,
  p_bank_code VARCHAR(20) DEFAULT NULL,
  p_bank_name VARCHAR(100) DEFAULT NULL,
  p_qr_code_url TEXT DEFAULT NULL,
  p_display_name VARCHAR(100) DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_is_default BOOLEAN DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
  v_account_type VARCHAR(30);
BEGIN
  -- Check admin permission
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) THEN
    RETURN QUERY SELECT false, 'ไม่มีสิทธิ์ดำเนินการ'::TEXT;
    RETURN;
  END IF;
  
  -- Get account type
  SELECT account_type INTO v_account_type FROM payment_receiving_accounts WHERE id = p_account_id;
  
  IF v_account_type IS NULL THEN
    RETURN QUERY SELECT false, 'ไม่พบบัญชีรับเงิน'::TEXT;
    RETURN;
  END IF;
  
  -- If setting as default, unset other defaults
  IF p_is_default = true THEN
    UPDATE payment_receiving_accounts
    SET is_default = false
    WHERE account_type = v_account_type AND id != p_account_id;
  END IF;
  
  -- Update account
  UPDATE payment_receiving_accounts
  SET 
    account_name = COALESCE(p_account_name, account_name),
    account_number = COALESCE(p_account_number, account_number),
    bank_code = COALESCE(p_bank_code, bank_code),
    bank_name = COALESCE(p_bank_name, bank_name),
    qr_code_url = COALESCE(p_qr_code_url, qr_code_url),
    display_name = COALESCE(p_display_name, display_name),
    description = COALESCE(p_description, description),
    is_active = COALESCE(p_is_active, is_active),
    is_default = COALESCE(p_is_default, is_default),
    updated_at = NOW()
  WHERE id = p_account_id;
  
  RETURN QUERY SELECT true, 'อัพเดทบัญชีรับเงินสำเร็จ'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_payment_receiving_accounts TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_default_payment_account TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_add_payment_account TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_payment_account TO authenticated;

-- =====================================================
-- 7. COMMENTS
-- =====================================================

COMMENT ON TABLE payment_receiving_accounts IS 'บัญชีรับเงินของ Admin สำหรับการเติมเงิน (พร้อมเพย์, ธนาคาร)';
COMMENT ON FUNCTION get_payment_receiving_accounts IS 'ดึงรายการบัญชีรับเงินสำหรับแสดงให้ลูกค้า';
COMMENT ON FUNCTION get_default_payment_account IS 'ดึงบัญชีรับเงินหลักตามประเภท';
