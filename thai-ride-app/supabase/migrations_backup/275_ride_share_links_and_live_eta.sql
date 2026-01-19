-- Migration: 275_ride_share_links_and_live_eta.sql
-- Author: Kiro
-- Date: 2026-01-15
-- Description: Share Trip links, Live ETA tracking, Chat enhancements

BEGIN;

-- 1. Create ride_share_links table for sharing trip with others
CREATE TABLE IF NOT EXISTS ride_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
  share_token VARCHAR(32) NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_token CHECK (LENGTH(share_token) >= 16)
);

-- Indexes for ride_share_links
CREATE INDEX IF NOT EXISTS idx_ride_share_links_token ON ride_share_links(share_token) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ride_share_links_ride ON ride_share_links(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_share_links_expires ON ride_share_links(expires_at) WHERE is_active = true;

-- Enable RLS
ALTER TABLE ride_share_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ride_share_links
-- Users can create share links for their own rides
DROP POLICY IF EXISTS "users_create_own_share_links" ON ride_share_links;
CREATE POLICY "users_create_own_share_links" ON ride_share_links
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ride_requests rr
      WHERE rr.id = ride_id
      AND rr.user_id = (SELECT auth.uid())
    )
  );

-- Users can view their own share links
DROP POLICY IF EXISTS "users_view_own_share_links" ON ride_share_links;
CREATE POLICY "users_view_own_share_links" ON ride_share_links
  FOR SELECT TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM ride_requests rr
      WHERE rr.id = ride_id
      AND rr.user_id = (SELECT auth.uid())
    )
  );

-- Users can deactivate their own share links
DROP POLICY IF EXISTS "users_update_own_share_links" ON ride_share_links;
CREATE POLICY "users_update_own_share_links" ON ride_share_links
  FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

-- 2. Create function to get shared ride info (public access via token)
CREATE OR REPLACE FUNCTION get_shared_ride_info(p_share_token VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_ride RECORD;
  v_provider RECORD;
  v_result JSONB;
BEGIN
  -- Find the share link
  SELECT * INTO v_link
  FROM ride_share_links
  WHERE share_token = p_share_token
  AND is_active = true
  AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_or_expired_link');
  END IF;
  
  -- Increment view count
  UPDATE ride_share_links SET view_count = view_count + 1 WHERE id = v_link.id;
  
  -- Get ride info
  SELECT 
    id, status, pickup_address, destination_address,
    pickup_lat, pickup_lng, destination_lat, destination_lng,
    estimated_fare, provider_id, created_at
  INTO v_ride
  FROM ride_requests
  WHERE id = v_link.ride_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'ride_not_found');
  END IF;
  
  -- Get provider info if assigned
  IF v_ride.provider_id IS NOT NULL THEN
    SELECT 
      first_name, vehicle_type, vehicle_plate, vehicle_color,
      current_lat, current_lng
    INTO v_provider
    FROM providers_v2
    WHERE id = v_ride.provider_id;
  END IF;
  
  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'ride', jsonb_build_object(
      'id', v_ride.id,
      'status', v_ride.status,
      'pickup_address', v_ride.pickup_address,
      'destination_address', v_ride.destination_address,
      'pickup_lat', v_ride.pickup_lat,
      'pickup_lng', v_ride.pickup_lng,
      'destination_lat', v_ride.destination_lat,
      'destination_lng', v_ride.destination_lng,
      'estimated_fare', v_ride.estimated_fare
    ),
    'provider', CASE WHEN v_provider.first_name IS NOT NULL THEN
      jsonb_build_object(
        'name', v_provider.first_name,
        'vehicle_type', v_provider.vehicle_type,
        'vehicle_plate', v_provider.vehicle_plate,
        'vehicle_color', v_provider.vehicle_color,
        'current_lat', v_provider.current_lat,
        'current_lng', v_provider.current_lng
      )
    ELSE NULL END,
    'expires_at', v_link.expires_at
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute to anon (for public share links)
GRANT EXECUTE ON FUNCTION get_shared_ride_info(VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION get_shared_ride_info(VARCHAR) TO authenticated;

-- 3. Create function to generate share link
CREATE OR REPLACE FUNCTION create_ride_share_link(p_ride_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_ride RECORD;
  v_token VARCHAR(32);
  v_link_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;
  
  -- Verify user owns this ride
  SELECT id, status INTO v_ride
  FROM ride_requests
  WHERE id = p_ride_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'ride_not_found_or_unauthorized');
  END IF;
  
  -- Generate unique token using extensions schema for pgcrypto
  v_token := encode(extensions.gen_random_bytes(16), 'hex');
  
  -- Create share link
  INSERT INTO ride_share_links (ride_id, share_token, created_by)
  VALUES (p_ride_id, v_token, v_user_id)
  RETURNING id INTO v_link_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'share_token', v_token,
    'link_id', v_link_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_ride_share_link(UUID) TO authenticated;

-- 4. Add message_type column to chat_messages if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' AND column_name = 'message_type'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN message_type VARCHAR(20) DEFAULT 'text';
  END IF;
END $$;

-- 5. Create RPC for marking messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_ride_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE chat_messages
  SET is_read = true
  WHERE ride_id = p_ride_id
  AND sender_id != p_user_id
  AND is_read = false;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_messages_read(UUID, UUID) TO authenticated;

-- 6. Create RPC for getting unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(p_ride_id UUID, p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM chat_messages
  WHERE ride_id = p_ride_id
  AND sender_id != p_user_id
  AND is_read = false;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION get_unread_message_count(UUID, UUID) TO authenticated;

COMMIT;
