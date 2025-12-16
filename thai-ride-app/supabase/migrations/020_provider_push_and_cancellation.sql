-- Migration: 020_provider_push_and_cancellation.sql
-- Feature: F14 - Provider Dashboard Enhancement
-- 
-- Adds:
-- 1. Push notification to nearby providers when new ride created
-- 2. Provider cancellation tracking for abuse prevention

-- =====================================================
-- 1. PROVIDER CANCELLATION TRACKING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS provider_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES ride_requests(id) ON DELETE SET NULL,
  delivery_id UUID REFERENCES delivery_requests(id) ON DELETE SET NULL,
  shopping_id UUID REFERENCES shopping_requests(id) ON DELETE SET NULL,
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('ride', 'delivery', 'shopping')),
  reason TEXT,
  reason_code VARCHAR(50), -- 'passenger_no_show', 'wrong_location', 'emergency', 'other'
  cancelled_at TIMESTAMPTZ DEFAULT NOW(),
  was_penalized BOOLEAN DEFAULT false,
  penalty_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_provider_cancellations_provider ON provider_cancellations(provider_id);
CREATE INDEX idx_provider_cancellations_date ON provider_cancellations(cancelled_at);
CREATE INDEX idx_provider_cancellations_ride ON provider_cancellations(ride_id) WHERE ride_id IS NOT NULL;

-- Enable RLS
ALTER TABLE provider_cancellations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Providers view own cancellations" ON provider_cancellations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM service_providers sp WHERE sp.id = provider_id AND sp.user_id = auth.uid())
  );

CREATE POLICY "Allow all provider_cancellations" ON provider_cancellations
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 2. FUNCTION TO GET PROVIDER CANCELLATION STATS
-- =====================================================

CREATE OR REPLACE FUNCTION get_provider_cancellation_stats(
  p_provider_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_cancellations INTEGER,
  cancellation_rate DECIMAL(5,2),
  total_completed INTEGER,
  penalty_total DECIMAL(10,2),
  is_flagged BOOLEAN
) AS $$
DECLARE
  v_cancellations INTEGER;
  v_completed INTEGER;
  v_rate DECIMAL(5,2);
  v_penalty DECIMAL(10,2);
BEGIN
  -- Count cancellations in period
  SELECT COUNT(*) INTO v_cancellations
  FROM provider_cancellations
  WHERE provider_id = p_provider_id
    AND cancelled_at >= NOW() - (p_days || ' days')::INTERVAL;
  
  -- Count completed rides in period
  SELECT COUNT(*) INTO v_completed
  FROM ride_requests
  WHERE provider_id = p_provider_id
    AND status = 'completed'
    AND completed_at >= NOW() - (p_days || ' days')::INTERVAL;
  
  -- Calculate rate
  IF (v_cancellations + v_completed) > 0 THEN
    v_rate := (v_cancellations::DECIMAL / (v_cancellations + v_completed)::DECIMAL) * 100;
  ELSE
    v_rate := 0;
  END IF;
  
  -- Sum penalties
  SELECT COALESCE(SUM(penalty_amount), 0) INTO v_penalty
  FROM provider_cancellations
  WHERE provider_id = p_provider_id
    AND cancelled_at >= NOW() - (p_days || ' days')::INTERVAL;
  
  RETURN QUERY SELECT 
    v_cancellations,
    v_rate,
    v_completed,
    v_penalty,
    (v_rate > 20 OR v_cancellations > 10) AS is_flagged; -- Flag if >20% rate or >10 cancellations
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. FUNCTION TO LOG PROVIDER CANCELLATION
-- =====================================================

