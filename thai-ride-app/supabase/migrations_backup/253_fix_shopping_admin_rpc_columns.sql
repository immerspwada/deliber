-- Migration: 253_fix_shopping_admin_rpc_columns.sql
-- Description: Fix column names in get_all_shopping_for_admin RPC to match actual table schema
-- Date: 2026-01-13
-- Issue: RPC used wrong columns (estimated_total, shopping_list, matched_at, completed_at)
--        Actual columns: total_cost, item_list, shopped_at, delivered_at

-- Drop existing functions
DROP FUNCTION IF EXISTS get_all_shopping_for_admin(TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_shopping_for_admin(TEXT) CASCADE;

-- =====================================================
-- GET ALL SHOPPING FOR ADMIN (FIXED)
-- =====================================================
CREATE OR REPLACE FUNCTION get_all_shopping_for_admin(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  tracking_id TEXT,
  status TEXT,
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  provider_id UUID,
  provider_name TEXT,
  provider_phone TEXT,
  store_address TEXT,
  delivery_address TEXT,
  amount NUMERIC,
  payment_method TEXT,
  shopping_list TEXT,
  created_at TIMESTAMPTZ,
  matched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    COALESCE(s.tracking_id, LEFT(s.id::TEXT, 8)) as tracking_id,
    s.status::TEXT,
    s.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as user_name,
    u.phone_number as user_phone,
    s.provider_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'Unassigned') as provider_name,
    p.phone_number as provider_phone,
    COALESCE(s.store_name, s.store_address, 'N/A') as store_address,
    s.delivery_address,
    COALESCE(s.total_cost, s.service_fee, 0) as amount,
    COALESCE(s.payment_method, 'cash') as payment_method,
    s.item_list::TEXT as shopping_list,
    s.created_at,
    s.shopped_at as matched_at,
    s.delivered_at as completed_at,
    s.cancelled_at
  FROM shopping_requests s
  LEFT JOIN users u ON s.user_id = u.id
  LEFT JOIN providers_v2 p ON s.provider_id = p.id
  WHERE (p_status IS NULL OR s.status::TEXT = p_status)
  ORDER BY s.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- COUNT SHOPPING FOR ADMIN (FIXED)
-- =====================================================
CREATE OR REPLACE FUNCTION count_shopping_for_admin(p_status TEXT DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM shopping_requests WHERE (p_status IS NULL OR status::TEXT = p_status);
  RETURN v_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_all_shopping_for_admin(TEXT, INT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_shopping_for_admin(TEXT) TO anon, authenticated, service_role;

-- Comments
COMMENT ON FUNCTION get_all_shopping_for_admin IS 'Get all shopping requests for admin with correct column mappings - SECURITY DEFINER bypasses RLS';
COMMENT ON FUNCTION count_shopping_for_admin IS 'Count shopping requests for admin filtering';
