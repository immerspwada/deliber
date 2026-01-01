-- ============================================
-- Migration: 203_promo_service_integration.sql
-- Feature: F10 - Promo System Integration with Services
-- Date: 2026-01-01
-- ============================================
-- Description: Add promo tracking to service requests
-- Tables: ride_requests, delivery_requests, shopping_requests, queue_bookings, moving_requests, laundry_requests
-- RLS: N/A (columns only)
-- Realtime: N/A
-- ============================================

-- 1. Add promo columns to ride_requests
ALTER TABLE ride_requests 
ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id),
ADD COLUMN IF NOT EXISTS promo_code TEXT,
ADD COLUMN IF NOT EXISTS promo_discount_amount NUMERIC(10,2) DEFAULT 0;

-- 2. Add promo columns to delivery_requests
ALTER TABLE delivery_requests 
ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id),
ADD COLUMN IF NOT EXISTS promo_code TEXT,
ADD COLUMN IF NOT EXISTS promo_discount_amount NUMERIC(10,2) DEFAULT 0;

-- 3. Add promo columns to shopping_requests
ALTER TABLE shopping_requests 
ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id),
ADD COLUMN IF NOT EXISTS promo_code TEXT,
ADD COLUMN IF NOT EXISTS promo_discount_amount NUMERIC(10,2) DEFAULT 0;

-- 4. Add promo columns to queue_bookings
ALTER TABLE queue_bookings 
ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id),
ADD COLUMN IF NOT EXISTS promo_code TEXT,
ADD COLUMN IF NOT EXISTS promo_discount_amount NUMERIC(10,2) DEFAULT 0;

-- 5. Add promo columns to moving_requests
ALTER TABLE moving_requests 
ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id),
ADD COLUMN IF NOT EXISTS promo_code TEXT,
ADD COLUMN IF NOT EXISTS promo_discount_amount NUMERIC(10,2) DEFAULT 0;

-- 6. Add promo columns to laundry_requests
ALTER TABLE laundry_requests 
ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id),
ADD COLUMN IF NOT EXISTS promo_code TEXT,
ADD COLUMN IF NOT EXISTS promo_discount_amount NUMERIC(10,2) DEFAULT 0;

-- 7. Create indexes for promo lookups
CREATE INDEX IF NOT EXISTS idx_ride_requests_promo ON ride_requests(promo_code_id) WHERE promo_code_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_requests_promo ON delivery_requests(promo_code_id) WHERE promo_code_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shopping_requests_promo ON shopping_requests(promo_code_id) WHERE promo_code_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_queue_bookings_promo ON queue_bookings(promo_code_id) WHERE promo_code_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moving_requests_promo ON moving_requests(promo_code_id) WHERE promo_code_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_laundry_requests_promo ON laundry_requests(promo_code_id) WHERE promo_code_id IS NOT NULL;

-- 8. RPC: get_job_promo_info - For Provider to see promo used
CREATE OR REPLACE FUNCTION get_job_promo_info(
  p_service_type TEXT,
  p_request_id UUID
)
RETURNS TABLE (
  promo_code TEXT,
  discount_type TEXT,
  discount_value NUMERIC,
  discount_amount NUMERIC,
  promo_description TEXT
) AS $$
BEGIN
  IF p_service_type = 'ride' THEN
    RETURN QUERY
    SELECT 
      r.promo_code,
      pc.discount_type,
      pc.discount_value,
      r.promo_discount_amount,
      pc.description
    FROM ride_requests r
    LEFT JOIN promo_codes pc ON pc.id = r.promo_code_id
    WHERE r.id = p_request_id;
  ELSIF p_service_type = 'delivery' THEN
    RETURN QUERY
    SELECT 
      r.promo_code,
      pc.discount_type,
      pc.discount_value,
      r.promo_discount_amount,
      pc.description
    FROM delivery_requests r
    LEFT JOIN promo_codes pc ON pc.id = r.promo_code_id
    WHERE r.id = p_request_id;
  ELSIF p_service_type = 'shopping' THEN
    RETURN QUERY
    SELECT 
      r.promo_code,
      pc.discount_type,
      pc.discount_value,
      r.promo_discount_amount,
      pc.description
    FROM shopping_requests r
    LEFT JOIN promo_codes pc ON pc.id = r.promo_code_id
    WHERE r.id = p_request_id;
  ELSIF p_service_type = 'queue' THEN
    RETURN QUERY
    SELECT 
      r.promo_code,
      pc.discount_type,
      pc.discount_value,
      r.promo_discount_amount,
      pc.description
    FROM queue_bookings r
    LEFT JOIN promo_codes pc ON pc.id = r.promo_code_id
    WHERE r.id = p_request_id;
  ELSIF p_service_type = 'moving' THEN
    RETURN QUERY
    SELECT 
      r.promo_code,
      pc.discount_type,
      pc.discount_value,
      r.promo_discount_amount,
      pc.description
    FROM moving_requests r
    LEFT JOIN promo_codes pc ON pc.id = r.promo_code_id
    WHERE r.id = p_request_id;
  ELSIF p_service_type = 'laundry' THEN
    RETURN QUERY
    SELECT 
      r.promo_code,
      pc.discount_type,
      pc.discount_value,
      r.promo_discount_amount,
      pc.description
    FROM laundry_requests r
    LEFT JOIN promo_codes pc ON pc.id = r.promo_code_id
    WHERE r.id = p_request_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_job_promo_info(TEXT, UUID) TO authenticated;

-- ============================================
-- ROLLBACK:
-- ALTER TABLE ride_requests DROP COLUMN IF EXISTS promo_code_id, DROP COLUMN IF EXISTS promo_code, DROP COLUMN IF EXISTS promo_discount_amount;
-- ALTER TABLE delivery_requests DROP COLUMN IF EXISTS promo_code_id, DROP COLUMN IF EXISTS promo_code, DROP COLUMN IF EXISTS promo_discount_amount;
-- ALTER TABLE shopping_requests DROP COLUMN IF EXISTS promo_code_id, DROP COLUMN IF EXISTS promo_code, DROP COLUMN IF EXISTS promo_discount_amount;
-- ALTER TABLE queue_bookings DROP COLUMN IF EXISTS promo_code_id, DROP COLUMN IF EXISTS promo_code, DROP COLUMN IF EXISTS promo_discount_amount;
-- ALTER TABLE moving_requests DROP COLUMN IF EXISTS promo_code_id, DROP COLUMN IF EXISTS promo_code, DROP COLUMN IF EXISTS promo_discount_amount;
-- ALTER TABLE laundry_requests DROP COLUMN IF EXISTS promo_code_id, DROP COLUMN IF EXISTS promo_code, DROP COLUMN IF EXISTS promo_discount_amount;
-- DROP FUNCTION IF EXISTS get_job_promo_info(TEXT, UUID);
-- ============================================
