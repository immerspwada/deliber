-- Migration: 114_production_api_monitoring.sql
-- Production API Monitoring & Performance Tracking
-- Features: F194 - API Monitoring, Request Logging, Performance Metrics

-- =====================================================
-- API Request Log Table
-- =====================================================
CREATE TABLE IF NOT EXISTS api_request_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  request_time TIMESTAMPTZ DEFAULT NOW(),
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance queries
CREATE INDEX IF NOT EXISTS idx_api_request_log_endpoint ON api_request_log(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_request_log_time ON api_request_log(request_time);
CREATE INDEX IF NOT EXISTS idx_api_request_log_user ON api_request_log(user_id);
CREATE INDEX IF NOT EXISTS idx_api_request_log_status ON api_request_log(status_code);

-- =====================================================
-- API Endpoint Statistics (Aggregated)
-- =====================================================
CREATE TABLE IF NOT EXISTS api_endpoint_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  hour INTEGER NOT NULL DEFAULT EXTRACT(HOUR FROM NOW()),
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  avg_response_time_ms NUMERIC(10,2),
  p50_response_time_ms INTEGER,
  p95_response_time_ms INTEGER,
  p99_response_time_ms INTEGER,
  total_request_bytes BIGINT DEFAULT 0,
  total_response_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(endpoint, date, hour)
);

CREATE INDEX IF NOT EXISTS idx_api_endpoint_stats_date ON api_endpoint_stats(date);
CREATE INDEX IF NOT EXISTS idx_api_endpoint_stats_endpoint ON api_endpoint_stats(endpoint);


-- =====================================================
-- Database Query Performance Log
-- =====================================================
CREATE TABLE IF NOT EXISTS db_query_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL,
  query_template TEXT,
  execution_time_ms INTEGER NOT NULL,
  rows_affected INTEGER,
  table_name TEXT,
  operation TEXT, -- SELECT, INSERT, UPDATE, DELETE
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_db_query_log_hash ON db_query_log(query_hash);
CREATE INDEX IF NOT EXISTS idx_db_query_log_time ON db_query_log(created_at);
CREATE INDEX IF NOT EXISTS idx_db_query_log_slow ON db_query_log(execution_time_ms) WHERE execution_time_ms > 1000;

-- =====================================================
-- Service Dependency Health
-- =====================================================
CREATE TABLE IF NOT EXISTS service_dependency_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  endpoint_url TEXT,
  status TEXT DEFAULT 'unknown', -- healthy, degraded, down, unknown
  last_check_at TIMESTAMPTZ DEFAULT NOW(),
  response_time_ms INTEGER,
  error_message TEXT,
  consecutive_failures INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_dependency_name ON service_dependency_health(service_name);

