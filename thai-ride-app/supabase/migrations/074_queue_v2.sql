-- Migration: 074_queue_v2.sql
-- Feature: F158 - Queue Booking Enhancement V2
-- Description: Virtual queue, estimated wait time, queue analytics

-- =====================================================
-- 1. Queue Locations (Popular places)
-- =====================================================
CREATE TABLE IF NOT EXISTS queue_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_th TEXT NOT NULL,
  location_type TEXT CHECK (location_type IN ('hospital', 'government', 'bank', 'mall', 'airport', 'station', 'other')),
  
  lat NUMERIC(10,7) NOT NULL,
  lng NUMERIC(10,7) NOT NULL,
  address TEXT,
  
  -- Queue settings
  avg_service_time_minutes INTEGER DEFAULT 15,
  max_queue_size INTEGER DEFAULT 100,
  operating_hours JSONB,
  
  -- Stats
  current_queue_size INTEGER DEFAULT 0,
  avg_wait_time_minutes INTEGER DEFAULT 0,
  total_served_today INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queue_locations_type ON queue_locations(location_type);

-- =====================================================
-- 2. Queue Tickets
-- =====================================================
CREATE TABLE IF NOT EXISTS queue_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_booking_id UUID REFERENCES queue_bookings(id) ON DELETE CASCADE,
  location_id UUID REFERENCES queue_locations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  ticket_number TEXT NOT NULL,
  queue_position INTEGER,
  
  -- Timing
  estimated_call_time TIMESTAMPTZ,
  actual_call_time TIMESTAMPTZ,
  service_start_time TIMESTAMPTZ,
  service_end_time TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'serving', 'completed', 'no_show', 'cancelled')),
  
  -- Notifications
  reminder_sent BOOLEAN DEFAULT FALSE,
  call_notification_sent BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queue_tickets_location ON queue_tickets(location_id);
CREATE INDEX IF NOT EXISTS idx_queue_tickets_user ON queue_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_tickets_status ON queue_tickets(status);

-- =====================================================
-- 3. Queue Analytics
-- =====================================================
CREATE TABLE IF NOT EXISTS queue_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES queue_locations(id),
  
  date DATE NOT NULL,
  hour INTEGER CHECK (hour >= 0 AND hour < 24),
  
  -- Metrics
  total_tickets INTEGER DEFAULT 0,
  completed_tickets INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  cancelled_count INTEGER DEFAULT 0,
  
  avg_wait_time_minutes NUMERIC(5,1),
  avg_service_time_minutes NUMERIC(5,1),
  peak_queue_size INTEGER,
  
  UNIQUE(location_id, date, hour)
);

CREATE INDEX IF NOT EXISTS idx_queue_analytics_location ON queue_analytics(location_id);
CREATE INDEX IF NOT EXISTS idx_queue_analytics_date ON queue_analytics(date);

-- =====================================================
-- 4. Enable RLS
-- =====================================================
ALTER TABLE queue_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone read active locations" ON queue_locations
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Users manage own tickets" ON queue_tickets
  FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Anyone read analytics" ON queue_analytics
  FOR SELECT TO authenticated USING (true);

-- =====================================================
-- 5. Functions
-- =====================================================

-- Get queue ticket
CREATE OR REPLACE FUNCTION get_queue_ticket(
  p_user_id UUID,
  p_location_id UUID
) RETURNS TABLE (
  ticket_id UUID,
  ticket_number TEXT,
  queue_position INTEGER,
  estimated_wait_minutes INTEGER,
  estimated_call_time TIMESTAMPTZ
) AS $$
DECLARE
  v_location queue_locations%ROWTYPE;
  v_ticket_id UUID;
  v_ticket_num TEXT;
  v_position INTEGER;
  v_wait INTEGER;
BEGIN
  SELECT * INTO v_location FROM queue_locations WHERE id = p_location_id;
  
  -- Get current position
  SELECT COUNT(*) + 1 INTO v_position
  FROM queue_tickets
  WHERE location_id = p_location_id AND status = 'waiting';
  
  -- Generate ticket number
  v_ticket_num := format('%s-%s', 
    UPPER(LEFT(v_location.name, 1)),
    LPAD(v_position::TEXT, 3, '0')
  );
  
  -- Calculate wait time
  v_wait := v_position * COALESCE(v_location.avg_service_time_minutes, 15);
  
  -- Create ticket
  INSERT INTO queue_tickets (
    location_id, user_id, ticket_number, queue_position,
    estimated_call_time, status
  ) VALUES (
    p_location_id, p_user_id, v_ticket_num, v_position,
    NOW() + (v_wait || ' minutes')::INTERVAL, 'waiting'
  ) RETURNING id INTO v_ticket_id;
  
  -- Update location stats
  UPDATE queue_locations
  SET current_queue_size = current_queue_size + 1
  WHERE id = p_location_id;
  
  RETURN QUERY SELECT v_ticket_id, v_ticket_num, v_position, v_wait, 
    NOW() + (v_wait || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update ticket status
CREATE OR REPLACE FUNCTION update_queue_ticket_status(
  p_ticket_id UUID,
  p_status TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_ticket queue_tickets%ROWTYPE;
BEGIN
  SELECT * INTO v_ticket FROM queue_tickets WHERE id = p_ticket_id;
  
  UPDATE queue_tickets
  SET status = p_status,
      actual_call_time = CASE WHEN p_status = 'called' THEN NOW() ELSE actual_call_time END,
      service_start_time = CASE WHEN p_status = 'serving' THEN NOW() ELSE service_start_time END,
      service_end_time = CASE WHEN p_status IN ('completed', 'no_show') THEN NOW() ELSE service_end_time END
  WHERE id = p_ticket_id;
  
  -- Update location stats
  IF p_status IN ('completed', 'no_show', 'cancelled') THEN
    UPDATE queue_locations
    SET current_queue_size = GREATEST(0, current_queue_size - 1),
        total_served_today = CASE WHEN p_status = 'completed' THEN total_served_today + 1 ELSE total_served_today END
    WHERE id = v_ticket.location_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get location queue status
CREATE OR REPLACE FUNCTION get_queue_status(p_location_id UUID)
RETURNS TABLE (
  current_size INTEGER,
  avg_wait_minutes INTEGER,
  next_ticket TEXT,
  serving_ticket TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ql.current_queue_size,
    ql.avg_wait_time_minutes,
    (SELECT ticket_number FROM queue_tickets WHERE location_id = p_location_id AND status = 'waiting' ORDER BY queue_position LIMIT 1),
    (SELECT ticket_number FROM queue_tickets WHERE location_id = p_location_id AND status = 'serving' ORDER BY service_start_time DESC LIMIT 1)
  FROM queue_locations ql
  WHERE ql.id = p_location_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE queue_locations IS 'Locations that support queue booking';
COMMENT ON TABLE queue_tickets IS 'Virtual queue tickets';
COMMENT ON TABLE queue_analytics IS 'Queue performance analytics';
