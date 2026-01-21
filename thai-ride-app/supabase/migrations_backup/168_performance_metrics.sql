-- Migration: Performance Metrics Tracking
-- Feature: F252 - Advanced Performance Monitoring
-- Description: Track Core Web Vitals and custom performance metrics

-- Create performance_metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  rating TEXT CHECK (rating IN ('good', 'needs-improvement', 'poor')),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  device_type TEXT,
  connection_type TEXT,
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_performance_metrics_created_at ON performance_metrics(created_at DESC);
CREATE INDEX idx_performance_metrics_metric_name ON performance_metrics(metric_name);
CREATE INDEX idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX idx_performance_metrics_rating ON performance_metrics(rating);

-- RLS Policies
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Users can insert their own metrics
CREATE POLICY "users_insert_own_metrics" ON performance_metrics
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Admin can view all metrics
CREATE POLICY "admin_view_all_metrics" ON performance_metrics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Function to get performance summary
CREATE OR REPLACE FUNCTION get_performance_summary(
  time_range INTERVAL DEFAULT '24 hours'
)
RETURNS TABLE (
  metric_name TEXT,
  avg_value NUMERIC,
  p50_value NUMERIC,
  p95_value NUMERIC,
  p99_value NUMERIC,
  good_count BIGINT,
  needs_improvement_count BIGINT,
  poor_count BIGINT,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.metric_name,
    AVG(pm.metric_value)::NUMERIC AS avg_value,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pm.metric_value)::NUMERIC AS p50_value,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY pm.metric_value)::NUMERIC AS p95_value,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY pm.metric_value)::NUMERIC AS p99_value,
    COUNT(*) FILTER (WHERE pm.rating = 'good') AS good_count,
    COUNT(*) FILTER (WHERE pm.rating = 'needs-improvement') AS needs_improvement_count,
    COUNT(*) FILTER (WHERE pm.rating = 'poor') AS poor_count,
    COUNT(*) AS total_count
  FROM performance_metrics pm
  WHERE pm.created_at >= NOW() - time_range
  GROUP BY pm.metric_name
  ORDER BY pm.metric_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get performance trends
CREATE OR REPLACE FUNCTION get_performance_trends(
  metric_name_param TEXT,
  time_range INTERVAL DEFAULT '7 days',
  bucket_size INTERVAL DEFAULT '1 hour'
)
RETURNS TABLE (
  time_bucket TIMESTAMPTZ,
  avg_value NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  sample_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('hour', pm.created_at) AS time_bucket,
    AVG(pm.metric_value)::NUMERIC AS avg_value,
    MIN(pm.metric_value)::NUMERIC AS min_value,
    MAX(pm.metric_value)::NUMERIC AS max_value,
    COUNT(*) AS sample_count
  FROM performance_metrics pm
  WHERE pm.metric_name = metric_name_param
    AND pm.created_at >= NOW() - time_range
  GROUP BY time_bucket
  ORDER BY time_bucket DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_performance_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_trends TO authenticated;

-- Comment
COMMENT ON TABLE performance_metrics IS 'Tracks Core Web Vitals and custom performance metrics for monitoring app performance';
