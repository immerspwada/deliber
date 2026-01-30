-- Migration: Add Promo Financial Columns
-- Date: 2026-01-29
-- Purpose: Add columns for correct promo financial calculation
-- 
-- CRITICAL: Commission calculated from FULL FARE, Platform bears discount cost

-- Add columns to ride_requests
ALTER TABLE ride_requests
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0.20,
ADD COLUMN IF NOT EXISTS platform_commission NUMERIC,
ADD COLUMN IF NOT EXISTS customer_paid_amount NUMERIC,
ADD COLUMN IF NOT EXISTS platform_revenue NUMERIC;

-- Add columns to queue_bookings
ALTER TABLE queue_bookings
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0.20,
ADD COLUMN IF NOT EXISTS platform_commission NUMERIC,
ADD COLUMN IF NOT EXISTS customer_paid_amount NUMERIC,
ADD COLUMN IF NOT EXISTS platform_revenue NUMERIC,
ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id),
ADD COLUMN IF NOT EXISTS promo_code TEXT,
ADD COLUMN IF NOT EXISTS promo_discount_amount NUMERIC DEFAULT 0;

-- Add columns to shopping_requests
ALTER TABLE shopping_requests
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0.15,
ADD COLUMN IF NOT EXISTS platform_commission NUMERIC,
ADD COLUMN IF NOT EXISTS customer_paid_amount NUMERIC,
ADD COLUMN IF NOT EXISTS platform_revenue NUMERIC,
ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id),
ADD COLUMN IF NOT EXISTS promo_code TEXT,
ADD COLUMN IF NOT EXISTS promo_discount_amount NUMERIC DEFAULT 0;

-- Update existing records with calculated values
UPDATE ride_requests
SET
  commission_rate = 0.20,
  platform_commission = total_fare * 0.20,
  customer_paid_amount = total_fare - COALESCE(promo_discount_amount, 0),
  platform_revenue = (total_fare * 0.20) - COALESCE(promo_discount_amount, 0)
WHERE platform_commission IS NULL;

UPDATE queue_bookings
SET
  commission_rate = 0.20,
  platform_commission = service_fee * 0.20,
  customer_paid_amount = service_fee - COALESCE(promo_discount_amount, 0),
  platform_revenue = (service_fee * 0.20) - COALESCE(promo_discount_amount, 0)
WHERE platform_commission IS NULL;

UPDATE shopping_requests
SET
  commission_rate = 0.15,
  platform_commission = service_fee * 0.15,
  customer_paid_amount = service_fee - COALESCE(promo_discount_amount, 0),
  platform_revenue = (service_fee * 0.15) - COALESCE(promo_discount_amount, 0)
WHERE platform_commission IS NULL;

-- Add comments
COMMENT ON COLUMN ride_requests.commission_rate IS 'Commission rate (e.g., 0.20 = 20%)';
COMMENT ON COLUMN ride_requests.platform_commission IS 'Platform commission calculated from FULL FARE';
COMMENT ON COLUMN ride_requests.customer_paid_amount IS 'Amount customer pays (total_fare - promo_discount)';
COMMENT ON COLUMN ride_requests.platform_revenue IS 'Platform net revenue (commission - promo_discount)';
