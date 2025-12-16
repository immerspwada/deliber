-- =============================================
-- PROVIDER MODULE: Earnings & Payouts
-- =============================================
-- Feature: F14 - Provider Dashboard (Earnings)
-- Used by: Provider App
-- Depends on: provider/001_service_providers.sql
-- =============================================

-- Provider earnings summary view
CREATE OR REPLACE VIEW provider_earnings_summary AS
SELECT 
  sp.id as provider_id,
  sp.user_id,
  sp.total_earnings,
  sp.total_trips,
  CASE WHEN sp.total_trips > 0 
    THEN ROUND(sp.total_earnings / sp.total_trips, 2) 
    ELSE 0 
  END as avg_earning_per_trip,
  sp.rating,
  
  -- Today's stats
  COALESCE(today.trips, 0) as today_trips,
  COALESCE(today.earnings, 0) as today_earnings,
  
  -- This week stats
  COALESCE(week.trips, 0) as week_trips,
  COALESCE(week.earnings, 0) as week_earnings,
  
  -- This month stats
  COALESCE(month.trips, 0) as month_trips,
  COALESCE(month.earnings, 0) as month_earnings

FROM service_providers sp

LEFT JOIN LATERAL (
  SELECT COUNT(*) as trips, COALESCE(SUM(actual_fare), 0) as earnings
  FROM ride_requests 
  WHERE provider_id = sp.id 
    AND status = 'completed'
    AND DATE(completed_at) = CURRENT_DATE
) today ON true

LEFT JOIN LATERAL (
  SELECT COUNT(*) as trips, COALESCE(SUM(actual_fare), 0) as earnings
  FROM ride_requests 
  WHERE provider_id = sp.id 
    AND status = 'completed'
    AND completed_at >= DATE_TRUNC('week', CURRENT_DATE)
) week ON true

LEFT JOIN LATERAL (
  SELECT COUNT(*) as trips, COALESCE(SUM(actual_fare), 0) as earnings
  FROM ride_requests 
  WHERE provider_id = sp.id 
    AND status = 'completed'
    AND completed_at >= DATE_TRUNC('month', CURRENT_DATE)
) month ON true;

-- Provider daily earnings
CREATE OR REPLACE VIEW provider_daily_earnings AS
SELECT 
  provider_id,
  DATE(completed_at) as date,
  COUNT(*) as trips,
  SUM(actual_fare) as earnings,
  AVG(actual_fare) as avg_fare
FROM ride_requests
WHERE status = 'completed'
  AND completed_at IS NOT NULL
GROUP BY provider_id, DATE(completed_at)
ORDER BY date DESC;

-- Function to get provider earnings by period
CREATE OR REPLACE FUNCTION get_provider_earnings(
  p_provider_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  date DATE,
  trips BIGINT,
  earnings DECIMAL(12,2),
  avg_fare DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(r.completed_at) as date,
    COUNT(*) as trips,
    COALESCE(SUM(r.actual_fare), 0)::DECIMAL(12,2) as earnings,
    COALESCE(AVG(r.actual_fare), 0)::DECIMAL(10,2) as avg_fare
  FROM ride_requests r
  WHERE r.provider_id = p_provider_id
    AND r.status = 'completed'
    AND r.completed_at IS NOT NULL
    AND (p_start_date IS NULL OR DATE(r.completed_at) >= p_start_date)
    AND (p_end_date IS NULL OR DATE(r.completed_at) <= p_end_date)
  GROUP BY DATE(r.completed_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to update provider stats after ride completion
CREATE OR REPLACE FUNCTION update_provider_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE service_providers
    SET 
      total_trips = total_trips + 1,
      total_earnings = total_earnings + COALESCE(NEW.actual_fare, NEW.estimated_fare),
      updated_at = NOW()
    WHERE id = NEW.provider_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_provider_stats ON ride_requests;
CREATE TRIGGER trigger_update_provider_stats
  AFTER UPDATE ON ride_requests
  FOR EACH ROW EXECUTE FUNCTION update_provider_stats();
