-- Migration: 143_add_matched_at_column.sql
-- Feature: Provider Response Time Analytics
-- Description: Add matched_at column to track when provider accepts a job

-- =====================================================
-- ADD matched_at COLUMN TO ALL SERVICE TABLES
-- =====================================================

-- 1. ride_requests
ALTER TABLE ride_requests 
ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ;

-- 2. delivery_requests
ALTER TABLE delivery_requests 
ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ;

-- 3. shopping_requests
ALTER TABLE shopping_requests 
ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ;

-- 4. queue_bookings
ALTER TABLE queue_bookings 
ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ;

-- 5. moving_requests
ALTER TABLE moving_requests 
ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ;

-- 6. laundry_requests
ALTER TABLE laundry_requests 
ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ;

-- =====================================================
-- CREATE INDEX FOR ANALYTICS QUERIES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ride_requests_matched_at 
ON ride_requests(matched_at) WHERE matched_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_requests_matched_at 
ON delivery_requests(matched_at) WHERE matched_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shopping_requests_matched_at 
ON shopping_requests(matched_at) WHERE matched_at IS NOT NULL;

-- =====================================================
-- FUNCTION: Calculate Provider Response Time
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_provider_response_time(
  p_created_at TIMESTAMPTZ,
  p_matched_at TIMESTAMPTZ
) RETURNS INTERVAL AS $$
BEGIN
  IF p_matched_at IS NULL OR p_created_at IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN p_matched_at - p_created_at;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- FUNCTION: Get Provider Average Response Time
-- =====================================================

CREATE OR REPLACE FUNCTION get_provider_avg_response_time(
  p_provider_id UUID,
  p_days INTEGER DEFAULT 30
) RETURNS INTERVAL AS $$
DECLARE
  avg_time INTERVAL;
BEGIN
  SELECT AVG(matched_at - created_at)
  INTO avg_time
  FROM ride_requests
  WHERE provider_id = p_provider_id
    AND matched_at IS NOT NULL
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
  
  RETURN avg_time;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- VIEW: Provider Response Time Analytics (Admin)
-- =====================================================

CREATE OR REPLACE VIEW admin_provider_response_analytics AS
SELECT 
  sp.id AS provider_id,
  sp.provider_uid,
  u.first_name || ' ' || u.last_name AS provider_name,
  sp.provider_type,
  COUNT(rr.id) AS total_rides,
  AVG(EXTRACT(EPOCH FROM (rr.matched_at - rr.created_at))) AS avg_response_seconds,
  MIN(EXTRACT(EPOCH FROM (rr.matched_at - rr.created_at))) AS min_response_seconds,
  MAX(EXTRACT(EPOCH FROM (rr.matched_at - rr.created_at))) AS max_response_seconds,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (rr.matched_at - rr.created_at))) AS median_response_seconds
FROM service_providers sp
JOIN users u ON sp.user_id = u.id
LEFT JOIN ride_requests rr ON rr.provider_id = sp.id AND rr.matched_at IS NOT NULL
GROUP BY sp.id, sp.provider_uid, u.first_name, u.last_name, sp.provider_type;

-- Grant access to authenticated users (admin will filter via RLS)
GRANT SELECT ON admin_provider_response_analytics TO authenticated;

COMMENT ON COLUMN ride_requests.matched_at IS 'Timestamp when provider accepted the ride';
COMMENT ON COLUMN delivery_requests.matched_at IS 'Timestamp when provider accepted the delivery';
COMMENT ON COLUMN shopping_requests.matched_at IS 'Timestamp when provider accepted the shopping request';
