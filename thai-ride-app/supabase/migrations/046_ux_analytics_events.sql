-- Migration: 046_ux_analytics_events.sql
-- Feature: UX Analytics Real-time Tracking
-- Description: Create analytics_events table for UX tracking and Admin dashboard

-- Create analytics_events table if not exists
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_category TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  page_url TEXT,
  page_name TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON analytics_events(event_category);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_device ON analytics_events(device_type);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can insert their own events
CREATE POLICY "Users can insert own events" ON analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can read their own events
CREATE POLICY "Users can read own events" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id);

-- Admin can read all events (using service role or admin check)
CREATE POLICY "Admin can read all events" ON analytics_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Function to get UX metrics summary
CREATE OR REPLACE FUNCTION get_ux_metrics_summary(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  total_interactions BIGINT,
  unique_sessions BIGINT,
  unique_users BIGINT,
  avg_session_duration NUMERIC,
  bounce_rate NUMERIC,
  haptic_usage_percent NUMERIC,
  pull_refresh_usage_percent NUMERIC,
  swipe_nav_usage_percent NUMERIC,
  smart_suggestion_acceptance NUMERIC
) AS $$
DECLARE
  v_start_date TIMESTAMPTZ := NOW() - (p_days || ' days')::INTERVAL;
  v_total_sessions BIGINT;
BEGIN
  -- Get total sessions
  SELECT COUNT(DISTINCT session_id) INTO v_total_sessions
  FROM analytics_events
  WHERE created_at >= v_start_date;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_interactions,
    COUNT(DISTINCT ae.session_id)::BIGINT as unique_sessions,
    COUNT(DISTINCT ae.user_id)::BIGINT as unique_users,
    COALESCE(AVG(
      CASE WHEN ae.event_name = 'session_end' 
      THEN (ae.properties->>'durationMinutes')::NUMERIC 
      END
    ), 0)::NUMERIC as avg_session_duration,
    CASE WHEN v_total_sessions > 0 THEN
      (COUNT(DISTINCT CASE WHEN ae.event_name = 'session_end' 
        AND (ae.properties->>'pageViews')::INTEGER <= 1 
        THEN ae.session_id END)::NUMERIC / v_total_sessions * 100)
    ELSE 0 END as bounce_rate,
    CASE WHEN v_total_sessions > 0 THEN
      (COUNT(DISTINCT CASE WHEN ae.event_name = 'haptic_feedback_triggered' 
        THEN ae.session_id END)::NUMERIC / v_total_sessions * 100)
    ELSE 0 END as haptic_usage_percent,
    CASE WHEN v_total_sessions > 0 THEN
      (COUNT(DISTINCT CASE WHEN ae.event_name = 'pull_to_refresh' 
        THEN ae.session_id END)::NUMERIC / v_total_sessions * 100)
    ELSE 0 END as pull_refresh_usage_percent,
    CASE WHEN v_total_sessions > 0 THEN
      (COUNT(DISTINCT CASE WHEN ae.event_name = 'swipe_navigation' 
        THEN ae.session_id END)::NUMERIC / v_total_sessions * 100)
    ELSE 0 END as swipe_nav_usage_percent,
    CASE WHEN COUNT(CASE WHEN ae.event_name = 'smart_suggestion_shown' THEN 1 END) > 0 THEN
      (COUNT(CASE WHEN ae.event_name = 'smart_suggestion_clicked' THEN 1 END)::NUMERIC /
       COUNT(CASE WHEN ae.event_name = 'smart_suggestion_shown' THEN 1 END) * 100)
    ELSE 0 END as smart_suggestion_acceptance
  FROM analytics_events ae
  WHERE ae.created_at >= v_start_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top interactions
CREATE OR REPLACE FUNCTION get_top_ux_interactions(p_days INTEGER DEFAULT 7, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  event_name TEXT,
  event_count BIGINT,
  unique_users BIGINT,
  trend_percent NUMERIC
) AS $$
DECLARE
  v_start_date TIMESTAMPTZ := NOW() - (p_days || ' days')::INTERVAL;
  v_prev_start_date TIMESTAMPTZ := NOW() - (p_days * 2 || ' days')::INTERVAL;
