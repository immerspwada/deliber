-- Fix shopping admin RPC functions return types

-- Drop existing functions
DROP FUNCTION IF EXISTS get_all_shopping_for_admin(text, integer, integer);
DROP FUNCTION IF EXISTS count_shopping_for_admin(text);
DROP FUNCTION IF EXISTS get_shopping_stats_for_admin();

-- Create proper return type for shopping admin
CREATE TYPE shopping_admin_record AS (
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
);

-- Recreate get_all_shopping_for_admin with proper return type
CREATE OR REPLACE FUNCTION get_all_shopping_for_admin(
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF shopping_admin_record
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Recreate count_shopping_for_admin
CREATE OR REPLACE FUNCTION count_shopping_for_admin(
  p_status TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
  v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM shopping_requests 
  WHERE (p_status IS NULL OR status::TEXT = p_status);
  
  RETURN v_count;
END;
$$;

-- Create shopping stats function
CREATE OR REPLACE FUNCTION get_shopping_stats_for_admin()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'matched', COUNT(*) FILTER (WHERE status = 'matched'),
    'shopping', COUNT(*) FILTER (WHERE status = 'shopping'),
    'delivering', COUNT(*) FILTER (WHERE status = 'delivering'),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'total_revenue', COALESCE(SUM(total_cost) FILTER (WHERE status = 'completed'), 0)
  ) INTO result
  FROM shopping_requests;
  
  RETURN result;
END;
$$;