-- =====================================================
-- Function: Log API Request
-- =====================================================
CREATE OR REPLACE FUNCTION log_api_request(
  p_endpoint TEXT,
  p_method TEXT,
  p_user_id UUID DEFAULT NULL,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_status_code INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_request_size INTEGER DEFAULT NULL,
  p_response_size INTEGER DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO api_request_log (
    endpoint, method, user_id, response_time_ms, status_code,
    error_message, request_size_bytes, response_size_bytes,
    ip_address, user_agent
  ) VALUES (
    p_endpoint, p_method, p_user_id, p_response_time_ms, p_status_code,
    p_error_message, p_request_size, p_response_size,
    p_ip_address, p_user_agent
  )
  RETURNING id INTO v_log_id;

  -- Update aggregated stats
  INSERT INTO api_endpoint_stats (
    endpoint, date, hour, total_requests, successful_requests, failed_requests,
    avg_response_time_ms, total_request_bytes, total_response_bytes
  ) VALUES (
    p_endpoint, CURRENT_DATE, EXTRACT(HOUR FROM NOW())::INTEGER,
    1,
    CASE WHEN p_status_code < 400 THEN 1 ELSE 0 END,
    CASE WHEN p_status_code >= 400 THEN 1 ELSE 0 END,
    p_response_time_ms,
    COALESCE(p_request_size, 0),
    COALESCE(p_response_size, 0)
  )
  ON CONFLICT (endpoint, date, hour) DO UPDATE SET
    total_requests = api_endpoint_stats.total_requests + 1,
    successful_requests = api_endpoint_stats.successful_requests + 
      CASE WHEN p_status_code < 400 THEN 1 ELSE 0 END,
    failed_requests = api_endpoint_stats.failed_requests + 
      CASE WHEN p_status_code >= 400 THEN 1 ELSE 0 END,
    avg_response_time_ms = (
      api_endpoint_stats.avg_response_time_ms * api_endpoint_stats.total_requests + p_response_time_ms
    ) / (api_endpoint_stats.total_requests + 1),
    total_request_bytes = api_endpoint_stats.total_request_bytes + COALESCE(p_request_size, 0),
    total_response_bytes = api_endpoint_stats.total_response_bytes + COALESCE(p_response_size, 0),
    updated_at = NOW();

  RETURN v_log_id;
END;
$$;

-- =====================================================
-- Function: Get API Performance Summary
-- =====================================================
CREATE OR REPLACE FUNCTION get_api_performance_summary(
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  endpoint TEXT,
  total_requests BIGINT,
  success_rate NUMERIC,
  avg_response_ms NUMERIC,
  p95_response_ms INTEGER,
  error_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    arl.endpoint,
    COUNT(*)::BIGINT as total_requests,
    ROUND(COUNT(*) FILTER (WHERE arl.status_code < 400)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as success_rate,
    ROUND(AVG(arl.response_time_ms)::NUMERIC, 2) as avg_response_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY arl.response_time_ms)::INTEGER as p95_response_ms,
    COUNT(*) FILTER (WHERE arl.status_code >= 400)::BIGINT as error_count
  FROM api_request_log arl
  WHERE arl.request_time > NOW() - (p_hours || ' hours')::INTERVAL
  GROUP BY arl.endpoint
  ORDER BY total_requests DESC;
END;
$$;

-- =====================================================
-- Function: Get Slow Queries
-- =====================================================
CREATE OR REPLACE FUNCTION get_slow_queries(
  p_threshold_ms INTEGER DEFAULT 1000,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  query_hash TEXT,
  query_template TEXT,
  avg_time_ms NUMERIC,
  max_time_ms INTEGER,
  call_count BIGINT,
  table_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dql.query_hash,
    dql.query_template,
    ROUND(AVG(dql.execution_time_ms)::NUMERIC, 2) as avg_time_ms,
    MAX(dql.execution_time_ms) as max_time_ms,
    COUNT(*)::BIGINT as call_count,
    dql.table_name
  FROM db_query_log dql
  WHERE dql.execution_time_ms > p_threshold_ms
    AND dql.created_at > NOW() - INTERVAL '24 hours'
  GROUP BY dql.query_hash, dql.query_template, dql.table_name
  ORDER BY avg_time_ms DESC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- Function: Update Service Health
-- =====================================================
CREATE OR REPLACE FUNCTION update_service_health(
  p_service_name TEXT,
  p_status TEXT,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_endpoint_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO service_dependency_health (
    service_name, endpoint_url, status, response_time_ms, error_message,
    consecutive_failures, last_check_at
  ) VALUES (
    p_service_name, p_endpoint_url, p_status, p_response_time_ms, p_error_message,
    CASE WHEN p_status = 'down' THEN 1 ELSE 0 END,
    NOW()
  )
  ON CONFLICT (service_name) DO UPDATE SET
    status = p_status,
    response_time_ms = p_response_time_ms,
    error_message = p_error_message,
    endpoint_url = COALESCE(p_endpoint_url, service_dependency_health.endpoint_url),
    consecutive_failures = CASE 
      WHEN p_status = 'down' THEN service_dependency_health.consecutive_failures + 1
      ELSE 0
    END,
    last_check_at = NOW(),
    updated_at = NOW();
END;
$$;

-- =====================================================
-- Cleanup old logs (keep 7 days)
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_api_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM api_request_log
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  DELETE FROM db_query_log
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  RETURN v_deleted;
END;
$$;

-- Enable RLS
ALTER TABLE api_request_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_endpoint_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE db_query_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_dependency_health ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admin can view api_request_log" ON api_request_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can view api_endpoint_stats" ON api_endpoint_stats
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can view db_query_log" ON db_query_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can view service_dependency_health" ON service_dependency_health
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