BEGIN
  RETURN QUERY
  WITH current_period AS (
    SELECT 
      ae.event_name,
      COUNT(*) as cnt,
      COUNT(DISTINCT ae.user_id) as users
    FROM analytics_events ae
    WHERE ae.created_at >= v_start_date
      AND ae.event_category = 'interaction'
    GROUP BY ae.event_name
  ),
  previous_period AS (
    SELECT 
      ae.event_name,
      COUNT(*) as cnt
    FROM analytics_events ae
    WHERE ae.created_at >= v_prev_start_date
      AND ae.created_at < v_start_date
      AND ae.event_category = 'interaction'
    GROUP BY ae.event_name
  )
  SELECT 
    cp.event_name,
    cp.cnt as event_count,
    cp.users as unique_users,
    CASE WHEN COALESCE(pp.cnt, 0) > 0 THEN
      ROUND(((cp.cnt - COALESCE(pp.cnt, 0))::NUMERIC / pp.cnt * 100), 1)
    ELSE 0 END as trend_percent
  FROM current_period cp
  LEFT JOIN previous_period pp ON cp.event_name = pp.event_name
  ORDER BY cp.cnt DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get device breakdown
CREATE OR REPLACE FUNCTION get_ux_device_breakdown(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  device_type TEXT,
  interaction_count BIGINT,
  percentage NUMERIC
) AS $$
DECLARE
  v_start_date TIMESTAMPTZ := NOW() - (p_days || ' days')::INTERVAL;
  v_total BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM analytics_events
  WHERE created_at >= v_start_date;

  RETURN QUERY
  SELECT 
    COALESCE(ae.device_type, 'Unknown') as device_type,
    COUNT(*) as interaction_count,
    CASE WHEN v_total > 0 THEN
      ROUND((COUNT(*)::NUMERIC / v_total * 100), 1)
    ELSE 0 END as percentage
  FROM analytics_events ae
  WHERE ae.created_at >= v_start_date
  GROUP BY ae.device_type
  ORDER BY interaction_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get feature usage stats
CREATE OR REPLACE FUNCTION get_ux_feature_usage(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  feature_name TEXT,
  enabled_percent NUMERIC,
  disabled_percent NUMERIC,
  total_usage BIGINT
) AS $$
DECLARE
  v_start_date TIMESTAMPTZ := NOW() - (p_days || ' days')::INTERVAL;
BEGIN
  RETURN QUERY
  WITH feature_events AS (
    SELECT 
      ae.properties->>'featureName' as feature,
      ae.event_name,
      COUNT(*) as cnt
    FROM analytics_events ae
    WHERE ae.created_at >= v_start_date
      AND ae.event_name IN ('feature_enabled', 'feature_disabled')
    GROUP BY ae.properties->>'featureName', ae.event_name
  ),
  feature_totals AS (
    SELECT 
      feature,
      SUM(cnt) as total,
      SUM(CASE WHEN event_name = 'feature_enabled' THEN cnt ELSE 0 END) as enabled,
      SUM(CASE WHEN event_name = 'feature_disabled' THEN cnt ELSE 0 END) as disabled
    FROM feature_events
    GROUP BY feature
  )
  SELECT 
    ft.feature as feature_name,
    CASE WHEN ft.total > 0 THEN ROUND((ft.enabled::NUMERIC / ft.total * 100), 1) ELSE 100 END as enabled_percent,
    CASE WHEN ft.total > 0 THEN ROUND((ft.disabled::NUMERIC / ft.total * 100), 1) ELSE 0 END as disabled_percent,
    ft.total as total_usage
  FROM feature_totals ft
  ORDER BY ft.total DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_ux_metrics_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_ux_interactions TO authenticated;
GRANT EXECUTE ON FUNCTION get_ux_device_breakdown TO authenticated;
GRANT EXECUTE ON FUNCTION get_ux_feature_usage TO authenticated;

-- Add comment
COMMENT ON TABLE analytics_events IS 'UX Analytics events for tracking user interactions - Feature: UX Tracking';
