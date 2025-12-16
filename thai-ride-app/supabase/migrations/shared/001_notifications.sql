-- =============================================
-- SHARED MODULE: Notifications
-- =============================================
-- Feature: F07 - Notifications & Push
-- Used by: Customer, Provider, Admin
-- Depends on: core/001_users_auth.sql
-- =============================================

-- User notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('promo', 'ride', 'delivery', 'shopping', 'payment', 'system', 'sos', 'referral', 'subscription', 'rating')),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  is_push_sent BOOLEAN DEFAULT false,
  action_url VARCHAR(255),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_info JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Push notification queue
CREATE TABLE IF NOT EXISTS push_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES user_notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  title_template VARCHAR(200) NOT NULL,
  message_template TEXT NOT NULL,
  variables JSONB,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for dev)
CREATE POLICY "Allow all user_notifications" ON user_notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all push_subscriptions" ON push_subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all push_notification_queue" ON push_notification_queue FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all notification_templates" ON notification_templates FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON user_notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON user_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_queue_status ON push_notification_queue(status);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;

-- Send notification function
CREATE OR REPLACE FUNCTION send_notification(
  p_user_id UUID,
  p_type VARCHAR(50),
  p_title VARCHAR(200),
  p_message TEXT,
  p_data JSONB DEFAULT NULL,
  p_action_url VARCHAR(255) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO user_notifications (user_id, type, title, message, data, action_url)
  VALUES (p_user_id, p_type, p_title, p_message, p_data, p_action_url)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Save push subscription
CREATE OR REPLACE FUNCTION save_push_subscription(
  p_user_id UUID,
  p_endpoint TEXT,
  p_p256dh TEXT,
  p_auth TEXT,
  p_device_info JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_subscription_id UUID;
BEGIN
  INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, device_info)
  VALUES (p_user_id, p_endpoint, p_p256dh, p_auth, p_device_info)
  ON CONFLICT (user_id, endpoint) 
  DO UPDATE SET 
    p256dh = p_p256dh,
    auth = p_auth,
    device_info = p_device_info,
    is_active = true,
    updated_at = NOW()
  RETURNING id INTO v_subscription_id;
  
  RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql;

-- Queue push notification
CREATE OR REPLACE FUNCTION queue_push_notification(p_notification_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_queue_id UUID;
BEGIN
  INSERT INTO push_notification_queue (notification_id, user_id)
  VALUES (p_notification_id, p_user_id)
  RETURNING id INTO v_queue_id;
  
  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Auto-queue push notification on insert
CREATE OR REPLACE FUNCTION auto_queue_push_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM push_subscriptions WHERE user_id = NEW.user_id AND is_active = true) THEN
    PERFORM queue_push_notification(NEW.id, NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_queue_push ON user_notifications;
CREATE TRIGGER trigger_auto_queue_push
  AFTER INSERT ON user_notifications
  FOR EACH ROW EXECUTE FUNCTION auto_queue_push_notification();
