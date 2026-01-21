-- Fix Enhanced Admin Orders RPC Function Data Types
-- Migration: 256_fix_enhanced_admin_orders_data_types.sql
-- Description: Fix data type mismatches in enhanced admin orders RPC function
-- Date: 2026-01-13

-- Drop and recreate the enhanced order record type with correct data types
DROP TYPE IF EXISTS enhanced_order_record CASCADE;

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

-- Recreate the enhanced get all orders function with proper type casting
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

  -- Union query across all service tables with explicit type casting
  RETURN QUERY EXECUTE format('
    WITH all_orders AS (
      -- Ride Requests
      SELECT 
        r.id,
        COALESCE(r.tracking_id, LEFT(r.id::TEXT, 8))::TEXT as tracking_id,
        ''ride''::TEXT as service_type,
        r.status::TEXT,
        CASE 
          WHEN r.scheduled_time IS NOT NULL AND r.scheduled_time > NOW() THEN ''scheduled''::TEXT
          WHEN r.status = ''pending'' AND r.created_at < NOW() - INTERVAL ''10 minutes'' THEN ''urgent''::TEXT
          ELSE ''normal''::TEXT
        END as priority,
        r.user_id,
        COALESCE(u.first_name || '' '' || u.last_name, u.full_name, u.name, u.email, ''Unknown'')::TEXT as user_name,
        u.phone_number::TEXT as user_phone,
        u.email::TEXT as user_email,
        r.provider_id,
        COALESCE(p.first_name || '' '' || p.last_name, ''Unassigned'')::TEXT as provider_name,
        p.phone_number::TEXT as provider_phone,
        p.rating::NUMERIC as provider_rating,
        r.pickup_address::TEXT,
        r.pickup_lat::NUMERIC,
        r.pickup_lng::NUMERIC,
        r.destination_address::TEXT as dropoff_address,
        r.destination_lat::NUMERIC as dropoff_lat,
        r.destination_lng::NUMERIC as dropoff_lng,
        r.estimated_fare::NUMERIC as estimated_amount,
        COALESCE(r.final_fare, r.actual_fare)::NUMERIC as final_amount,
        COALESCE(r.payment_method, ''cash'')::TEXT as payment_method,
        COALESCE(r.payment_status, ''pending'')::TEXT as payment_status,
        r.promo_code::TEXT,
        COALESCE(r.promo_discount_amount, 0)::NUMERIC as promo_discount,
        NULL::NUMERIC as distance_km,
        NULL::INTEGER as duration_minutes,
        COALESCE(r.special_requests, r.notes)::TEXT as special_notes,
        r.created_at,
        r.started_at as matched_at,
        r.started_at,
        r.completed_at,
        r.cancelled_at,
        r.cancel_reason::TEXT,
        r.cancelled_by::TEXT,
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
        COALESCE(d.tracking_id, LEFT(d.id::TEXT, 8))::TEXT as tracking_id,
        ''delivery''::TEXT as service_type,
        d.status::TEXT,
        CASE 
          WHEN d.scheduled_pickup IS NOT NULL AND d.scheduled_pickup > NOW() THEN ''scheduled''::TEXT
          WHEN d.status = ''pending'' AND d.created_at < NOW() - INTERVAL ''15 minutes'' THEN ''urgent''::TEXT
          ELSE ''normal''::TEXT
        END as priority,
        d.user_id,
        COALESCE(u.first_name || '' '' || u.last_name, u.full_name, u.name, u.email, ''Unknown'')::TEXT as user_name,
        u.phone_number::TEXT as user_phone,
        u.email::TEXT as user_email,
        d.provider_id,
        COALESCE(p.first_name || '' '' || p.last_name, ''Unassigned'')::TEXT as provider_name,
        p.phone_number::TEXT as provider_phone,
        p.rating::NUMERIC as provider_rating,
        d.sender_address::TEXT as pickup_address,
        d.sender_lat::NUMERIC as pickup_lat,
        d.sender_lng::NUMERIC as pickup_lng,
        d.recipient_address::TEXT as dropoff_address,
        d.recipient_lat::NUMERIC as dropoff_lat,
        d.recipient_lng::NUMERIC as dropoff_lng,
        d.estimated_fee::NUMERIC as estimated_amount,
        d.final_fee::NUMERIC as final_amount,
        COALESCE(d.payment_method, ''cash'')::TEXT as payment_method,
        COALESCE(d.payment_status, ''pending'')::TEXT as payment_status,
        d.promo_code::TEXT,
        COALESCE(d.promo_discount_amount, 0)::NUMERIC as promo_discount,
        d.distance_km::NUMERIC,
        NULL::INTEGER as duration_minutes,
        d.special_instructions::TEXT as special_notes,
        d.created_at,
        d.picked_up_at as matched_at,
        d.picked_up_at as started_at,
        d.delivered_at as completed_at,
        d.cancelled_at,
        d.cancel_reason::TEXT,
        d.cancelled_by::TEXT,
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
        COALESCE(s.tracking_id, LEFT(s.id::TEXT, 8))::TEXT as tracking_id,
        ''shopping''::TEXT as service_type,
        s.status::TEXT,
        CASE 
          WHEN s.status = ''pending'' AND s.created_at < NOW() - INTERVAL ''20 minutes'' THEN ''urgent''::TEXT
          WHEN s.budget_limit > 5000 THEN ''high_value''::TEXT
          ELSE ''normal''::TEXT
        END as priority,
        s.user_id,
        COALESCE(u.first_name || '' '' || u.last_name, u.full_name, u.name, u.email, ''Unknown'')::TEXT as user_name,
        u.phone_number::TEXT as user_phone,
        u.email::TEXT as user_email,
        s.provider_id,
        COALESCE(p.first_name || '' '' || p.last_name, ''Unassigned'')::TEXT as provider_name,
        p.phone_number::TEXT as provider_phone,
        p.rating::NUMERIC as provider_rating,
        COALESCE(s.store_name, s.store_address)::TEXT as pickup_address,
        s.store_lat::NUMERIC as pickup_lat,
        s.store_lng::NUMERIC as pickup_lng,
        s.delivery_address::TEXT as dropoff_address,
        s.delivery_lat::NUMERIC as dropoff_lat,
        s.delivery_lng::NUMERIC as dropoff_lng,
        s.service_fee::NUMERIC as estimated_amount,
        s.total_cost::NUMERIC as final_amount,
        COALESCE(s.payment_method, ''cash'')::TEXT as payment_method,
        COALESCE(s.payment_status, ''pending'')::TEXT as payment_status,
        s.promo_code::TEXT,
        COALESCE(s.promo_discount_amount, 0)::NUMERIC as promo_discount,
        NULL::NUMERIC as distance_km,
        NULL::INTEGER as duration_minutes,
        COALESCE(s.special_instructions, s.item_list)::TEXT as special_notes,
        s.created_at,
        s.shopped_at as matched_at,
        s.shopped_at as started_at,
        s.delivered_at as completed_at,
        s.cancelled_at,
        s.cancel_reason::TEXT,
        s.cancelled_by::TEXT,
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin(TEXT, TEXT, INTEGER, INTEGER, TEXT, DATE, DATE, TEXT, TEXT) TO anon, authenticated, service_role;

-- Comments
COMMENT ON FUNCTION get_all_orders_for_admin IS 'Enhanced admin orders view with fixed data types and explicit casting';