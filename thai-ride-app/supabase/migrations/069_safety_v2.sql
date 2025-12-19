-- Migration: 069_safety_v2.sql
-- Feature: F13 - Safety Features Enhancement V2
-- Description: Enhanced safety with live tracking, panic button, trusted contacts

-- =====================================================
-- 1. Safety Profiles
-- =====================================================
CREATE TABLE IF NOT EXISTS safety_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Auto-share settings
  auto_share_rides BOOLEAN DEFAULT FALSE,
  auto_share_after_minutes INTEGER DEFAULT 5,
  share_with_contacts BOOLEAN DEFAULT TRUE,
  
  -- Safety preferences
  preferred_gender_driver TEXT CHECK (preferred_gender_driver IN ('any', 'male', 'female')),
  night_mode_enabled BOOLEAN DEFAULT TRUE, -- Extra safety features at night
  night_mode_start TIME DEFAULT '22:00',
  night_mode_end TIME DEFAULT '06:00',
  
  -- Verification requirements
  require_driver_photo_match BOOLEAN DEFAULT FALSE,
  require_vehicle_photo_match BOOLEAN DEFAULT FALSE,
  
  -- Emergency settings
  emergency_contact_primary UUID,
  emergency_message TEXT DEFAULT 'ฉันต้องการความช่วยเหลือ กรุณาติดต่อกลับด่วน',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- =====================================================
-- 2. Trusted Contacts
-- =====================================================
CREATE TABLE IF NOT EXISTS trusted_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,
  relationship TEXT, -- 'family', 'friend', 'spouse', 'other'
  
  -- Permissions
  can_track_live BOOLEAN DEFAULT TRUE,
  can_receive_alerts BOOLEAN DEFAULT TRUE,
  can_receive_trip_summary BOOLEAN DEFAULT FALSE,
  
  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  verification_code TEXT,
  verified_at TIMESTAMPTZ,
  
  is_primary BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trusted_contacts_user ON trusted_contacts(user_id);

-- =====================================================
-- 3. Safety Alerts
-- =====================================================
CREATE TABLE IF NOT EXISTS safety_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'sos', 'panic', 'route_deviation', 'long_stop', 
    'speed_alert', 'geofence_exit', 'no_movement', 'manual'
  )),
  
  -- Location
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  address TEXT,
  
  -- Related entities
  ride_id UUID REFERENCES ride_requests(id),
  delivery_id UUID REFERENCES delivery_requests(id),
  provider_id UUID REFERENCES service_providers(id),
  
  -- Alert details
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT,
  auto_generated BOOLEAN DEFAULT FALSE,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'false_alarm')),
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Notifications sent
  contacts_notified JSONB DEFAULT '[]',
  authorities_notified BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_alerts_user ON safety_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_alerts_status ON safety_alerts(status);
CREATE INDEX IF NOT EXISTS idx_safety_alerts_type ON safety_alerts(alert_type);

-- =====================================================
-- 4. Live Tracking Sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS live_tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Session info
  session_type TEXT NOT NULL CHECK (session_type IN ('ride', 'delivery', 'manual')),
  ride_id UUID REFERENCES ride_requests(id),
  delivery_id UUID REFERENCES delivery_requests(id),
  
  -- Share settings
  share_token TEXT UNIQUE NOT NULL,
  share_url TEXT,
  expires_at TIMESTAMPTZ,
  
  -- Shared with
  shared_with_contacts UUID[] DEFAULT '{}',
  shared_with_emails TEXT[] DEFAULT '{}',
  shared_with_phones TEXT[] DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  
  -- Stats
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_live_tracking_user ON live_tracking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_live_tracking_token ON live_tracking_sessions(share_token);
CREATE INDEX IF NOT EXISTS idx_live_tracking_active ON live_tracking_sessions(is_active);

-- =====================================================
-- 5. Route Monitoring
-- =====================================================
CREATE TABLE IF NOT EXISTS route_monitoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
  
  -- Expected route
  expected_route JSONB, -- GeoJSON LineString
  expected_duration_minutes INTEGER,
  expected_distance_km NUMERIC(10,2),
  
  -- Actual tracking
  actual_route JSONB DEFAULT '[]', -- Array of {lat, lng, timestamp}
  deviation_points JSONB DEFAULT '[]',
  
  -- Alerts
  deviation_threshold_meters INTEGER DEFAULT 500,
  deviation_count INTEGER DEFAULT 0,
  last_deviation_at TIMESTAMPTZ,
  
  -- Long stops
  stop_threshold_minutes INTEGER DEFAULT 5,
  long_stops JSONB DEFAULT '[]', -- Array of {lat, lng, start, end, duration}
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_monitoring_ride ON route_monitoring(ride_id);

