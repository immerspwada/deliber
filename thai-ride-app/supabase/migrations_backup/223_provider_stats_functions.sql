-- Migration: Provider stats functions
-- Feature: provider-system-redesign
-- Purpose: Update provider statistics on job completion

-- Function to increment provider stats
CREATE OR REPLACE FUNCTION increment_provider_stats(
  p_provider_id UUID,
  p_earnings DECIMAL
) RETURNS VOID AS $$
BEGIN
  UPDATE providers
  SET 
    total_trips = total_trips + 1,
    total_earnings = total_earnings + p_earnings,
    updated_at = NOW()
  WHERE id = p_provider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refresh performance metrics materialized view
CREATE OR REPLACE FUNCTION refresh_provider_metrics()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY provider_performance_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule metrics refresh (call this periodically via cron or trigger)
CREATE OR REPLACE FUNCTION trigger_refresh_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh metrics after job completion
  PERFORM refresh_provider_metrics();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comment on functions
COMMENT ON FUNCTION increment_provider_stats IS 'Increments provider total trips and earnings';
COMMENT ON FUNCTION refresh_provider_metrics IS 'Refreshes the provider performance metrics materialized view';
