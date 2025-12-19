-- Migration: 062_notification_system_v2.sql
-- Feature: F07 - Enhanced Notification System
-- Description: Rich notifications, channels, preferences, and delivery tracking

-- =====================================================
-- 1. Notification Channels
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  display_name_th TEXT,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('push', 'sms', 'email', 'in_app', 'line')),
  provider TEXT,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default channels
INSERT INTO notification_channels (name, display_name, display_name_th, channel_type, priority) VALUES
('in_app', 'In-App', 'ในแอป', 'in_app', 1),
('push', 'Push Notification', 'การแจ้งเตือน Push', 'push', 2),
('sms', 'SMS', 'ข้อความ SMS', 'sms', 3),
('email', 'Email', 'อีเมล', 'email', 4),
('line', 'LINE', 'LINE', 'line', 5)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 2. Notification Categories
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key TEXT NOT NULL UNIQUE,
  category_name TEXT NOT NULL,
  category_name_th TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  default_channels TEXT[] DEFAULT ARRAY['in_app', 'push'],
  is_critical BOOLEAN DEFAULT FALSE, -- Cannot be disabled
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- Insert default categories
INSERT INTO notification_categories (category_key, category_name, category_name_th, default_channels, is_critical, sort_order) VALUES
('ride_updates', 'Ride Updates', 'อัพเดทการเดินทาง', ARRAY['in_app', 'push'], true, 1),
('delivery_updates', 'Delivery Updates', 'อัพเดทการส่งของ', ARRAY['in_app', 'push'], true, 2),
('payment', 'Payment', 'การชำระเงิน', ARRAY['in_app', 'push', 'email'], true, 3),
('promotions', 'Promotions', 'โปรโมชั่น', ARRAY['in_app', 'push'], false, 4),
('safety', 'Safety Alerts', 'แจ้งเตือนความปลอดภัย', ARRAY['in_app', 'push', 'sms'], true, 5),
('account', 'Account', 'บัญชี', ARRAY['in_app', 'email'], false, 6),
('rewards', 'Rewards & Points', 'รางวัลและแต้ม', ARRAY['in_app', 'push'], false, 7),
('system', 'System', 'ระบบ', ARRAY['in_app'], false, 8)
ON CONFLICT (category_key) DO NOTHING;

-- =====================================================
-- 3. User Notification Preferences
-- =====================================================
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_key TEXT NOT NULL,
  channels TEXT[] DEFAULT ARRAY['in_app', 'push'],
  is_enabled BOOLEAN DEFAULT TRUE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category_key)
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON user_notification_preferences(user_id);

-- =====================================================
-- 4. Enhanced Notifications Table
-- =====================================================
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS category_key TEXT;
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS actions JSONB DEFAULT '[]';
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS delivered_channels TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS delivery_status JSONB DEFAULT '{}';

-- =====================================================
-- 5. Notification Delivery Log
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES user_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  channel TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'clicked')),
  provider_response JSONB DEFAULT '{}',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_log_notification ON notification_delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_delivery_log_user ON notification_delivery_log(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_log_status ON notification_delivery_log(status);

-- =====================================================
-- 6. Notification Analytics
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  category_key TEXT NOT NULL,
  channel TEXT NOT NULL,
  
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  delivery_rate NUMERIC(5,4),
  click_rate NUMERIC(5,4),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, category_key, channel)
);

-- =====================================================
-- 7. Enable RLS
-- =====================================================
ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone read channels" ON notification_channels FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Anyone read categories" ON notification_categories FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Users manage own preferences" ON user_notification_preferences
  FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users read own delivery_log" ON notification_delivery_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admin read all delivery_log" ON notification_delivery_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin read analytics" ON notification_analytics
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 8. Functions
-- =====================================================

