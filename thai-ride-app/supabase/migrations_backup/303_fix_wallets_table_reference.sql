-- Fix wallets table reference in get_admin_providers_v2
-- =====================================================
-- Issue: Function references "wallets" table but actual table is "user_wallets"

-- Drop existing functions
DROP FUNCTION IF EXISTS get_admin_providers_v2(TEXT, TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_admin_providers_v2(TEXT, TEXT) CASCADE;

-- ================================================================
-- get_admin_providers_v2 - FIXED wallets table reference
-- ================================================================
CREATE OR REPLACE FUNCTION get_admin_providers_v2(
  p_status TEXT DEFAULT NULL,
  p_provider_type TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  provider_uid TEXT,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  provider_type TEXT,
  status TEXT,
  is_online BOOLEAN,
  is_available BOOLEAN,
  current_lat NUMERIC,
  current_lng NUMERIC,
  rating NUMERIC,
  total_trips INT,
  total_earnings NUMERIC,
  wallet_balance NUMERIC,
  created_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_user_role TEXT;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO v_admin_id;
  
  -- Check if user exists and has admin role
  SELECT u.role INTO v_user_role
  FROM users u
  WHERE u.id = v_admin_id;
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  IF v_user_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required. Current role: %', v_user_role;
  END IF;

  -- Return provider data with only existing columns
  RETURN QUERY
  SELECT 
    pv.id,
    pv.user_id,
    pv.provider_uid,
    pv.email,
    pv.first_name,
    pv.last_name,
    pv.phone_number,
    pv.provider_type,
    pv.status::TEXT,
    pv.is_online,
    pv.is_available,
    pv.current_lat,
    pv.current_lng,
    pv.rating,
    pv.total_trips,
    COALESCE(pv.total_earnings, 0) as total_earnings,
    COALESCE(uw.balance, 0) as wallet_balance,
    pv.created_at,
    pv.approved_at,
    pv.updated_at
  FROM providers_v2 pv
  LEFT JOIN user_wallets uw ON pv.user_id = uw.user_id
  WHERE 
    (p_status IS NULL OR pv.status::TEXT = p_status)
    AND (p_provider_type IS NULL OR pv.provider_type = p_provider_type)
  ORDER BY pv.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ================================================================
-- count_admin_providers_v2 - No changes needed
-- ================================================================
CREATE OR REPLACE FUNCTION count_admin_providers_v2(
  p_status TEXT DEFAULT NULL,
  p_provider_type TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_user_role TEXT;
  v_count INT;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO v_admin_id;
  
  -- Check if user exists and has admin role
  SELECT u.role INTO v_user_role
  FROM users u
  WHERE u.id = v_admin_id;
  
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  IF v_user_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required. Current role: %', v_user_role;
  END IF;

  -- Count providers with proper type casting
  SELECT COUNT(*)::INT INTO v_count
  FROM providers_v2 pv
  WHERE 
    (p_status IS NULL OR pv.status::TEXT = p_status)
    AND (p_provider_type IS NULL OR pv.provider_type = p_provider_type);
    
  RETURN v_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_providers_v2(TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION count_admin_providers_v2(TEXT, TEXT) TO authenticated;

-- Add comments
COMMENT ON FUNCTION get_admin_providers_v2 IS 'Get provider list with filters and pagination - Fixed user_wallets table reference';
COMMENT ON FUNCTION count_admin_providers_v2 IS 'Count providers for pagination - Fixed type casting for enum comparison';
