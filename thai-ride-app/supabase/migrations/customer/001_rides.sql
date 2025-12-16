-- =============================================
-- CUSTOMER MODULE: Ride Requests
-- =============================================
-- Feature: F02 - Ride Booking
-- Used by: Customer App
-- Depends on: core/001_users_auth.sql
-- =============================================

-- Ride requests table
CREATE TABLE IF NOT EXISTS ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id VARCHAR(50) UNIQUE,
  user_id UUID REFERENCES users(id),
  provider_id UUID REFERENCES service_providers(id),
  pickup_lat NUMERIC NOT NULL,
  pickup_lng NUMERIC NOT NULL,
  pickup_address TEXT NOT NULL,
  destination_lat NUMERIC NOT NULL,
  destination_lng NUMERIC NOT NULL,
  destination_address TEXT NOT NULL,
  ride_type VARCHAR(20) DEFAULT 'standard' CHECK (ride_type IN ('standard', 'premium', 'shared', 'moto')),
  passenger_count INTEGER DEFAULT 1,
  special_requests TEXT,
  estimated_fare NUMERIC,
  final_fare NUMERIC,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'pickup', 'in_progress', 'completed', 'cancelled')),
  scheduled_time TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own rides" ON ride_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create rides" ON ride_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rides" ON ride_requests
  FOR UPDATE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ride_requests_user ON ride_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_provider ON ride_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON ride_requests(status);
CREATE INDEX IF NOT EXISTS idx_ride_requests_created ON ride_requests(created_at DESC);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE ride_requests;
