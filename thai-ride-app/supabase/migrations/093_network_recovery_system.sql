-- Feature: Multi-Role Ride Booking System V3
-- Migration: 093_network_recovery_system.sql
-- Description: Network recovery system for detecting and handling offline providers

-- ============================================================================
-- check_stale_rides() - Detect and Handle Offline Providers
-- ============================================================================

CREATE OR REPLACE FUNCTION check_stale_rides()
RETURNS JSON AS $
DECLARE
  v_stale_ride RECORD;
  v_cancelled_count INTEGER := 0;
  v_reassigned_count INTEGER := 0;
  v_result JSON;
BEGIN
  -- Find rides stuck in matched/arriving with offline providers
  -- Provider is considered offline if no location update for 2 minutes
  FOR v_stale_ride IN
    SELECT 
      r.id as ride_id,
      r.user_id,
      r.provider_id,
      r.status,
      r.estimated_fare,
      r.pickup_lat,
      r.pickup_lng,
      r.vehicle_type,
      sp.last_location_update,
      EXTRACT(EPOCH FROM (NOW() - r.matched_at)) as seconds_since_match
    FROM ride_requests r
    INNER JOIN service_providers sp ON r.provider_id = sp.id
    WHERE r.status IN ('matched', 'arriving')
      AND r.matched_at < NOW() - INTERVAL '5 minutes'
      AND sp.last_location_update < NOW() - INTERVAL '2 minutes'
  LOOP
    BEGIN
      -- Cancel the stale ride with full refund
      PERFORM cancel_ride_atomic(
        v_stale_ride.ride_id,
        v_stale_ride.provider_id,
        'system',
        'Provider offline - auto-cancelled by system'
      );
      
      v_cancelled_count := v_cancelled_count + 1;
      
      -- Log the incident
      INSERT INTO safety_incidents (
        user_id,
        incident_type,
        description,
        status,
        created_at
      ) VALUES (
        v_stale_ride.user_id,
        'provider_offline',
        'Provider went offline during ride. Ride auto-cancelled and refunded.',
        'resolved',
        NOW()
      );
      
      -- Notify customer
      PERFORM send_notification(
        v_stale_ride.user_id,
        'ride_auto_cancelled',
        'งานถูกยกเลิกอัตโนมัติ',
        'คนขับขาดการติดต่อ เงินได้รับคืนเต็มจำนวนแล้ว กรุณาสั่งใหม่อีกครั้ง',
        json_build_object(
          'ride_id', v_stale_ride.ride_id,
          'reason', 'provider_offline'
        )
      );
      
      -- Try to auto-reassign by creating a new ride request
      DECLARE
        v_new_ride_result JSON;
      BEGIN
        -- Create new ride with same details
        v_new_ride_result := create_ride_atomic(
          v_stale_ride.user_id,
          v_stale_ride.pickup_lat,
          v_stale_ride.pickup_lng,
          (SELECT pickup_address FROM ride_requests WHERE id = v_stale_ride.ride_id),
          (SELECT destination_lat FROM ride_requests WHERE id = v_stale_ride.ride_id),
          (SELECT destination_lng FROM ride_requests WHERE id = v_stale_ride.ride_id),
          (SELECT destination_address FROM ride_requests WHERE id = v_stale_ride.ride_id),
          v_stale_ride.vehicle_type,
          v_stale_ride.estimated_fare
        );
        
        v_reassigned_count := v_reassigned_count + 1;
        
        -- Notify customer about reassignment
        PERFORM send_notification(
          v_stale_ride.user_id,
          'ride_reassigned',
          'กำลังหาคนขับใหม่',
          'ระบบกำลังหาคนขับใหม่ให้คุณโดยอัตโนมัติ',
          json_build_object(
            'new_ride_id', (v_new_ride_result->>'ride_id')::UUID,
            'tracking_id', v_new_ride_result->>'tracking_id'
          )
        );
        
      EXCEPTION
        WHEN OTHERS THEN
          -- If reassignment fails (e.g., insufficient balance), just log it
          RAISE NOTICE 'Failed to reassign ride %: %', v_stale_ride.ride_id, SQLERRM;
      END;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but continue processing other stale rides
        RAISE NOTICE 'Failed to process stale ride %: %', v_stale_ride.ride_id, SQLERRM;
    END;
  END LOOP;
  
  -- Return summary
  v_result := json_build_object(
    'success', true,
    'cancelled_count', v_cancelled_count,
    'reassigned_count', v_reassigned_count,
    'checked_at', NOW()
  );
  
  RETURN v_result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_stale_rides TO authenticated;

