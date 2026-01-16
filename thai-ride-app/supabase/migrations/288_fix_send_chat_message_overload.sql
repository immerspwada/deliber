-- Migration: 288_fix_send_chat_message_overload.sql
-- Author: AI Assistant
-- Date: 2026-01-16
-- Description: Fix duplicate send_chat_message function causing HTTP 300 error
-- Problem: Two overloads with similar signatures cause PostgREST ambiguity
--   - send_chat_message(uuid, text, text) - 3 params
--   - send_chat_message(uuid, text, text, text) - 4 params with image_url
-- Solution: Keep only the 4-parameter version which has defaults for all optional params

BEGIN;

-- Drop the 3-parameter version (keep the 4-parameter version with image_url)
DROP FUNCTION IF EXISTS send_chat_message(uuid, text, text);

-- The remaining function signature:
-- send_chat_message(
--   p_ride_id uuid,
--   p_message text,
--   p_message_type text DEFAULT 'text',
--   p_image_url text DEFAULT NULL
-- )

COMMIT;
