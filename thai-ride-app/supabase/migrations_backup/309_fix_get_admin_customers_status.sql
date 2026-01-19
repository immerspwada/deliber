-- Fix get_admin_customers to use profiles.status
-- ================================================
-- Migration 309: แก้ไข RPC function ให้ดึง status จาก profiles table

BEGIN;

-- Drop and recreate get_admin_customers function
DROP FUNCTION IF EXISTS get_admin_customers(TEXT, TEXT, INT, INT) CASCADE;

CREATE OR REPLACE FUNCTION get_admin_customers(
  p_search_term TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  phone_number TEXT,
  status TEXT,
  wallet_balance NUMERIC,
  total_orders BIGINT,
  total_spent NUMERIC,
  average_rating NUMERIC,
  created_at TIMESTAMPTZ,
  last_order_at TIMESTAMPTZ,
  suspension_reason TEXT,
  suspended_at TIMESTAMPTZ,
  suspended_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_admin_id UUID;
BEGIN
  -- Admin role check
  SELECT (SELECT auth.uid()) INTO v_admin_id;
  
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = v_admin_id
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Return customer data with aggregated statistics
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    COALESCE(p.full_name, p.email) as full_name,
    p.phone_number,
    COALESCE(p.status, 'active')::TEXT as status,
    COALESCE(w.balance, 0) as wallet_balance,
    COALESCE(order_stats.total_orders, 0) as total_orders,
    COALESCE(order_stats.total_spent, 0) as total_spent,
    COALESCE(order_stats.average_rating, 0) as average_rating,
    p.created_at,
    order_stats.last_order_at,
    p.suspension_reason,
    p.suspended_at,
    p.suspended_by
  FROM profiles p
  LEFT JOIN wallets w ON p.id = w.user_id
  LEFT JOIN LATERAL (
    SELECT 
      COUNT(*) as total_orders,
      SUM(COALESCE(r.fare, 0)) as total_spent,
      AVG(r.rating) as average_rating,
      MAX(r.created_at) as last_order_at
    FROM ride_requests r
    WHERE r.customer_id = p.id
      AND r.status = 'completed'
  ) order_stats ON true
  WHERE p.role = 'customer'
    -- Search filter: name, email, or phone
    AND (
      p_search_term IS NULL 
      OR p.email ILIKE '%' || p_search_term || '%'
      OR p.full_name ILIKE '%' || p_search_term || '%'
      OR p.phone_number ILIKE '%' || p_search_term || '%'
    )
    -- Status filter (ใช้ profiles.status)
    AND (
      p_status IS NULL 
      OR COALESCE(p.status, 'active') = p_status
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_customers(TEXT, TEXT, INT, INT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_admin_customers IS 
  'Get customer list with search, filters, and pagination - Uses profiles.status for suspension system';

COMMIT;
