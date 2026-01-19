-- Migration: 108_production_readiness.sql
-- Production Readiness - System Health & Monitoring
-- Features: F251 - System Health Monitor

-- =====================================================
-- 1. System Health Log Table (Enhanced)
-- =====================================================
CREATE TABLE IF NOT EXISTS system_health_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL, -- 'database', 'api', 'realtime', 'storage'
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  response_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_health_created ON system_health_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON system_health_log(status);

-- =====================================================
-- 2. API Rate Limiting Table
-- =====================================================
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user ON api_rate_limits(user_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON api_rate_limits(window_start);

-- =====================================================
-- 3. Error Tracking Table
-- =====================================================
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_path TEXT,
  request_method TEXT,
  user_agent TEXT,
  ip_address INET,
  metadata JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);

-- =====================================================
-- 4. System Configuration Table
-- =====================================================
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  is_sensitive BOOLEAN DEFAULT FALSE,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configurations
INSERT INTO system_config (key, value, description) VALUES
  ('maintenance_mode', 'false', 'Enable/disable maintenance mode'),
  ('max_concurrent_rides', '1000', 'Maximum concurrent rides allowed'),
  ('rate_limit_requests', '100', 'API rate limit per minute'),
  ('rate_limit_window_ms', '60000', 'Rate limit window in milliseconds'),
  ('min_app_version', '"1.0.0"', 'Minimum required app version'),
  ('feature_flags', '{"new_ui": true, "beta_features": false}', 'Feature flags')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 5. Health Check Function
-- =====================================================
CREATE OR REPLACE FUNCTION check_system_health()
RETURNS TABLE (
  component TEXT,
  status TEXT,
  response_time_ms INTEGER,
  details JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  db_response INTEGER;
BEGIN
  -- Database health check
  start_time := clock_timestamp();
  PERFORM 1;
  end_time := clock_timestamp();
  db_response := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
  
  RETURN QUERY SELECT 
    'database'::TEXT,
    CASE WHEN db_response < 100 THEN 'healthy' 
         WHEN db_response < 500 THEN 'degraded' 
         ELSE 'unhealthy' END,
    db_response,
    jsonb_build_object('query_time_ms', db_response);

  -- Check active connections
  RETURN QUERY SELECT 
    'connections'::TEXT,
    CASE WHEN (SELECT count(*) FROM pg_stat_activity) < 80 THEN 'healthy'
         WHEN (SELECT count(*) FROM pg_stat_activity) < 95 THEN 'degraded'
         ELSE 'unhealthy' END,
    0,
    jsonb_build_object('active_connections', (SELECT count(*) FROM pg_stat_activity));

  -- Check pending rides
  RETURN QUERY SELECT 
    'pending_rides'::TEXT,
    CASE WHEN (SELECT count(*) FROM ride_requests WHERE status = 'pending') < 100 THEN 'healthy'
         WHEN (SELECT count(*) FROM ride_requests WHERE status = 'pending') < 500 THEN 'degraded'
         ELSE 'unhealthy' END,
    0,
    jsonb_build_object('pending_count', (SELECT count(*) FROM ride_requests WHERE status = 'pending'));

  -- Check online providers
  RETURN QUERY SELECT 
    'online_providers'::TEXT,
    CASE WHEN (SELECT count(*) FROM service_providers WHERE is_available = true) > 0 THEN 'healthy'
         ELSE 'degraded' END,
    0,
    jsonb_build_object('online_count', (SELECT count(*) FROM service_providers WHERE is_available = true));
END;
$$;

-- =====================================================
-- 6. Rate Limiting Function
-- =====================================================
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 100,
  p_window_ms INTEGER DEFAULT 60000
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
BEGIN
  v_window_start := NOW() - (p_window_ms || ' milliseconds')::INTERVAL;
  
  -- Get current request count in window
  SELECT COALESCE(SUM(request_count), 0) INTO v_current_count
  FROM api_rate_limits
  WHERE user_id = p_user_id 
    AND endpoint = p_endpoint
    AND window_start > v_window_start;
  
  -- Check if limit exceeded
  IF v_current_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Record this request
  INSERT INTO api_rate_limits (user_id, endpoint, request_count, window_start)
  VALUES (p_user_id, p_endpoint, 1, NOW())
  ON CONFLICT DO NOTHING;
  
  RETURN TRUE;
END;
$$;

-- =====================================================
-- 7. Log Error Function
-- =====================================================
CREATE OR REPLACE FUNCTION log_error(
  p_error_type TEXT,
  p_error_message TEXT,
  p_stack_trace TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_request_path TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_error_id UUID;
BEGIN
  INSERT INTO error_logs (
    error_type, error_message, stack_trace, user_id, 
    request_path, metadata
  ) VALUES (
    p_error_type, p_error_message, p_stack_trace, p_user_id,
    p_request_path, p_metadata
  ) RETURNING id INTO v_error_id;
  
  RETURN v_error_id;
END;
$$;

-- =====================================================
-- 8. Get System Config Function
-- =====================================================
CREATE OR REPLACE FUNCTION get_system_config(p_key TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (SELECT value FROM system_config WHERE key = p_key);
END;
$$;

-- =====================================================
-- 9. Update System Config Function
-- =====================================================
CREATE OR REPLACE FUNCTION update_system_config(
  p_key TEXT,
  p_value JSONB,
  p_admin_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE system_config 
  SET value = p_value, 
      updated_by = p_admin_id,
      updated_at = NOW()
  WHERE key = p_key;
  
  RETURN FOUND;
END;
$$;

-- =====================================================
-- 10. Cleanup Old Data Function
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS TABLE (
  table_name TEXT,
  rows_deleted INTEGER
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  -- Clean old rate limit records (older than 1 hour)
  DELETE FROM api_rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN QUERY SELECT 'api_rate_limits'::TEXT, v_deleted;
  
  -- Clean old health logs (older than 7 days)
  DELETE FROM system_health_log WHERE created_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN QUERY SELECT 'system_health_log'::TEXT, v_deleted;
  
  -- Clean resolved error logs (older than 30 days)
  DELETE FROM error_logs WHERE resolved = true AND created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN QUERY SELECT 'error_logs'::TEXT, v_deleted;
  
  -- Clean old analytics events (older than 90 days)
  DELETE FROM analytics_events WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN QUERY SELECT 'analytics_events'::TEXT, v_deleted;
END;
$$;

-- =====================================================
-- 11. RLS Policies
-- =====================================================
ALTER TABLE system_health_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Admin can read all
CREATE POLICY "Admin read system_health_log" ON system_health_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin read error_logs" ON error_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin manage system_config" ON system_config
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_system_health() TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION log_error(TEXT, TEXT, TEXT, UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_config(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_system_config(TEXT, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_data() TO authenticated;
