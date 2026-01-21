-- Migration: 117_production_sla_monitoring.sql
-- SLA Monitoring & Performance Targets
-- Features: SLA tracking, uptime monitoring, performance targets

-- =====================================================
-- SLA Definitions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS sla_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  metric_type TEXT NOT NULL, -- uptime, response_time, error_rate, resolution_time
  target_value NUMERIC NOT NULL,
  target_unit TEXT NOT NULL, -- percent, ms, hours
  measurement_period TEXT DEFAULT 'monthly', -- daily, weekly, monthly
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SLA Measurements Table
-- =====================================================
CREATE TABLE IF NOT EXISTS sla_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sla_id UUID REFERENCES sla_definitions(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  actual_value NUMERIC NOT NULL,
  target_value NUMERIC NOT NULL,
  is_met BOOLEAN NOT NULL,
  breach_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sla_measurements_sla ON sla_measurements(sla_id);
CREATE INDEX IF NOT EXISTS idx_sla_measurements_period ON sla_measurements(period_start, period_end);

-- =====================================================
-- Uptime Log Table
-- =====================================================
CREATE TABLE IF NOT EXISTS uptime_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  status TEXT NOT NULL, -- up, down, degraded
  check_time TIMESTAMPTZ DEFAULT NOW(),
  response_time_ms INTEGER,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_uptime_log_service ON uptime_log(service_name);
CREATE INDEX IF NOT EXISTS idx_uptime_log_time ON uptime_log(check_time);
CREATE INDEX IF NOT EXISTS idx_uptime_log_status ON uptime_log(status);

-- =====================================================
-- Function: Calculate Uptime Percentage
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_uptime(
  p_service_name TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_checks INTEGER;
  v_up_checks INTEGER;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'up')
  INTO v_total_checks, v_up_checks
  FROM uptime_log
  WHERE service_name = p_service_name
    AND check_time BETWEEN p_start_date AND p_end_date + INTERVAL '1 day';
  
  IF v_total_checks = 0 THEN
    RETURN 100.00;
  END IF;
  
  RETURN ROUND((v_up_checks::NUMERIC / v_total_checks) * 100, 2);
END;
$$;

-- =====================================================
-- Function: Get SLA Dashboard
-- =====================================================
CREATE OR REPLACE FUNCTION get_sla_dashboard()
RETURNS TABLE (
  sla_name TEXT,
  metric_type TEXT,
  target_value NUMERIC,
  target_unit TEXT,
  current_value NUMERIC,
  is_met BOOLEAN,
  trend TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sd.name as sla_name,
    sd.metric_type,
    sd.target_value,
    sd.target_unit,
    COALESCE(sm.actual_value, 0) as current_value,
    COALESCE(sm.is_met, true) as is_met,
    CASE 
      WHEN sm.actual_value > LAG(sm.actual_value) OVER (PARTITION BY sd.id ORDER BY sm.period_start) THEN 'up'
      WHEN sm.actual_value < LAG(sm.actual_value) OVER (PARTITION BY sd.id ORDER BY sm.period_start) THEN 'down'
      ELSE 'stable'
    END as trend
  FROM sla_definitions sd
  LEFT JOIN LATERAL (
    SELECT * FROM sla_measurements
    WHERE sla_id = sd.id
    ORDER BY period_end DESC
    LIMIT 1
  ) sm ON true
  WHERE sd.is_active = true;
END;
$$;

-- =====================================================
-- Function: Record SLA Measurement
-- =====================================================
CREATE OR REPLACE FUNCTION record_sla_measurement(
  p_sla_id UUID,
  p_period_start DATE,
  p_period_end DATE,
  p_actual_value NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_target NUMERIC;
  v_is_met BOOLEAN;
  v_measurement_id UUID;
BEGIN
  SELECT target_value INTO v_target FROM sla_definitions WHERE id = p_sla_id;
  
  -- Determine if SLA is met (depends on metric type)
  v_is_met := p_actual_value >= v_target;
  
  INSERT INTO sla_measurements (
    sla_id, period_start, period_end, actual_value, target_value, is_met
  ) VALUES (
    p_sla_id, p_period_start, p_period_end, p_actual_value, v_target, v_is_met
  )
  RETURNING id INTO v_measurement_id;
  
  RETURN v_measurement_id;
END;
$$;

-- =====================================================
-- Default SLA Definitions
-- =====================================================
INSERT INTO sla_definitions (name, description, metric_type, target_value, target_unit) VALUES
  ('System Uptime', 'Overall system availability', 'uptime', 99.9, 'percent'),
  ('API Response Time', 'Average API response time', 'response_time', 500, 'ms'),
  ('Error Rate', 'Maximum acceptable error rate', 'error_rate', 1, 'percent'),
  ('Support Resolution', 'Average support ticket resolution time', 'resolution_time', 24, 'hours')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE sla_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE uptime_log ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admin can manage sla_definitions" ON sla_definitions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can view sla_measurements" ON sla_measurements
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can view uptime_log" ON uptime_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
