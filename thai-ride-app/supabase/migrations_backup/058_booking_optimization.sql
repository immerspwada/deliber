-- Migration: 058_booking_optimization.sql
-- Feature: F02 - Customer Booking Flow Optimization
-- Description: Smart booking suggestions, fare predictions, and booking templates

-- =====================================================
-- 1. Booking Templates (Saved Booking Patterns)
-- =====================================================
CREATE TABLE IF NOT EXISTS booking_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('ride', 'delivery', 'shopping', 'queue', 'moving', 'laundry')),
  template_data JSONB NOT NULL DEFAULT '{}',
  pickup_location JSONB,
  destination_location JSONB,
  preferred_time TEXT,
  preferred_vehicle_type TEXT,
  notes TEXT,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_templates_user ON booking_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_templates_service ON booking_templates(service_type);

-- =====================================================
-- 2. Fare Predictions (ML-ready structure)
-- =====================================================
CREATE TABLE IF NOT EXISTS fare_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_area TEXT NOT NULL,
  destination_area TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  day_of_week INTEGER, -- 0-6
  hour_of_day INTEGER, -- 0-23
  avg_fare NUMERIC(10,2),
  min_fare NUMERIC(10,2),
  max_fare NUMERIC(10,2),
  sample_count INTEGER DEFAULT 0,
  surge_multiplier NUMERIC(3,2) DEFAULT 1.0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fare_predictions_route ON fare_predictions(pickup_area, destination_area);
CREATE INDEX IF NOT EXISTS idx_fare_predictions_time ON fare_predictions(day_of_week, hour_of_day);

-- =====================================================
-- 3. Smart Suggestions Log
-- =====================================================
CREATE TABLE IF NOT EXISTS booking_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('frequent_route', 'time_based', 'location_based', 'promo_based')),
  suggestion_data JSONB NOT NULL,
  relevance_score NUMERIC(3,2) DEFAULT 0.5,
  was_used BOOLEAN DEFAULT FALSE,
  shown_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_suggestions_user ON booking_suggestions(user_id);

-- =====================================================
-- 4. Booking Analytics
-- =====================================================
CREATE TABLE IF NOT EXISTS booking_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  funnel_step INTEGER,
  time_spent_ms INTEGER,
  device_type TEXT,
  app_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_analytics_user ON booking_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_analytics_event ON booking_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_booking_analytics_date ON booking_analytics(created_at);

-- =====================================================
-- 5. Enable RLS
-- =====================================================
ALTER TABLE booking_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE fare_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users manage own templates" ON booking_templates
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone read fare_predictions" ON fare_predictions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manage fare_predictions" ON fare_predictions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users read own suggestions" ON booking_suggestions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System insert suggestions" ON booking_suggestions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users insert own analytics" ON booking_analytics
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Admin read all analytics" ON booking_analytics
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 6. Functions
-- =====================================================

