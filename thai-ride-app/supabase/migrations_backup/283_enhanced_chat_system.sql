-- Migration: 283_enhanced_chat_system.sql
-- Author: AI Assistant
-- Date: 2026-01-16
-- Description: Enhanced chat system with proper RLS, role validation, and ride status checks
-- Features:
--   1. Chat only allowed during active ride (not completed/cancelled)
--   2. Proper role validation (customer vs provider)
--   3. Support for 100+ concurrent chats
--   4. Optimized indexes for performance

BEGIN;

-- =====================================================
-- 1. Drop old policies and recreate with proper checks
-- =====================================================

DROP POLICY IF EXISTS "ride_participants_can_view_messages" ON chat_messages;
DROP POLICY IF EXISTS "ride_participants_can_send_messages" ON chat_messages;
DROP POLICY IF EXISTS "recipients_can_mark_read" ON chat_messages;

-- =====================================================
-- 2. Add sender_type column if not exists
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' AND column_name = 'sender_type'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN sender_type TEXT DEFAULT 'customer' 
      CHECK (sender_type IN ('customer', 'provider', 'system'));
  END IF;
END $$;

-- =====================================================
-- 3. Create optimized indexes for chat performance
-- =====================================================

-- Index for ride_id lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_chat_messages_ride_id ON chat_messages(ride_id);

-- Composite index for unread messages per ride
CREATE INDEX IF NOT EXISTS idx_chat_messages_ride_unread 
  ON chat_messages(ride_id, sender_id, is_read) 
  WHERE is_read = FALSE;

-- Index for sender lookups
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_created 
  ON chat_messages(ride_id, created_at DESC);

-- =====================================================
-- 4. Helper function to check if user is ride participant
-- =====================================================

CREATE OR REPLACE FUNCTION is_ride_participant(p_ride_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_is_customer BOOLEAN;
  v_is_provider BOOLEAN;
BEGIN
  -- Check if user is the customer
  SELECT EXISTS (
    SELECT 1 FROM ride_requests 
    WHERE id = p_ride_id AND user_id = p_user_id
  ) INTO v_is_customer;
  
  IF v_is_customer THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is the provider (via providers_v2)
  SELECT EXISTS (
    SELECT 1 FROM ride_requests r
    INNER JOIN providers_v2 p ON p.id = r.provider_id
    WHERE r.id = p_ride_id AND p.user_id = p_user_id
  ) INTO v_is_provider;
  
  RETURN v_is_provider;
END;
$$;

-- =====================================================
-- 5. Helper function to check if ride allows chat
-- =====================================================

CREATE OR REPLACE FUNCTION is_ride_chat_allowed(p_ride_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM ride_requests
  WHERE id = p_ride_id;
  
  -- Chat allowed only for active rides
  -- NOT allowed for: completed, cancelled, expired
  RETURN v_status IN ('pending', 'matched', 'arriving', 'arrived', 'pickup', 'in_progress');
END;
$$;

-- =====================================================
-- 6. Helper function to get user role in ride
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_ride_role(p_ride_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_is_customer BOOLEAN;
  v_is_provider BOOLEAN;
BEGIN
  -- Check if user is the customer
  SELECT EXISTS (
    SELECT 1 FROM ride_requests 
    WHERE id = p_ride_id AND user_id = p_user_id
  ) INTO v_is_customer;
  
  IF v_is_customer THEN
    RETURN 'customer';
  END IF;
  
  -- Check if user is the provider
  SELECT EXISTS (
    SELECT 1 FROM ride_requests r
    INNER JOIN providers_v2 p ON p.id = r.provider_id
    WHERE r.id = p_ride_id AND p.user_id = p_user_id
  ) INTO v_is_provider;
  
  IF v_is_provider THEN
    RETURN 'provider';
  END IF;
  
  RETURN NULL;
END;
$$;

-- =====================================================
-- 7. RLS Policies with proper role and status checks
-- =====================================================

-- SELECT: Participants can view messages for their rides
CREATE POLICY "chat_select_participants" ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    is_ride_participant(ride_id, (SELECT auth.uid()))
  );

-- INSERT: Participants can send messages only during active rides
CREATE POLICY "chat_insert_active_rides" ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be the sender
    sender_id = (SELECT auth.uid())
    -- Must be a participant
    AND is_ride_participant(ride_id, (SELECT auth.uid()))
    -- Ride must allow chat (not completed/cancelled)
    AND is_ride_chat_allowed(ride_id)
    -- Sender type must match user's role
    AND sender_type = get_user_ride_role(ride_id, (SELECT auth.uid()))
  );

-- UPDATE: Only for marking messages as read
CREATE POLICY "chat_update_mark_read" ON chat_messages
  FOR UPDATE
  TO authenticated
  USING (
    -- Can only update messages NOT sent by self
    sender_id != (SELECT auth.uid())
    -- Must be a participant
    AND is_ride_participant(ride_id, (SELECT auth.uid()))
  )
  WITH CHECK (
    -- Can only change is_read to TRUE
    is_read = TRUE
  );

-- =====================================================
-- 8. Improved broadcast trigger for realtime
-- =====================================================

CREATE OR REPLACE FUNCTION broadcast_chat_message()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Broadcast to ride-specific channel
  PERFORM realtime.send(
    'ride:' || NEW.ride_id::text || ':chat',
    'message_created',
    jsonb_build_object(
      'id', NEW.id,
      'ride_id', NEW.ride_id,
      'sender_id', NEW.sender_id,
      'sender_type', NEW.sender_type,
      'message', NEW.message,
      'message_type', NEW.message_type,
      'is_read', NEW.is_read,
      'created_at', NEW.created_at
    ),
    false  -- public channel for simplicity
  );
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS chat_message_broadcast ON chat_messages;
CREATE TRIGGER chat_message_broadcast
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION broadcast_chat_message();

-- =====================================================
-- 9. Improved helper functions
-- =====================================================

-- Get unread count with proper role check
CREATE OR REPLACE FUNCTION get_unread_message_count(p_ride_id UUID, p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Only count if user is participant
  IF NOT is_ride_participant(p_ride_id, p_user_id) THEN
    RETURN 0;
  END IF;

  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM chat_messages
    WHERE ride_id = p_ride_id
    AND sender_id != p_user_id
    AND is_read = FALSE
  );
END;
$$;

-- Mark messages as read with proper role check
CREATE OR REPLACE FUNCTION mark_messages_read(p_ride_id UUID, p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Only mark if user is participant
  IF NOT is_ride_participant(p_ride_id, p_user_id) THEN
    RETURN 0;
  END IF;

  UPDATE chat_messages
  SET is_read = TRUE
  WHERE ride_id = p_ride_id
  AND sender_id != p_user_id
  AND is_read = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- =====================================================
-- 10. Function to send chat message with validation
-- =====================================================

CREATE OR REPLACE FUNCTION send_chat_message(
  p_ride_id UUID,
  p_message TEXT,
  p_message_type TEXT DEFAULT 'text'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_new_message chat_messages;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'AUTH_REQUIRED');
  END IF;
  
  -- Check if user is participant
  v_user_role := get_user_ride_role(p_ride_id, v_user_id);
  IF v_user_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_PARTICIPANT');
  END IF;
  
  -- Check if chat is allowed
  IF NOT is_ride_chat_allowed(p_ride_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'CHAT_CLOSED');
  END IF;
  
  -- Validate message
  IF p_message IS NULL OR LENGTH(TRIM(p_message)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMPTY_MESSAGE');
  END IF;
  
  IF LENGTH(p_message) > 1000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'MESSAGE_TOO_LONG');
  END IF;
  
  -- Insert message
  INSERT INTO chat_messages (ride_id, sender_id, sender_type, message, message_type)
  VALUES (p_ride_id, v_user_id, v_user_role, TRIM(p_message), p_message_type)
  RETURNING * INTO v_new_message;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', jsonb_build_object(
      'id', v_new_message.id,
      'ride_id', v_new_message.ride_id,
      'sender_id', v_new_message.sender_id,
      'sender_type', v_new_message.sender_type,
      'message', v_new_message.message,
      'message_type', v_new_message.message_type,
      'created_at', v_new_message.created_at
    )
  );
