-- Migration: 287_fix_chat_broadcast_trigger.sql
-- Author: AI Assistant
-- Date: 2026-01-16
-- Description: Fix chat system by removing realtime.send() trigger that doesn't exist in hosted Supabase
-- 
-- Problem: The broadcast_chat_message() trigger uses realtime.send() which is only available
-- in local Supabase development, not in hosted Supabase. This causes INSERT to fail with:
-- "function realtime.send(text, unknown, jsonb, boolean) does not exist"
--
-- Solution: Remove the trigger entirely and use pg_notify() instead which works in hosted Supabase.
-- The frontend uses Supabase Realtime subscriptions via supabase.channel() which works correctly.

BEGIN;

-- =====================================================
-- 1. Drop the problematic trigger and function
-- =====================================================

DROP TRIGGER IF EXISTS chat_message_broadcast ON chat_messages;
DROP FUNCTION IF EXISTS broadcast_chat_message();

-- =====================================================
-- 2. Create a new trigger function using pg_notify
-- =====================================================

CREATE OR REPLACE FUNCTION notify_chat_message()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_notify(
    'chat_message',
    json_build_object(
      'id', NEW.id,
      'ride_id', NEW.ride_id,
      'sender_id', NEW.sender_id,
      'sender_type', NEW.sender_type,
      'message', NEW.message,
      'message_type', NEW.message_type,
      'image_url', NEW.image_url,
      'is_read', NEW.is_read,
      'created_at', NEW.created_at
    )::text
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER chat_message_notify
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION notify_chat_message();

-- =====================================================
-- 3. Update send_chat_message function to include image_url
-- =====================================================

CREATE OR REPLACE FUNCTION send_chat_message(
  p_ride_id UUID,
  p_message TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_image_url TEXT DEFAULT NULL
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
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'AUTH_REQUIRED');
  END IF;
  
  v_user_role := get_user_ride_role(p_ride_id, v_user_id);
  IF v_user_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_PARTICIPANT');
  END IF;
  
  IF NOT is_ride_chat_allowed(p_ride_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'CHAT_CLOSED');
  END IF;
  
  IF p_message IS NULL OR LENGTH(TRIM(p_message)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMPTY_MESSAGE');
  END IF;
  
  IF LENGTH(p_message) > 1000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'MESSAGE_TOO_LONG');
  END IF;
  
  INSERT INTO chat_messages (ride_id, sender_id, sender_type, message, message_type, image_url)
  VALUES (p_ride_id, v_user_id, v_user_role, TRIM(p_message), p_message_type, p_image_url)
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
      'image_url', v_new_message.image_url,
      'is_read', v_new_message.is_read,
      'created_at', v_new_message.created_at
    )
  );
END;
$$;

-- =====================================================
-- 4. Update get_chat_history to include image_url
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
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'AUTH_REQUIRED');
  END IF;
  
  IF NOT is_ride_participant(p_ride_id, v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_PARTICIPANT');
  END IF;
  
  IF p_before_id IS NULL THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id, 'ride_id', ride_id, 'sender_id', sender_id,
        'sender_type', sender_type, 'message', message,
        'message_type', message_type, 'image_url', image_url,
        'is_read', is_read, 'created_at', created_at
      ) ORDER BY created_at ASC
    ) INTO v_messages
    FROM (SELECT * FROM chat_messages WHERE ride_id = p_ride_id ORDER BY created_at DESC LIMIT p_limit) sub;
  ELSE
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id, 'ride_id', ride_id, 'sender_id', sender_id,
        'sender_type', sender_type, 'message', message,
        'message_type', message_type, 'image_url', image_url,
        'is_read', is_read, 'created_at', created_at
      ) ORDER BY created_at ASC
    ) INTO v_messages
    FROM (
      SELECT * FROM chat_messages
      WHERE ride_id = p_ride_id
      AND created_at < (SELECT created_at FROM chat_messages WHERE id = p_before_id)
      ORDER BY created_at DESC LIMIT p_limit
    ) sub;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'messages', COALESCE(v_messages, '[]'::jsonb));
END;
$$;

-- =====================================================
-- 5. Grant permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION send_chat_message(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_chat_history(UUID, INTEGER, UUID) TO authenticated;

COMMIT;