-- Get user notification preferences
CREATE OR REPLACE FUNCTION get_user_notification_preferences(p_user_id UUID)
RETURNS TABLE (
  category_key TEXT,
  category_name TEXT,
  category_name_th TEXT,
  is_critical BOOLEAN,
  channels TEXT[],
  is_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nc.category_key,
    nc.category_name,
    nc.category_name_th,
    nc.is_critical,
    COALESCE(unp.channels, nc.default_channels) as channels,
    COALESCE(unp.is_enabled, true) as is_enabled
  FROM notification_categories nc
  LEFT JOIN user_notification_preferences unp 
    ON nc.category_key = unp.category_key AND unp.user_id = p_user_id
  WHERE nc.is_active = true
  ORDER BY nc.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update user notification preference
CREATE OR REPLACE FUNCTION update_notification_preference(
  p_user_id UUID,
  p_category_key TEXT,
  p_channels TEXT[] DEFAULT NULL,
  p_is_enabled BOOLEAN DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_critical BOOLEAN;
BEGIN
  -- Check if category is critical
  SELECT is_critical INTO v_is_critical FROM notification_categories WHERE category_key = p_category_key;
  
  -- Cannot disable critical categories
  IF v_is_critical AND p_is_enabled = false THEN
    RAISE EXCEPTION 'Cannot disable critical notification category';
  END IF;
  
  INSERT INTO user_notification_preferences (user_id, category_key, channels, is_enabled)
  VALUES (p_user_id, p_category_key, COALESCE(p_channels, ARRAY['in_app', 'push']), COALESCE(p_is_enabled, true))
  ON CONFLICT (user_id, category_key) DO UPDATE SET
    channels = COALESCE(p_channels, user_notification_preferences.channels),
    is_enabled = COALESCE(p_is_enabled, user_notification_preferences.is_enabled),
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Send notification with channel routing
CREATE OR REPLACE FUNCTION send_notification_v2(
  p_user_id UUID,
  p_category_key TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}',
  p_priority TEXT DEFAULT 'normal',
  p_image_url TEXT DEFAULT NULL,
  p_actions JSONB DEFAULT '[]',
  p_action_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_channels TEXT[];
  v_is_enabled BOOLEAN;
  v_channel TEXT;
BEGIN
  -- Get user preferences for this category
  SELECT channels, is_enabled INTO v_channels, v_is_enabled
  FROM user_notification_preferences
  WHERE user_id = p_user_id AND category_key = p_category_key;
  
  -- Use defaults if no preference
  IF v_channels IS NULL THEN
    SELECT default_channels INTO v_channels FROM notification_categories WHERE category_key = p_category_key;
  END IF;
  
  -- Check if enabled (default true)
  IF v_is_enabled = false THEN
    RETURN NULL;
  END IF;
  
  -- Create notification
  INSERT INTO user_notifications (
    user_id, type, title, message, data, action_url,
    category_key, priority, image_url, actions
  ) VALUES (
    p_user_id, p_category_key, p_title, p_message, p_data, p_action_url,
    p_category_key, p_priority, p_image_url, p_actions
  )
  RETURNING id INTO v_notification_id;
  
  -- Create delivery log entries for each channel
  FOREACH v_channel IN ARRAY v_channels
  LOOP
    INSERT INTO notification_delivery_log (notification_id, user_id, channel, status)
    VALUES (v_notification_id, p_user_id, v_channel, 'pending');
    
    -- Queue for push if applicable
    IF v_channel = 'push' THEN
      INSERT INTO push_notification_queue (user_id, title, body, data)
      VALUES (p_user_id, p_title, p_message, p_data || jsonb_build_object('notification_id', v_notification_id));
    END IF;
  END LOOP;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark notification as delivered
CREATE OR REPLACE FUNCTION mark_notification_delivered(
  p_notification_id UUID,
  p_channel TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE notification_delivery_log
  SET status = 'delivered', delivered_at = NOW()
  WHERE notification_id = p_notification_id AND channel = p_channel;
  
  UPDATE user_notifications
  SET delivered_channels = array_append(delivered_channels, p_channel)
  WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark notification as clicked
CREATE OR REPLACE FUNCTION mark_notification_clicked(
  p_notification_id UUID,
  p_channel TEXT DEFAULT 'in_app'
) RETURNS VOID AS $$
BEGIN
  UPDATE notification_delivery_log
  SET status = 'clicked', clicked_at = NOW()
  WHERE notification_id = p_notification_id AND channel = p_channel;
  
  UPDATE user_notifications
  SET is_read = true
  WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get notification stats for admin
CREATE OR REPLACE FUNCTION get_notification_stats(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  category_key TEXT,
  total_sent BIGINT,
  total_delivered BIGINT,
  total_clicked BIGINT,
  delivery_rate NUMERIC,
  click_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ndl.channel as category_key,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE ndl.status IN ('delivered', 'clicked')) as total_delivered,
    COUNT(*) FILTER (WHERE ndl.status = 'clicked') as total_clicked,
    (COUNT(*) FILTER (WHERE ndl.status IN ('delivered', 'clicked'))::NUMERIC / NULLIF(COUNT(*), 0) * 100)::NUMERIC(5,2) as delivery_rate,
    (COUNT(*) FILTER (WHERE ndl.status = 'clicked')::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE ndl.status IN ('delivered', 'clicked')), 0) * 100)::NUMERIC(5,2) as click_rate
  FROM notification_delivery_log ndl
  WHERE ndl.created_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY ndl.channel;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update notification analytics (daily job)
CREATE OR REPLACE FUNCTION update_notification_analytics()
RETURNS VOID AS $$
BEGIN
  INSERT INTO notification_analytics (
    date, category_key, channel,
    sent_count, delivered_count, clicked_count, failed_count,
    delivery_rate, click_rate
  )
  SELECT 
    DATE(created_at) as date,
    COALESCE(un.category_key, 'system') as category_key,
    ndl.channel,
    COUNT(*) as sent_count,
    COUNT(*) FILTER (WHERE ndl.status IN ('delivered', 'clicked')) as delivered_count,
    COUNT(*) FILTER (WHERE ndl.status = 'clicked') as clicked_count,
    COUNT(*) FILTER (WHERE ndl.status = 'failed') as failed_count,
    CASE WHEN COUNT(*) > 0 
      THEN COUNT(*) FILTER (WHERE ndl.status IN ('delivered', 'clicked'))::NUMERIC / COUNT(*)
      ELSE 0 
    END as delivery_rate,
    CASE WHEN COUNT(*) FILTER (WHERE ndl.status IN ('delivered', 'clicked')) > 0
      THEN COUNT(*) FILTER (WHERE ndl.status = 'clicked')::NUMERIC / COUNT(*) FILTER (WHERE ndl.status IN ('delivered', 'clicked'))
      ELSE 0
    END as click_rate
  FROM notification_delivery_log ndl
  LEFT JOIN user_notifications un ON ndl.notification_id = un.id
  WHERE DATE(ndl.created_at) = CURRENT_DATE - 1
  GROUP BY DATE(ndl.created_at), un.category_key, ndl.channel
  ON CONFLICT (date, category_key, channel) DO UPDATE SET
    sent_count = EXCLUDED.sent_count,
    delivered_count = EXCLUDED.delivered_count,
    clicked_count = EXCLUDED.clicked_count,
    failed_count = EXCLUDED.failed_count,
    delivery_rate = EXCLUDED.delivery_rate,
    click_rate = EXCLUDED.click_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE notification_channels IS 'Available notification delivery channels';
COMMENT ON TABLE notification_categories IS 'Notification categories with default settings';
COMMENT ON TABLE user_notification_preferences IS 'User preferences for each notification category';
COMMENT ON TABLE notification_delivery_log IS 'Track delivery status for each notification';
COMMENT ON TABLE notification_analytics IS 'Daily notification analytics';
