-- =====================================================
-- PRODUCTION DEPLOYMENT: Migrations 299 & 300
-- Deploy these migrations to complete admin panel setup
-- =====================================================

-- =====================================================
-- MIGRATION 299: Admin Priority 3 RPC Functions
-- =====================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS get_admin_revenue_stats(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_admin_payment_stats(TIMESTAMPTZ, TIMESTAMPTZ) CASCADE;

-- Create get_admin_revenue_stats function
CREATE OR REPLACE FUNCTION get_admin_revenue_stats(
  p_date_from TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_date_to TIMESTAMPTZ DEFAULT NOW(),
  p_service_type TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_result JSON;
  v_total_revenue NUMERIC;
  v_ride_revenue NUMERIC;
  v_delivery_revenue NUMERIC;
  v_shopping_revenue NUMERIC;
  v_platform_fee NUMERIC;
  v_provider_earnings NUMERIC;
  v_daily_breakdown JSON;
  v_payment_breakdown JSON;
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

  -- Calculate ride revenue
  SELECT COALESCE(SUM(COALESCE(final_fare, actual_fare, estimated_fare)), 0)
  INTO v_ride_revenue
  FROM ride_requests
  WHERE status = 'completed'
    AND completed_at >= p_date_from
    AND completed_at <= p_date_to
    AND (p_service_type IS NULL OR p_service_type = 'ride');

  -- Calculate delivery revenue
  SELECT COALESCE(SUM(COALESCE(final_fee, estimated_fee)), 0)
  INTO v_delivery_revenue
  FROM delivery_requests
  WHERE status = 'delivered'
    AND delivered_at >= p_date_from
    AND delivered_at <= p_date_to
    AND (p_service_type IS NULL OR p_service_type = 'delivery');

  -- Calculate shopping revenue
  SELECT COALESCE(SUM(COALESCE(total_cost, service_fee)), 0)
  INTO v_shopping_revenue
  FROM shopping_requests
  WHERE status = 'completed'
    AND completed_at >= p_date_from
    AND completed_at <= p_date_to
    AND (p_service_type IS NULL OR p_service_type = 'shopping');

  -- Calculate totals
  v_total_revenue := v_ride_revenue + v_delivery_revenue + v_shopping_revenue;
  v_platform_fee := v_total_revenue * 0.15;
  v_provider_earnings := v_total_revenue * 0.85;

  -- Build result
  v_result := json_build_object(
    'total_revenue', v_total_revenue,
    'ride_revenue', v_ride_revenue,
    'delivery_revenue', v_delivery_revenue,
    'shopping_revenue', v_shopping_revenue,
    'platform_fee', v_platform_fee,
    'provider_earnings', v_provider_earnings,
    'date_from', p_date_from,
    'date_to', p_date_to,
    'service_type_filter', p_service_type
  );

  RETURN v_result;
END;
$$;

-- Create get_admin_payment_stats function
CREATE OR REPLACE FUNCTION get_admin_payment_stats(
  p_date_from TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_date_to TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_result JSON;
  v_total_transactions BIGINT;
  v_total_amount NUMERIC;
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

  -- Calculate totals
  SELECT 
    COUNT(*),
    COALESCE(SUM(amount), 0)
  INTO v_total_transactions, v_total_amount
  FROM (
    SELECT COALESCE(final_fare, actual_fare, estimated_fare) as amount
    FROM ride_requests
    WHERE status = 'completed'
      AND completed_at >= p_date_from
      AND completed_at <= p_date_to
    
    UNION ALL
    
    SELECT COALESCE(final_fee, estimated_fee) as amount
    FROM delivery_requests
    WHERE status = 'delivered'
      AND delivered_at >= p_date_from
      AND delivered_at <= p_date_to
    
    UNION ALL
    
    SELECT COALESCE(total_cost, service_fee) as amount
    FROM shopping_requests
    WHERE status = 'completed'
      AND completed_at >= p_date_from
      AND completed_at <= p_date_to
  ) all_transactions;

  -- Build result
  v_result := json_build_object(
    'total_transactions', v_total_transactions,
    'total_amount', v_total_amount,
    'average_transaction', CASE WHEN v_total_transactions > 0 THEN v_total_amount / v_total_transactions ELSE 0 END,
    'date_from', p_date_from,
    'date_to', p_date_to
  );

  RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_revenue_stats(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_payment_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- =====================================================
-- MIGRATION 300: Admin RLS Policy Verification (Simplified)
-- =====================================================

-- Helper function: Check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ) INTO v_is_admin;
  
  RETURN COALESCE(v_is_admin, FALSE);
END;
$$;

GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check migrations 297-305 are deployed
SELECT version, name FROM supabase_migrations.schema_migrations 
WHERE version IN ('20260118041654', '20260118042435', '20260118042441', '20260118042448', '20260118042455', '20260118042516', '20260118042614')
ORDER BY version;

-- Check all admin RPC functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'admin_%' OR routine_name LIKE 'get_admin_%' OR routine_name LIKE 'count_admin_%'
ORDER BY routine_name;

-- Test revenue stats function
SELECT get_admin_revenue_stats(NOW() - INTERVAL '7 days', NOW(), NULL);

-- Test payment stats function  
SELECT get_admin_payment_stats(NOW() - INTERVAL '7 days', NOW());
