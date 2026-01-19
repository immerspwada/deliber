-- Migration: 095_upgrade_customer_to_provider.sql
-- Feature: Role Switch - Customer to Provider
-- Description: Functions for upgrading customer to provider

-- =====================================================
-- FUNCTION: Check if user can switch to provider mode
-- =====================================================
CREATE OR REPLACE FUNCTION can_switch_to_provider(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_providers JSONB;
BEGIN
  -- Get all provider records for this user
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', sp.id,
        'type', sp.provider_type,
        'is_verified', COALESCE(sp.is_verified, false),
        'status', COALESCE(sp.status, 'pending')
      )
    ),
    '[]'::jsonb
  ) INTO v_providers
  FROM service_providers sp
  WHERE sp.user_id = p_user_id;

  RETURN jsonb_build_object(
    'can_switch', EXISTS (
      SELECT 1 FROM service_providers 
      WHERE user_id = p_user_id 
      AND is_verified = true 
      AND status = 'approved'
    ),
    'providers', v_providers
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Upgrade customer to provider
-- =====================================================
CREATE OR REPLACE FUNCTION upgrade_customer_to_provider(
  p_user_id UUID,
  p_provider_type TEXT,
  p_vehicle_type TEXT DEFAULT NULL,
  p_vehicle_plate TEXT DEFAULT NULL,
  p_vehicle_color TEXT DEFAULT NULL,
  p_license_number TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_provider_id UUID;
  v_existing_id UUID;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'ไม่พบผู้ใช้');
  END IF;

  -- Check if already registered for this type
  SELECT id INTO v_existing_id
  FROM service_providers
  WHERE user_id = p_user_id AND provider_type = p_provider_type;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'คุณสมัครประเภทนี้แล้ว',
      'provider_id', v_existing_id
    );
  END IF;

  -- Create new provider record
  INSERT INTO service_providers (
    user_id,
    provider_type,
    vehicle_type,
    vehicle_plate,
    vehicle_color,
    license_number,
    status,
    is_verified,
    is_available,
    documents,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_provider_type,
    p_vehicle_type,
    p_vehicle_plate,
    p_vehicle_color,
    p_license_number,
    'pending',
    false,
    false,
    '{}'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_provider_id;

  -- Create notification for user
  INSERT INTO user_notifications (
    user_id,
    type,
    title,
    message,
    action_url,
    is_read
  ) VALUES (
    p_user_id,
    'system',
    'สมัครเป็นผู้ให้บริการสำเร็จ',
    'กรุณาอัพโหลดเอกสารเพื่อรอการอนุมัติ',
    '/provider/documents',
    false
  );

  RETURN jsonb_build_object(
    'success', true,
    'provider_id', v_provider_id,
    'message', 'สมัครสำเร็จ กรุณาอัพโหลดเอกสาร'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Grant permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION can_switch_to_provider(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_switch_to_provider(UUID) TO anon;
GRANT EXECUTE ON FUNCTION upgrade_customer_to_provider(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION upgrade_customer_to_provider IS 'Upgrade a customer account to provider with specified type';
COMMENT ON FUNCTION can_switch_to_provider IS 'Check if user can switch to provider mode and get provider info';
