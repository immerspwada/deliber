-- Migration: 298_admin_priority2_rpc_functions.sql
-- Description: Priority 2 Admin RPC Functions - Service-Specific Management
-- Author: Admin Panel Complete Verification Team
-- Date: 2026-01-16
-- Requirements: 3.3, 3.4, 3.5

-- =====================================================
-- DROP EXISTING FUNCTIONS (if any)
-- =====================================================
DROP FUNCTION IF EXISTS get_scheduled_rides(TIMESTAMPTZ, TIMESTAMPTZ, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_scheduled_rides(TIMESTAMPTZ, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS get_provider_withdrawals_admin(TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_provider_withdrawals_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_topup_requests_admin(TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_topup_requests_admin(TEXT) CASCADE;

-- =====================================================
-- 1. GET SCHEDULED RIDES
-- =====================================================
-- Function to retrieve scheduled rides for future dates
-- Parameters: date_from, date_to, limit, offset
-- Returns TABLE with scheduled ride details
-- Security: SECURITY DEFINER with admin role check
-- Performance: Uses SELECT wrapper pattern and filters for future rides

CREATE OR REPLACE FUNCTION get_scheduled_rides(
  p_date_from TIMESTAMPTZ DEFAULT NOW(),
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  tracking_id TEXT,
  user_id UUID,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  pickup_address TEXT,
  pickup_lat NUMERIC,
  pickup_lng NUMERIC,
  destination_address TEXT,
  destination_lat NUMERIC,
  destination_lng NUMERIC,
  scheduled_datetime TIMESTAMPTZ,
  ride_type TEXT,
  estimated_fare NUMERIC,
  notes TEXT,
  reminder_sent BOOLEAN,
  status TEXT,
  ride_request_id UUID,
  passenger_count INT,
  special_requests TEXT,
  provider_id UUID,
  provider_name TEXT,
  provider_phone TEXT,
  provider_rating NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
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

  -- Return scheduled rides data with customer and provider details
  RETURN QUERY
  SELECT 
    sr.id,
    sr.tracking_id::TEXT,
    sr.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email)::TEXT as customer_name,
    u.email::TEXT as customer_email,
    COALESCE(u.phone_number, '')::TEXT as customer_phone,
    sr.pickup_address::TEXT,
    sr.pickup_lat,
    sr.pickup_lng,
    sr.destination_address::TEXT,
    sr.destination_lat,
    sr.destination_lng,
    sr.scheduled_datetime,
    sr.ride_type::TEXT,
    sr.estimated_fare,
    sr.notes::TEXT,
    sr.reminder_sent,
    sr.status::TEXT,
    sr.ride_request_id,
    sr.passenger_count,
    sr.special_requests::TEXT,
    -- Provider details using dual-role pattern
    pv.id as provider_id,
    CASE 
      WHEN pv.id IS NOT NULL THEN COALESCE(pv.first_name || ' ' || pv.last_name, pv.first_name)::TEXT
      ELSE NULL
    END as provider_name,
    pv.phone_number::TEXT as provider_phone,
    pv.rating as provider_rating,
    sr.created_at,
    sr.updated_at
  FROM scheduled_rides sr
  LEFT JOIN users u ON sr.user_id = u.id
  -- Join with ride_requests to get provider_id
  LEFT JOIN ride_requests rr ON sr.ride_request_id = rr.id
  -- Use dual-role pattern: join providers_v2 through ride_requests.provider_id
  LEFT JOIN providers_v2 pv ON rr.provider_id = pv.id
  WHERE 
    -- Filter for future rides (scheduled_time > NOW())
    sr.scheduled_datetime > NOW()
    -- Date range filter: from date
    AND sr.scheduled_datetime >= p_date_from
    -- Date range filter: to date (optional)
    AND (p_date_to IS NULL OR sr.scheduled_datetime <= p_date_to)
    -- Exclude cancelled and expired rides by default
    AND sr.status NOT IN ('cancelled', 'expired')
  ORDER BY sr.scheduled_datetime ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- 2. COUNT SCHEDULED RIDES
-- =====================================================
-- Helper function to get total count for pagination

CREATE OR REPLACE FUNCTION count_scheduled_rides(
  p_date_from TIMESTAMPTZ DEFAULT NOW(),
  p_date_to TIMESTAMPTZ DEFAULT NULL
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

  -- Count scheduled rides with filters
  SELECT COUNT(*) INTO v_count
  FROM scheduled_rides sr
  WHERE 
    sr.scheduled_datetime > NOW()
    AND sr.scheduled_datetime >= p_date_from
    AND (p_date_to IS NULL OR sr.scheduled_datetime <= p_date_to)
    AND sr.status NOT IN ('cancelled', 'expired');
  
  RETURN v_count;
END;
$$;

-- =====================================================
-- 3. GET PROVIDER WITHDRAWALS ADMIN
-- =====================================================
-- Function to retrieve provider withdrawal requests
-- Parameters: status, limit, offset
-- Returns TABLE with withdrawal details including bank info
-- Security: SECURITY DEFINER with admin role check
-- Note: Uses providers_v2 table with dual-role architecture

CREATE OR REPLACE FUNCTION get_provider_withdrawals_admin(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  provider_id UUID,
  provider_name TEXT,
  provider_phone TEXT,
  provider_email TEXT,
  amount NUMERIC,
  bank_account TEXT,
  bank_name TEXT,
  account_holder TEXT,
  status TEXT,
  requested_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  rejection_reason TEXT,
  transaction_id TEXT,
  wallet_balance NUMERIC,
  total_earnings NUMERIC
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

  -- Return withdrawal requests with provider details
  RETURN QUERY
  SELECT 
    wr.id,
    wr.provider_id,
    COALESCE(pv.first_name || ' ' || pv.last_name, pv.first_name)::TEXT as provider_name,
    pv.phone_number::TEXT as provider_phone,
    u.email::TEXT as provider_email,
    wr.amount,
    wr.bank_account::TEXT,
    wr.bank_name::TEXT,
    wr.account_holder::TEXT,
    wr.status::TEXT,
    wr.requested_at,
    wr.processed_at,
    wr.processed_by,
    wr.rejection_reason::TEXT,
    wr.transaction_id::TEXT,
    COALESCE(w.balance, 0) as wallet_balance,
    COALESCE(pv.total_earnings, 0) as total_earnings
  FROM withdrawal_requests wr
  -- Use dual-role pattern: join providers_v2 by provider_id
  INNER JOIN providers_v2 pv ON wr.provider_id = pv.id
  -- Join users through providers_v2.user_id
  LEFT JOIN users u ON pv.user_id = u.id
  -- Join wallets through providers_v2.user_id
  LEFT JOIN wallets w ON pv.user_id = w.user_id
  WHERE 
    -- Status filter
    (p_status IS NULL OR wr.status = p_status)
  ORDER BY 
    -- Pending first, then by requested date
    CASE WHEN wr.status = 'pending' THEN 0 ELSE 1 END,
    wr.requested_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- 4. COUNT PROVIDER WITHDRAWALS ADMIN
-- =====================================================
-- Helper function to get total count for pagination

CREATE OR REPLACE FUNCTION count_provider_withdrawals_admin(
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

  -- Count withdrawal requests with filters
  SELECT COUNT(*) INTO v_count
  FROM withdrawal_requests wr
  WHERE (p_status IS NULL OR wr.status = p_status);
  
  RETURN v_count;
END;
$$;

-- =====================================================
-- 5. GET TOPUP REQUESTS ADMIN
-- =====================================================
-- Function to retrieve customer topup requests
-- Parameters: status, limit, offset
-- Returns TABLE with topup details including payment proof
-- Security: SECURITY DEFINER with admin role check

CREATE OR REPLACE FUNCTION get_topup_requests_admin(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  amount NUMERIC,
  payment_method TEXT,
  payment_reference TEXT,
  payment_proof_url TEXT,
  status TEXT,
  requested_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  rejection_reason TEXT,
  wallet_balance NUMERIC
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

  -- Return topup requests with customer details
  RETURN QUERY
  SELECT 
    tr.id,
    tr.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email)::TEXT as user_name,
    u.email::TEXT as user_email,
    COALESCE(u.phone_number, '')::TEXT as user_phone,
    tr.amount,
    tr.payment_method::TEXT,
    tr.payment_reference::TEXT,
    tr.payment_proof_url::TEXT,
    tr.status::TEXT,
    tr.requested_at,
    tr.processed_at,
    tr.processed_by,
    tr.rejection_reason::TEXT,
    COALESCE(w.balance, 0) as wallet_balance
  FROM topup_requests tr
  INNER JOIN users u ON tr.user_id = u.id
  LEFT JOIN wallets w ON tr.user_id = w.user_id
  WHERE 
    -- Status filter
    (p_status IS NULL OR tr.status = p_status)
  ORDER BY 
    -- Pending first, then by requested date
    CASE WHEN tr.status = 'pending' THEN 0 ELSE 1 END,
    tr.requested_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- 6. COUNT TOPUP REQUESTS ADMIN
-- =====================================================
-- Helper function to get total count for pagination

CREATE OR REPLACE FUNCTION count_topup_requests_admin(
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

  -- Count topup requests with filters
  SELECT COUNT(*) INTO v_count
  FROM topup_requests tr
  WHERE (p_status IS NULL OR tr.status = p_status);
  
  RETURN v_count;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_scheduled_rides(TIMESTAMPTZ, TIMESTAMPTZ, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION count_scheduled_rides(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_withdrawals_admin(TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION count_provider_withdrawals_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_topup_requests_admin(TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION count_topup_requests_admin(TEXT) TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION get_scheduled_rides IS 'Get scheduled rides for future dates with date range filters - SECURITY DEFINER with admin role check';
COMMENT ON FUNCTION count_scheduled_rides IS 'Count scheduled rides for pagination - SECURITY DEFINER with admin role check';
COMMENT ON FUNCTION get_provider_withdrawals_admin IS 'Get provider withdrawal requests with dual-role pattern - SECURITY DEFINER with admin role check';
COMMENT ON FUNCTION count_provider_withdrawals_admin IS 'Count provider withdrawal requests for pagination - SECURITY DEFINER with admin role check';
COMMENT ON FUNCTION get_topup_requests_admin IS 'Get customer topup requests - SECURITY DEFINER with admin role check';
COMMENT ON FUNCTION count_topup_requests_admin IS 'Count customer topup requests for pagination - SECURITY DEFINER with admin role check';

-- =====================================================
-- PERFORMANCE INDEXES (if not already exist)
-- =====================================================
-- These indexes improve query performance for Priority 2 admin functions

-- Scheduled rides indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scheduled_rides_datetime 
  ON scheduled_rides(scheduled_datetime) WHERE scheduled_datetime > NOW();
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scheduled_rides_status 
  ON scheduled_rides(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scheduled_rides_user 
  ON scheduled_rides(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scheduled_rides_request 
  ON scheduled_rides(ride_request_id) WHERE ride_request_id IS NOT NULL;

-- Withdrawal requests indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withdrawal_requests_provider 
  ON withdrawal_requests(provider_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withdrawal_requests_status 
  ON withdrawal_requests(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withdrawal_requests_requested 
  ON withdrawal_requests(requested_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withdrawal_requests_pending 
  ON withdrawal_requests(status, requested_at DESC) WHERE status = 'pending';

-- Topup requests indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_topup_requests_user 
  ON topup_requests(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_topup_requests_status 
  ON topup_requests(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_topup_requests_requested 
  ON topup_requests(requested_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_topup_requests_pending 
  ON topup_requests(status, requested_at DESC) WHERE status = 'pending';

