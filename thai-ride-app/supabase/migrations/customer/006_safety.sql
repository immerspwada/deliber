-- =============================================
-- CUSTOMER MODULE: Safety Features
-- =============================================
-- Feature: F13 - Safety/SOS
-- Used by: Customer App
-- Depends on: core/001_users_auth.sql, customer/001_rides.sql
-- =============================================

-- Emergency contacts table
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  relationship VARCHAR(50),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trip shares table
CREATE TABLE IF NOT EXISTS trip_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES ride_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  shared_with_phone VARCHAR(15) NOT NULL,
  shared_with_name VARCHAR(100),
  share_code VARCHAR(20) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Safety incidents table
CREATE TABLE IF NOT EXISTS safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id VARCHAR(25) UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES service_providers(id),
  ride_id UUID REFERENCES ride_requests(id),
  incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN ('sos', 'accident', 'harassment', 'unsafe_driving', 'other')),
  description TEXT,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  location_address TEXT,
  status VARCHAR(20) DEFAULT 'reported' CHECK (status IN ('reported', 'responding', 'resolved', 'false_alarm')),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for dev)
CREATE POLICY "Allow all emergency_contacts" ON emergency_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all trip_shares" ON trip_shares FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all safety_incidents" ON safety_incidents FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON emergency_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_shares_ride ON trip_shares(ride_id);
CREATE INDEX IF NOT EXISTS idx_trip_shares_code ON trip_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_user ON safety_incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_status ON safety_incidents(status);

-- Safety incident tracking ID trigger
CREATE OR REPLACE FUNCTION set_safety_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := 'SOS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_safety_tracking_id ON safety_incidents;
CREATE TRIGGER trigger_safety_tracking_id
  BEFORE INSERT ON safety_incidents
  FOR EACH ROW EXECUTE FUNCTION set_safety_tracking_id();

-- Create trip share
CREATE OR REPLACE FUNCTION create_trip_share(
  p_ride_id UUID,
  p_user_id UUID,
  p_phone VARCHAR(15),
  p_name VARCHAR(100) DEFAULT NULL
)
RETURNS VARCHAR(20) AS $$
DECLARE
  v_share_code VARCHAR(20);
BEGIN
  v_share_code := 'SH' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
  
  INSERT INTO trip_shares (ride_id, user_id, shared_with_phone, shared_with_name, share_code, expires_at)
  VALUES (p_ride_id, p_user_id, p_phone, p_name, v_share_code, NOW() + INTERVAL '24 hours');
  
  RETURN v_share_code;
END;
$$ LANGUAGE plpgsql;

-- Report SOS
CREATE OR REPLACE FUNCTION report_sos(
  p_user_id UUID,
  p_ride_id UUID DEFAULT NULL,
  p_lat DECIMAL(10,8) DEFAULT NULL,
  p_lng DECIMAL(11,8) DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_incident_id UUID;
  v_provider_id UUID;
BEGIN
  IF p_ride_id IS NOT NULL THEN
    SELECT provider_id INTO v_provider_id FROM ride_requests WHERE id = p_ride_id;
  END IF;
  
  INSERT INTO safety_incidents (user_id, provider_id, ride_id, incident_type, description, location_lat, location_lng)
  VALUES (p_user_id, v_provider_id, p_ride_id, 'sos', p_description, p_lat, p_lng)
  RETURNING id INTO v_incident_id;
  
  -- Send notification to admin
  PERFORM send_notification(
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    'sos',
    'SOS Alert!',
    'มีผู้ใช้กดปุ่มฉุกเฉิน',
    jsonb_build_object('incident_id', v_incident_id, 'user_id', p_user_id)
  );
  
  RETURN v_incident_id;
END;
$$ LANGUAGE plpgsql;
