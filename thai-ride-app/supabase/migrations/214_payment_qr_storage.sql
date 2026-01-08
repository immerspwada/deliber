-- ============================================
-- Migration: 214_payment_qr_storage.sql
-- Feature: QR Code Storage for Payment Accounts
-- Date: 2026-01-08
-- ============================================

-- =====================================================
-- 1. STORAGE BUCKET FOR PAYMENT QR CODES
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-qr',
  'payment-qr',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- =====================================================
-- 2. STORAGE POLICIES
-- =====================================================

-- Allow public read access
DROP POLICY IF EXISTS "public_read_payment_qr" ON storage.objects;
CREATE POLICY "public_read_payment_qr" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'payment-qr');

-- Allow admin to upload/update/delete
DROP POLICY IF EXISTS "admin_manage_payment_qr" ON storage.objects;
CREATE POLICY "admin_manage_payment_qr" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'payment-qr' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    bucket_id = 'payment-qr' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- =====================================================
-- 3. FUNCTION: Update QR Code URL
-- =====================================================

CREATE OR REPLACE FUNCTION admin_update_account_qr(
  p_account_id UUID,
  p_qr_code_url TEXT
)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
BEGIN
  -- Check admin permission
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) THEN
    RETURN QUERY SELECT false, 'ไม่มีสิทธิ์ดำเนินการ'::TEXT;
    RETURN;
  END IF;
  
  -- Update QR URL
  UPDATE payment_receiving_accounts
  SET qr_code_url = p_qr_code_url, updated_at = NOW()
  WHERE id = p_account_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบบัญชีรับเงิน'::TEXT;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'อัพเดท QR Code สำเร็จ'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_update_account_qr TO authenticated;

-- =====================================================
-- 4. FUNCTION: Delete Account
-- =====================================================

CREATE OR REPLACE FUNCTION admin_delete_payment_account(p_account_id UUID)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
BEGIN
  -- Check admin permission
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) THEN
    RETURN QUERY SELECT false, 'ไม่มีสิทธิ์ดำเนินการ'::TEXT;
    RETURN;
  END IF;
  
  -- Soft delete (set inactive)
  UPDATE payment_receiving_accounts
  SET is_active = false, updated_at = NOW()
  WHERE id = p_account_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบบัญชีรับเงิน'::TEXT;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'ลบบัญชีรับเงินสำเร็จ'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_delete_payment_account TO authenticated;

COMMENT ON FUNCTION admin_update_account_qr IS 'อัพเดท QR Code URL ของบัญชีรับเงิน';
COMMENT ON FUNCTION admin_delete_payment_account IS 'ลบบัญชีรับเงิน (soft delete)';
