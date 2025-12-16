-- Migration: 011_scheduled_notifications.sql
-- Feature: F07 - Scheduled Notifications & User Segmentation
-- Tables: scheduled_notifications

-- =====================================================
-- SCHEDULED NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  action_url TEXT,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'Asia/Bangkok',
  
  -- User Segmentation
  segment TEXT NOT NULL DEFAULT 'all', -- all, new_users, inactive, subscribers, custom
  segment_config JSONB DEFAULT '{}',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, sent, cancelled, failed
  sent_at TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  error_message TEXT,
  
  -- Template variables (stored for reference)
  template_variables JSONB DEFAULT '{}',
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding pending scheduled notifications
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_pending 
ON scheduled_notifications(scheduled_at, status) 
WHERE status = 'scheduled';

-- =====================================================
-- FUNCTION: Get users by segment
-- =====================================================

CREATE OR REPLACE FUNCTION get_users_by_segment(
  p_segment TEXT,
  p_config JSONB DEFAULT '{}'
)
RETURNS TABLE(user_id UUID) AS $$
BEGIN
  CASE p_segment
    WHEN 'all' THEN
      RETURN QUERY SELECT id FROM users WHERE is_active = true;
      
    WHEN 'new_users' THEN
      RETURN QUERY 
        SELECT id FROM users 
        WHERE is_active = true 
        AND created_at >= NOW() - INTERVAL '1 day' * COALESCE((p_config->>'registered_within_days')::int, 30);
      
    WHEN 'inactive' THEN
      RETURN QUERY 
        SELECT u.id FROM users u
        WHERE u.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM ride_requests r 
          WHERE r.user_id = u.id 
          AND r.created_at >= NOW() - INTERVAL '1 day' * COALESCE((p_config->>'inactive_days')::int, 7)
        )
        AND NOT EXISTS (
          SELECT 1 FROM delivery_requests d 
          WHERE d.user_id = u.id 
          AND d.created_at >= NOW() - INTERVAL '1 day' * COALESCE((p_config->>'inactive_days')::int, 7)
        )
        AND NOT EXISTS (
          SELECT 1 FROM shopping_requests s 
          WHERE s.user_id = u.id 
          AND s.created_at >= NOW() - INTERVAL '1 day' * COALESCE((p_config->>'inactive_days')::int, 7)
        );
      
    WHEN 'subscribers' THEN
      RETURN QUERY 
        SELECT DISTINCT us.user_id FROM user_subscriptions us
        WHERE us.status = 'active'
        AND us.end_date > NOW();
      
    WHEN 'non_subscribers' THEN
      RETURN QUERY 
        SELECT u.id FROM users u
        WHERE u.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM user_subscriptions us 
          WHERE us.user_id = u.id 
          AND us.status = 'active'
          AND us.end_date > NOW()
        );
      
    WHEN 'high_value' THEN
      RETURN QUERY 
        SELECT u.id FROM users u
        WHERE u.is_active = true
        AND (
          SELECT COUNT(*) FROM ride_requests r 
          WHERE r.user_id = u.id AND r.status = 'completed'
        ) >= COALESCE((p_config->>'min_rides')::int, 10);
      
    WHEN 'custom' THEN
      RETURN QUERY 
        SELECT (jsonb_array_elements_text(p_config->'user_ids'))::UUID;
      
    ELSE
      RETURN QUERY SELECT id FROM users WHERE is_active = true;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Process scheduled notification
-- =====================================================

CREATE OR REPLACE FUNCTION process_scheduled_notification(p_notification_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_notification RECORD;
  v_user_id UUID;
  v_sent_count INTEGER := 0;
BEGIN
  SELECT * INTO v_notification 
  FROM scheduled_notifications 
  WHERE id = p_notification_id AND status = 'scheduled';
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  FOR v_user_id IN 
    SELECT user_id FROM get_users_by_segment(v_notification.segment, v_notification.segment_config)
  LOOP
    INSERT INTO user_notifications (user_id, type, title, message, action_url, is_read)
    VALUES (v_user_id, v_notification.type, v_notification.title, v_notification.message, v_notification.action_url, false);
    v_sent_count := v_sent_count + 1;
  END LOOP;
  
  UPDATE scheduled_notifications 
  SET status = 'sent', sent_at = NOW(), sent_count = v_sent_count, updated_at = NOW()
  WHERE id = p_notification_id;
  
  RETURN v_sent_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Get segment user count (for preview)
-- =====================================================

CREATE OR REPLACE FUNCTION get_segment_user_count(
  p_segment TEXT,
  p_config JSONB DEFAULT '{}'
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM get_users_by_segment(p_segment, p_config));
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage scheduled notifications" ON scheduled_notifications;
CREATE POLICY "Admin can manage scheduled notifications"
ON scheduled_notifications FOR ALL
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
