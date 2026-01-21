-- Migration: 289_enhanced_push_notification_system.sql
-- Description: Enhanced Push Notification System with preferences and analytics
-- Role Impact:
--   - Provider: Can manage notification preferences
--   - Customer: No access
--   - Admin: Full access to analytics and logs

-- ============================================
-- 1. Notification Preferences Table
-- ============================================

-- Notification categories enum
DO $$ BEGIN
  CREATE TYPE notification_category AS ENUM (
    'new_job',
    'job_update', 
    'earnings',
    'promotions',
    'system_announcements'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers_v2(id) ON DELETE CASCADE,
  category notification_category NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, category)
);

-- Create indexes for notification_preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_provider 
  ON notification_preferences(provider_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_category 
  ON notification_preferences(category);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_enabled 
  ON notification_preferences(provider_id, category) WHERE enabled = true;

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_preferences

-- Provider: Can view own preferences
CREATE POLICY "provider_select_own_preferences" ON notification_preferences
  FOR SELECT TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers_v2 WHERE user_id = (SELECT auth.uid())
    )
  );

-- Provider: Can insert own preferences
CREATE POLICY "provider_insert_own_preferences" ON notification_preferences
  FOR INSERT TO authenticated
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers_v2 WHERE user_id = (SELECT auth.uid())
    )
  );

-- Provider: Can update own preferences
CREATE POLICY "provider_update_own_preferences" ON notification_preferences
  FOR UPDATE TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers_v2 WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers_v2 WHERE user_id = (SELECT auth.uid())
    )
  );

-- Provider: Can delete own preferences
CREATE POLICY "provider_delete_own_preferences" ON notification_preferences
  FOR DELETE TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers_v2 WHERE user_id = (SELECT auth.uid())
    )
  );

-- Admin: Can view all preferences (using 'users' table for production)
CREATE POLICY "admin_select_all_preferences" ON notification_preferences
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- ============================================
-- 2. Push Logs Table for Analytics
-- ============================================

