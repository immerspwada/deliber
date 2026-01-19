-- Migration: 049_scheduled_ride_status.sql
-- Feature: F15 - Scheduled Rides Enhancement
-- Description: Add 'scheduled' status to ride_requests for scheduled rides

-- Drop existing constraint and add new one with 'scheduled' status
ALTER TABLE ride_requests 
DROP CONSTRAINT IF EXISTS ride_requests_status_check;

ALTER TABLE ride_requests 
ADD CONSTRAINT ride_requests_status_check 
CHECK (status IN ('pending', 'scheduled', 'matched', 'pickup', 'in_progress', 'completed', 'cancelled'));

-- Create index for scheduled rides
CREATE INDEX IF NOT EXISTS idx_ride_requests_scheduled 
ON ride_requests(scheduled_time, status) 
WHERE scheduled_time IS NOT NULL;

-- Function to process scheduled rides when it's time
CREATE OR REPLACE FUNCTION process_scheduled_rides()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  processed_count INTEGER := 0;
BEGIN
  -- Update scheduled rides that are due (within 15 minutes of scheduled time)
  UPDATE ride_requests
  SET status = 'pending',
      updated_at = NOW()
  WHERE status = 'scheduled'
    AND scheduled_time IS NOT NULL
    AND scheduled_time <= NOW() + INTERVAL '15 minutes'
    AND scheduled_time >= NOW() - INTERVAL '5 minutes';
  
  GET DIAGNOSTICS processed_count = ROW_COUNT;
  
  RETURN processed_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_scheduled_rides() TO authenticated;

COMMENT ON FUNCTION process_scheduled_rides() IS 'Process scheduled rides that are due to start';
