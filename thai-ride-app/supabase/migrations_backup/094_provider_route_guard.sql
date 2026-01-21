-- Migration: Provider Route Guard Functions
-- Description: Functions to check if user can access provider routes
-- Feature: F14 - Provider Dashboard Access Control

-- Function: Check if user can access provider routes
CREATE OR REPLACE FUNCTION can_access_provider_routes(p_user_id UUID)
RETURNS TABLE (
  can_access BOOLEAN,
  provider_id UUID,
  is_verified BOOLEAN,
  status TEXT,
  message TEXT
) AS $$
DECLARE
  v_provider RECORD;
BEGIN
  -- Check if user has provider account
  SELECT 
    id,
    is_verified,
    status
  INTO v_provider
  FROM service_providers
  WHERE user_id = p_user_id
  LIMIT 1;

  -- No provider account
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE,
      NULL::UUID,
      FALSE,
      NULL::TEXT,
      'ไม่พบบัญชีผู้ให้บริการ กรุณาสมัครก่อน'::TEXT;
    RETURN;
  END IF;

  -- Provider not verified
  IF NOT v_provider.is_verified THEN
    RETURN QUERY SELECT 
      FALSE,
      v_provider.id,
      v_provider.is_verified,
      v_provider.status,
      'บัญชีของคุณยังไม่ได้รับการยืนยัน'::TEXT;
    RETURN;
  END IF;

  -- Provider not approved
  IF v_provider.status != 'approved' THEN
    RETURN QUERY SELECT 
      FALSE,
      v_provider.id,
      v_provider.is_verified,
      v_provider.status,
      CASE v_provider.status
        WHEN 'pending' THEN 'รอการอนุมัติจากแอดมิน'
        WHEN 'rejected' THEN 'บัญชีของคุณถูกปฏิเสธ'
        WHEN 'suspended' THEN 'บัญชีของคุณถูกระงับ'
        ELSE 'สถานะบัญชีไม่ถูกต้อง'
      END::TEXT;
    RETURN;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT 
    TRUE,
    v_provider.id,
    v_provider.is_verified,
    v_provider.status,
    'สามารถเข้าใช้งานได้'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user should be redirected from customer routes
CREATE OR REPLACE FUNCTION should_redirect_to_provider_onboarding(p_user_id UUID)
RETURNS TABLE (
  should_redirect BOOLEAN,
  provider_id UUID,
  is_verified BOOLEAN,
  status TEXT,
  reason TEXT
) AS $$
DECLARE
  v_provider RECORD;
BEGIN
  -- Check if user has provider account
  SELECT 
    id,
    is_verified,
    status
  INTO v_provider
  FROM service_providers
  WHERE user_id = p_user_id
  LIMIT 1;

  -- No provider account - no redirect needed
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE,
      NULL::UUID,
      FALSE,
      NULL::TEXT,
      'ไม่มีบัญชีผู้ให้บริการ'::TEXT;
    RETURN;
  END IF;

  -- Provider exists but not verified or not approved - should redirect
  IF NOT v_provider.is_verified OR v_provider.status != 'approved' THEN
    RETURN QUERY SELECT 
      TRUE,
      v_provider.id,
      v_provider.is_verified,
      v_provider.status,
      CASE 
        WHEN NOT v_provider.is_verified THEN 'กรุณาอัพโหลดเอกสารเพื่อยืนยันตัวตน'
        WHEN v_provider.status = 'pending' THEN 'รอการอนุมัติจากแอดมิน'
        WHEN v_provider.status = 'rejected' THEN 'บัญชีถูกปฏิเสธ กรุณาติดต่อแอดมิน'
        WHEN v_provider.status = 'suspended' THEN 'บัญชีถูกระงับ กรุณาติดต่อแอดมิน'
        ELSE 'กรุณาดำเนินการให้เสร็จสิ้น'
      END::TEXT;
    RETURN;
  END IF;

  -- Provider is approved - no redirect needed
  RETURN QUERY SELECT 
    FALSE,
    v_provider.id,
    v_provider.is_verified,
    v_provider.status,
    'บัญชีได้รับการอนุมัติแล้ว'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION can_access_provider_routes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION should_redirect_to_provider_onboarding(UUID) TO authenticated;

-- Add comments
COMMENT ON FUNCTION can_access_provider_routes IS 'Check if user can access provider routes - returns access status and message';
COMMENT ON FUNCTION should_redirect_to_provider_onboarding IS 'Check if user should be redirected from customer routes to provider onboarding';
