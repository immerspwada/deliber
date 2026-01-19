-- Migration: 112_production_analytics.sql
-- Production Analytics & Reporting
-- Features: Business metrics, KPIs, dashboards

-- =====================================================
-- 1. Daily Metrics Snapshot Table
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  metric_type TEXT NOT NULL, -- 'rides', 'deliveries', 'revenue', 'users', 'providers'
  
  -- Counts
  total_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  cancelled_count INTEGER DEFAULT 0,
  
  -- Revenue
  total_revenue DECIMAL(12,2) DEFAULT 0,
  platform_fee DECIMAL(12,2) DEFAULT 0,
  provider_earnings DECIMAL(12,2) DEFAULT 0,
  
  -- Averages
  avg_rating DECIMAL(3,2),
  avg_completion_time_minutes INTEGER,
  avg_fare DECIMAL(10,2),
  
  -- Growth
  new_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  returning_users INTEGER DEFAULT 0,
  
  -- Provider metrics
  online_providers INTEGER DEFAULT 0,
  active_providers INTEGER DEFAULT 0,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(metric_date, metric_type)
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_type ON daily_metrics(metric_type, metric_date DESC);

-- =====================================================
-- 2. Hourly Metrics Table (for real-time dashboards)
-- =====================================================
CREATE TABLE IF NOT EXISTS hourly_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_hour TIMESTAMPTZ NOT NULL,
  metric_type TEXT NOT NULL,
  
  request_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  cancelled_count INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  avg_wait_time_seconds INTEGER,
  online_providers INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(metric_hour, metric_type)
);

CREATE INDEX IF NOT EXISTS idx_hourly_metrics_hour ON hourly_metrics(metric_hour DESC);