-- Push log status enum
DO $$ BEGIN
  CREATE TYPE push_log_status AS ENUM (
    'pending',
    'sent',
    'delivered',
    'failed',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create push_logs table
CREATE TABLE IF NOT EXISTS push_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers_v2(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL, -- 'new_job', 'job_update', 'earnings', etc.
  title TEXT NOT NULL,
  body TEXT,
  status push_log_status DEFAULT 'pending',
  error_message TEXT,
  latency_ms INTEGER, -- Time from send to delivery confirmation
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for push_logs (optimized for analytics queries)
CREATE INDEX IF NOT EXISTS idx_push_logs_sent_at 
  ON push_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_logs_notification_type 
  ON push_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_push_logs_status 
  ON push_logs(status);
CREATE INDEX IF NOT EXISTS idx_push_logs_provider 
  ON push_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_push_logs_analytics 
  ON push_logs(sent_at DESC, notification_type, status);

-- Partial index for failed notifications (for debugging)
CREATE INDEX IF NOT EXISTS idx_push_logs_failed 
  ON push_logs(sent_at DESC) WHERE status = 'failed';

-- Enable RLS
ALTER TABLE push_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for push_logs (Admin-only access)

-- Admin: Can view all logs (using 'users' table for production)
CREATE POLICY "admin_select_push_logs" ON push_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- Admin: Can insert logs (for Edge Functions via service role)
CREATE POLICY "admin_insert_push_logs" ON push_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- Service role can always insert (for Edge Functions)
CREATE POLICY "service_role_insert_push_logs" ON push_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Service role can always select (for Edge Functions)
CREATE POLICY "service_role_select_push_logs" ON push_logs
  FOR SELECT TO service_role
  USING (true);

-- ============================================
-- 3. Helper Functions
-- ============================================

-- Function to initialize default preferences for a provider
CREATE OR REPLACE FUNCTION initialize_notification_preferences(p_provider_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default preferences for all categories (all enabled by default)
  INSERT INTO notification_preferences (provider_id, category, enabled)
  VALUES 
    (p_provider_id, 'new_job', true),
    (p_provider_id, 'job_update', true),
    (p_provider_id, 'earnings', true),
    (p_provider_id, 'promotions', true),
    (p_provider_id, 'system_announcements', true)
  ON CONFLICT (provider_id, category) DO NOTHING;
END;
$$;

-- Function to check if a notification category is enabled for a provider
CREATE OR REPLACE FUNCTION is_notification_enabled(
  p_provider_id UUID,
  p_category TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT enabled INTO v_enabled
  FROM notification_preferences
  WHERE provider_id = p_provider_id
    AND category = p_category::notification_category;
  
  -- Default to true if no preference exists
  RETURN COALESCE(v_enabled, true);
END;
$$;

-- Function to get push analytics summary
CREATE OR REPLACE FUNCTION get_push_analytics(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_sent BIGINT,
  total_delivered BIGINT,
  total_failed BIGINT,
  delivery_rate NUMERIC,
  avg_latency_ms NUMERIC,
  by_type JSONB,
  by_status JSONB,
  failure_reasons JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) FILTER (WHERE status IN ('sent', 'delivered')) as sent,
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      AVG(latency_ms) FILTER (WHERE latency_ms IS NOT NULL) as avg_latency
    FROM push_logs
    WHERE sent_at BETWEEN p_start_date AND p_end_date
  ),
  type_breakdown AS (
    SELECT jsonb_object_agg(notification_type, cnt) as data
    FROM (
      SELECT notification_type, COUNT(*) as cnt
      FROM push_logs
      WHERE sent_at BETWEEN p_start_date AND p_end_date
      GROUP BY notification_type
    ) t
  ),
  status_breakdown AS (
    SELECT jsonb_object_agg(status::text, cnt) as data
    FROM (
      SELECT status, COUNT(*) as cnt
      FROM push_logs
      WHERE sent_at BETWEEN p_start_date AND p_end_date
      GROUP BY status
    ) t
  ),
  failure_breakdown AS (
    SELECT jsonb_object_agg(COALESCE(error_message, 'unknown'), cnt) as data
    FROM (
      SELECT error_message, COUNT(*) as cnt
      FROM push_logs
      WHERE sent_at BETWEEN p_start_date AND p_end_date
        AND status = 'failed'
      GROUP BY error_message
      ORDER BY cnt DESC
      LIMIT 10
    ) t
  )
  SELECT
    s.sent,
    s.delivered,
    s.failed,
    CASE WHEN s.sent > 0 THEN ROUND((s.delivered::NUMERIC / s.sent) * 100, 2) ELSE 0 END,
    ROUND(s.avg_latency, 2),
    COALESCE(tb.data, '{}'::jsonb),
    COALESCE(sb.data, '{}'::jsonb),
    COALESCE(fb.data, '{}'::jsonb)
  FROM stats s
  CROSS JOIN type_breakdown tb
  CROSS JOIN status_breakdown sb
  CROSS JOIN failure_breakdown fb;
END;
$$;

-- Function to get push volume by time period
CREATE OR REPLACE FUNCTION get_push_volume_by_time(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW(),
  p_interval TEXT DEFAULT 'day' -- 'hour', 'day', 'week'
)
RETURNS TABLE (
  time_bucket TIMESTAMPTZ,
  total_count BIGINT,
  sent_count BIGINT,
  delivered_count BIGINT,
  failed_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc(p_interval, sent_at) as time_bucket,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status IN ('sent', 'delivered')) as sent_count,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count
  FROM push_logs
  WHERE sent_at BETWEEN p_start_date AND p_end_date
  GROUP BY date_trunc(p_interval, sent_at)
  ORDER BY time_bucket;
END;
$$;

-- ============================================
-- 4. Trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_notification_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notification_preferences_timestamp ON notification_preferences;
CREATE TRIGGER update_notification_preferences_timestamp
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_timestamp();

-- ============================================
-- 5. Cleanup Function for Old Logs
-- ============================================

-- Function to cleanup old push logs (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_push_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM push_logs
  WHERE sent_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE '[Push Logs] Cleaned up % old records', deleted_count;
  RETURN deleted_count;
END;
$$;

-- ============================================
-- 6. Comments
-- ============================================

COMMENT ON TABLE notification_preferences IS 'Provider notification preferences by category';
COMMENT ON TABLE push_logs IS 'Push notification delivery logs for analytics';
COMMENT ON FUNCTION initialize_notification_preferences(UUID) IS 'Initialize default notification preferences for a new provider';
COMMENT ON FUNCTION is_notification_enabled(UUID, TEXT) IS 'Check if a notification category is enabled for a provider';
COMMENT ON FUNCTION get_push_analytics(TIMESTAMPTZ, TIMESTAMPTZ) IS 'Get push notification analytics summary';
COMMENT ON FUNCTION get_push_volume_by_time(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) IS 'Get push notification volume aggregated by time';
COMMENT ON FUNCTION cleanup_old_push_logs() IS 'Cleanup push logs older than 30 days';

-- ============================================
-- 7. Grant Permissions
-- ============================================

GRANT EXECUTE ON FUNCTION initialize_notification_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_notification_enabled(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_push_analytics(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_push_volume_by_time(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_push_logs() TO service_role;
