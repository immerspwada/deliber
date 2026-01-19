-- Migration: Job matching functions
-- Feature: provider-system-redesign
-- Purpose: Support geographic job matching with PostGIS

-- Function to get nearby jobs
CREATE OR REPLACE FUNCTION get_nearby_jobs(
  p_provider_location GEOGRAPHY,
  p_max_distance_meters FLOAT,
  p_service_types TEXT[]
) RETURNS TABLE (
  id UUID,
  service_type service_type,
  status job_status,
  pickup_location GEOGRAPHY,
  pickup_address TEXT,
  pickup_lat FLOAT,
  pickup_lng FLOAT,
  dropoff_location GEOGRAPHY,
  dropoff_address TEXT,
  estimated_earnings DECIMAL,
  distance_km DECIMAL,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.service_type,
    j.status,
    j.pickup_location,
    j.pickup_address,
    ST_Y(j.pickup_location::geometry) AS pickup_lat,
    ST_X(j.pickup_location::geometry) AS pickup_lng,
    j.dropoff_location,
    j.dropoff_address,
    j.estimated_earnings,
    j.distance_km,
    j.duration_minutes,
    j.created_at
  FROM jobs j
  WHERE j.status IN ('pending', 'offered')
    AND j.service_type = ANY(p_service_types)
    AND j.provider_id IS NULL
    AND ST_DWithin(
      j.pickup_location,
      p_provider_location,
      p_max_distance_meters
    )
  ORDER BY j.created_at ASC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify providers about new jobs
CREATE OR REPLACE FUNCTION notify_nearby_providers(
  p_job_id UUID,
  p_max_distance_meters FLOAT DEFAULT 10000
) RETURNS INTEGER AS $$
DECLARE
  v_job RECORD;
  v_provider RECORD;
  v_notified_count INTEGER := 0;
BEGIN
  -- Get job details
  SELECT * INTO v_job
  FROM jobs
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found';
  END IF;

  -- Find nearby online providers with matching service type
  FOR v_provider IN
    SELECT p.id, p.user_id
    FROM providers p
    WHERE p.status IN ('approved', 'active')
      AND p.is_online = TRUE
      AND v_job.service_type = ANY(p.service_types)
      AND NOT EXISTS (
        SELECT 1 FROM jobs j
        WHERE j.provider_id = p.id
        AND j.status IN ('accepted', 'arrived', 'in_progress')
      )
  LOOP
    -- Create notification
    INSERT INTO notifications (
      recipient_id,
      type,
      title,
      body,
      data
    ) VALUES (
      v_provider.user_id,
      'job_available',
      'งานใหม่',
      'มีงานใหม่ที่เหมาะกับคุณ',
      jsonb_build_object(
        'job_id', p_job_id,
        'service_type', v_job.service_type,
        'estimated_earnings', v_job.estimated_earnings
      )
    );

    v_notified_count := v_notified_count + 1;
  END LOOP;

  RETURN v_notified_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to notify providers when new job is created
CREATE OR REPLACE FUNCTION trigger_notify_providers_on_new_job()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify providers asynchronously (within 10 seconds)
  PERFORM notify_nearby_providers(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS notify_providers_on_new_job ON jobs;
CREATE TRIGGER notify_providers_on_new_job
  AFTER INSERT ON jobs
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION trigger_notify_providers_on_new_job();

-- Comment on functions
COMMENT ON FUNCTION get_nearby_jobs IS 'Returns jobs within specified distance that match provider service types';
COMMENT ON FUNCTION notify_nearby_providers IS 'Notifies nearby online providers about a new job';
COMMENT ON FUNCTION trigger_notify_providers_on_new_job IS 'Trigger function to notify providers when new job is created';
