-- Enhanced Admin Orders RPC Functions
-- Migration: 255_enhanced_admin_orders_rpc.sql
-- Description: Create enhanced RPC functions for better admin orders management
-- Date: 2026-01-13

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_all_orders_for_admin(text, text, integer, integer);
DROP FUNCTION IF EXISTS count_all_orders_for_admin(text, text);
DROP FUNCTION IF EXISTS get_orders_analytics_for_admin();
DROP FUNCTION IF EXISTS bulk_update_orders_status(text, text[], text, text);

-- Create enhanced order record type
CREATE TYPE enhanced_order_record AS (
  id UUID,
  tracking_id TEXT,
  service_type TEXT,
  status TEXT,
  priority TEXT,
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  user_email TEXT,
  provider_id UUID,
  provider_name TEXT,
  provider_phone TEXT,
  provider_rating NUMERIC,
  pickup_address TEXT,
  pickup_lat NUMERIC,
  pickup_lng NUMERIC,
  dropoff_address TEXT,
  dropoff_lat NUMERIC,
  dropoff_lng NUMERIC,
  estimated_amount NUMERIC,
  final_amount NUMERIC,
  payment_method TEXT,
  payment_status TEXT,
  promo_code TEXT,
  promo_discount NUMERIC,
  distance_km NUMERIC,
  duration_minutes INTEGER,
  special_notes TEXT,
  created_at TIMESTAMPTZ,
  matched_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  cancelled_by TEXT,
  rating NUMERIC,
  feedback TEXT,
  last_updated TIMESTAMPTZ
);

-- Enhanced get all orders function with better filtering and sorting
CREATE OR REPLACE FUNCTION get_all_orders_for_admin(
  p_service_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_order TEXT DEFAULT 'desc'
)
RETURNS SETOF enhanced_order_record
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  query_text TEXT;
  sort_clause TEXT;
