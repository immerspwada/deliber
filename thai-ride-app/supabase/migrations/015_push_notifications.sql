-- Migration: 015_push_notifications.sql
-- Feature: F07 - Push Notifications with VAPID
-- Description: Add push subscription storage and VAPID configuration

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  device_type TEXT DEFAULT 'unknown', -- 'mobile', 'desktop', 'tablet'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Function to save push subscription
CREATE OR REPLACE FUNCTION save_push_subscription(
  p_user_id UUID,
  p_endpoint TEXT,
  p_p256dh TEXT,
  p_auth TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_device_type TEXT DEFAULT 'unknown'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription_id UUID;
BEGIN
  INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, device_type)
  VALUES (p_user_id, p_endpoint, p_p256dh, p_auth, p_user_agent, p_device_type)
  ON CONFLICT (user_id, endpoint) 
  DO UPDATE SET 
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth,
    user_agent = EXCLUDED.user_agent,
    device_type = EXCLUDED.device_type,
    is_active = true,
    updated_at = NOW(),
    last_used_at = NOW()
  RETURNING id INTO v_subscription_id;
  
  RETURN v_subscription_id;
END;
$$;

-- Function to remove push subscription
CREATE OR REPLACE FUNCTION remove_push_subscription(
  p_user_id UUID,
  p_endpoint TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE push_subscriptions
  SET is_active = false, updated_at = NOW()
  WHERE user_id = p_user_id AND endpoint = p_endpoint;
  
  RETURN FOUND;
END;
$$;

-- Function to get active subscriptions for a user
CREATE OR REPLACE FUNCTION get_user_push_subscriptions(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  endpoint TEXT,
  p256dh TEXT,
  auth TEXT,
  device_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.endpoint,
    ps.p256dh,
    ps.auth,
    ps.device_type
  FROM push_subscriptions ps
  WHERE ps.user_id = p_user_id AND ps.is_active = true;
END;
$$;

-- Push notification queue for batch sending
CREATE TABLE IF NOT EXISTS push_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  notification_id UUID REFERENCES user_notifications(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT DEFAULT '/pwa-192x192.png',
  badge TEXT DEFAULT '/pwa-192x192.png',
  tag TEXT,
  data JSONB DEFAULT '{}',
  url TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'expired'
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ DEFAULT NOW()
);

-- Index for queue processing
CREATE INDEX IF NOT EXISTS idx_push_queue_status ON push_notification_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_push_queue_scheduled ON push_notification_queue(scheduled_for) WHERE status = 'pending';

-- Function to queue push notification
CREATE OR REPLACE FUNCTION queue_push_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}',
  p_url TEXT DEFAULT NULL,
  p_tag TEXT DEFAULT NULL,
  p_notification_id UUID DEFAULT NULL,
  p_scheduled_for TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_queue_id UUID;
BEGIN
  INSERT INTO push_notification_queue (
    user_id, notification_id, title, body, data, url, tag, scheduled_for
  )
  VALUES (
    p_user_id, p_notification_id, p_title, p_body, p_data, p_url, p_tag, p_scheduled_for
  )
  RETURNING id INTO v_queue_id;
  
  RETURN v_queue_id;
END;
$$;

-- Trigger to auto-queue push notification when user_notification is created
CREATE OR REPLACE FUNCTION auto_queue_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only queue if user has active push subscriptions
  IF EXISTS (
    SELECT 1 FROM push_subscriptions 
    WHERE user_id = NEW.user_id AND is_active = true
  ) THEN
    PERFORM queue_push_notification(
      NEW.user_id,
      NEW.title,
      NEW.message,
      COALESCE(NEW.data, '{}')::JSONB,
      NEW.action_url,
      NEW.id::TEXT,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_queue_push
  AFTER INSERT ON user_notifications
  FOR EACH ROW
  EXECUTE FUNCTION auto_queue_push_notification();

-- Grant permissions
GRANT EXECUTE ON FUNCTION save_push_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION remove_push_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_push_subscriptions TO authenticated;
GRANT EXECUTE ON FUNCTION queue_push_notification TO authenticated;