-- =====================================================
-- 6. Safety Check-ins
-- =====================================================
CREATE TABLE IF NOT EXISTS safety_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  ride_id UUID REFERENCES ride_requests(id),
  
  checkin_type TEXT NOT NULL CHECK (checkin_type IN ('auto', 'manual', 'prompted')),
  status TEXT NOT NULL CHECK (status IN ('ok', 'help_needed', 'no_response')),
  
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  
  prompted_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response_time_seconds INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_checkins_user ON safety_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_checkins_ride ON safety_checkins(ride_id);

-- =====================================================
-- 7. Enable RLS
-- =====================================================
ALTER TABLE safety_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_checkins ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users manage own safety_profile" ON safety_profiles
  FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users manage own trusted_contacts" ON trusted_contacts
  FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users read own safety_alerts" ON safety_alerts
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users create safety_alerts" ON safety_alerts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own live_tracking" ON live_tracking_sessions
  FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Anyone read by share_token" ON live_tracking_sessions
  FOR SELECT USING (share_token IS NOT NULL);

CREATE POLICY "Users read own route_monitoring" ON route_monitoring
  FOR SELECT TO authenticated USING (
    ride_id IN (SELECT id FROM ride_requests WHERE user_id = auth.uid())
  );

CREATE POLICY "Users manage own checkins" ON safety_checkins
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- =====================================================
-- 8. Functions
-- =====================================================

