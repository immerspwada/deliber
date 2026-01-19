-- Migration: 053_rated_at_columns.sql
-- Feature: Add rated_at column to track when orders were rated
-- This enables counting unrated orders for badge display

-- Add rated_at column to ride_requests
ALTER TABLE ride_requests 
ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

-- Add rated_at column to delivery_requests
ALTER TABLE delivery_requests 
ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

-- Add rated_at column to shopping_requests
ALTER TABLE shopping_requests 
ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

-- Add rated_at column to queue_bookings
ALTER TABLE queue_bookings 
ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

-- Add rated_at column to moving_requests
ALTER TABLE moving_requests 
ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

-- Add rated_at column to laundry_requests
ALTER TABLE laundry_requests 
ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

-- Create indexes for faster unrated queries
CREATE INDEX IF NOT EXISTS idx_ride_requests_unrated 
ON ride_requests (user_id, status) 
WHERE rated_at IS NULL AND status = 'completed';

CREATE INDEX IF NOT EXISTS idx_delivery_requests_unrated 
ON delivery_requests (user_id, status) 
WHERE rated_at IS NULL AND status IN ('delivered', 'completed');

CREATE INDEX IF NOT EXISTS idx_shopping_requests_unrated 
ON shopping_requests (user_id, status) 
WHERE rated_at IS NULL AND status = 'completed';

-- Function to mark order as rated (called after rating submission)
CREATE OR REPLACE FUNCTION mark_order_rated(
  p_order_id UUID,
  p_order_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CASE p_order_type
    WHEN 'ride' THEN
      UPDATE ride_requests SET rated_at = NOW() WHERE id = p_order_id;
    WHEN 'delivery' THEN
      UPDATE delivery_requests SET rated_at = NOW() WHERE id = p_order_id;
    WHEN 'shopping' THEN
      UPDATE shopping_requests SET rated_at = NOW() WHERE id = p_order_id;
    WHEN 'queue' THEN
      UPDATE queue_bookings SET rated_at = NOW() WHERE id = p_order_id;
    WHEN 'moving' THEN
      UPDATE moving_requests SET rated_at = NOW() WHERE id = p_order_id;
    WHEN 'laundry' THEN
      UPDATE laundry_requests SET rated_at = NOW() WHERE id = p_order_id;
    ELSE
      RETURN FALSE;
  END CASE;
  
  RETURN TRUE;
END;
$$;

-- Function to get unrated orders count for a user
CREATE OR REPLACE FUNCTION get_unrated_orders_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
  v_temp INTEGER;
BEGIN
  -- Count unrated rides
  SELECT COUNT(*) INTO v_temp
  FROM ride_requests
  WHERE user_id = p_user_id 
    AND status = 'completed' 
    AND rated_at IS NULL;
  v_count := v_count + COALESCE(v_temp, 0);
  
  -- Count unrated deliveries
  SELECT COUNT(*) INTO v_temp
  FROM delivery_requests
  WHERE user_id = p_user_id 
    AND status IN ('delivered', 'completed') 
    AND rated_at IS NULL;
  v_count := v_count + COALESCE(v_temp, 0);
  
  -- Count unrated shopping
  SELECT COUNT(*) INTO v_temp
  FROM shopping_requests
  WHERE user_id = p_user_id 
    AND status = 'completed' 
    AND rated_at IS NULL;
  v_count := v_count + COALESCE(v_temp, 0);
  
  RETURN v_count;
END;
$$;

-- Trigger to auto-set rated_at when rating is inserted
CREATE OR REPLACE FUNCTION auto_mark_rated_on_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- For ride_ratings
  IF TG_TABLE_NAME = 'ride_ratings' THEN
    UPDATE ride_requests SET rated_at = NOW() WHERE id = NEW.ride_id;
  -- For delivery_ratings
  ELSIF TG_TABLE_NAME = 'delivery_ratings' THEN
    UPDATE delivery_requests SET rated_at = NOW() WHERE id = NEW.delivery_id;
  -- For shopping_ratings
  ELSIF TG_TABLE_NAME = 'shopping_ratings' THEN
    UPDATE shopping_requests SET rated_at = NOW() WHERE id = NEW.shopping_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers for auto-marking rated
DROP TRIGGER IF EXISTS trg_auto_mark_ride_rated ON ride_ratings;
CREATE TRIGGER trg_auto_mark_ride_rated
  AFTER INSERT ON ride_ratings
  FOR EACH ROW
  EXECUTE FUNCTION auto_mark_rated_on_rating();

DROP TRIGGER IF EXISTS trg_auto_mark_delivery_rated ON delivery_ratings;
CREATE TRIGGER trg_auto_mark_delivery_rated
  AFTER INSERT ON delivery_ratings
  FOR EACH ROW
  EXECUTE FUNCTION auto_mark_rated_on_rating();

DROP TRIGGER IF EXISTS trg_auto_mark_shopping_rated ON shopping_ratings;
CREATE TRIGGER trg_auto_mark_shopping_rated
  AFTER INSERT ON shopping_ratings
  FOR EACH ROW
  EXECUTE FUNCTION auto_mark_rated_on_rating();

COMMENT ON COLUMN ride_requests.rated_at IS 'Timestamp when the ride was rated by customer';
COMMENT ON COLUMN delivery_requests.rated_at IS 'Timestamp when the delivery was rated by customer';
COMMENT ON COLUMN shopping_requests.rated_at IS 'Timestamp when the shopping was rated by customer';
