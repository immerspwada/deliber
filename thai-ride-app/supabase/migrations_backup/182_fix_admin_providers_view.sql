-- =====================================================
-- Migration: 182_fix_admin_providers_view.sql
-- Purpose: Fix /admin/providers page showing empty
-- Issue: RPC functions missing or have wrong return types
-- =====================================================

-- Drop existing functions to recreate with correct signatures
DROP FUNCTION IF EXISTS get_all_providers_for_admin(TEXT, TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_providers_for_admin(TEXT, TEXT) CASCADE;

-- =====================================================
-- 1. CREATE get_all_providers_for_admin
-- =====================================================
CREATE OR REPLACE FUNCTION get_all_providers_for_admin(
  p_status TEXT DEFAULT NULL,
  p_provider_type TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  provider_uid TEXT,
  provider_type TEXT,
  status TEXT,
  is_available BOOLEAN,
  is_verified BOOLEAN,
  rating NUMERIC,
  total_rides INT,
  total_earnings NUMERIC,
  user_first_name TEXT,
  user_last_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.user_id,
    sp.provider_uid,
    sp.provider_type,
    sp.status,
    COALESCE(sp.is_available, sp.is_online, false) as is_available,
    COALESCE(sp.is_verified, false) as is_verified,
    COALESCE(sp.rating, 0)::NUMERIC as rating,
    COALESCE(sp.total_rides, sp.total_trips, 0)::INT as total_rides,
    COALESCE(sp.total_earnings, 0)::NUMERIC as total_earnings,
    u.first_name as user_first_name,
    u.last_name as user_last_name,
    u.email as user_email,
    COALESCE(u.phone_number, u.phone) as user_phone,
    sp.created_at
  FROM service_providers sp
  LEFT JOIN users u ON sp.user_id = u.id
  WHERE 
    (p_status IS NULL OR p_status = '' OR sp.status = p_status)
    AND (p_provider_type IS NULL OR p_provider_type = '' OR sp.provider_type = p_provider_type)
  ORDER BY sp.created_at DESC
  LIMIT p_limit 
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- 2. CREATE count_providers_for_admin
-- =====================================================
CREATE OR REPLACE FUNCTION count_providers_for_admin(
  p_status TEXT DEFAULT NULL,
  p_provider_type TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) 
    FROM service_providers
    WHERE 
      (p_status IS NULL OR p_status = '' OR status = p_status)
      AND (p_provider_type IS NULL OR p_provider_type = '' OR provider_type = p_provider_type)
  );
END;
$$;

-- =====================================================
-- 3. GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_all_providers_for_admin(TEXT, TEXT, INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION get_all_providers_for_admin(TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_providers_for_admin(TEXT, TEXT, INT, INT) TO service_role;

GRANT EXECUTE ON FUNCTION count_providers_for_admin(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION count_providers_for_admin(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION count_providers_for_admin(TEXT, TEXT) TO service_role;

-- =====================================================
-- 4. VERIFY FUNCTIONS EXIST
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_all_providers_for_admin') THEN
    RAISE NOTICE '✅ get_all_providers_for_admin created successfully';
  ELSE
    RAISE EXCEPTION '❌ get_all_providers_for_admin NOT created';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'count_providers_for_admin') THEN
    RAISE NOTICE '✅ count_providers_for_admin created successfully';
  ELSE
    RAISE EXCEPTION '❌ count_providers_for_admin NOT created';
  END IF;
END $$;

-- =====================================================
-- 5. TEST FUNCTIONS
-- =====================================================
SELECT 'Testing get_all_providers_for_admin...' as test;
SELECT * FROM get_all_providers_for_admin(NULL, NULL, 5, 0);

SELECT 'Testing count_providers_for_admin...' as test;
SELECT count_providers_for_admin(NULL, NULL) as total_providers;

SELECT '✅ Migration 182 completed - Admin Providers View Fixed!' as status;
