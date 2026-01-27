-- Migration: 008_queue_booking_system.sql
-- Feature: F158 - Queue Booking Service
-- Author: AI Assistant
-- Date: 2026-01-27
-- Description: Complete queue booking system with atomic transactions

BEGIN;

-- ============================================================================
-- 1. QUEUE BOOKINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS queue_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES providers_v2(id) ON DELETE SET NULL,
  
  -- Service Details
  category TEXT NOT NULL CHECK (category IN ('hospital', 'bank', 'government', 'restaurant', 'salon', 'other')),
  place_name TEXT,
  place_address TEXT,
  place_lat DECIMAL(10, 8),
  place_lng DECIMAL(11, 8),
  details TEXT,
  
  -- Schedule
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  
  -- Pricing
  service_fee DECIMAL(10, 2) NOT NULL DEFAULT 50.00 CHECK (service_fee >= 0),
  final_fee DECIMAL(10, 2),
  
  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  cancelled_by UUID REFERENCES users(id),
  cancelled_by_role TEXT CHECK (cancelled_by_role IN ('customer', 'provider', 'admin')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_schedule CHECK (scheduled_date >= CURRENT_DATE),
  CONSTRAINT valid_coordinates CHECK (
    (place_lat IS NULL AND place_lng IS NULL) OR 
    (place_lat BETWEEN -90 AND 90 AND place_lng BETWEEN -180 AND 180)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_queue_bookings_user ON queue_bookings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_queue_bookings_provider ON queue_bookings(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_bookings_status ON queue_bookings(status, scheduled_date, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_queue_bookings_tracking ON queue_bookings(tracking_id);
CREATE INDEX IF NOT EXISTS idx_queue_bookings_schedule ON queue_bookings(scheduled_date, scheduled_time) WHERE status IN ('pending', 'confirmed');

-- Location index (if using PostGIS)
-- CREATE INDEX IF NOT EXISTS idx_queue_bookings_location ON queue_bookings USING GIST(ST_MakePoint(place_lng, place_lat)::geography);

-- ============================================================================
-- 2. QUEUE RATINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS queue_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES queue_bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers_v2(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One rating per booking
  UNIQUE(booking_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_queue_ratings_booking ON queue_ratings(booking_id);
CREATE INDEX IF NOT EXISTS idx_queue_ratings_provider ON queue_ratings(provider_id, created_at DESC);

-- ============================================================================
-- 3. RLS POLICIES
-- ============================================================================

-- Queue Bookings RLS
ALTER TABLE queue_bookings ENABLE ROW LEVEL SECURITY;

-- Customer: Own bookings
CREATE POLICY "customer_own_queue_bookings" ON queue_bookings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- Provider: Assigned bookings
CREATE POLICY "provider_assigned_queue_bookings" ON queue_bookings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = queue_bookings.provider_id
      AND providers_v2.user_id = auth.uid()
    )
  );

-- Provider: Update assigned bookings
CREATE POLICY "provider_update_queue_bookings" ON queue_bookings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = queue_bookings.provider_id
      AND providers_v2.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = queue_bookings.provider_id
      AND providers_v2.user_id = auth.uid()
    )
  );

-- Admin: Full access
CREATE POLICY "admin_full_queue_bookings" ON queue_bookings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Queue Ratings RLS
ALTER TABLE queue_ratings ENABLE ROW LEVEL SECURITY;

-- Customer: Own ratings
CREATE POLICY "customer_own_queue_ratings" ON queue_ratings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- Provider: View ratings
CREATE POLICY "provider_view_queue_ratings" ON queue_ratings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = queue_ratings.provider_id
      AND providers_v2.user_id = auth.uid()
    )
  );

