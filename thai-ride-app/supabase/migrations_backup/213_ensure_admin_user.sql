-- ============================================
-- Migration: 213_ensure_admin_user.sql
-- Feature: Ensure Admin User Exists
-- Date: 2026-01-08
-- ============================================
-- Description: สร้าง/อัปเดต admin user สำหรับ testing
-- ============================================

-- Function to ensure admin user exists and has correct role
CREATE OR REPLACE FUNCTION ensure_admin_user(
  p_email TEXT,
  p_role TEXT DEFAULT 'super_admin'
)
RETURNS TABLE (success BOOLEAN, message TEXT, user_id UUID) AS $$
DECLARE
  v_user_id UUID;
  v_auth_user_id UUID;
BEGIN
  -- Check if user exists in users table by email
  SELECT id INTO v_user_id FROM users WHERE email = p_email;
  
  IF v_user_id IS NOT NULL THEN
    -- Update role if user exists
    UPDATE users 
    SET role = p_role, 
        verification_status = 'verified',
        updated_at = NOW()
    WHERE id = v_user_id;
    
    RETURN QUERY SELECT true, 'อัปเดต role เป็น ' || p_role || ' สำเร็จ'::TEXT, v_user_id;
    RETURN;
  END IF;
  
  -- Check if user exists in auth.users
  SELECT id INTO v_auth_user_id FROM auth.users WHERE email = p_email;
  
  IF v_auth_user_id IS NOT NULL THEN
    -- Create user record with admin role
    INSERT INTO users (id, email, role, verification_status, created_at, updated_at)
    VALUES (v_auth_user_id, p_email, p_role, 'verified', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET role = p_role, verification_status = 'verified';
    
    RETURN QUERY SELECT true, 'สร้าง user record และตั้ง role เป็น ' || p_role || ' สำเร็จ'::TEXT, v_auth_user_id;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT false, 'ไม่พบ user ในระบบ กรุณาสมัครสมาชิกก่อน'::TEXT, NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION ensure_admin_user TO authenticated;

-- Helper function to promote existing user to admin (for use in Supabase dashboard)
CREATE OR REPLACE FUNCTION promote_to_admin(p_user_id UUID, p_role TEXT DEFAULT 'admin')
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
BEGIN
  -- Validate role
  IF p_role NOT IN ('admin', 'super_admin') THEN
    RETURN QUERY SELECT false, 'role ต้องเป็น admin หรือ super_admin'::TEXT;
    RETURN;
  END IF;
  
  -- Update user role
  UPDATE users 
  SET role = p_role, 
      verification_status = 'verified',
      updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบ user'::TEXT;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'อัปเดต role เป็น ' || p_role || ' สำเร็จ'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION promote_to_admin TO authenticated;

COMMENT ON FUNCTION ensure_admin_user IS 'ตรวจสอบและสร้าง/อัปเดต admin user';
COMMENT ON FUNCTION promote_to_admin IS 'เลื่อนขั้น user เป็น admin';
