-- Migration: 299_admin_priority3_rpc_functions.sql
-- Description: Priority 3 Admin RPC Functions - Analytics and Revenue Statistics
-- Author: Admin Panel Complete Verification Team
-- Date: 2026-01-16
-- Requirements: 4.1, 4.2

-- =====================================================
-- DROP EXISTING FUNCTIONS (if any)
-- =====================================================
DROP FUNCTION IF EXISTS get_admin_revenue_stats(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_admin_payment_stats(TIMESTAMPTZ, TIMESTAMPTZ) CASCADE;

-- =====================================================
-- 1. GET ADMIN REVENUE STATS
-- =====================================================
-- Function to calculate revenue statistics with date ranges
-- Parameters: date_from, date_to, service_type (optional filter)
-- Returns JSON with revenue breakdown by service type, daily breakdown, and payment method breakdown
-- Security: SECURITY DEFINER with admin role check
-- Performance: Uses aggregation queries with proper indexes

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
  -- Admin role check with SELECT wrapper for performance
  SELECT (SELECT auth.uid()) INTO v_admin_id;
  
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = v_admin_id
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Calculate ride revenue (completed rides only)
  SELECT COALESCE(SUM(COALESCE(final_fare, actual_fare, estimated_fare)), 0)
  INTO v_ride_revenue
  FROM ride_requests
  WHERE status = 'completed'
    AND completed_at >= p_date_from
    AND completed_at <= p_date_to
    AND (p_service_type IS NULL OR p_service_type = 'ride');

  -- Calculate delivery revenue (delivered orders only)
  SELECT COALESCE(SUM(COALESCE(final_fee, estimated_fee)), 0)
  INTO v_delivery_revenue
  FROM delivery_requests
  WHERE status = 'delivered'
    AND delivered_at >= p_date_from
    AND delivered_at <= p_date_to
    AND (p_service_type IS NULL OR p_service_type = 'delivery');

  -- Calculate shopping revenue (completed orders only)
  SELECT COALESCE(SUM(COALESCE(total_cost, service_fee)), 0)
  INTO v_shopping_revenue
  FROM shopping_requests
  WHERE status = 'completed'
    AND completed_at >= p_date_from
    AND completed_at <= p_date_to
    AND (p_service_type IS NULL OR p_service_type = 'shopping');

  -- Calculate total revenue
  v_total_revenue := v_ride_revenue + v_delivery_revenue + v_shopping_revenue;

  -- Calculate platform fee (15% of total revenue)
  v_platform_fee := v_total_revenue * 0.15;

  -- Calculate provider earnings (85% of total revenue)
  v_provider_earnings := v_total_revenue * 0.85;

  -- Build daily breakdown (aggregated by date)
  SELECT json_agg(
    json_build_object(
      'date', daily_date,
      'revenue', daily_revenue,
      'orders', daily_orders,
      'ride_revenue', ride_rev,
      'delivery_revenue', delivery_rev,
      'shopping_revenue', shopping_rev
    ) ORDER BY daily_date
  )
  INTO v_daily_breakdown
  FROM (
    -- Ride requests daily aggregation
    SELECT 
      DATE(completed_at) as daily_date,
      SUM(COALESCE(final_fare, actual_fare, estimated_fare)) as daily_revenue,
      COUNT(*) as daily_orders,
      SUM(COALESCE(final_fare, actual_fare, estimated_fare)) as ride_rev,
      0 as delivery_rev,
      0 as shopping_rev
    FROM ride_requests
    WHERE status = 'completed'
      AND completed_at >= p_date_from
      AND completed_at <= p_date_to
      AND (p_service_type IS NULL OR p_service_type = 'ride')
    GROUP BY DATE(completed_at)
    
    UNION ALL
    
    -- Delivery requests daily aggregation
    SELECT 
      DATE(delivered_at) as daily_date,
      SUM(COALESCE(final_fee, estimated_fee)) as daily_revenue,
      COUNT(*) as daily_orders,
      0 as ride_rev,
      SUM(COALESCE(final_fee, estimated_fee)) as delivery_rev,
      0 as shopping_rev
    FROM delivery_requests
    WHERE status = 'delivered'
      AND delivered_at >= p_date_from
      AND delivered_at <= p_date_to
      AND (p_service_type IS NULL OR p_service_type = 'delivery')
    GROUP BY DATE(delivered_at)
    
    UNION ALL
    
    -- Shopping requests daily aggregation
    SELECT 
      DATE(completed_at) as daily_date,
      SUM(COALESCE(total_cost, service_fee)) as daily_revenue,
      COUNT(*) as daily_orders,
      0 as ride_rev,
      0 as delivery_rev,
      SUM(COALESCE(total_cost, service_fee)) as shopping_rev
    FROM shopping_requests
    WHERE status = 'completed'
      AND completed_at >= p_date_from
      AND completed_at <= p_date_to
      AND (p_service_type IS NULL OR p_service_type = 'shopping')
    GROUP BY DATE(completed_at)
  ) daily_data;

  -- Build payment method breakdown
  SELECT json_build_object(
    'cash', COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0),
    'wallet', COALESCE(SUM(CASE WHEN payment_method = 'wallet' THEN amount ELSE 0 END), 0),
    'card', COALESCE(SUM(CASE WHEN payment_method IN ('credit_card', 'debit_card', 'card') THEN amount ELSE 0 END), 0),
    'promptpay', COALESCE(SUM(CASE WHEN payment_method = 'promptpay' THEN amount ELSE 0 END), 0),
    'mobile_banking', COALESCE(SUM(CASE WHEN payment_method = 'mobile_banking' THEN amount ELSE 0 END), 0),
    'other', COALESCE(SUM(CASE WHEN payment_method NOT IN ('cash', 'wallet', 'credit_card', 'debit_card', 'card', 'promptpay', 'mobile_banking') OR payment_method IS NULL THEN amount ELSE 0 END), 0)
  )
  INTO v_payment_breakdown
  FROM (
    -- Ride requests payment breakdown
    SELECT 
      COALESCE(payment_method, 'cash') as payment_method,
      COALESCE(final_fare, actual_fare, estimated_fare) as amount
    FROM ride_requests
    WHERE status = 'completed'
      AND completed_at >= p_date_from
      AND completed_at <= p_date_to
      AND (p_service_type IS NULL OR p_service_type = 'ride')
    
    UNION ALL
    
    -- Delivery requests payment breakdown
    SELECT 
      COALESCE(payment_method, 'cash') as payment_method,
      COALESCE(final_fee, estimated_fee) as amount
    FROM delivery_requests
    WHERE status = 'delivered'
      AND delivered_at >= p_date_from
      AND delivered_at <= p_date_to
      AND (p_service_type IS NULL OR p_service_type = 'delivery')
    
    UNION ALL
    
    -- Shopping requests payment breakdown
    SELECT 
      COALESCE(payment_method, 'cash') as payment_method,
      COALESCE(total_cost, service_fee) as amount
    FROM shopping_requests
    WHERE status = 'completed'
      AND completed_at >= p_date_from
      AND completed_at <= p_date_to
      AND (p_service_type IS NULL OR p_service_type = 'shopping')
  ) payment_data;

  -- Build final JSON result
  v_result := json_build_object(
    'total_revenue', v_total_revenue,
    'ride_revenue', v_ride_revenue,
    'delivery_revenue', v_delivery_revenue,
    'shopping_revenue', v_shopping_revenue,
    'platform_fee', v_platform_fee,
    'provider_earnings', v_provider_earnings,
    'daily_breakdown', COALESCE(v_daily_breakdown, '[]'::json),
    'payment_method_breakdown', v_payment_breakdown,
    'date_from', p_date_from,
    'date_to', p_date_to,
    'service_type_filter', p_service_type
  );

  RETURN v_result;
