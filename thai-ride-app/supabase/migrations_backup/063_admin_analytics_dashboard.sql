-- Migration: 063_admin_analytics_dashboard.sql
-- Feature: F23 - Admin Analytics Dashboard
-- Description: Comprehensive analytics for admin dashboard

-- =====================================================
-- 1. Dashboard Metrics Cache
-- =====================================================
CREATE TABLE IF NOT EXISTS dashboard_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key TEXT NOT NULL UNIQUE,
  metric_value NUMERIC,
  metric_data JSONB DEFAULT '{}',
  period TEXT DEFAULT 'realtime',
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. Revenue Analytics
-- =====================================================
CREATE TABLE IF NOT EXISTS revenue_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  service_type TEXT NOT NULL,
  
  -- Revenue
  gross_revenue NUMERIC(12,2) DEFAULT 0,
  net_revenue NUMERIC(12,2) DEFAULT 0,
  platform_fee NUMERIC(10,2) DEFAULT 0,
  provider_earnings NUMERIC(12,2) DEFAULT 0,
  
  -- Orders
  total_orders INTEGER DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  cancelled_orders INTEGER DEFAULT 0,
  
  -- Averages
  avg_order_value NUMERIC(10,2),
  avg_tip NUMERIC(10,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, service_type)
);

CREATE INDEX IF NOT EXISTS idx_revenue_date ON revenue_analytics(date);

-- =====================================================
-- 3. User Analytics
-- =====================================================
CREATE TABLE IF NOT EXISTS user_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  
  -- User counts
  total_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  returning_users INTEGER DEFAULT 0,
  churned_users INTEGER DEFAULT 0,
  
  -- Provider counts
  total_providers INTEGER DEFAULT 0,
  new_providers INTEGER DEFAULT 0,
  active_providers INTEGER DEFAULT 0,
  online_providers_avg INTEGER DEFAULT 0,
  
  -- Engagement
  avg_sessions_per_user NUMERIC(5,2),
  avg_session_duration_mins NUMERIC(6,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

-- =====================================================
-- 4. Service Analytics
-- =====================================================
CREATE TABLE IF NOT EXISTS service_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  hour INTEGER, -- 0-23, NULL for daily
  service_type TEXT NOT NULL,
  
  -- Demand
  total_requests INTEGER DEFAULT 0,
  fulfilled_requests INTEGER DEFAULT 0,
  unfulfilled_requests INTEGER DEFAULT 0,
  
  -- Timing
  avg_wait_time_mins NUMERIC(6,2),
  avg_trip_duration_mins NUMERIC(6,2),
  avg_eta_accuracy NUMERIC(5,2), -- percentage
  
  -- Geography
  top_pickup_areas JSONB DEFAULT '[]',
  top_destination_areas JSONB DEFAULT '[]',
  
  -- Pricing
  avg_fare NUMERIC(10,2),
  surge_multiplier_avg NUMERIC(3,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, hour, service_type)
);

CREATE INDEX IF NOT EXISTS idx_service_analytics_date ON service_analytics(date);

-- =====================================================
-- 5. Enable RLS
-- =====================================================
ALTER TABLE dashboard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_analytics ENABLE ROW LEVEL SECURITY;

-- Admin only policies
CREATE POLICY "Admin read dashboard_metrics" ON dashboard_metrics
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin read revenue_analytics" ON revenue_analytics
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin read user_analytics" ON user_analytics
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin read service_analytics" ON service_analytics
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 6. Functions
-- =====================================================

-- Get real-time dashboard stats
CREATE OR REPLACE FUNCTION get_realtime_dashboard_stats()
RETURNS TABLE (
  total_users BIGINT,
  total_providers BIGINT,
  online_providers BIGINT,
  active_rides BIGINT,
  active_deliveries BIGINT,
  today_revenue NUMERIC,
  today_orders BIGINT,
  pending_verifications BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM users WHERE role = 'customer')::BIGINT,
    (SELECT COUNT(*) FROM service_providers)::BIGINT,
    (SELECT COUNT(*) FROM service_providers WHERE is_available = true)::BIGINT,
    (SELECT COUNT(*) FROM ride_requests WHERE status IN ('pending', 'matched', 'pickup', 'in_progress'))::BIGINT,
    (SELECT COUNT(*) FROM delivery_requests WHERE status IN ('pending', 'matched', 'picked_up', 'in_transit'))::BIGINT,
    COALESCE((SELECT SUM(COALESCE(final_fare, estimated_fare)) FROM ride_requests WHERE status = 'completed' AND DATE(created_at) = CURRENT_DATE), 0),
    (SELECT COUNT(*) FROM ride_requests WHERE DATE(created_at) = CURRENT_DATE)::BIGINT,
    (SELECT COUNT(*) FROM service_providers WHERE status = 'pending')::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get revenue trend
