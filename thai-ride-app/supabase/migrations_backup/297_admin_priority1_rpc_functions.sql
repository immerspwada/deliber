-- Migration: 297_admin_priority1_rpc_functions.sql
-- Description: Priority 1 Admin RPC Functions - Customer and Provider Management
-- Author: Admin Panel Complete Verification Team
-- Date: 2026-01-16
-- Requirements: 2.2, 2.3

-- =====================================================
-- DROP EXISTING FUNCTIONS (if any)
-- =====================================================
DROP FUNCTION IF EXISTS get_admin_customers(TEXT, TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_admin_customers(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_admin_providers_v2(TEXT, TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_admin_providers_v2(TEXT, TEXT) CASCADE;

-- =====================================================
-- 1. GET ADMIN CUSTOMERS
-- =====================================================
-- Function to retrieve customer list with filters and search
-- Parameters: search_term, status, limit, offset
-- Returns TABLE with customer details including wallet balance and order stats
-- Security: SECURITY DEFINER with admin role check
-- Performance: Uses SELECT wrapper pattern and indexes

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
AS $$
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
    u.id,
    u.email,
    COALESCE(u.first_name || ' ' || u.last_name, u.email) as full_name,
    u.phone_number,
    COALESCE(u.status, 'active')::TEXT as status,
    COALESCE(w.balance, 0) as wallet_balance,
    COALESCE(order_stats.total_orders, 0) as total_orders,
    COALESCE(order_stats.total_spent, 0) as total_spent,
    COALESCE(order_stats.average_rating, 0) as average_rating,
    u.created_at,
    order_stats.last_order_at,
    u.suspension_reason,
    u.suspended_at,
    u.suspended_by
  FROM users u
  INNER JOIN profiles p ON u.id = p.id
  LEFT JOIN wallets w ON u.id = w.user_id
  LEFT JOIN LATERAL (
    SELECT 
      COUNT(*) as total_orders,
      SUM(COALESCE(r.fare, 0)) as total_spent,
      AVG(r.rating) as average_rating,
      MAX(r.created_at) as last_order_at
    FROM ride_requests r
    WHERE r.user_id = u.id
      AND r.status = 'completed'
  ) order_stats ON true
  WHERE p.role = 'customer'
    -- Search filter: name, email, or phone
    AND (
      p_search_term IS NULL 
      OR u.email ILIKE '%' || p_search_term || '%'
      OR u.first_name ILIKE '%' || p_search_term || '%'
      OR u.last_name ILIKE '%' || p_search_term || '%'
      OR u.phone_number ILIKE '%' || p_search_term || '%'
    )
    -- Status filter
    AND (
      p_status IS NULL 
      OR COALESCE(u.status, 'active') = p_status
    )
  ORDER BY u.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- 2. COUNT ADMIN CUSTOMERS
-- =====================================================
-- Helper function to get total count for pagination

CREATE OR REPLACE FUNCTION count_admin_customers(
  p_search_term TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_count BIGINT;
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

  -- Count customers with filters
  SELECT COUNT(*) INTO v_count
  FROM users u
  INNER JOIN profiles p ON u.id = p.id
  WHERE p.role = 'customer'
    AND (
      p_search_term IS NULL 
      OR u.email ILIKE '%' || p_search_term || '%'
      OR u.first_name ILIKE '%' || p_search_term || '%'
      OR u.last_name ILIKE '%' || p_search_term || '%'
      OR u.phone_number ILIKE '%' || p_search_term || '%'
    )
    AND (
      p_status IS NULL 
      OR COALESCE(u.status, 'active') = p_status
    );
  
  RETURN v_count;
END;
$$;

-- =====================================================
-- 3. GET ADMIN PROVIDERS V2
-- =====================================================
-- Function to retrieve provider list with status and verification info
-- Parameters: status, provider_type, limit, offset
-- Returns TABLE with provider details
-- Security: SECURITY DEFINER with admin role check
-- Note: Uses providers_v2 table with dual-role architecture

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
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  rating NUMERIC,
  total_trips INT,
  total_earnings NUMERIC,
  wallet_balance NUMERIC,
  documents_verified BOOLEAN,
  verification_notes TEXT,
  created_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  last_active_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Return provider data
  RETURN QUERY
  SELECT 
    pv.id,
    pv.user_id,
    pv.provider_uid,
    u.email,
    pv.first_name,
    pv.last_name,
    pv.phone_number,
    pv.provider_type,
    pv.status,
    pv.is_online,
    pv.is_available,
    pv.current_lat,
    pv.current_lng,
    pv.rating,
    pv.total_trips,
    COALESCE(pv.total_earnings, 0) as total_earnings,
    COALESCE(w.balance, 0) as wallet_balance,
    pv.documents_verified,
    pv.verification_notes,
    pv.created_at,
    pv.approved_at,
    pv.approved_by,
    pv.last_active_at
  FROM providers_v2 pv
  LEFT JOIN users u ON pv.user_id = u.id
  LEFT JOIN wallets w ON pv.user_id = w.user_id
  WHERE 
    -- Status filter
    (p_status IS NULL OR pv.status = p_status)
    -- Provider type filter
    AND (p_provider_type IS NULL OR pv.provider_type = p_provider_type)
  ORDER BY pv.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- 4. COUNT ADMIN PROVIDERS V2
-- =====================================================
-- Helper function to get total count for pagination

CREATE OR REPLACE FUNCTION count_admin_providers_v2(
  p_status TEXT DEFAULT NULL,
  p_provider_type TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_count BIGINT;
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

  -- Count providers with filters
  SELECT COUNT(*) INTO v_count
  FROM providers_v2 pv
  WHERE 
    (p_status IS NULL OR pv.status = p_status)
    AND (p_provider_type IS NULL OR pv.provider_type = p_provider_type);
  
  RETURN v_count;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_admin_customers(TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION count_admin_customers(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_providers_v2(TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION count_admin_providers_v2(TEXT, TEXT) TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION get_admin_customers IS 'Get customer list with search, filters, and pagination - SECURITY DEFINER with admin role check';
COMMENT ON FUNCTION count_admin_customers IS 'Count customers for pagination - SECURITY DEFINER with admin role check';
COMMENT ON FUNCTION get_admin_providers_v2 IS 'Get provider list with filters and pagination - SECURITY DEFINER with admin role check';
COMMENT ON FUNCTION count_admin_providers_v2 IS 'Count providers for pagination - SECURITY DEFINER with admin role check';

-- =====================================================
-- PERFORMANCE INDEXES (if not already exist)
-- =====================================================
-- These indexes improve query performance for admin functions

-- Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_search 
  ON users USING gin(to_tsvector('english', email));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_name_search 
  ON users USING gin(to_tsvector('english', COALESCE(first_name || ' ' || last_name, '')));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone_search 
  ON users(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status 
  ON users(status) WHERE status IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at 
  ON users(created_at DESC);

-- Profiles table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_role 
  ON profiles(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_role 
  ON profiles(id, role);

-- Providers_v2 table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_providers_v2_status 
  ON providers_v2(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_providers_v2_type 
  ON providers_v2(provider_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_providers_v2_online 
  ON providers_v2(is_online) WHERE is_online = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_providers_v2_created 
  ON providers_v2(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_providers_v2_user_id 
  ON providers_v2(user_id);

-- Ride requests indexes for statistics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ride_requests_user_completed 
  ON ride_requests(user_id, status) WHERE status = 'completed';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ride_requests_user_created 
  ON ride_requests(user_id, created_at DESC);

-- Wallets indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallets_user_id 
  ON wallets(user_id);