-- Add comment
COMMENT ON FUNCTION check_stale_rides IS 'Detects rides with offline providers and auto-cancels with reassignment';

-- ============================================================================
-- Provider Cancellation Log Table (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS provider_cancellation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES service_providers(id) NOT NULL,
  ride_id UUID REFERENCES ride_requests(id) NOT NULL,
  cancelled_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for provider lookup
CREATE INDEX IF NOT EXISTS idx_provider_cancellation_log_provider 
  ON provider_cancellation_log(provider_id, cancelled_at DESC);

-- Index for ride lookup
CREATE INDEX IF NOT EXISTS idx_provider_cancellation_log_ride 
  ON provider_cancellation_log(ride_id);

-- ============================================================================
-- Scheduled Job Setup Instructions
-- ============================================================================

-- NOTE: To enable automatic stale ride detection, you need to set up a scheduled job.
-- 
-- Option 1: Using pg_cron (if available)
-- SELECT cron.schedule(
--   'check-stale-rides',
--   '*/30 * * * * *',  -- Every 30 seconds
--   $$ SELECT check_stale_rides(); $$
-- );
--
-- Option 2: Using Supabase Edge Functions with cron trigger
-- Create an Edge Function that calls check_stale_rides() and schedule it
-- to run every 30 seconds using Supabase's cron feature
--
-- Option 3: Using external cron service (e.g., GitHub Actions, Vercel Cron)
-- Make HTTP request to Supabase RPC endpoint every 30 seconds
--
-- For development/testing, you can manually call:
-- SELECT check_stale_rides();

-- ============================================================================
-- Helper Function: Get Provider Cancellation Stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_provider_cancellation_stats(
  p_provider_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS JSON AS $
DECLARE
  v_total_cancellations INTEGER;
  v_recent_cancellations INTEGER;
  v_cancellation_rate DECIMAL;
  v_total_rides INTEGER;
BEGIN
  -- Count total cancellations in period
  SELECT COUNT(*)
  INTO v_total_cancellations
  FROM provider_cancellation_log
  WHERE provider_id = p_provider_id
    AND cancelled_at >= NOW() - (p_days || ' days')::INTERVAL;
  
  -- Count recent cancellations (last 7 days)
  SELECT COUNT(*)
  INTO v_recent_cancellations
  FROM provider_cancellation_log
  WHERE provider_id = p_provider_id
    AND cancelled_at >= NOW() - INTERVAL '7 days';
  
  -- Get total rides in period
  SELECT COUNT(*)
  INTO v_total_rides
  FROM ride_requests
  WHERE provider_id = p_provider_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND status IN ('completed', 'cancelled');
  
  -- Calculate cancellation rate
  IF v_total_rides > 0 THEN
    v_cancellation_rate := (v_total_cancellations::DECIMAL / v_total_rides) * 100;
  ELSE
    v_cancellation_rate := 0;
  END IF;
  
  RETURN json_build_object(
    'provider_id', p_provider_id,
    'period_days', p_days,
    'total_cancellations', v_total_cancellations,
    'recent_cancellations', v_recent_cancellations,
    'total_rides', v_total_rides,
    'cancellation_rate', ROUND(v_cancellation_rate, 2)
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_provider_cancellation_stats TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_provider_cancellation_stats IS 'Get provider cancellation statistics for penalty tracking';

-- ============================================================================
-- RLS Policies for provider_cancellation_log
-- ============================================================================

ALTER TABLE provider_cancellation_log ENABLE ROW LEVEL SECURITY;

-- Providers can view their own cancellation log
CREATE POLICY provider_cancellation_log_provider_select
  ON provider_cancellation_log
  FOR SELECT
  TO authenticated
  USING (
    provider_id = auth.uid()
  );

-- Admins can view all cancellation logs
CREATE POLICY provider_cancellation_log_admin_all
  ON provider_cancellation_log
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- System can insert cancellation logs
CREATE POLICY provider_cancellation_log_system_insert
  ON provider_cancellation_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
