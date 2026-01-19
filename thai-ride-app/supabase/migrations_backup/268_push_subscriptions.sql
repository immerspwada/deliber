-- Migration: Push Subscriptions for Provider Notifications
-- Description: Stores Web Push API subscriptions for sending notifications to providers
-- Role Impact:
--   - Provider: Can receive push notifications even when app is closed
--   - Customer: No access
--   - Admin: Can view all subscriptions for monitoring

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers_v2(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL, -- Contains p256dh and auth keys
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(provider_id, endpoint)
);

-- Create indexes
CREATE INDEX idx_push_subscriptions_provider ON push_subscriptions(provider_id);
CREATE INDEX idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX idx_push_subscriptions_updated ON push_subscriptions(updated_at DESC);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Provider: Can manage own subscriptions
CREATE POLICY "provider_own_subscriptions" ON push_subscriptions
  FOR ALL
  USING (
    provider_id IN (
      SELECT id FROM providers_v2 WHERE user_id = auth.uid()
    )
  );

-- Admin: Can view all subscriptions
CREATE POLICY "admin_view_all_subscriptions" ON push_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_push_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_push_subscription_timestamp
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscription_timestamp();

-- Function to cleanup old inactive subscriptions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_inactive_push_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete subscriptions inactive for more than 30 days
  DELETE FROM push_subscriptions
  WHERE is_active = false
    AND updated_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE push_subscriptions IS 'Stores Web Push API subscriptions for provider notifications';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Push service endpoint URL';
COMMENT ON COLUMN push_subscriptions.keys IS 'JSONB containing p256dh and auth keys for encryption';
COMMENT ON COLUMN push_subscriptions.is_active IS 'Whether subscription is currently active';
COMMENT ON COLUMN push_subscriptions.last_used_at IS 'Last time a notification was sent to this subscription';
