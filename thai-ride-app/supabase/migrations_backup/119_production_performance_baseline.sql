-- Migration: 119_production_performance_baseline.sql
-- Performance Baseline & Benchmarking
-- Features: Performance baselines, benchmarks, regression detection

-- =====================================================
-- Performance Baselines Table
-- =====================================================
CREATE TABLE IF NOT EXISTS performance_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_type TEXT NOT NULL, -- response_time, throughput, error_rate, etc.
  baseline_value NUMERIC NOT NULL,
  threshold_warning NUMERIC,
  threshold_critical NUMERIC,
  measurement_unit TEXT NOT NULL, -- ms, percent, requests/sec
  environment TEXT DEFAULT 'production',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_name, environment)
);

-- =====================================================
-- Performance Measurements Table
-- =====================================================
CREATE TABLE IF NOT EXISTS performance_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_id UUID REFERENCES performance_baselines(id),
  measured_value NUMERIC NOT NULL,
  deviation_percent NUMERIC,
  status TEXT DEFAULT 'normal', -- normal, warning, critical, improved
  measurement_time TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_perf_measurements_baseline ON performance_measurements(baseline_id);
CREATE INDEX IF NOT EXISTS idx_perf_measurements_time ON performance_measurements(measurement_time);
CREATE INDEX IF NOT EXISTS idx_perf_measurements_status ON performance_measurements(status);

-- =====================================================
-- Load Test Results Table
-- =====================================================
CREATE TABLE IF NOT EXISTS load_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name TEXT NOT NULL,
  test_type TEXT NOT NULL, -- stress, load, spike, soak
  concurrent_users INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  total_requests INTEGER,
  successful_requests INTEGER,
  failed_requests INTEGER,
  avg_response_time_ms NUMERIC,
  p50_response_time_ms NUMERIC,
  p95_response_time_ms NUMERIC,
  p99_response_time_ms NUMERIC,
  max_response_time_ms NUMERIC,
  requests_per_second NUMERIC,
  error_rate NUMERIC,
  notes TEXT,
  run_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_load_test_results_name ON load_test_results(test_name);
CREATE INDEX IF NOT EXISTS idx_load_test_results_time ON load_test_results(created_at);

-- =====================================================
-- Function: Record Performance Measurement
-- =====================================================
CREATE OR REPLACE FUNCTION record_performance_measurement(
  p_metric_name TEXT,
  p_measured_value NUMERIC,
  p_environment TEXT DEFAULT 'production',
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_baseline RECORD;
  v_deviation NUMERIC;
  v_status TEXT;
  v_measurement_id UUID;
BEGIN
  -- Get baseline
  SELECT * INTO v_baseline
  FROM performance_baselines
  WHERE metric_name = p_metric_name
    AND environment = p_environment
    AND is_active = true;
  
  IF v_baseline IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Calculate deviation
  v_deviation := ((p_measured_value - v_baseline.baseline_value) / v_baseline.baseline_value) * 100;
  
  -- Determine status
  IF p_measured_value < v_baseline.baseline_value THEN
    v_status := 'improved';
  ELSIF v_baseline.threshold_critical IS NOT NULL AND p_measured_value >= v_baseline.threshold_critical THEN
    v_status := 'critical';
  ELSIF v_baseline.threshold_warning IS NOT NULL AND p_measured_value >= v_baseline.threshold_warning THEN
    v_status := 'warning';
  ELSE
    v_status := 'normal';
  END IF;
  
  -- Insert measurement
  INSERT INTO performance_measurements (
    baseline_id, measured_value, deviation_percent, status, metadata
  ) VALUES (
    v_baseline.id, p_measured_value, v_deviation, v_status, p_metadata
  )
  RETURNING id INTO v_measurement_id;
  
  RETURN v_measurement_id;
END;
$$;

-- =====================================================
-- Function: Get Performance Trend
-- =====================================================
CREATE OR REPLACE FUNCTION get_performance_trend(
  p_metric_name TEXT,
  p_hours INTEGER DEFAULT 24,
  p_environment TEXT DEFAULT 'production'
)
RETURNS TABLE (
  measurement_time TIMESTAMPTZ,
  measured_value NUMERIC,
  baseline_value NUMERIC,
  deviation_percent NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.measurement_time,
    pm.measured_value,
    pb.baseline_value,
    pm.deviation_percent,
    pm.status
  FROM performance_measurements pm
  JOIN performance_baselines pb ON pm.baseline_id = pb.id
  WHERE pb.metric_name = p_metric_name
    AND pb.environment = p_environment
    AND pm.measurement_time > NOW() - (p_hours || ' hours')::INTERVAL
  ORDER BY pm.measurement_time DESC;
END;
$$;

-- =====================================================
-- Function: Detect Performance Regression
-- =====================================================
CREATE OR REPLACE FUNCTION detect_performance_regression(
  p_hours INTEGER DEFAULT 1
)
RETURNS TABLE (
  metric_name TEXT,
  baseline_value NUMERIC,
  current_avg NUMERIC,
  deviation_percent NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pb.metric_name,
    pb.baseline_value,
    AVG(pm.measured_value) as current_avg,
    AVG(pm.deviation_percent) as deviation_percent,
    CASE 
      WHEN AVG(pm.measured_value) >= pb.threshold_critical THEN 'critical'
      WHEN AVG(pm.measured_value) >= pb.threshold_warning THEN 'warning'
      ELSE 'normal'
    END as status
  FROM performance_baselines pb
  JOIN performance_measurements pm ON pm.baseline_id = pb.id
  WHERE pb.is_active = true
    AND pm.measurement_time > NOW() - (p_hours || ' hours')::INTERVAL
  GROUP BY pb.id, pb.metric_name, pb.baseline_value, pb.threshold_warning, pb.threshold_critical
  HAVING AVG(pm.deviation_percent) > 10 -- More than 10% deviation
  ORDER BY AVG(pm.deviation_percent) DESC;
END;
$$;

-- =====================================================
-- Default Performance Baselines
-- =====================================================
INSERT INTO performance_baselines (metric_name, metric_type, baseline_value, threshold_warning, threshold_critical, measurement_unit) VALUES
  ('api_response_time', 'response_time', 200, 500, 1000, 'ms'),
  ('database_query_time', 'response_time', 50, 200, 500, 'ms'),
  ('page_load_time', 'response_time', 2000, 4000, 6000, 'ms'),
  ('error_rate', 'error_rate', 0.5, 2, 5, 'percent'),
  ('requests_per_second', 'throughput', 100, 50, 20, 'requests/sec'),
  ('memory_usage', 'resource', 70, 85, 95, 'percent'),
  ('cpu_usage', 'resource', 50, 80, 95, 'percent')
ON CONFLICT (metric_name, environment) DO NOTHING;

-- Enable RLS
ALTER TABLE performance_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_test_results ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admin can manage performance_baselines" ON performance_baselines
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can view performance_measurements" ON performance_measurements
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can manage load_test_results" ON load_test_results
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