END;
$$;

-- =====================================================
-- 2. GET ADMIN PAYMENT STATS
-- =====================================================
-- Function to calculate payment statistics and trends
-- Parameters: date_from, date_to
-- Returns JSON with payment analytics including transaction counts and amounts by payment method
-- Security: SECURITY DEFINER with admin role check

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
  v_payment_methods JSON;
  v_daily_trends JSON;
  v_service_breakdown JSON;
BEGIN
  -- Admin role check with SELECT wrapper for performance
  SELECT (SELECT auth.uid()) INTO v_admin_id;
  
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = v_admin_id
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Calculate total transactions and amount
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

  -- Payment methods breakdown with counts and amounts
  SELECT json_agg(
    json_build_object(
      'payment_method', payment_method,
      'transaction_count', transaction_count,
      'total_amount', total_amount,
      'average_amount', average_amount,
      'percentage', ROUND((total_amount / NULLIF(v_total_amount, 0) * 100)::NUMERIC, 2)
    ) ORDER BY total_amount DESC
  )
  INTO v_payment_methods
  FROM (
    SELECT 
      COALESCE(payment_method, 'cash') as payment_method,
      COUNT(*) as transaction_count,
      SUM(amount) as total_amount,
      AVG(amount) as average_amount
    FROM (
      SELECT 
        payment_method,
        COALESCE(final_fare, actual_fare, estimated_fare) as amount
      FROM ride_requests
      WHERE status = 'completed'
        AND completed_at >= p_date_from
        AND completed_at <= p_date_to
      
      UNION ALL
      
      SELECT 
        payment_method,
        COALESCE(final_fee, estimated_fee) as amount
      FROM delivery_requests
      WHERE status = 'delivered'
        AND delivered_at >= p_date_from
        AND delivered_at <= p_date_to
      
      UNION ALL
      
      SELECT 
        payment_method,
        COALESCE(total_cost, service_fee) as amount
      FROM shopping_requests
      WHERE status = 'completed'
        AND completed_at >= p_date_from
        AND completed_at <= p_date_to
    ) payment_data
    GROUP BY COALESCE(payment_method, 'cash')
  ) method_stats;

  -- Daily payment trends
  SELECT json_agg(
    json_build_object(
      'date', daily_date,
      'transaction_count', transaction_count,
      'total_amount', total_amount,
      'average_amount', average_amount
    ) ORDER BY daily_date
  )
  INTO v_daily_trends
  FROM (
    SELECT 
      DATE(transaction_date) as daily_date,
      COUNT(*) as transaction_count,
      SUM(amount) as total_amount,
      AVG(amount) as average_amount
    FROM (
      SELECT 
        completed_at as transaction_date,
        COALESCE(final_fare, actual_fare, estimated_fare) as amount
      FROM ride_requests
      WHERE status = 'completed'
        AND completed_at >= p_date_from
        AND completed_at <= p_date_to
      
      UNION ALL
      
      SELECT 
        delivered_at as transaction_date,
        COALESCE(final_fee, estimated_fee) as amount
      FROM delivery_requests
      WHERE status = 'delivered'
        AND delivered_at >= p_date_from
        AND delivered_at <= p_date_to
      
      UNION ALL
      
      SELECT 
        completed_at as transaction_date,
        COALESCE(total_cost, service_fee) as amount
      FROM shopping_requests
      WHERE status = 'completed'
        AND completed_at >= p_date_from
        AND completed_at <= p_date_to
    ) daily_data
    GROUP BY DATE(transaction_date)
  ) daily_stats;

  -- Service type breakdown
  SELECT json_build_object(
    'ride', json_build_object(
      'count', COALESCE(ride_count, 0),
      'amount', COALESCE(ride_amount, 0),
      'average', CASE WHEN ride_count > 0 THEN ride_amount / ride_count ELSE 0 END
    ),
    'delivery', json_build_object(
      'count', COALESCE(delivery_count, 0),
      'amount', COALESCE(delivery_amount, 0),
      'average', CASE WHEN delivery_count > 0 THEN delivery_amount / delivery_count ELSE 0 END
    ),
    'shopping', json_build_object(
      'count', COALESCE(shopping_count, 0),
      'amount', COALESCE(shopping_amount, 0),
      'average', CASE WHEN shopping_count > 0 THEN shopping_amount / shopping_count ELSE 0 END
    )
  )
  INTO v_service_breakdown
  FROM (
    SELECT 
      (SELECT COUNT(*) FROM ride_requests WHERE status = 'completed' AND completed_at >= p_date_from AND completed_at <= p_date_to) as ride_count,
      (SELECT COALESCE(SUM(COALESCE(final_fare, actual_fare, estimated_fare)), 0) FROM ride_requests WHERE status = 'completed' AND completed_at >= p_date_from AND completed_at <= p_date_to) as ride_amount,
      (SELECT COUNT(*) FROM delivery_requests WHERE status = 'delivered' AND delivered_at >= p_date_from AND delivered_at <= p_date_to) as delivery_count,
      (SELECT COALESCE(SUM(COALESCE(final_fee, estimated_fee)), 0) FROM delivery_requests WHERE status = 'delivered' AND delivered_at >= p_date_from AND delivered_at <= p_date_to) as delivery_amount,
      (SELECT COUNT(*) FROM shopping_requests WHERE status = 'completed' AND completed_at >= p_date_from AND completed_at <= p_date_to) as shopping_count,
      (SELECT COALESCE(SUM(COALESCE(total_cost, service_fee)), 0) FROM shopping_requests WHERE status = 'completed' AND completed_at >= p_date_from AND completed_at <= p_date_to) as shopping_amount
  ) service_stats;

  -- Build final JSON result
  v_result := json_build_object(
    'total_transactions', v_total_transactions,
    'total_amount', v_total_amount,
    'average_transaction', CASE WHEN v_total_transactions > 0 THEN v_total_amount / v_total_transactions ELSE 0 END,
    'payment_methods', COALESCE(v_payment_methods, '[]'::json),
    'daily_trends', COALESCE(v_daily_trends, '[]'::json),
    'service_breakdown', v_service_breakdown,
    'date_from', p_date_from,
    'date_to', p_date_to
  );

  RETURN v_result;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_admin_revenue_stats(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_payment_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION get_admin_revenue_stats IS 'Calculate revenue statistics with date ranges and service type filter - Returns JSON with revenue breakdown, daily breakdown, and payment method breakdown - SECURITY DEFINER with admin role check';
COMMENT ON FUNCTION get_admin_payment_stats IS 'Calculate payment statistics and trends - Returns JSON with payment analytics including transaction counts and amounts by payment method - SECURITY DEFINER with admin role check';

-- =====================================================
-- PERFORMANCE INDEXES (if not already exist)
-- =====================================================
-- These indexes improve query performance for Priority 3 analytics functions

-- Ride requests indexes for analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ride_requests_completed_at 
  ON ride_requests(completed_at) WHERE status = 'completed';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ride_requests_payment_method 
  ON ride_requests(payment_method) WHERE status = 'completed';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ride_requests_status_completed 
  ON ride_requests(status, completed_at) WHERE status = 'completed';

-- Delivery requests indexes for analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_requests_delivered_at 
  ON delivery_requests(delivered_at) WHERE status = 'delivered';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_requests_payment_method 
  ON delivery_requests(payment_method) WHERE status = 'delivered';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delivery_requests_status_delivered 
  ON delivery_requests(status, delivered_at) WHERE status = 'delivered';

-- Shopping requests indexes for analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shopping_requests_completed_at 
  ON shopping_requests(completed_at) WHERE status = 'completed';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shopping_requests_payment_method 
  ON shopping_requests(payment_method) WHERE status = 'completed';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shopping_requests_status_completed 
  ON shopping_requests(status, completed_at) WHERE status = 'completed';