CREATE OR REPLACE FUNCTION log_provider_cancellation(
  p_provider_id UUID,
  p_ride_id UUID DEFAULT NULL,
  p_delivery_id UUID DEFAULT NULL,
  p_shopping_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_reason_code VARCHAR(50) DEFAULT 'other'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_request_type VARCHAR(20);
  v_penalty DECIMAL(10,2) := 0;
  v_stats RECORD;
BEGIN
  -- Determine request type
  IF p_ride_id IS NOT NULL THEN
    v_request_type := 'ride';
  ELSIF p_delivery_id IS NOT NULL THEN
    v_request_type := 'delivery';
  ELSIF p_shopping_id IS NOT NULL THEN
    v_request_type := 'shopping';
  ELSE
    v_request_type := 'ride';
  END IF;
  
  -- Check cancellation stats for penalty
  SELECT * INTO v_stats FROM get_provider_cancellation_stats(p_provider_id, 7);
  
  -- Apply penalty if high cancellation rate (>3 in last 7 days)
  IF v_stats.total_cancellations >= 3 THEN
    v_penalty := 50; -- 50 baht penalty
  END IF;
  
  -- Insert cancellation record
  INSERT INTO provider_cancellations (
    provider_id, ride_id, delivery_id, shopping_id,
    request_type, reason, reason_code, was_penalized, penalty_amount
  ) VALUES (
    p_provider_id, p_ride_id, p_delivery_id, p_shopping_id,
    v_request_type, p_reason, p_reason_code, v_penalty > 0, v_penalty
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. FUNCTION TO NOTIFY NEARBY PROVIDERS OF NEW RIDE
-- =====================================================

CREATE OR REPLACE FUNCTION notify_nearby_providers_new_ride(
  p_ride_id UUID,
  p_pickup_lat DECIMAL(10,8),
  p_pickup_lng DECIMAL(11,8),
  p_radius_km INTEGER DEFAULT 5
)
RETURNS INTEGER AS $$
DECLARE
  v_provider RECORD;
  v_count INTEGER := 0;
  v_ride RECORD;
BEGIN
  -- Get ride details
  SELECT * INTO v_ride FROM ride_requests WHERE id = p_ride_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  
  -- Find nearby available providers
  FOR v_provider IN
    SELECT sp.id, sp.user_id
    FROM service_providers sp
    WHERE sp.is_available = true
      AND sp.is_verified = true
      AND sp.provider_type IN ('driver', 'both')
      AND sp.current_lat IS NOT NULL
      AND sp.current_lng IS NOT NULL
      AND (6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_pickup_lat)) * cos(radians(sp.current_lat)) *
          cos(radians(sp.current_lng) - radians(p_pickup_lng)) +
          sin(radians(p_pickup_lat)) * sin(radians(sp.current_lat))
        ))
      )) <= p_radius_km
  LOOP
    -- Queue push notification for each provider
    IF EXISTS (SELECT 1 FROM push_subscriptions WHERE user_id = v_provider.user_id AND is_active = true) THEN
      PERFORM queue_push_notification(
        v_provider.user_id,
        'งานใหม่ใกล้คุณ!',
        'มีผู้โดยสารต้องการเรียกรถ - ' || COALESCE(v_ride.pickup_address, 'ไม่ระบุ'),
        jsonb_build_object(
          'type', 'new_ride_request',
          'ride_id', p_ride_id,
          'pickup_address', v_ride.pickup_address,
          'destination_address', v_ride.destination_address,
          'estimated_fare', v_ride.estimated_fare
        ),
        '/provider',
        'new-ride-' || p_ride_id::TEXT
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. TRIGGER TO AUTO-NOTIFY PROVIDERS ON NEW RIDE
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_notify_providers_new_ride()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify for new pending rides
  IF NEW.status = 'pending' AND NEW.provider_id IS NULL THEN
    PERFORM notify_nearby_providers_new_ride(
      NEW.id,
      NEW.pickup_lat,
      NEW.pickup_lng,
      5 -- 5km radius
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_new_ride_notify_providers ON ride_requests;
CREATE TRIGGER trigger_new_ride_notify_providers
  AFTER INSERT ON ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notify_providers_new_ride();

-- =====================================================
-- 6. UPDATE cancel_ride_by_provider TO LOG CANCELLATION
-- =====================================================

CREATE OR REPLACE FUNCTION cancel_ride_by_provider(
  p_ride_id UUID,
  p_provider_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_ride RECORD;
BEGIN
  SELECT * INTO v_ride FROM ride_requests WHERE id = p_ride_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบคำขอเรียกรถนี้'::TEXT;
    RETURN;
  END IF;
  
  IF v_ride.provider_id != p_provider_id THEN
    RETURN QUERY SELECT false, 'คุณไม่ได้รับมอบหมายงานนี้'::TEXT;
    RETURN;
  END IF;
  
  IF v_ride.status IN ('completed', 'cancelled') THEN
    RETURN QUERY SELECT false, 'ไม่สามารถยกเลิกงานที่เสร็จสิ้นแล้ว'::TEXT;
    RETURN;
  END IF;
  
  -- Log cancellation
  PERFORM log_provider_cancellation(p_provider_id, p_ride_id, NULL, NULL, p_reason, 'provider_cancel');
  
  -- Release ride back to pending
  UPDATE ride_requests SET provider_id = NULL, status = 'pending', updated_at = NOW() WHERE id = p_ride_id;
  
  RETURN QUERY SELECT true, 'ยกเลิกงานสำเร็จ'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_provider_cancellation_stats(UUID, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION log_provider_cancellation(UUID, UUID, UUID, UUID, TEXT, VARCHAR) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION notify_nearby_providers_new_ride(UUID, DECIMAL, DECIMAL, INTEGER) TO authenticated, anon;
