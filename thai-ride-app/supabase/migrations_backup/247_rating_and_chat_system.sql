-- Migration: 247_rating_and_chat_system.sql
-- Features: Rating System + Chat/Message System + Provider Location Tracking
-- Date: 2026-01-12

BEGIN;

-- =====================================================
-- 1. Rating System
-- =====================================================

-- Ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ratee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rater_role TEXT NOT NULL CHECK (rater_role IN ('customer', 'provider')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  tags TEXT[], -- ['friendly', 'clean_car', 'safe_driving', etc.]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate ratings
  UNIQUE(ride_id, rater_id)
);

-- Indexes for ratings
CREATE INDEX idx_ratings_ride ON ratings(ride_id);
CREATE INDEX idx_ratings_ratee ON ratings(ratee_id);
CREATE INDEX idx_ratings_rater ON ratings(rater_id);
CREATE INDEX idx_ratings_created ON ratings(created_at DESC);

-- Enable RLS
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ratings
CREATE POLICY "users_can_create_own_ratings" ON ratings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = rater_id);

CREATE POLICY "users_can_view_own_ratings" ON ratings
  FOR SELECT TO authenticated
  USING (auth.uid() = rater_id OR auth.uid() = ratee_id);

-- Function to calculate average rating
CREATE OR REPLACE FUNCTION get_user_rating(p_user_id UUID)
RETURNS TABLE(avg_rating NUMERIC, total_ratings BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(rating)::NUMERIC, 2) as avg_rating,
    COUNT(*) as total_ratings
  FROM ratings
  WHERE ratee_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. Chat/Message System
-- =====================================================

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (LENGTH(message) <= 1000),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'location', 'system')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for chat
CREATE INDEX idx_chat_ride ON chat_messages(ride_id);
CREATE INDEX idx_chat_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_created ON chat_messages(ride_id, created_at DESC);
CREATE INDEX idx_chat_unread ON chat_messages(ride_id, is_read) WHERE is_read = FALSE;

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat
-- Users can only see messages for rides they're involved in
CREATE POLICY "ride_participants_can_view_messages" ON chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ride_requests r
      WHERE r.id = chat_messages.ride_id
      AND (r.user_id = auth.uid() OR r.provider_id IN (
        SELECT id FROM providers_v2 WHERE user_id = auth.uid()
      ))
    )
  );

-- Users can send messages for rides they're involved in
CREATE POLICY "ride_participants_can_send_messages" ON chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM ride_requests r
      WHERE r.id = chat_messages.ride_id
      AND (r.user_id = auth.uid() OR r.provider_id IN (
        SELECT id FROM providers_v2 WHERE user_id = auth.uid()
      ))
    )
  );

-- Users can mark messages as read
CREATE POLICY "recipients_can_mark_read" ON chat_messages
  FOR UPDATE TO authenticated
  USING (
    sender_id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM ride_requests r
      WHERE r.id = chat_messages.ride_id
      AND (r.user_id = auth.uid() OR r.provider_id IN (
        SELECT id FROM providers_v2 WHERE user_id = auth.uid()
      ))
    )
  )
  WITH CHECK (is_read = TRUE);

-- =====================================================
-- 3. Provider Location Tracking
-- =====================================================

