-- Migration 203: Admin Reports Generation Function
-- ================================================
-- Creates the admin_generate_report function for generating various reports

-- Drop existing function if exists
DROP FUNCTION IF EXISTS admin_generate_report(text, date, date);

-- Create report generation function
CREATE OR REPLACE FUNCTION admin_generate_report(
  p_report_type text,
  p_date_from date,
  p_date_to date
)
RETURNS TABLE (
  date date,
  service_type text,
  order_count bigint,
  revenue numeric,
  completed bigint,
  cancelled bigint,
  avg_rating numeric,
  provider_name text,
  customer_name text,
  completion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Revenue Report
  IF p_report_type = 'revenue' THEN
    RETURN QUERY
    SELECT 
      d.date::date,
      'all'::text as service_type,
      COALESCE(r.cnt, 0) + COALESCE(del.cnt, 0) + COALESCE(sh.cnt, 0) as order_count,
      COALESCE(r.rev, 0) + COALESCE(del.rev, 0) + COALESCE(sh.rev, 0) as revenue,
      COALESCE(r.comp, 0) + COALESCE(del.comp, 0) + COALESCE(sh.comp, 0) as completed,
      COALESCE(r.canc, 0) + COALESCE(del.canc, 0) + COALESCE(sh.canc, 0) as cancelled,
      0::numeric as avg_rating,
      ''::text as provider_name,
      ''::text as customer_name,
      CASE WHEN (COALESCE(r.cnt, 0) + COALESCE(del.cnt, 0) + COALESCE(sh.cnt, 0)) > 0 
        THEN ((COALESCE(r.comp, 0) + COALESCE(del.comp, 0) + COALESCE(sh.comp, 0))::numeric / 
              (COALESCE(r.cnt, 0) + COALESCE(del.cnt, 0) + COALESCE(sh.cnt, 0))::numeric * 100)
        ELSE 0 END as completion_rate
    FROM generate_series(p_date_from, p_date_to, '1 day'::interval) d(date)
    LEFT JOIN (
      SELECT created_at::date as dt, COUNT(*) as cnt, SUM(COALESCE(fare, 0)) as rev,
             COUNT(*) FILTER (WHERE status = 'completed') as comp,
             COUNT(*) FILTER (WHERE status = 'cancelled') as canc
      FROM ride_requests WHERE created_at::date BETWEEN p_date_from AND p_date_to
      GROUP BY created_at::date
    ) r ON r.dt = d.date::date
    LEFT JOIN (
      SELECT created_at::date as dt, COUNT(*) as cnt, SUM(COALESCE(delivery_fee, 0)) as rev,
             COUNT(*) FILTER (WHERE status = 'completed') as comp,
             COUNT(*) FILTER (WHERE status = 'cancelled') as canc
      FROM delivery_requests WHERE created_at::date BETWEEN p_date_from AND p_date_to
      GROUP BY created_at::date
    ) del ON del.dt = d.date::date
    LEFT JOIN (
      SELECT created_at::date as dt, COUNT(*) as cnt, SUM(COALESCE(total_amount, 0)) as rev,
             COUNT(*) FILTER (WHERE status = 'completed') as comp,
             COUNT(*) FILTER (WHERE status = 'cancelled') as canc
      FROM shopping_requests WHERE created_at::date BETWEEN p_date_from AND p_date_to
      GROUP BY created_at::date
    ) sh ON sh.dt = d.date::date
    ORDER BY d.date;

  -- Orders Report
  ELSIF p_report_type = 'orders' THEN
    RETURN QUERY
    SELECT 
      d.date::date,
      'ride'::text as service_type,
      COALESCE(r.cnt, 0) as order_count,
      COALESCE(r.rev, 0) as revenue,
      COALESCE(r.comp, 0) as completed,
      COALESCE(r.canc, 0) as cancelled,
      0::numeric as avg_rating,
      ''::text as provider_name,
      ''::text as customer_name,
      CASE WHEN COALESCE(r.cnt, 0) > 0 THEN (COALESCE(r.comp, 0)::numeric / r.cnt::numeric * 100) ELSE 0 END as completion_rate
    FROM generate_series(p_date_from, p_date_to, '1 day'::interval) d(date)
    LEFT JOIN (
      SELECT created_at::date as dt, COUNT(*) as cnt, SUM(COALESCE(fare, 0)) as rev,
             COUNT(*) FILTER (WHERE status = 'completed') as comp,
             COUNT(*) FILTER (WHERE status = 'cancelled') as canc
      FROM ride_requests WHERE created_at::date BETWEEN p_date_from AND p_date_to
      GROUP BY created_at::date
    ) r ON r.dt = d.date::date
    ORDER BY d.date;

  -- Providers Report
  ELSIF p_report_type = 'providers' THEN
    RETURN QUERY
    SELECT 
      p_date_from as date,
      sp.provider_type as service_type,
      COALESCE(stats.order_count, 0) as order_count,
      COALESCE(stats.revenue, 0) as revenue,
      COALESCE(stats.completed, 0) as completed,
      0::bigint as cancelled,
      COALESCE(stats.avg_rating, 0) as avg_rating,
      COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as provider_name,
      ''::text as customer_name,
      CASE WHEN COALESCE(stats.order_count, 0) > 0 
        THEN (COALESCE(stats.completed, 0)::numeric / stats.order_count::numeric * 100) 
        ELSE 0 END as completion_rate
    FROM service_providers sp
    LEFT JOIN users u ON sp.user_id = u.id
    LEFT JOIN (
      SELECT provider_id, COUNT(*) as order_count, SUM(COALESCE(fare, 0)) as revenue,
             COUNT(*) FILTER (WHERE status = 'completed') as completed,
             AVG(COALESCE((SELECT rating FROM ride_ratings WHERE ride_id = ride_requests.id), 0)) as avg_rating
      FROM ride_requests 
      WHERE created_at::date BETWEEN p_date_from AND p_date_to AND provider_id IS NOT NULL
      GROUP BY provider_id
    ) stats ON stats.provider_id = sp.id
    WHERE sp.status = 'active'
    ORDER BY stats.order_count DESC NULLS LAST
    LIMIT 100;

  -- Customers Report
  ELSIF p_report_type = 'customers' THEN
    RETURN QUERY
    SELECT 
      p_date_from as date,
      'all'::text as service_type,
      COALESCE(stats.order_count, 0) as order_count,
      COALESCE(stats.revenue, 0) as revenue,
      COALESCE(stats.completed, 0) as completed,
      0::bigint as cancelled,
      0::numeric as avg_rating,
      ''::text as provider_name,
      COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as customer_name,
      CASE WHEN COALESCE(stats.order_count, 0) > 0 
        THEN (COALESCE(stats.completed, 0)::numeric / stats.order_count::numeric * 100) 
        ELSE 0 END as completion_rate
    FROM users u
    LEFT JOIN (
      SELECT user_id, COUNT(*) as order_count, SUM(COALESCE(fare, 0)) as revenue,
             COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM ride_requests 
      WHERE created_at::date BETWEEN p_date_from AND p_date_to
      GROUP BY user_id
    ) stats ON stats.user_id = u.id
    WHERE stats.order_count > 0
    ORDER BY stats.order_count DESC
    LIMIT 100;

  -- Cancellations Report
  ELSIF p_report_type = 'cancellations' THEN
    RETURN QUERY
    SELECT 
      d.date::date,
      'all'::text as service_type,
      0::bigint as order_count,
      0::numeric as revenue,
      0::bigint as completed,
      COALESCE(r.canc, 0) + COALESCE(del.canc, 0) as cancelled,
      0::numeric as avg_rating,
      ''::text as provider_name,
      ''::text as customer_name,
      0::numeric as completion_rate
    FROM generate_series(p_date_from, p_date_to, '1 day'::interval) d(date)
    LEFT JOIN (
      SELECT created_at::date as dt, COUNT(*) as canc
      FROM ride_requests WHERE status = 'cancelled' AND created_at::date BETWEEN p_date_from AND p_date_to
      GROUP BY created_at::date
    ) r ON r.dt = d.date::date
    LEFT JOIN (
      SELECT created_at::date as dt, COUNT(*) as canc
      FROM delivery_requests WHERE status = 'cancelled' AND created_at::date BETWEEN p_date_from AND p_date_to
      GROUP BY created_at::date
    ) del ON del.dt = d.date::date
    ORDER BY d.date;

  -- Ratings Report
  ELSIF p_report_type = 'ratings' THEN
    RETURN QUERY
    SELECT 
      d.date::date,
      'ride'::text as service_type,
      COALESCE(r.cnt, 0) as order_count,
      0::numeric as revenue,
      0::bigint as completed,
      0::bigint as cancelled,
      COALESCE(r.avg_rating, 0) as avg_rating,
      ''::text as provider_name,
      ''::text as customer_name,
      0::numeric as completion_rate
    FROM generate_series(p_date_from, p_date_to, '1 day'::interval) d(date)
    LEFT JOIN (
      SELECT created_at::date as dt, COUNT(*) as cnt, AVG(rating) as avg_rating
      FROM ride_ratings WHERE created_at::date BETWEEN p_date_from AND p_date_to
      GROUP BY created_at::date
    ) r ON r.dt = d.date::date
    ORDER BY d.date;

  ELSE
    -- Default empty result
    RETURN;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_generate_report(text, date, date) TO authenticated;

-- Add comment
COMMENT ON FUNCTION admin_generate_report IS 'Generate various admin reports based on type and date range';
