-- Migration: System Logs for Admin Monitoring
-- Feature: Realtime Logging System - Admin Dashboard
-- Description: Centralized log storage and monitoring for Admin

-- =====================================================
-- 1. CREATE SYSTEM_LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'success')),
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  stack TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  page TEXT,
  session_id TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_category ON system_logs(category);
CREATE INDEX idx_system_logs_session_id ON system_logs(session_id);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_system_logs_level_timestamp ON system_logs(level, timestamp DESC);
CREATE INDEX idx_system_logs_user_timestamp ON system_logs(user_id, timestamp DESC);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE system_logs;

-- =====================================================
-- 2. RLS POLICIES
-- =====================================================

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Users can insert their own logs
CREATE POLICY "users_insert_own_logs" ON system_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can read their own logs
CREATE POLICY "users_read_own_logs" ON system_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admin can read all logs
CREATE POLICY "admin_read_all_logs" ON system_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admin can delete old logs
CREATE POLICY "admin_delete_logs" ON system_logs
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- 3. FUNCTIONS
-- =====================================================

-- Function: Save log entry
CREATE OR REPLACE FUNCTION save_log_entry(
  p_level TEXT,
  p_category TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT NULL,
  p_stack TEXT DEFAULT NULL,
  p_page TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Insert log entry
  INSERT INTO system_logs (
    level,
    category,
    message,
    data,
    stack,
    user_id,
    page,
    session_id,
    user_agent,
    ip_address
  ) VALUES (
    p_level,
    p_category,
    p_message,
    p_data,
    p_stack,
    v_user_id,
    p_page,
    p_session_id,
    p_user_agent,
    p_ip_address::INET
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Function: Get logs with filters (Admin only)
CREATE OR REPLACE FUNCTION admin_get_logs(
  p_level TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_page TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  timestamp TIMESTAMPTZ,
  level TEXT,
  category TEXT,
  message TEXT,
  data JSONB,
  stack TEXT,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  page TEXT,
  session_id TEXT,
  user_agent TEXT,
  ip_address INET
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT 
    sl.id,
    sl.timestamp,
    sl.level,
    sl.category,
    sl.message,
    sl.data,
    sl.stack,
    sl.user_id,
    u.email AS user_email,
    CONCAT(u.first_name, ' ', u.last_name) AS user_name,
    sl.page,
    sl.session_id,
    sl.user_agent,
    sl.ip_address
  FROM system_logs sl
  LEFT JOIN users u ON sl.user_id = u.id
  WHERE
    (p_level IS NULL OR sl.level = p_level)
    AND (p_category IS NULL OR sl.category = p_category)
    AND (p_user_id IS NULL OR sl.user_id = p_user_id)
    AND (p_page IS NULL OR sl.page ILIKE '%' || p_page || '%')
    AND (p_search IS NULL OR sl.message ILIKE '%' || p_search || '%')
    AND (p_start_date IS NULL OR sl.timestamp >= p_start_date)
    AND (p_end_date IS NULL OR sl.timestamp <= p_end_date)
  ORDER BY sl.timestamp DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function: Get log statistics (Admin only)
CREATE OR REPLACE FUNCTION admin_get_log_stats(
  p_hours INT DEFAULT 24
)
RETURNS TABLE (
  total_logs BIGINT,
  error_count BIGINT,
  warn_count BIGINT,
  info_count BIGINT,
  debug_count BIGINT,
  success_count BIGINT,
  unique_users BIGINT,
  unique_sessions BIGINT,
  top_category TEXT,
  top_page TEXT,
  error_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  v_start_time := NOW() - (p_hours || ' hours')::INTERVAL;
  
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_logs,
    COUNT(*) FILTER (WHERE level = 'error')::BIGINT AS error_count,
    COUNT(*) FILTER (WHERE level = 'warn')::BIGINT AS warn_count,
    COUNT(*) FILTER (WHERE level = 'info')::BIGINT AS info_count,
    COUNT(*) FILTER (WHERE level = 'debug')::BIGINT AS debug_count,
    COUNT(*) FILTER (WHERE level = 'success')::BIGINT AS success_count,
    COUNT(DISTINCT user_id)::BIGINT AS unique_users,
    COUNT(DISTINCT session_id)::BIGINT AS unique_sessions,
    (
      SELECT category
      FROM system_logs
      WHERE timestamp >= v_start_time
      GROUP BY category
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) AS top_category,
    (
      SELECT page
      FROM system_logs
      WHERE timestamp >= v_start_time AND page IS NOT NULL
      GROUP BY page
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) AS top_page,
    CASE 
      WHEN COUNT(*) > 0 THEN
        ROUND((COUNT(*) FILTER (WHERE level = 'error')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0
    END AS error_rate
  FROM system_logs
  WHERE timestamp >= v_start_time;
END;
$$;

-- Function: Get error trends (Admin only)
CREATE OR REPLACE FUNCTION admin_get_error_trends(
  p_hours INT DEFAULT 24
)
RETURNS TABLE (
  hour_bucket TIMESTAMPTZ,
  error_count BIGINT,
  warn_count BIGINT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  v_start_time := NOW() - (p_hours || ' hours')::INTERVAL;
  
  RETURN QUERY
  SELECT
    date_trunc('hour', timestamp) AS hour_bucket,
    COUNT(*) FILTER (WHERE level = 'error')::BIGINT AS error_count,
    COUNT(*) FILTER (WHERE level = 'warn')::BIGINT AS warn_count,
    COUNT(*)::BIGINT AS total_count
  FROM system_logs
  WHERE timestamp >= v_start_time
  GROUP BY date_trunc('hour', timestamp)
  ORDER BY hour_bucket DESC;
END;
$$;

-- Function: Get most common errors (Admin only)
CREATE OR REPLACE FUNCTION admin_get_common_errors(
  p_hours INT DEFAULT 24,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  message TEXT,
  category TEXT,
  count BIGINT,
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  affected_users BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  v_start_time := NOW() - (p_hours || ' hours')::INTERVAL;
  
  RETURN QUERY
  SELECT
    sl.message,
    sl.category,
    COUNT(*)::BIGINT AS count,
    MIN(sl.timestamp) AS first_seen,
    MAX(sl.timestamp) AS last_seen,
    COUNT(DISTINCT sl.user_id)::BIGINT AS affected_users
  FROM system_logs sl
  WHERE 
    sl.timestamp >= v_start_time
    AND sl.level = 'error'
  GROUP BY sl.message, sl.category
  ORDER BY count DESC
  LIMIT p_limit;
END;
$$;

-- Function: Clean old logs (Admin only)
CREATE OR REPLACE FUNCTION admin_clean_old_logs(
  p_days INT DEFAULT 30
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count BIGINT;
  v_cutoff_date TIMESTAMPTZ;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  v_cutoff_date := NOW() - (p_days || ' days')::INTERVAL;
  
  DELETE FROM system_logs
  WHERE timestamp < v_cutoff_date;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- =====================================================
-- 4. COMMENTS
-- =====================================================

COMMENT ON TABLE system_logs IS 'Centralized system logs for debugging and monitoring';
COMMENT ON FUNCTION save_log_entry IS 'Save a log entry to the database';
COMMENT ON FUNCTION admin_get_logs IS 'Get logs with filters (Admin only)';
COMMENT ON FUNCTION admin_get_log_stats IS 'Get log statistics (Admin only)';
COMMENT ON FUNCTION admin_get_error_trends IS 'Get error trends over time (Admin only)';
COMMENT ON FUNCTION admin_get_common_errors IS 'Get most common errors (Admin only)';
COMMENT ON FUNCTION admin_clean_old_logs IS 'Clean logs older than specified days (Admin only)';