-- Admin: Full access
CREATE POLICY "admin_full_queue_ratings" ON queue_ratings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- 4. ATOMIC CREATE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_queue_atomic(
  p_user_id UUID,
  p_category TEXT,
  p_place_name TEXT DEFAULT NULL,
  p_place_address TEXT DEFAULT NULL,
  p_place_lat DECIMAL DEFAULT NULL,
  p_place_lng DECIMAL DEFAULT NULL,
  p_details TEXT DEFAULT NULL,
  p_scheduled_date DATE,
  p_scheduled_time TIME,
  p_service_fee DECIMAL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id UUID;
  v_tracking_id TEXT;
  v_wallet_balance DECIMAL;
  v_scheduled_datetime TIMESTAMPTZ;
BEGIN
  -- Validate inputs
  IF p_service_fee <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Service fee must be positive';
  END IF;
  
  -- Validate future date/time
  v_scheduled_datetime := (p_scheduled_date || ' ' || p_scheduled_time)::TIMESTAMPTZ;
  IF v_scheduled_datetime <= NOW() THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Scheduled time must be in the future';
  END IF;
  
  -- Validate coordinates if provided
  IF (p_place_lat IS NOT NULL AND p_place_lng IS NULL) OR 
     (p_place_lat IS NULL AND p_place_lng IS NOT NULL) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Both lat and lng must be provided together';
  END IF;
  
  IF p_place_lat IS NOT NULL THEN
    IF p_place_lat < -90 OR p_place_lat > 90 THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: Invalid latitude';
    END IF;
    IF p_place_lng < -180 OR p_place_lng > 180 THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: Invalid longitude';
    END IF;
  END IF;
  
  -- 1. Check wallet balance
  SELECT balance INTO v_wallet_balance
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND: User wallet not found';
  END IF;
  
  IF v_wallet_balance < p_service_fee THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: ยอดเงินไม่เพียงพอ (ปัจจุบัน: %.2f บาท, ต้องการ: %.2f บาท)', 
      v_wallet_balance, p_service_fee;
  END IF;
  
  -- 2. Generate tracking ID
  v_tracking_id := 'QUE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  -- Ensure unique tracking ID
  WHILE EXISTS (SELECT 1 FROM queue_bookings WHERE tracking_id = v_tracking_id) LOOP
    v_tracking_id := 'QUE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  END LOOP;
  
  -- 3. Create queue booking
  INSERT INTO queue_bookings (
    user_id,
    tracking_id,
    category,
    place_name,
    place_address,
    place_lat,
    place_lng,
    details,
    scheduled_date,
    scheduled_time,
    service_fee,
    status
  ) VALUES (
    p_user_id,
    v_tracking_id,
    p_category,
    p_place_name,
    p_place_address,
    p_place_lat,
    p_place_lng,
    p_details,
    p_scheduled_date,
    p_scheduled_time,
    p_service_fee,
    'pending'
  )
  RETURNING id INTO v_booking_id;
  
  -- 4. Deduct from wallet
  UPDATE user_wallets
  SET balance = balance - p_service_fee
  WHERE user_id = p_user_id;
  
  -- 5. Record wallet transaction
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount,
    balance_before,
    balance_after,
    reference_type,
    reference_id,
    description
  ) VALUES (
    p_user_id,
    'payment',
    p_service_fee,
    v_wallet_balance,
    v_wallet_balance - p_service_fee,
    'queue',
    v_booking_id,
    'ค่าบริการจองคิว ' || v_tracking_id
  );
  
  -- 6. Return result
  RETURN json_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'tracking_id', v_tracking_id,
    'message', 'จองคิวสำเร็จ'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback handled automatically by PostgreSQL
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_queue_atomic TO authenticated;

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_queue_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_queue_bookings_updated_at
  BEFORE UPDATE ON queue_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_queue_bookings_updated_at();

-- Set completed_at when status changes to completed
CREATE OR REPLACE FUNCTION set_queue_booking_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_queue_booking_completed_at
  BEFORE UPDATE ON queue_bookings
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION set_queue_booking_completed_at();

-- Set confirmed_at when status changes to confirmed
CREATE OR REPLACE FUNCTION set_queue_booking_confirmed_at()
RETURNS TRIGGER AS $
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    NEW.confirmed_at = NOW();
  END IF;
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_queue_booking_confirmed_at
  BEFORE UPDATE ON queue_bookings
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION set_queue_booking_confirmed_at();

-- ============================================================================
-- 6. PROVIDER ACCEPT PENDING BOOKINGS POLICY
-- ============================================================================

-- Allow providers to accept pending queue bookings
CREATE POLICY "Providers can accept pending queue bookings" ON queue_bookings
  FOR UPDATE TO authenticated
  USING (
    status = 'pending' 
    AND provider_id IS NULL
    AND EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.user_id = auth.uid()
      AND providers_v2.status = 'approved'
      AND providers_v2.is_online = true
      AND providers_v2.is_available = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = queue_bookings.provider_id
      AND providers_v2.user_id = auth.uid()
    )
  );

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('queue_bookings', 'queue_ratings');

-- Check RLS
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('queue_bookings', 'queue_ratings')
ORDER BY tablename, policyname;

-- Check function
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'create_queue_atomic';
