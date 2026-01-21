-- Migration: 284_fix_chat_policies_cleanup.sql
-- Author: AI Assistant
-- Date: 2026-01-16
-- Description: Remove conflicting old policies and keep only the new secure ones

BEGIN;

-- Drop old conflicting policies
DROP POLICY IF EXISTS "Allow all chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can manage own chat" ON chat_messages;

-- Verify RLS is enabled
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

COMMIT;