-- Trigger SOS alert
CREATE OR REPLACE FUNCTION trigger_sos_alert(
  p_user_id UUID,
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_ride_id UUID DEFAULT NULL,
  p_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
  v_contacts JSONB := '[]';
  v_contact RECORD;
BEGIN
  -- Create alert
  INSERT INTO safety_alerts (
    user_id, alert_type, lat, lng, ride_id,
    severity, message, status
  ) VALUES (
    p_user_id, 'sos', p_lat, p_lng, p_ride_id,
    'critical', COALESCE(p_message, 'SOS Alert triggered'), 'active'
  ) RETURNING id INTO v_alert_id;
  
  -- Get trusted contacts
  FOR v_contact IN
    SELECT * FROM trusted_contacts
    WHERE user_id = p_user_id AND can_receive_alerts = true
  LOOP
    v_contacts := v_contacts || jsonb_build_object(
      'contact_id', v_contact.id,
      'name', v_contact.contact_name,
      'phone', v_contact.contact_phone,
      'notified_at', NOW()
    );
    
    -- Create notification for each contact (would trigger SMS/push in real app)
    INSERT INTO user_notifications (user_id, type, title, message, data)
    VALUES (
      p_user_id, 'safety',
      'SOS Alert Sent',
      format('Alert sent to %s', v_contact.contact_name),
      jsonb_build_object('alert_id', v_alert_id, 'contact', v_contact.contact_name)
    );
  END LOOP;
  
  -- Update alert with notified contacts
  UPDATE safety_alerts SET contacts_notified = v_contacts WHERE id = v_alert_id;
  
  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create live tracking session
CREATE OR REPLACE FUNCTION create_live_tracking(
  p_user_id UUID,
  p_session_type TEXT,
  p_ride_id UUID DEFAULT NULL,
  p_duration_hours INTEGER DEFAULT 24
) RETURNS TABLE (
  session_id UUID,
  share_token TEXT,
  share_url TEXT
) AS $$
DECLARE
  v_session_id UUID;
  v_token TEXT;
  v_url TEXT;
BEGIN
  -- Generate unique token
  v_token := encode(gen_random_bytes(16), 'hex');
  v_url := format('https://thairide.app/track/%s', v_token);
  
  INSERT INTO live_tracking_sessions (
    user_id, session_type, ride_id, share_token, share_url, expires_at
  ) VALUES (
    p_user_id, p_session_type, p_ride_id, v_token, v_url,
    NOW() + (p_duration_hours || ' hours')::INTERVAL
  ) RETURNING id INTO v_session_id;
  
  RETURN QUERY SELECT v_session_id, v_token, v_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Share tracking with contacts
CREATE OR REPLACE FUNCTION share_tracking_with_contacts(
  p_session_id UUID,
  p_contact_ids UUID[]
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE live_tracking_sessions
  SET shared_with_contacts = p_contact_ids
  WHERE id = p_session_id;
  
  -- Notify contacts
  INSERT INTO user_notifications (user_id, type, title, message, data)
  SELECT 
    tc.user_id,
    'safety',
    'Trip Shared With You',
    format('%s shared their trip with you', u.first_name),
    jsonb_build_object('session_id', p_session_id, 'share_url', lts.share_url)
  FROM live_tracking_sessions lts
  JOIN users u ON lts.user_id = u.id
  CROSS JOIN UNNEST(p_contact_ids) AS contact_id
  JOIN trusted_contacts tc ON tc.id = contact_id
  WHERE lts.id = p_session_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check route deviation
CREATE OR REPLACE FUNCTION check_route_deviation(
  p_ride_id UUID,
  p_current_lat NUMERIC,
  p_current_lng NUMERIC
) RETURNS TABLE (
  is_deviated BOOLEAN,
  deviation_meters NUMERIC,
  alert_created BOOLEAN
) AS $$
DECLARE
  v_monitoring route_monitoring%ROWTYPE;
  v_deviation NUMERIC;
  v_is_deviated BOOLEAN := FALSE;
  v_alert_created BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_monitoring FROM route_monitoring WHERE ride_id = p_ride_id;
  
  IF v_monitoring.id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, FALSE;
    RETURN;
  END IF;
  
  -- Simple deviation check (in real app, would use proper geo functions)
  -- This is a placeholder calculation
  v_deviation := 0; -- Would calculate actual deviation from expected route
  
  IF v_deviation > v_monitoring.deviation_threshold_meters THEN
    v_is_deviated := TRUE;
    
    -- Update monitoring
    UPDATE route_monitoring
    SET deviation_count = deviation_count + 1,
        last_deviation_at = NOW(),
        deviation_points = deviation_points || jsonb_build_object(
          'lat', p_current_lat,
          'lng', p_current_lng,
          'timestamp', NOW(),
          'deviation_m', v_deviation
        )
    WHERE id = v_monitoring.id;
    
    -- Create alert if significant deviation
    IF v_deviation > v_monitoring.deviation_threshold_meters * 2 THEN
      INSERT INTO safety_alerts (
        user_id, alert_type, lat, lng, ride_id,
        severity, message, auto_generated
      )
      SELECT 
        rr.user_id, 'route_deviation', p_current_lat, p_current_lng, p_ride_id,
        'medium', format('Route deviation detected: %sm from expected route', v_deviation::INTEGER),
        TRUE
      FROM ride_requests rr WHERE rr.id = p_ride_id;
      
      v_alert_created := TRUE;
    END IF;
  END IF;
  
  RETURN QUERY SELECT v_is_deviated, v_deviation, v_alert_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resolve safety alert
CREATE OR REPLACE FUNCTION resolve_safety_alert(
  p_alert_id UUID,
  p_resolver_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE safety_alerts
  SET status = p_status,
      resolved_by = p_resolver_id,
      resolved_at = NOW(),
      resolution_notes = p_notes
  WHERE id = p_alert_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get safety summary for user
CREATE OR REPLACE FUNCTION get_safety_summary(p_user_id UUID)
RETURNS TABLE (
  total_alerts INTEGER,
  active_alerts INTEGER,
  trusted_contacts_count INTEGER,
  has_safety_profile BOOLEAN,
  last_checkin TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM safety_alerts WHERE user_id = p_user_id),
    (SELECT COUNT(*)::INTEGER FROM safety_alerts WHERE user_id = p_user_id AND status = 'active'),
    (SELECT COUNT(*)::INTEGER FROM trusted_contacts WHERE user_id = p_user_id),
    EXISTS(SELECT 1 FROM safety_profiles WHERE user_id = p_user_id),
    (SELECT MAX(created_at) FROM safety_checkins WHERE user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE safety_profiles IS 'User safety preferences and settings';
COMMENT ON TABLE trusted_contacts IS 'Emergency contacts for safety features';
COMMENT ON TABLE safety_alerts IS 'Safety alerts and SOS events';
COMMENT ON TABLE live_tracking_sessions IS 'Live location sharing sessions';
COMMENT ON TABLE route_monitoring IS 'Route deviation monitoring';
COMMENT ON TABLE safety_checkins IS 'Safety check-in records';
