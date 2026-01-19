-- Migration: 120_production_incident_management.sql
-- Incident Management System
-- Features: Incident tracking, postmortems, on-call management

-- =====================================================
-- Incidents Table
-- =====================================================
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number SERIAL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  status TEXT NOT NULL DEFAULT 'open', -- open, investigating, identified, monitoring, resolved
  impact TEXT, -- none, minor, major, critical
  affected_services TEXT[],
  started_at TIMESTAMPTZ DEFAULT NOW(),
  identified_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  root_cause TEXT,
  resolution TEXT,
  created_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_started ON incidents(started_at);

-- =====================================================
-- Incident Timeline Table
-- =====================================================
CREATE TABLE IF NOT EXISTS incident_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- status_change, update, action, escalation
  description TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_timeline_incident ON incident_timeline(incident_id);

-- =====================================================
-- Postmortems Table
-- =====================================================
CREATE TABLE IF NOT EXISTS postmortems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  timeline TEXT,
  root_cause_analysis TEXT,
  contributing_factors TEXT[],
  lessons_learned TEXT,
  action_items JSONB, -- [{title, assignee, due_date, status}]
  blameless BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'draft', -- draft, review, published
  created_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- On-Call Schedule Table
-- =====================================================
CREATE TABLE IF NOT EXISTS oncall_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_primary BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oncall_schedule_time ON oncall_schedule(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_oncall_schedule_user ON oncall_schedule(user_id);

-- =====================================================
-- Function: Create Incident
-- =====================================================
CREATE OR REPLACE FUNCTION create_incident(
  p_title TEXT,
  p_description TEXT,
  p_severity TEXT,
  p_affected_services TEXT[],
  p_created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_incident_id UUID;
BEGIN
  INSERT INTO incidents (
    title, description, severity, affected_services, created_by
  ) VALUES (
    p_title, p_description, p_severity, p_affected_services, p_created_by
  )
  RETURNING id INTO v_incident_id;
  
  -- Add timeline entry
  INSERT INTO incident_timeline (incident_id, event_type, description, created_by)
  VALUES (v_incident_id, 'status_change', 'Incident created with status: open', p_created_by);
  
  RETURN v_incident_id;
END;
$$;

-- =====================================================
-- Function: Update Incident Status
-- =====================================================
CREATE OR REPLACE FUNCTION update_incident_status(
  p_incident_id UUID,
  p_status TEXT,
  p_description TEXT,
  p_updated_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE incidents
  SET status = p_status,
      identified_at = CASE WHEN p_status = 'identified' AND identified_at IS NULL THEN NOW() ELSE identified_at END,
      resolved_at = CASE WHEN p_status = 'resolved' THEN NOW() ELSE resolved_at END,
      duration_minutes = CASE WHEN p_status = 'resolved' THEN EXTRACT(EPOCH FROM (NOW() - started_at)) / 60 ELSE duration_minutes END,
      updated_at = NOW()
  WHERE id = p_incident_id;
  
  -- Add timeline entry
  INSERT INTO incident_timeline (incident_id, event_type, description, created_by)
  VALUES (p_incident_id, 'status_change', COALESCE(p_description, 'Status changed to: ' || p_status), p_updated_by);
  
  RETURN FOUND;
END;
$$;

-- =====================================================
-- Function: Get Current On-Call
-- =====================================================
CREATE OR REPLACE FUNCTION get_current_oncall()
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  is_primary BOOLEAN,
  shift_end TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ocs.user_id,
    u.first_name || ' ' || u.last_name as user_name,
    u.email as user_email,
    ocs.is_primary,
    ocs.end_time as shift_end
  FROM oncall_schedule ocs
  JOIN users u ON ocs.user_id = u.id
  WHERE NOW() BETWEEN ocs.start_time AND ocs.end_time
  ORDER BY ocs.is_primary DESC;
END;
$$;

-- =====================================================
-- Function: Get Incident Statistics
-- =====================================================
CREATE OR REPLACE FUNCTION get_incident_statistics(
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_incidents BIGINT,
  open_incidents BIGINT,
  resolved_incidents BIGINT,
  avg_resolution_minutes NUMERIC,
  mttr_minutes NUMERIC,
  by_severity JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_incidents,
    COUNT(*) FILTER (WHERE i.status != 'resolved')::BIGINT as open_incidents,
    COUNT(*) FILTER (WHERE i.status = 'resolved')::BIGINT as resolved_incidents,
    ROUND(AVG(i.duration_minutes) FILTER (WHERE i.status = 'resolved'), 2) as avg_resolution_minutes,
    ROUND(AVG(i.duration_minutes) FILTER (WHERE i.status = 'resolved'), 2) as mttr_minutes,
    jsonb_object_agg(
      COALESCE(i.severity, 'unknown'),
      (SELECT COUNT(*) FROM incidents WHERE severity = i.severity AND started_at > NOW() - (p_days || ' days')::INTERVAL)
    ) as by_severity
  FROM incidents i
  WHERE i.started_at > NOW() - (p_days || ' days')::INTERVAL;
END;
$$;

-- Enable RLS
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE postmortems ENABLE ROW LEVEL SECURITY;
ALTER TABLE oncall_schedule ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admin can manage incidents" ON incidents
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can manage incident_timeline" ON incident_timeline
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can manage postmortems" ON postmortems
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can manage oncall_schedule" ON oncall_schedule
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