BEGIN
  -- Build sort clause
  sort_clause := CASE p_sort_by
    WHEN 'amount' THEN 'COALESCE(final_amount, estimated_amount, 0)'
    WHEN 'distance' THEN 'distance_km'
    WHEN 'rating' THEN 'rating'
    WHEN 'user_name' THEN 'user_name'
    WHEN 'provider_name' THEN 'provider_name'
    ELSE 'created_at'
  END;
  
  IF p_sort_order = 'asc' THEN
    sort_clause := sort_clause || ' ASC NULLS LAST';
  ELSE
    sort_clause := sort_clause || ' DESC NULLS LAST';
  END IF;

  -- Union query across all service tables
  RETURN QUERY EXECUTE format('
    WITH all_orders AS (
      -- Ride Requests
      SELECT 
        r.id,
        COALESCE(r.tracking_id, LEFT(r.id::TEXT, 8)) as tracking_id,
        ''ride''::TEXT as service_type,
        r.status::TEXT,
        CASE 
          WHEN r.scheduled_time IS NOT NULL AND r.scheduled_time > NOW() THEN ''scheduled''
          WHEN r.status = ''pending'' AND r.created_at < NOW() - INTERVAL ''10 minutes'' THEN ''urgent''
          ELSE ''normal''
        END as priority,
        r.user_id,
        COALESCE(u.first_name || '' '' || u.last_name, u.email, ''Unknown'') as user_name,
        u.phone_number as user_phone,
        u.email as user_email,
        r.provider_id,
        COALESCE(p.first_name || '' '' || p.last_name, ''Unassigned'') as provider_name,
        p.phone_number as provider_phone,
        p.rating as provider_rating,
        r.pickup_address,
        r.pickup_lat,
        r.pickup_lng,
        r.destination_address as dropoff_address,
        r.destination_lat as dropoff_lat,
        r.destination_lng as dropoff_lng,
        r.estimated_fare as estimated_amount,
        COALESCE(r.final_fare, r.actual_fare) as final_amount,
        r.payment_method,
        r.payment_status,
        r.promo_code,
        r.promo_discount_amount as promo_discount,
        NULL::NUMERIC as distance_km,
        NULL::INTEGER as duration_minutes,
        COALESCE(r.special_requests, r.notes) as special_notes,
        r.created_at,
        r.started_at as matched_at,
        r.started_at,
        r.completed_at,
        r.cancelled_at,
        r.cancel_reason,
        r.cancelled_by,
        NULL::NUMERIC as rating,
        NULL::TEXT as feedback,
        r.updated_at as last_updated
      FROM ride_requests r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN providers_v2 p ON r.provider_id = p.id
      
      UNION ALL
      
      -- Delivery Requests
      SELECT 
        d.id,
        COALESCE(d.tracking_id, LEFT(d.id::TEXT, 8)) as tracking_id,
        ''delivery''::TEXT as service_type,
        d.status::TEXT,
        CASE 
          WHEN d.scheduled_pickup IS NOT NULL AND d.scheduled_pickup > NOW() THEN ''scheduled''
          WHEN d.status = ''pending'' AND d.created_at < NOW() - INTERVAL ''15 minutes'' THEN ''urgent''
          ELSE ''normal''
        END as priority,
        d.user_id,
        COALESCE(u.first_name || '' '' || u.last_name, u.email, ''Unknown'') as user_name,
        u.phone_number as user_phone,
        u.email as user_email,
        d.provider_id,
        COALESCE(p.first_name || '' '' || p.last_name, ''Unassigned'') as provider_name,
        p.phone_number as provider_phone,
        p.rating as provider_rating,
        d.sender_address as pickup_address,
        d.sender_lat as pickup_lat,
        d.sender_lng as pickup_lng,
        d.recipient_address as dropoff_address,
        d.recipient_lat as dropoff_lat,
        d.recipient_lng as dropoff_lng,
        d.estimated_fee as estimated_amount,
        d.final_fee as final_amount,
        d.payment_method,
        d.payment_status,
        d.promo_code,
        d.promo_discount_amount as promo_discount,
        d.distance_km,
        NULL::INTEGER as duration_minutes,
        d.special_instructions as special_notes,
        d.created_at,
        d.picked_up_at as matched_at,
        d.picked_up_at as started_at,
        d.delivered_at as completed_at,
        d.cancelled_at,
        d.cancel_reason,
        d.cancelled_by,
        NULL::NUMERIC as rating,
        NULL::TEXT as feedback,
        d.updated_at as last_updated
      FROM delivery_requests d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN providers_v2 p ON d.provider_id = p.id
      
      UNION ALL
      
      -- Shopping Requests
      SELECT 
        s.id,
        COALESCE(s.tracking_id, LEFT(s.id::TEXT, 8)) as tracking_id,
        ''shopping''::TEXT as service_type,
        s.status::TEXT,
        CASE 
          WHEN s.status = ''pending'' AND s.created_at < NOW() - INTERVAL ''20 minutes'' THEN ''urgent''
          WHEN s.budget_limit > 5000 THEN ''high_value''
          ELSE ''normal''
        END as priority,
        s.user_id,
        COALESCE(u.first_name || '' '' || u.last_name, u.email, ''Unknown'') as user_name,
        u.phone_number as user_phone,
        u.email as user_email,
        s.provider_id,
        COALESCE(p.first_name || '' '' || p.last_name, ''Unassigned'') as provider_name,
        p.phone_number as provider_phone,
        p.rating as provider_rating,
        COALESCE(s.store_name, s.store_address) as pickup_address,
        s.store_lat as pickup_lat,
        s.store_lng as pickup_lng,
        s.delivery_address as dropoff_address,
        s.delivery_lat as dropoff_lat,
        s.delivery_lng as dropoff_lng,
        s.service_fee as estimated_amount,
        s.total_cost as final_amount,
        s.payment_method,
        s.payment_status,
        s.promo_code,
        s.promo_discount_amount as promo_discount,
        NULL::NUMERIC as distance_km,
        NULL::INTEGER as duration_minutes,
        COALESCE(s.special_instructions, s.item_list) as special_notes,
        s.created_at,
        s.shopped_at as matched_at,
        s.shopped_at as started_at,
        s.delivered_at as completed_at,
        s.cancelled_at,
        s.cancel_reason,
        s.cancelled_by,
        NULL::NUMERIC as rating,
        NULL::TEXT as feedback,
        s.updated_at as last_updated
      FROM shopping_requests s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN providers_v2 p ON s.provider_id = p.id
    )
    SELECT * FROM all_orders
    WHERE ($1 IS NULL OR service_type = $1)
      AND ($2 IS NULL OR status = $2)
      AND ($5 IS NULL OR (
        tracking_id ILIKE ''%%'' || $5 || ''%%'' OR
        user_name ILIKE ''%%'' || $5 || ''%%'' OR
        provider_name ILIKE ''%%'' || $5 || ''%%'' OR
        pickup_address ILIKE ''%%'' || $5 || ''%%'' OR
        dropoff_address ILIKE ''%%'' || $5 || ''%%''
      ))
      AND ($6 IS NULL OR DATE(created_at) >= $6)
      AND ($7 IS NULL OR DATE(created_at) <= $7)
    ORDER BY %s
    LIMIT $3 OFFSET $4
  ', sort_clause)
  USING p_service_type, p_status, p_limit, p_offset, p_search, p_date_from, p_date_to;
END;
$$;

-- Enhanced count function
CREATE OR REPLACE FUNCTION count_all_orders_for_admin(
  p_service_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM (
    SELECT r.id FROM ride_requests r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN providers_v2 p ON r.provider_id = p.id
    WHERE (p_service_type IS NULL OR 'ride' = p_service_type)
      AND (p_status IS NULL OR r.status::TEXT = p_status)
      AND (p_search IS NULL OR (
        COALESCE(r.tracking_id, LEFT(r.id::TEXT, 8)) ILIKE '%' || p_search || '%' OR
        COALESCE(u.first_name || ' ' || u.last_name, u.email) ILIKE '%' || p_search || '%' OR
        COALESCE(p.first_name || ' ' || p.last_name) ILIKE '%' || p_search || '%'
      ))
      AND (p_date_from IS NULL OR DATE(r.created_at) >= p_date_from)
      AND (p_date_to IS NULL OR DATE(r.created_at) <= p_date_to)
    
    UNION ALL
    
    SELECT d.id FROM delivery_requests d
    LEFT JOIN users u ON d.user_id = u.id
    LEFT JOIN providers_v2 p ON d.provider_id = p.id
    WHERE (p_service_type IS NULL OR 'delivery' = p_service_type)
      AND (p_status IS NULL OR d.status::TEXT = p_status)
      AND (p_search IS NULL OR (
        COALESCE(d.tracking_id, LEFT(d.id::TEXT, 8)) ILIKE '%' || p_search || '%' OR
        COALESCE(u.first_name || ' ' || u.last_name, u.email) ILIKE '%' || p_search || '%' OR
        COALESCE(p.first_name || ' ' || p.last_name) ILIKE '%' || p_search || '%'
      ))
      AND (p_date_from IS NULL OR DATE(d.created_at) >= p_date_from)
      AND (p_date_to IS NULL OR DATE(d.created_at) <= p_date_to)
    
    UNION ALL
    
    SELECT s.id FROM shopping_requests s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN providers_v2 p ON s.provider_id = p.id
    WHERE (p_service_type IS NULL OR 'shopping' = p_service_type)
      AND (p_status IS NULL OR s.status::TEXT = p_status)
      AND (p_search IS NULL OR (
        COALESCE(s.tracking_id, LEFT(s.id::TEXT, 8)) ILIKE '%' || p_search || '%' OR
        COALESCE(u.first_name || ' ' || u.last_name, u.email) ILIKE '%' || p_search || '%' OR
        COALESCE(p.first_name || ' ' || p.last_name) ILIKE '%' || p_search || '%'
      ))
      AND (p_date_from IS NULL OR DATE(s.created_at) >= p_date_from)
      AND (p_date_to IS NULL OR DATE(s.created_at) <= p_date_to)
  ) combined;
  
  RETURN total_count;
END;
$$;

-- Orders analytics function
CREATE OR REPLACE FUNCTION get_orders_analytics_for_admin(
  p_date_from DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_date_to DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  WITH order_stats AS (
    SELECT 
      'ride' as service_type,
      COUNT(*) as total_orders,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders,
      COUNT(*) FILTER (WHERE status IN ('pending', 'matched', 'in_progress')) as active_orders,
      COALESCE(SUM(COALESCE(final_fare, actual_fare)) FILTER (WHERE status = 'completed'), 0) as total_revenue,
      COALESCE(AVG(COALESCE(final_fare, actual_fare)) FILTER (WHERE status = 'completed'), 0) as avg_order_value
    FROM ride_requests 
    WHERE DATE(created_at) BETWEEN p_date_from AND p_date_to
    
    UNION ALL
    
    SELECT 
      'delivery' as service_type,
      COUNT(*) as total_orders,
      COUNT(*) FILTER (WHERE status = 'delivered') as completed_orders,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders,
      COUNT(*) FILTER (WHERE status IN ('pending', 'matched', 'picked_up', 'in_transit')) as active_orders,
      COALESCE(SUM(final_fee) FILTER (WHERE status = 'delivered'), 0) as total_revenue,
      COALESCE(AVG(final_fee) FILTER (WHERE status = 'delivered'), 0) as avg_order_value
    FROM delivery_requests 
    WHERE DATE(created_at) BETWEEN p_date_from AND p_date_to
    
    UNION ALL
    
    SELECT 
      'shopping' as service_type,
      COUNT(*) as total_orders,
      COUNT(*) FILTER (WHERE status = 'delivered') as completed_orders,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders,
      COUNT(*) FILTER (WHERE status IN ('pending', 'matched', 'shopping', 'delivering')) as active_orders,
      COALESCE(SUM(total_cost) FILTER (WHERE status = 'delivered'), 0) as total_revenue,
      COALESCE(AVG(total_cost) FILTER (WHERE status = 'delivered'), 0) as avg_order_value
    FROM shopping_requests 
    WHERE DATE(created_at) BETWEEN p_date_from AND p_date_to
  ),
  hourly_stats AS (
    SELECT 
      EXTRACT(HOUR FROM created_at) as hour,
      COUNT(*) as order_count
    FROM (
      SELECT created_at FROM ride_requests WHERE DATE(created_at) = CURRENT_DATE
      UNION ALL
      SELECT created_at FROM delivery_requests WHERE DATE(created_at) = CURRENT_DATE
      UNION ALL
      SELECT created_at FROM shopping_requests WHERE DATE(created_at) = CURRENT_DATE
    ) all_today_orders
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY hour
  )
  SELECT json_build_object(
    'by_service', json_agg(row_to_json(order_stats.*)),
    'hourly_distribution', (
      SELECT json_agg(json_build_object('hour', hour, 'count', order_count))
      FROM hourly_stats
    ),
    'summary', json_build_object(
      'total_orders', (SELECT SUM(total_orders) FROM order_stats),
      'total_completed', (SELECT SUM(completed_orders) FROM order_stats),
      'total_cancelled', (SELECT SUM(cancelled_orders) FROM order_stats),
      'total_active', (SELECT SUM(active_orders) FROM order_stats),
      'total_revenue', (SELECT SUM(total_revenue) FROM order_stats),
      'avg_order_value', (SELECT AVG(avg_order_value) FROM order_stats),
      'completion_rate', CASE 
        WHEN (SELECT SUM(total_orders) FROM order_stats) > 0 
        THEN ROUND((SELECT SUM(completed_orders) FROM order_stats) * 100.0 / (SELECT SUM(total_orders) FROM order_stats), 2)
        ELSE 0 
      END,
      'cancellation_rate', CASE 
        WHEN (SELECT SUM(total_orders) FROM order_stats) > 0 
        THEN ROUND((SELECT SUM(cancelled_orders) FROM order_stats) * 100.0 / (SELECT SUM(total_orders) FROM order_stats), 2)
        ELSE 0 
      END
    )
  ) INTO result
  FROM order_stats;
  
  RETURN result;
END;
$$;

-- Bulk update orders status function
CREATE OR REPLACE FUNCTION bulk_update_orders_status(
  p_service_type TEXT,
  p_order_ids TEXT[],
  p_new_status TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER := 0;
  failed_count INTEGER := 0;
  table_name TEXT;
  order_id TEXT;
  result JSON;
BEGIN
  -- Determine table name
  table_name := CASE p_service_type
    WHEN 'ride' THEN 'ride_requests'
    WHEN 'delivery' THEN 'delivery_requests'
    WHEN 'shopping' THEN 'shopping_requests'
    WHEN 'queue' THEN 'queue_bookings'
    WHEN 'moving' THEN 'moving_requests'
    WHEN 'laundry' THEN 'laundry_requests'
    ELSE NULL
  END;
  
  IF table_name IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid service type',
      'updated_count', 0,
      'failed_count', array_length(p_order_ids, 1)
    );
  END IF;
  
  -- Update each order
  FOREACH order_id IN ARRAY p_order_ids
  LOOP
    BEGIN
      EXECUTE format('
        UPDATE %I SET 
          status = $1,
          updated_at = NOW(),
          %s
        WHERE id = $2::UUID
      ', 
        table_name,
        CASE 
          WHEN p_new_status = 'cancelled' THEN 
            'cancelled_at = NOW(), cancelled_by = ''admin'', cancel_reason = COALESCE($3, ''Cancelled by admin'')'
          WHEN p_new_status IN ('completed', 'delivered') THEN 
            CASE p_service_type
              WHEN 'ride' THEN 'completed_at = NOW()'
              WHEN 'delivery' THEN 'delivered_at = NOW()'
              WHEN 'shopping' THEN 'delivered_at = NOW()'
              ELSE 'completed_at = NOW()'
            END
          ELSE ''
        END
      ) USING p_new_status, order_id, p_reason;
      
      IF FOUND THEN
        updated_count := updated_count + 1;
      ELSE
        failed_count := failed_count + 1;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      failed_count := failed_count + 1;
    END;
  END LOOP;
  
  result := json_build_object(
    'success', updated_count > 0,
    'message', format('Updated %s orders, %s failed', updated_count, failed_count),
    'updated_count', updated_count,
    'failed_count', failed_count
  );
  
  RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin(TEXT, TEXT, INTEGER, INTEGER, TEXT, DATE, DATE, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION count_all_orders_for_admin(TEXT, TEXT, TEXT, DATE, DATE) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_orders_analytics_for_admin(DATE, DATE) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION bulk_update_orders_status(TEXT, TEXT[], TEXT, TEXT) TO anon, authenticated, service_role;

-- Comments
COMMENT ON FUNCTION get_all_orders_for_admin IS 'Enhanced admin orders view with advanced filtering, sorting, and search';
COMMENT ON FUNCTION count_all_orders_for_admin IS 'Count orders with same filtering as get_all_orders_for_admin';
COMMENT ON FUNCTION get_orders_analytics_for_admin IS 'Get comprehensive orders analytics and statistics';
COMMENT ON FUNCTION bulk_update_orders_status IS 'Bulk update multiple orders status with proper audit trail';