-- =====================================================
-- 3. User Cohort Analysis Table
-- =====================================================
CREATE TABLE IF NOT EXISTS user_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_month DATE NOT NULL, -- First day of cohort month
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Retention tracking
  month_0_active BOOLEAN DEFAULT TRUE,
  month_1_active BOOLEAN DEFAULT FALSE,
  month_2_active BOOLEAN DEFAULT FALSE,
  month_3_active BOOLEAN DEFAULT FALSE,
  month_6_active BOOLEAN DEFAULT FALSE,
  month_12_active BOOLEAN DEFAULT FALSE,
  
  -- Lifetime value
  total_rides INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  last_activity_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(cohort_month, user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_cohorts_month ON user_cohorts(cohort_month);
CREATE INDEX IF NOT EXISTS idx_user_cohorts_user ON user_cohorts(user_id);

-- =====================================================
-- 4. Generate Daily Metrics Function
-- =====================================================
CREATE OR REPLACE FUNCTION generate_daily_metrics(p_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
BEGIN
  v_start_time := p_date::TIMESTAMPTZ;
  v_end_time := (p_date + 1)::TIMESTAMPTZ;
  
  -- Ride metrics
  INSERT INTO daily_metrics (metric_date, metric_type, total_count, completed_count, cancelled_count, 
    total_revenue, avg_rating, avg_fare)
  SELECT 
    p_date,
    'rides',
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COALESCE(SUM(final_fare) FILTER (WHERE status = 'completed'), 0),
    AVG(r.rating),
    AVG(final_fare) FILTER (WHERE status = 'completed')
  FROM ride_requests rr
  LEFT JOIN ride_ratings r ON r.ride_id = rr.id
  WHERE rr.created_at >= v_start_time AND rr.created_at < v_end_time
  ON CONFLICT (metric_date, metric_type) DO UPDATE SET
    total_count = EXCLUDED.total_count,
    completed_count = EXCLUDED.completed_count,
    cancelled_count = EXCLUDED.cancelled_count,
    total_revenue = EXCLUDED.total_revenue,
    avg_rating = EXCLUDED.avg_rating,
    avg_fare = EXCLUDED.avg_fare;
  
  -- Delivery metrics
  INSERT INTO daily_metrics (metric_date, metric_type, total_count, completed_count, cancelled_count, total_revenue)
  SELECT 
    p_date,
    'deliveries',
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COALESCE(SUM(final_fee) FILTER (WHERE status = 'completed'), 0)
  FROM delivery_requests
  WHERE created_at >= v_start_time AND created_at < v_end_time
  ON CONFLICT (metric_date, metric_type) DO UPDATE SET
    total_count = EXCLUDED.total_count,
    completed_count = EXCLUDED.completed_count,
    cancelled_count = EXCLUDED.cancelled_count,
    total_revenue = EXCLUDED.total_revenue;
  
  -- User metrics
  INSERT INTO daily_metrics (metric_date, metric_type, new_users, active_users)
  SELECT 
    p_date,
    'users',
    (SELECT COUNT(*) FROM users WHERE created_at >= v_start_time AND created_at < v_end_time),
    (SELECT COUNT(DISTINCT customer_id) FROM ride_requests 
     WHERE created_at >= v_start_time AND created_at < v_end_time)
  ON CONFLICT (metric_date, metric_type) DO UPDATE SET
    new_users = EXCLUDED.new_users,
    active_users = EXCLUDED.active_users;
  
  -- Provider metrics
  INSERT INTO daily_metrics (metric_date, metric_type, online_providers, active_providers)
  SELECT 
    p_date,
    'providers',
    (SELECT COUNT(*) FROM service_providers WHERE is_available = true AND status = 'approved'),
    (SELECT COUNT(DISTINCT provider_id) FROM ride_requests 
     WHERE created_at >= v_start_time AND created_at < v_end_time AND provider_id IS NOT NULL)
  ON CONFLICT (metric_date, metric_type) DO UPDATE SET
    online_providers = EXCLUDED.online_providers,
    active_providers = EXCLUDED.active_providers;
END;
$$;

-- =====================================================
-- 5. Get Dashboard KPIs Function
-- =====================================================
CREATE OR REPLACE FUNCTION get_dashboard_kpis(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  total_rides BIGINT,
  total_revenue DECIMAL,
  avg_rating DECIMAL,
  completion_rate DECIMAL,
  new_users BIGINT,
  active_providers BIGINT,
  rides_growth DECIMAL,
  revenue_growth DECIMAL
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_start DATE := CURRENT_DATE - p_days;
  v_previous_start DATE := CURRENT_DATE - (p_days * 2);
  v_previous_end DATE := CURRENT_DATE - p_days;
BEGIN
  RETURN QUERY
  WITH current_period AS (
    SELECT 
      COALESCE(SUM(total_count), 0) as rides,
      COALESCE(SUM(total_revenue), 0) as revenue,
      AVG(avg_rating) as rating,
      CASE WHEN SUM(total_count) > 0 
        THEN (SUM(completed_count)::DECIMAL / SUM(total_count)::DECIMAL) * 100 
        ELSE 0 END as completion
    FROM daily_metrics
    WHERE metric_date >= v_current_start AND metric_type = 'rides'
  ),
  previous_period AS (
    SELECT 
      COALESCE(SUM(total_count), 0) as rides,
      COALESCE(SUM(total_revenue), 0) as revenue
    FROM daily_metrics
    WHERE metric_date >= v_previous_start AND metric_date < v_previous_end AND metric_type = 'rides'
  ),
  user_stats AS (
    SELECT COALESCE(SUM(new_users), 0) as new_users
    FROM daily_metrics
    WHERE metric_date >= v_current_start AND metric_type = 'users'
  ),
  provider_stats AS (
    SELECT COALESCE(MAX(active_providers), 0) as active_providers
    FROM daily_metrics
    WHERE metric_date >= v_current_start AND metric_type = 'providers'
  )
  SELECT 
    c.rides::BIGINT,
    c.revenue,
    ROUND(c.rating, 2),
    ROUND(c.completion, 2),
    u.new_users::BIGINT,
    pr.active_providers::BIGINT,
    CASE WHEN p.rides > 0 
      THEN ROUND(((c.rides - p.rides)::DECIMAL / p.rides::DECIMAL) * 100, 2)
      ELSE 0 END,
    CASE WHEN p.revenue > 0 
      THEN ROUND(((c.revenue - p.revenue) / p.revenue) * 100, 2)
      ELSE 0 END
  FROM current_period c, previous_period p, user_stats u, provider_stats pr;
END;
$$;

-- =====================================================
-- 6. Get Revenue Breakdown Function
-- =====================================================
CREATE OR REPLACE FUNCTION get_revenue_breakdown(
  p_start_date DATE DEFAULT CURRENT_DATE - 30,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  service_type TEXT,
  total_revenue DECIMAL,
  transaction_count BIGINT,
  avg_transaction DECIMAL,
  percentage DECIMAL
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total DECIMAL;
BEGIN
  -- Calculate total revenue
  SELECT COALESCE(SUM(total_revenue), 0) INTO v_total
  FROM daily_metrics
  WHERE metric_date >= p_start_date AND metric_date <= p_end_date
    AND metric_type IN ('rides', 'deliveries', 'shopping');
  
  RETURN QUERY
  SELECT 
    dm.metric_type,
    COALESCE(SUM(dm.total_revenue), 0),
    COALESCE(SUM(dm.completed_count), 0)::BIGINT,
    CASE WHEN SUM(dm.completed_count) > 0 
      THEN ROUND(SUM(dm.total_revenue) / SUM(dm.completed_count), 2)
      ELSE 0 END,
    CASE WHEN v_total > 0 
      THEN ROUND((SUM(dm.total_revenue) / v_total) * 100, 2)
      ELSE 0 END
  FROM daily_metrics dm
  WHERE dm.metric_date >= p_start_date AND dm.metric_date <= p_end_date
    AND dm.metric_type IN ('rides', 'deliveries', 'shopping')
  GROUP BY dm.metric_type
  ORDER BY SUM(dm.total_revenue) DESC;
END;
$$;

-- =====================================================
-- 7. Get Hourly Activity Function
-- =====================================================
CREATE OR REPLACE FUNCTION get_hourly_activity(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  hour INTEGER,
  ride_count BIGINT,
  delivery_count BIGINT,
  total_revenue DECIMAL
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM created_at)::INTEGER as hour,
    COUNT(*) FILTER (WHERE 'ride' = 'ride')::BIGINT,
    0::BIGINT,
    COALESCE(SUM(final_fare), 0)
  FROM ride_requests
  WHERE created_at::DATE = p_date
  GROUP BY EXTRACT(HOUR FROM created_at)
  ORDER BY hour;
END;
$$;

-- =====================================================
-- 8. Get User Retention Function
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_retention(p_cohort_month DATE)
RETURNS TABLE (
  cohort_month DATE,
  total_users BIGINT,
  month_1_retention DECIMAL,
  month_2_retention DECIMAL,
  month_3_retention DECIMAL,
  month_6_retention DECIMAL
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uc.cohort_month,
    COUNT(*)::BIGINT,
    ROUND((COUNT(*) FILTER (WHERE month_1_active)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2),
    ROUND((COUNT(*) FILTER (WHERE month_2_active)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2),
    ROUND((COUNT(*) FILTER (WHERE month_3_active)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2),
    ROUND((COUNT(*) FILTER (WHERE month_6_active)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
  FROM user_cohorts uc
  WHERE uc.cohort_month = p_cohort_month
  GROUP BY uc.cohort_month;
END;
$$;

-- =====================================================
-- 9. Get Top Providers Function
-- =====================================================
CREATE OR REPLACE FUNCTION get_top_providers(
  p_limit INTEGER DEFAULT 10,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  provider_id UUID,
  provider_name TEXT,
  total_rides BIGINT,
  total_earnings DECIMAL,
  avg_rating DECIMAL,
  completion_rate DECIMAL
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    CONCAT(u.first_name, ' ', u.last_name),
    COUNT(rr.id)::BIGINT,
    COALESCE(SUM(rr.final_fare * 0.8), 0), -- 80% to provider
    ROUND(AVG(r.rating), 2),
    ROUND((COUNT(*) FILTER (WHERE rr.status = 'completed')::DECIMAL / 
           NULLIF(COUNT(*)::DECIMAL, 0)) * 100, 2)
  FROM service_providers sp
  JOIN users u ON u.id = sp.user_id
  LEFT JOIN ride_requests rr ON rr.provider_id = sp.id 
    AND rr.created_at > NOW() - (p_days || ' days')::INTERVAL
  LEFT JOIN ride_ratings r ON r.ride_id = rr.id
  WHERE sp.status = 'approved'
  GROUP BY sp.id, u.first_name, u.last_name
  ORDER BY COUNT(rr.id) DESC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- 10. RLS Policies
-- =====================================================
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cohorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read daily_metrics" ON daily_metrics
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin read hourly_metrics" ON hourly_metrics
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin read user_cohorts" ON user_cohorts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_daily_metrics(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_kpis(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_breakdown(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_hourly_activity(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_retention(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_providers(INTEGER, INTEGER) TO authenticated;