-- Provider locations table (for realtime tracking)
CREATE TABLE IF NOT EXISTS provider_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers_v2(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES ride_requests(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION, -- Direction in degrees
  speed DOUBLE PRECISION, -- Speed in km/h
  accuracy DOUBLE PRECISION, -- GPS accuracy in meters
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One location per provider
  UNIQUE(provider_id)
);

-- Indexes
CREATE INDEX idx_provider_locations_provider ON provider_locations(provider_id);
CREATE INDEX idx_provider_locations_ride ON provider_locations(ride_id) WHERE ride_id IS NOT NULL;
CREATE INDEX idx_provider_locations_updated ON provider_locations(updated_at DESC);

-- Enable RLS
ALTER TABLE provider_locations ENABLE ROW LEVEL SECURITY;

-- Providers can update their own location
CREATE POLICY "providers_can_update_own_location" ON provider_locations
  FOR ALL TO authenticated
  USING (
    provider_id IN (SELECT id FROM providers_v2 WHERE user_id = auth.uid())
  )
  WITH CHECK (
    provider_id IN (SELECT id FROM providers_v2 WHERE user_id = auth.uid())
  );

-- Customers can view provider location for their active rides
CREATE POLICY "customers_can_view_provider_location" ON provider_locations
  FOR SELECT TO authenticated
  USING (
    ride_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM ride_requests r
      WHERE r.id = provider_locations.ride_id
      AND r.user_id = auth.uid()
      AND r.status IN ('matched', 'arriving', 'pickup', 'in_progress')
    )
  );

-- =====================================================
-- 4. Realtime Broadcast Triggers
-- =====================================================

-- Trigger function for chat messages
CREATE OR REPLACE FUNCTION broadcast_chat_message()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM realtime.send(
    'ride:' || NEW.ride_id::text || ':chat',
    'message_created',
    jsonb_build_object(
      'id', NEW.id,
      'ride_id', NEW.ride_id,
      'sender_id', NEW.sender_id,
      'message', NEW.message,
      'message_type', NEW.message_type,
      'created_at', NEW.created_at
    ),
    false
  );
  RETURN NEW;
END;
$$;

-- Trigger for chat messages
DROP TRIGGER IF EXISTS chat_message_broadcast ON chat_messages;
CREATE TRIGGER chat_message_broadcast
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION broadcast_chat_message();

-- Trigger function for provider location updates
CREATE OR REPLACE FUNCTION broadcast_provider_location()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only broadcast if there's an active ride
  IF NEW.ride_id IS NOT NULL THEN
    PERFORM realtime.send(
      'ride:' || NEW.ride_id::text || ':tracking',
      'location_updated',
      jsonb_build_object(
        'provider_id', NEW.provider_id,
        'latitude', NEW.latitude,
        'longitude', NEW.longitude,
        'heading', NEW.heading,
        'speed', NEW.speed,
        'updated_at', NEW.updated_at
      ),
      false
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for provider location
DROP TRIGGER IF EXISTS provider_location_broadcast ON provider_locations;
CREATE TRIGGER provider_location_broadcast
  AFTER INSERT OR UPDATE ON provider_locations
  FOR EACH ROW EXECUTE FUNCTION broadcast_provider_location();

-- =====================================================
-- 5. Helper Functions
-- =====================================================

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(p_ride_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM chat_messages
    WHERE ride_id = p_ride_id
    AND sender_id != p_user_id
    AND is_read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_ride_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE chat_messages
  SET is_read = TRUE
  WHERE ride_id = p_ride_id
  AND sender_id != p_user_id
  AND is_read = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to upsert provider location
CREATE OR REPLACE FUNCTION upsert_provider_location(
  p_provider_id UUID,
  p_ride_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_heading DOUBLE PRECISION DEFAULT NULL,
  p_speed DOUBLE PRECISION DEFAULT NULL,
  p_accuracy DOUBLE PRECISION DEFAULT NULL
)
RETURNS provider_locations AS $$
DECLARE
  result provider_locations;
BEGIN
  INSERT INTO provider_locations (provider_id, ride_id, latitude, longitude, heading, speed, accuracy, updated_at)
  VALUES (p_provider_id, p_ride_id, p_latitude, p_longitude, p_heading, p_speed, p_accuracy, NOW())
  ON CONFLICT (provider_id) DO UPDATE SET
    ride_id = EXCLUDED.ride_id,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    heading = EXCLUDED.heading,
    speed = EXCLUDED.speed,
    accuracy = EXCLUDED.accuracy,
    updated_at = NOW()
  RETURNING * INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