CREATE OR REPLACE FUNCTION get_revenue_trend(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  ride_revenue NUMERIC,
  delivery_revenue NUMERIC,
  shopping_revenue NUMERIC,
  total_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH dates AS (
    SELECT generate_series(
      CURRENT_DATE - (p_days - 1),
      CURRENT_DATE,
      '1 day'::INTERVAL
    )::DATE as d
  ),
  ride_rev AS (
    SELECT DATE(created_at) as d, SUM(COALESCE(final_fare, estimated_fare)) as rev
    FROM ride_requests WHERE status = 'completed' AND created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY DATE(created_at)
  ),
  delivery_rev AS (
    SELECT DATE(created_at) as d, SUM(COALESCE(final_fee, estimated_fee)) as rev
    FROM delivery_requests WHERE status = 'delivered' AND created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY DATE(created_at)
  ),
  shopping_rev AS (
    SELECT DATE(created_at) as d, SUM(COALESCE(final_total, estimated_total)) as rev
    FROM shopping_requests WHERE status = 'delivered' AND created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY DATE(created_at)
  )
  SELECT 
    dates.d,
    COALESCE(ride_rev.rev, 0) as ride_revenue,
    COALESCE(delivery_rev.rev, 0) as delivery_revenue,
    COALESCE(shopping_rev.rev, 0) as shopping_revenue,
    COALESCE(ride_rev.rev, 0) + COALESCE(delivery_rev.rev, 0) + COALESCE(shopping_rev.rev, 0) as total_revenue
  FROM dates
  LEFT JOIN ride_rev ON dates.d = ride_rev.d
  LEFT JOIN delivery_rev ON dates.d = delivery_rev.d
  LEFT JOIN shopping_rev ON dates.d = shopping_rev.d
  ORDER BY dates.d;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get orders by hour
CREATE OR REPLACE FUNCTION get_orders_by_hour(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  hour INTEGER,
  ride_count BIGINT,
  delivery_count BIGINT,
  shopping_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH hours AS (SELECT generate_series(0, 23) as h)
  SELECT 
    hours.h as hour,
    COALESCE((SELECT COUNT(*) FROM ride_requests WHERE DATE(created_at) = p_date AND EXTRACT(HOUR FROM created_at) = hours.h), 0) as ride_count,
    COALESCE((SELECT COUNT(*) FROM delivery_requests WHERE DATE(created_at) = p_date AND EXTRACT(HOUR FROM created_at) = hours.h), 0) as delivery_count,
    COALESCE((SELECT COUNT(*) FROM shopping_requests WHERE DATE(created_at) = p_date AND EXTRACT(HOUR FROM created_at) = hours.h), 0) as shopping_count
  FROM hours
  ORDER BY hours.h;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get top providers
CREATE OR REPLACE FUNCTION get_top_providers(p_limit INTEGER DEFAULT 10, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  provider_id UUID,
  provider_name TEXT,
  provider_type TEXT,
  total_trips BIGINT,
  total_earnings NUMERIC,
  avg_rating NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    u.first_name || ' ' || u.last_name as provider_name,
    sp.provider_type,
    COUNT(rr.id) as total_trips,
    SUM(COALESCE(rr.final_fare, rr.estimated_fare) * 0.8) as total_earnings,
    AVG(rr2.rating)::NUMERIC(3,2) as avg_rating
  FROM service_providers sp
  JOIN users u ON sp.user_id = u.id
  LEFT JOIN ride_requests rr ON sp.id = rr.provider_id AND rr.status = 'completed' AND rr.created_at > NOW() - (p_days || ' days')::INTERVAL
  LEFT JOIN ride_ratings rr2 ON sp.id = rr2.provider_id
  GROUP BY sp.id, u.first_name, u.last_name, sp.provider_type
  ORDER BY total_trips DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user growth
CREATE OR REPLACE FUNCTION get_user_growth(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  new_users BIGINT,
  cumulative_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_new AS (
    SELECT DATE(created_at) as d, COUNT(*) as cnt
    FROM users
    WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY DATE(created_at)
  )
  SELECT 
    d as date,
    cnt as new_users,
    SUM(cnt) OVER (ORDER BY d) as cumulative_users
  FROM daily_new
  ORDER BY d;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get service distribution
CREATE OR REPLACE FUNCTION get_service_distribution(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  service_type TEXT,
  total_orders BIGINT,
  percentage NUMERIC
) AS $$
DECLARE
  v_total BIGINT;
BEGIN
  SELECT 
    (SELECT COUNT(*) FROM ride_requests WHERE created_at > NOW() - (p_days || ' days')::INTERVAL) +
    (SELECT COUNT(*) FROM delivery_requests WHERE created_at > NOW() - (p_days || ' days')::INTERVAL) +
    (SELECT COUNT(*) FROM shopping_requests WHERE created_at > NOW() - (p_days || ' days')::INTERVAL)
  INTO v_total;
  
  RETURN QUERY
  SELECT 'ride'::TEXT, 
    (SELECT COUNT(*) FROM ride_requests WHERE created_at > NOW() - (p_days || ' days')::INTERVAL),
    CASE WHEN v_total > 0 THEN ((SELECT COUNT(*) FROM ride_requests WHERE created_at > NOW() - (p_days || ' days')::INTERVAL)::NUMERIC / v_total * 100) ELSE 0 END
  UNION ALL
  SELECT 'delivery'::TEXT,
    (SELECT COUNT(*) FROM delivery_requests WHERE created_at > NOW() - (p_days || ' days')::INTERVAL),
    CASE WHEN v_total > 0 THEN ((SELECT COUNT(*) FROM delivery_requests WHERE created_at > NOW() - (p_days || ' days')::INTERVAL)::NUMERIC / v_total * 100) ELSE 0 END
  UNION ALL
  SELECT 'shopping'::TEXT,
    (SELECT COUNT(*) FROM shopping_requests WHERE created_at > NOW() - (p_days || ' days')::INTERVAL),
    CASE WHEN v_total > 0 THEN ((SELECT COUNT(*) FROM shopping_requests WHERE created_at > NOW() - (p_days || ' days')::INTERVAL)::NUMERIC / v_total * 100) ELSE 0 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update daily analytics (scheduled job)
CREATE OR REPLACE FUNCTION update_daily_analytics()
RETURNS VOID AS $$
BEGIN
  -- Update revenue analytics
  INSERT INTO revenue_analytics (date, service_type, gross_revenue, total_orders, completed_orders, cancelled_orders, avg_order_value)
  SELECT 
    CURRENT_DATE - 1,
    'ride',
    COALESCE(SUM(COALESCE(final_fare, estimated_fare)), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    AVG(COALESCE(final_fare, estimated_fare))
  FROM ride_requests
  WHERE DATE(created_at) = CURRENT_DATE - 1
  ON CONFLICT (date, service_type) DO UPDATE SET
    gross_revenue = EXCLUDED.gross_revenue,
    total_orders = EXCLUDED.total_orders,
    completed_orders = EXCLUDED.completed_orders,
    cancelled_orders = EXCLUDED.cancelled_orders,
    avg_order_value = EXCLUDED.avg_order_value;
  
  -- Update user analytics
  INSERT INTO user_analytics (date, total_users, new_users, active_users, total_providers, new_providers, active_providers)
  SELECT 
    CURRENT_DATE - 1,
    (SELECT COUNT(*) FROM users),
    (SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURRENT_DATE - 1),
    (SELECT COUNT(DISTINCT user_id) FROM ride_requests WHERE DATE(created_at) = CURRENT_DATE - 1),
    (SELECT COUNT(*) FROM service_providers),
    (SELECT COUNT(*) FROM service_providers WHERE DATE(created_at) = CURRENT_DATE - 1),
    (SELECT COUNT(DISTINCT provider_id) FROM ride_requests WHERE DATE(created_at) = CURRENT_DATE - 1 AND provider_id IS NOT NULL)
  ON CONFLICT (date) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    new_users = EXCLUDED.new_users,
    active_users = EXCLUDED.active_users,
    total_providers = EXCLUDED.total_providers,
    new_providers = EXCLUDED.new_providers,
    active_providers = EXCLUDED.active_providers;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE dashboard_metrics IS 'Cached dashboard metrics for fast loading';
COMMENT ON TABLE revenue_analytics IS 'Daily revenue analytics by service type';
COMMENT ON TABLE user_analytics IS 'Daily user and provider analytics';
COMMENT ON TABLE service_analytics IS 'Hourly/daily service analytics';
