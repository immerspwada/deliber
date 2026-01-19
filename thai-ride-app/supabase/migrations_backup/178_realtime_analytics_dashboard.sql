-- Migration: 178_realtime_analytics_dashboard.sql
-- Feature: Real-time Analytics Dashboard for Admin
-- Description: Add functions for live analytics data

-- ============================================
-- REAL-TIME DASHBOARD STATS
-- ============================================

-- Function: Get real-time order stats (last 24 hours breakdown)
CREATE OR REPLACE FUNCTION get_realtime_order_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'today_orders', COALESCE((
      SELECT COUNT(*) FROM ride_requests 
      WHERE created_at >= CURRENT_DATE
    ), 0),
    'today_completed', COALESCE((
      SELECT COUNT(*) FROM ride_requests 
      WHERE created_at >= CURRENT_DATE AND status = 'completed'
    ), 0),
    'today_cancelled', COALESCE((
      SELECT COUNT(*) FROM ride_requests 
      WHERE created_at >= CURRENT_DATE AND status = 'cancelled'
    ), 0),
    'today_revenue', COALESCE((
      SELECT SUM(COALESCE(final_fare, estimated_fare, 0)) FROM ride_requests 
      WHERE created_at >= CURRENT_DATE AND status = 'completed'
    ), 0),
    'active_rides', COALESCE((
      SELECT COUNT(*) FROM ride_requests 
      WHERE status IN ('pending', 'matched', 'arriving', 'in_progress')
    ), 0),
    'online_providers', COALESCE((
      SELECT COUNT(*) FROM service_providers 
      WHERE is_available = true AND status = 'approved'
    ), 0),
    'hourly_orders', (
      SELECT json_agg(hourly_data ORDER BY hour)
      FROM (
        SELECT 
          EXTRACT(HOUR FROM created_at)::int as hour,
          COUNT(*) as count,
          SUM(CASE WHEN status = 'completed' THEN COALESCE(final_fare, estimated_fare, 0) ELSE 0 END) as revenue
        FROM ride_requests
        WHERE created_at >= CURRENT_DATE
        GROUP BY EXTRACT(HOUR FROM created_at)
      ) hourly_data
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function: Get real-time service breakdown
CREATE OR REPLACE FUNCTION get_realtime_service_breakdown()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'rides', json_build_object(
      'total', COALESCE((SELECT COUNT(*) FROM ride_requests WHERE created_at >= CURRENT_DATE), 0),
      'active', COALESCE((SELECT COUNT(*) FROM ride_requests WHERE status IN ('pending', 'matched', 'in_progress')), 0),
      'completed', COALESCE((SELECT COUNT(*) FROM ride_requests WHERE created_at >= CURRENT_DATE AND status = 'completed'), 0),
      'revenue', COALESCE((SELECT SUM(COALESCE(final_fare, estimated_fare, 0)) FROM ride_requests WHERE created_at >= CURRENT_DATE AND status = 'completed'), 0)
    ),
    'deliveries', json_build_object(
      'total', COALESCE((SELECT COUNT(*) FROM delivery_requests WHERE created_at >= CURRENT_DATE), 0),
      'active', COALESCE((SELECT COUNT(*) FROM delivery_requests WHERE status IN ('pending', 'matched', 'picking_up', 'delivering')), 0),
      'completed', COALESCE((SELECT COUNT(*) FROM delivery_requests WHERE created_at >= CURRENT_DATE AND status = 'delivered'), 0),
      'revenue', COALESCE((SELECT SUM(COALESCE(final_fee, estimated_fee, 0)) FROM delivery_requests WHERE created_at >= CURRENT_DATE AND status = 'delivered'), 0)
    ),
    'shopping', json_build_object(
      'total', COALESCE((SELECT COUNT(*) FROM shopping_requests WHERE created_at >= CURRENT_DATE), 0),
      'active', COALESCE((SELECT COUNT(*) FROM shopping_requests WHERE status IN ('pending', 'matched', 'shopping', 'delivering')), 0),
      'completed', COALESCE((SELECT COUNT(*) FROM shopping_requests WHERE created_at >= CURRENT_DATE AND status = 'delivered'), 0),
      'revenue', COALESCE((SELECT SUM(COALESCE(final_total, estimated_total, 0)) FROM shopping_requests WHERE created_at >= CURRENT_DATE AND status = 'delivered'), 0)
    ),
    'queue', json_build_object(
      'total', COALESCE((SELECT COUNT(*) FROM queue_bookings WHERE created_at >= CURRENT_DATE), 0),
      'active', COALESCE((SELECT COUNT(*) FROM queue_bookings WHERE status IN ('pending', 'confirmed', 'in_queue')), 0),
      'completed', COALESCE((SELECT COUNT(*) FROM queue_bookings WHERE created_at >= CURRENT_DATE AND status = 'completed'), 0),
      'revenue', COALESCE((SELECT SUM(COALESCE(service_fee, 0)) FROM queue_bookings WHERE created_at >= CURRENT_DATE AND status = 'completed'), 0)
    ),
    'moving', json_build_object(
      'total', COALESCE((SELECT COUNT(*) FROM moving_requests WHERE created_at >= CURRENT_DATE), 0),
      'active', COALESCE((SELECT COUNT(*) FROM moving_requests WHERE status IN ('pending', 'matched', 'loading', 'in_transit')), 0),
      'completed', COALESCE((SELECT COUNT(*) FROM moving_requests WHERE created_at >= CURRENT_DATE AND status = 'completed'), 0),
      'revenue', COALESCE((SELECT SUM(COALESCE(final_price, estimated_price, 0)) FROM moving_requests WHERE created_at >= CURRENT_DATE AND status = 'completed'), 0)
    ),
    'laundry', json_build_object(
      'total', COALESCE((SELECT COUNT(*) FROM laundry_requests WHERE created_at >= CURRENT_DATE), 0),
      'active', COALESCE((SELECT COUNT(*) FROM laundry_requests WHERE status IN ('pending', 'matched', 'picked_up', 'washing', 'ready')), 0),
      'completed', COALESCE((SELECT COUNT(*) FROM laundry_requests WHERE created_at >= CURRENT_DATE AND status = 'delivered'), 0),
      'revenue', COALESCE((SELECT SUM(COALESCE(final_price, estimated_price, 0)) FROM laundry_requests WHERE created_at >= CURRENT_DATE AND status = 'delivered'), 0)
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function: Get live provider stats
CREATE OR REPLACE FUNCTION get_live_provider_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_providers', COALESCE((SELECT COUNT(*) FROM service_providers WHERE status = 'approved'), 0),
    'online_providers', COALESCE((SELECT COUNT(*) FROM service_providers WHERE is_available = true AND status = 'approved'), 0),
    'busy_providers', COALESCE((
      SELECT COUNT(DISTINCT provider_id) FROM ride_requests 
      WHERE status IN ('matched', 'arriving', 'in_progress') AND provider_id IS NOT NULL
    ), 0),
    'by_type', (
      SELECT json_object_agg(provider_type, stats)
      FROM (
        SELECT 
          provider_type,
          json_build_object(
            'total', COUNT(*),
            'online', COUNT(*) FILTER (WHERE is_available = true),
            'avg_rating', ROUND(AVG(rating)::numeric, 2)
          ) as stats
        FROM service_providers
        WHERE status = 'approved'
        GROUP BY provider_type
      ) type_stats
    ),
    'pending_verification', COALESCE((SELECT COUNT(*) FROM service_providers WHERE status = 'pending'), 0)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function: Get revenue trends (last 7 days)
CREATE OR REPLACE FUNCTION get_revenue_trends()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(daily_data ORDER BY date)
  FROM (
    SELECT 
      d.date::date as date,
      COALESCE(r.ride_revenue, 0) as ride_revenue,
      COALESCE(r.ride_count, 0) as ride_count,
      COALESCE(del.delivery_revenue, 0) as delivery_revenue,
      COALESCE(del.delivery_count, 0) as delivery_count,
      COALESCE(r.ride_revenue, 0) + COALESCE(del.delivery_revenue, 0) as total_revenue,
      COALESCE(r.ride_count, 0) + COALESCE(del.delivery_count, 0) as total_orders
    FROM (
      SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') as date
    ) d
    LEFT JOIN (
      SELECT 
        DATE(created_at) as date,
        SUM(COALESCE(final_fare, estimated_fare, 0)) as ride_revenue,
        COUNT(*) as ride_count
      FROM ride_requests
      WHERE status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY DATE(created_at)
    ) r ON d.date = r.date
    LEFT JOIN (
      SELECT 
        DATE(created_at) as date,
        SUM(COALESCE(final_fee, estimated_fee, 0)) as delivery_revenue,
        COUNT(*) as delivery_count
      FROM delivery_requests
      WHERE status = 'delivered' AND created_at >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY DATE(created_at)
    ) del ON d.date = del.date
  ) daily_data
  INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_realtime_order_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_realtime_service_breakdown() TO authenticated;
GRANT EXECUTE ON FUNCTION get_live_provider_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_trends() TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_realtime_order_stats() IS 'Get real-time order statistics for admin dashboard';
COMMENT ON FUNCTION get_realtime_service_breakdown() IS 'Get breakdown of all services for admin dashboard';
COMMENT ON FUNCTION get_live_provider_stats() IS 'Get live provider statistics for admin dashboard';
COMMENT ON FUNCTION get_revenue_trends() IS 'Get 7-day revenue trends for admin dashboard';