-- Get smart suggestions for user
CREATE OR REPLACE FUNCTION get_booking_suggestions(p_user_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
  suggestion_type TEXT,
  suggestion_data JSONB,
  relevance_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH frequent_routes AS (
    SELECT 
      'frequent_route' as stype,
      jsonb_build_object(
        'pickup', pickup_address,
        'destination', destination_address,
        'count', COUNT(*)
      ) as sdata,
      (COUNT(*)::NUMERIC / 10) as score
    FROM ride_requests
    WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY pickup_address, destination_address
    HAVING COUNT(*) >= 2
    ORDER BY COUNT(*) DESC
    LIMIT 3
  ),
  time_based AS (
    SELECT 
      'time_based' as stype,
      jsonb_build_object(
        'hour', EXTRACT(HOUR FROM created_at),
        'day', EXTRACT(DOW FROM created_at),
        'typical_destination', destination_address
      ) as sdata,
      0.7 as score
    FROM ride_requests
    WHERE user_id = p_user_id
      AND EXTRACT(HOUR FROM created_at) = EXTRACT(HOUR FROM NOW())
      AND EXTRACT(DOW FROM created_at) = EXTRACT(DOW FROM NOW())
    ORDER BY created_at DESC
    LIMIT 1
  )
  SELECT stype, sdata, score FROM frequent_routes
  UNION ALL
  SELECT stype, sdata, score FROM time_based
  ORDER BY score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Predict fare based on historical data
CREATE OR REPLACE FUNCTION predict_fare(
  p_pickup_area TEXT,
  p_destination_area TEXT,
  p_vehicle_type TEXT DEFAULT 'car'
) RETURNS TABLE (
  predicted_fare NUMERIC,
  min_fare NUMERIC,
  max_fare NUMERIC,
  confidence NUMERIC,
  surge_active BOOLEAN
) AS $$
DECLARE
  v_hour INTEGER;
  v_dow INTEGER;
BEGIN
  v_hour := EXTRACT(HOUR FROM NOW());
  v_dow := EXTRACT(DOW FROM NOW());
  
  RETURN QUERY
  SELECT 
    COALESCE(fp.avg_fare, 50.0) as predicted_fare,
    COALESCE(fp.min_fare, 35.0) as min_fare,
    COALESCE(fp.max_fare, 100.0) as max_fare,
    CASE 
      WHEN fp.sample_count > 100 THEN 0.9
      WHEN fp.sample_count > 50 THEN 0.7
      WHEN fp.sample_count > 10 THEN 0.5
      ELSE 0.3
    END as confidence,
    COALESCE(fp.surge_multiplier > 1.0, false) as surge_active
  FROM fare_predictions fp
  WHERE fp.pickup_area = p_pickup_area
    AND fp.destination_area = p_destination_area
    AND fp.vehicle_type = p_vehicle_type
    AND (fp.hour_of_day = v_hour OR fp.hour_of_day IS NULL)
  ORDER BY 
    CASE WHEN fp.hour_of_day = v_hour THEN 0 ELSE 1 END,
    fp.sample_count DESC
  LIMIT 1;
  
  -- Return default if no prediction found
  IF NOT FOUND THEN
    RETURN QUERY SELECT 50.0::NUMERIC, 35.0::NUMERIC, 100.0::NUMERIC, 0.2::NUMERIC, false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Save booking template
CREATE OR REPLACE FUNCTION save_booking_template(
  p_user_id UUID,
  p_name TEXT,
  p_service_type TEXT,
  p_template_data JSONB
) RETURNS UUID AS $$
DECLARE
  v_template_id UUID;
BEGIN
  INSERT INTO booking_templates (user_id, name, service_type, template_data)
  VALUES (p_user_id, p_name, p_service_type, p_template_data)
  RETURNING id INTO v_template_id;
  
  RETURN v_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Use booking template (increment counter)
CREATE OR REPLACE FUNCTION use_booking_template(p_template_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_template JSONB;
BEGIN
  UPDATE booking_templates
  SET use_count = use_count + 1, last_used_at = NOW()
  WHERE id = p_template_id
  RETURNING template_data INTO v_template;
  
  RETURN v_template;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Track booking funnel
CREATE OR REPLACE FUNCTION track_booking_event(
  p_user_id UUID,
  p_session_id TEXT,
  p_event_type TEXT,
  p_event_data JSONB DEFAULT '{}',
  p_funnel_step INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO booking_analytics (user_id, session_id, event_type, event_data, funnel_step)
  VALUES (p_user_id, p_session_id, p_event_type, p_event_data, p_funnel_step);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get booking funnel stats (Admin)
CREATE OR REPLACE FUNCTION get_booking_funnel_stats(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  funnel_step INTEGER,
  event_type TEXT,
  total_count BIGINT,
  unique_users BIGINT,
  avg_time_spent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ba.funnel_step,
    ba.event_type,
    COUNT(*) as total_count,
    COUNT(DISTINCT ba.user_id) as unique_users,
    AVG(ba.time_spent_ms)::NUMERIC as avg_time_spent
  FROM booking_analytics ba
  WHERE ba.created_at > NOW() - (p_days || ' days')::INTERVAL
    AND ba.funnel_step IS NOT NULL
  GROUP BY ba.funnel_step, ba.event_type
  ORDER BY ba.funnel_step;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update fare predictions from completed rides
CREATE OR REPLACE FUNCTION update_fare_predictions()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO fare_predictions (
    pickup_area, destination_area, vehicle_type,
    day_of_week, hour_of_day,
    avg_fare, min_fare, max_fare, sample_count
  )
  SELECT 
    SPLIT_PART(pickup_address, ',', 1) as pickup_area,
    SPLIT_PART(destination_address, ',', 1) as dest_area,
    COALESCE(vehicle_type, 'car'),
    EXTRACT(DOW FROM created_at)::INTEGER,
    EXTRACT(HOUR FROM created_at)::INTEGER,
    AVG(COALESCE(final_fare, estimated_fare)),
    MIN(COALESCE(final_fare, estimated_fare)),
    MAX(COALESCE(final_fare, estimated_fare)),
    COUNT(*)
  FROM ride_requests
  WHERE status = 'completed'
    AND created_at > NOW() - INTERVAL '30 days'
  GROUP BY 
    SPLIT_PART(pickup_address, ',', 1),
    SPLIT_PART(destination_address, ',', 1),
    COALESCE(vehicle_type, 'car'),
    EXTRACT(DOW FROM created_at),
    EXTRACT(HOUR FROM created_at)
  ON CONFLICT (pickup_area, destination_area, vehicle_type, day_of_week, hour_of_day)
  DO UPDATE SET
    avg_fare = EXCLUDED.avg_fare,
    min_fare = EXCLUDED.min_fare,
    max_fare = EXCLUDED.max_fare,
    sample_count = EXCLUDED.sample_count,
    last_updated = NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE booking_templates IS 'User-saved booking templates for quick rebooking';
COMMENT ON TABLE fare_predictions IS 'Historical fare data for predictions';
COMMENT ON TABLE booking_suggestions IS 'Smart suggestions shown to users';
COMMENT ON TABLE booking_analytics IS 'Booking funnel analytics';
