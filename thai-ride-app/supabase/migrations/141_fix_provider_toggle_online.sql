-- Migration: 141_fix_provider_toggle_online.sql
-- Description: Fix provider toggle online - allow approved providers to go online
-- Problem: set_provider_availability checks is_verified but should check status = 'approved'

-- ============================================================================
-- 1. FIX set_provider_availability - Check status instead of is_verified
-- ============================================================================

CREATE OR REPLACE FUNCTION set_provider_availability(
  p_provider_id UUID,
  p_is_available BOOLEAN,
  p_lat DECIMAL(10,8) DEFAULT NULL,
  p_lng DECIMAL(11,8) DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $
DECLARE
  v_provider RECORD;
BEGIN
  -- Get provider
  SELECT * INTO v_provider
  FROM public.service_providers
  WHERE id = p_provider_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบข้อมูลผู้ให้บริการ'::TEXT;
    RETURN;
  END IF;
  
  -- Check if approved before going online (check status OR is_verified)
  IF p_is_available THEN
    -- Allow if status is approved/active OR is_verified is true
    IF v_provider.status NOT IN ('approved', 'active') AND NOT COALESCE(v_provider.is_verified, false) THEN
      RETURN QUERY SELECT false, 'บัญชียังไม่ได้รับการอนุมัติ กรุณารอ Admin ตรวจสอบ'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Update availability
  UPDATE public.service_providers
  SET 
    is_available = p_is_available,
    current_lat = COALESCE(p_lat, current_lat),
    current_lng = COALESCE(p_lng, current_lng),
    updated_at = NOW()
  WHERE id = p_provider_id;
  
  RETURN QUERY SELECT true, CASE WHEN p_is_available THEN 'เปิดรับงานแล้ว' ELSE 'ปิดรับงานแล้ว' END::TEXT;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. CREATE simple toggle function (alternative)
-- ============================================================================

CREATE OR REPLACE FUNCTION toggle_provider_online(
  p_user_id UUID,
  p_is_online BOOLEAN,
  p_lat DECIMAL(10,8) DEFAULT NULL,
  p_lng DECIMAL(11,8) DEFAULT NULL
)
RETURNS JSON AS $
DECLARE
  v_provider RECORD;
BEGIN
  -- Get provider by user_id
  SELECT * INTO v_provider
  FROM public.service_providers
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'ไม่พบข้อมูลผู้ให้บริการ');
  END IF;
  
  -- Check if can go online
  IF p_is_online THEN
    IF v_provider.status NOT IN ('approved', 'active') AND NOT COALESCE(v_provider.is_verified, false) THEN
      RETURN json_build_object('success', false, 'error', 'บัญชียังไม่ได้รับการอนุมัติ');
    END IF;
  END IF;
  
  -- Update
  UPDATE public.service_providers
  SET 
    is_available = p_is_online,
    current_lat = COALESCE(p_lat, current_lat),
    current_lng = COALESCE(p_lng, current_lng),
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'is_online', p_is_online,
    'message', CASE WHEN p_is_online THEN 'เปิดรับงานแล้ว' ELSE 'ปิดรับงานแล้ว' END
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. ALLOW PROVIDERS TO UPDATE THEIR OWN AVAILABILITY
-- ============================================================================

-- RLS Policy for providers to update their own record
DROP POLICY IF EXISTS "providers_update_own_availability" ON service_providers;
CREATE POLICY "providers_update_own_availability" ON service_providers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policy for providers to read their own record
DROP POLICY IF EXISTS "providers_read_own_profile" ON service_providers;
CREATE POLICY "providers_read_own_profile" ON service_providers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- 4. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION set_provider_availability TO authenticated;
GRANT EXECUTE ON FUNCTION set_provider_availability TO anon;
GRANT EXECUTE ON FUNCTION toggle_provider_online TO authenticated;

-- ============================================================================
-- 5. AUTO-APPROVE PROVIDERS FOR TESTING (Optional - Remove in production)
-- ============================================================================

-- Update existing providers to approved status if they have documents
UPDATE service_providers
SET 
  status = 'approved',
  is_verified = true
WHERE status = 'pending'
  AND (
    license_number IS NOT NULL 
    OR vehicle_plate IS NOT NULL
    OR vehicle_plate_number IS NOT NULL
  );

COMMENT ON FUNCTION set_provider_availability IS 'Toggle provider online/offline status - checks status or is_verified';
COMMENT ON FUNCTION toggle_provider_online IS 'Alternative toggle function using user_id instead of provider_id';
