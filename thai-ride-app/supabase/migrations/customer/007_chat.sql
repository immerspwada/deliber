-- =============================================
-- CUSTOMER MODULE: Chat/Messaging
-- =============================================
-- Feature: F12 - Chat/Messaging
-- Used by: Customer, Provider
-- Depends on: core/001_users_auth.sql, customer/001_rides.sql
-- =============================================

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id VARCHAR(25) UNIQUE,
  ride_id UUID REFERENCES ride_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES service_providers(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('customer', 'provider', 'system')),
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'location', 'quick_reply')),
  metadata JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for dev)
CREATE POLICY "Allow all chat_sessions" ON chat_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all chat_messages" ON chat_messages FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_ride ON chat_sessions(ride_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_provider ON chat_sessions(provider_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Chat session tracking ID trigger
CREATE OR REPLACE FUNCTION set_chat_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := 'CHT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_chat_tracking_id ON chat_sessions;
CREATE TRIGGER trigger_chat_tracking_id
  BEFORE INSERT ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION set_chat_tracking_id();

-- Get or create chat session
CREATE OR REPLACE FUNCTION get_or_create_chat_session(
  p_ride_id UUID,
  p_user_id UUID,
  p_provider_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  SELECT id INTO v_session_id FROM chat_sessions
  WHERE ride_id = p_ride_id AND is_active = true;
  
  IF v_session_id IS NULL THEN
    INSERT INTO chat_sessions (ride_id, user_id, provider_id)
    VALUES (p_ride_id, p_user_id, p_provider_id)
    RETURNING id INTO v_session_id;
  END IF;
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- Send chat message
CREATE OR REPLACE FUNCTION send_chat_message(
  p_session_id UUID,
  p_sender_id UUID,
  p_sender_type VARCHAR(20),
  p_message TEXT,
  p_message_type VARCHAR(20) DEFAULT 'text',
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
BEGIN
  INSERT INTO chat_messages (session_id, sender_id, sender_type, message, message_type, metadata)
  VALUES (p_session_id, p_sender_id, p_sender_type, p_message, p_message_type, p_metadata)
  RETURNING id INTO v_message_id;
  
  UPDATE chat_sessions SET updated_at = NOW() WHERE id = p_session_id;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;

-- Mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_session_id UUID, p_reader_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE chat_messages
  SET is_read = true
  WHERE session_id = p_session_id
    AND sender_id != p_reader_id
    AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