END;
$$;

-- =====================================================
-- 11. Function to get chat history with pagination
-- =====================================================

CREATE OR REPLACE FUNCTION get_chat_history(
  p_ride_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_before_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_id UUID;
  v_messages jsonb;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'AUTH_REQUIRED');
  END IF;
  
  -- Check if user is participant
  IF NOT is_ride_participant(p_ride_id, v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_PARTICIPANT');
  END IF;
  
  -- Get messages
  IF p_before_id IS NULL THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'ride_id', ride_id,
        'sender_id', sender_id,
        'sender_type', sender_type,
        'message', message,
        'message_type', message_type,
        'is_read', is_read,
        'created_at', created_at
      ) ORDER BY created_at ASC
    )
    INTO v_messages
    FROM (
      SELECT * FROM chat_messages
      WHERE ride_id = p_ride_id
      ORDER BY created_at DESC
      LIMIT p_limit
    ) sub;
  ELSE
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'ride_id', ride_id,
        'sender_id', sender_id,
        'sender_type', sender_type,
        'message', message,
        'message_type', message_type,
        'is_read', is_read,
        'created_at', created_at
      ) ORDER BY created_at ASC
    )
    INTO v_messages
    FROM (
      SELECT * FROM chat_messages
      WHERE ride_id = p_ride_id
      AND created_at < (SELECT created_at FROM chat_messages WHERE id = p_before_id)
      ORDER BY created_at DESC
      LIMIT p_limit
    ) sub;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'messages', COALESCE(v_messages, '[]'::jsonb)
  );
END;
$$;

-- =====================================================
-- 12. Grant execute permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION is_ride_participant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_ride_chat_allowed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_ride_role(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_message_count(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION send_chat_message(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_chat_history(UUID, INTEGER, UUID) TO authenticated;

COMMIT;
