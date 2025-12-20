-- Migration: 120_order_history_view.sql
-- Feature: Order History View with Provider Info
-- Description: Create unified view for order history with pre-joined provider and user data

-- =====================================================
-- DROP EXISTING VIEW IF EXISTS
-- =====================================================
DROP VIEW IF EXISTS order_history_view;

-- =====================================================
-- CREATE UNIFIED ORDER HISTORY VIEW
-- =====================================================
CREATE OR REPLACE VIEW order_history_view AS

-- Ride Requests
SELECT 
    r.id,
    r.tracking_id,
    'ride' as service_type,
    r.user_id,
    r.provider_id,
    r.pickup_address as from_address,
    r.destination_address as to_address,
    r.estimated_fare as estimated_price,
    COALESCE(r.final_fare, r.estimated_fare) as final_price,
    r.status,
    r.created_at,
    r.completed_at,
    r.ride_type as service_subtype,
    -- Provider info
    sp.tracking_id as provider_tracking_id,
    sp.vehicle_type,
    sp.vehicle_plate,
    sp.vehicle_color,
    sp.rating as provider_rating,
    -- User info (provider's user)
    u.name as provider_name,
    u.avatar_url as provider_avatar,
    u.phone_number as provider_phone,
    -- Rating info
    rr.rating as customer_rating,
    rr.comment as rating_comment,
    r.rated_at
FROM ride_requests r
LEFT JOIN service_providers sp ON r.provider_id = sp.id
LEFT JOIN users u ON sp.user_id = u.id
LEFT JOIN ride_ratings rr ON rr.ride_id = r.id

UNION ALL

-- Delivery Requests
SELECT 
    d.id,
    d.tracking_id,
    'delivery' as service_type,
    d.user_id,
    d.provider_id,
    d.sender_address as from_address,
    d.recipient_address as to_address,
    d.estimated_fee as estimated_price,
    COALESCE(d.final_fee, d.estimated_fee) as final_price,
    d.status,
    d.created_at,
    d.delivered_at as completed_at,
    d.package_type as service_subtype,
    -- Provider info
    sp.tracking_id as provider_tracking_id,
    sp.vehicle_type,
    sp.vehicle_plate,
    sp.vehicle_color,
    sp.rating as provider_rating,
    -- User info
    u.name as provider_name,
    u.avatar_url as provider_avatar,
    u.phone_number as provider_phone,
    -- Rating info
    dr.rating as customer_rating,
    dr.comment as rating_comment,
    d.rated_at
FROM delivery_requests d
LEFT JOIN service_providers sp ON d.provider_id = sp.id
LEFT JOIN users u ON sp.user_id = u.id
LEFT JOIN delivery_ratings dr ON dr.delivery_id = d.id

UNION ALL

-- Shopping Requests
SELECT 
    s.id,
    s.tracking_id,
    'shopping' as service_type,
    s.user_id,
    s.provider_id,
    COALESCE(s.store_name, s.store_address) as from_address,
    s.delivery_address as to_address,
    s.service_fee as estimated_price,
    COALESCE(s.total_cost, s.service_fee) as final_price,
    s.status,
    s.created_at,
    s.delivered_at as completed_at,
    NULL as service_subtype,
    -- Provider info
    sp.tracking_id as provider_tracking_id,
    sp.vehicle_type,
    sp.vehicle_plate,
    sp.vehicle_color,
    sp.rating as provider_rating,
    -- User info
    u.name as provider_name,
    u.avatar_url as provider_avatar,
    u.phone_number as provider_phone,
    -- Rating info
    sr.rating as customer_rating,
    sr.comment as rating_comment,
    s.rated_at
FROM shopping_requests s
LEFT JOIN service_providers sp ON s.provider_id = sp.id
LEFT JOIN users u ON sp.user_id = u.id
LEFT JOIN shopping_ratings sr ON sr.shopping_id = s.id

UNION ALL

-- Queue Bookings
SELECT 
    q.id,
    q.tracking_id,
    'queue' as service_type,
    q.user_id,
    q.provider_id,
    q.category as from_address,
    COALESCE(q.place_name, q.place_address) as to_address,
    q.service_fee as estimated_price,
    COALESCE(q.final_fee, q.service_fee) as final_price,
    q.status,
    q.created_at,
    q.completed_at,
    q.category as service_subtype,
    -- Provider info
    sp.tracking_id as provider_tracking_id,
    sp.vehicle_type,
    sp.vehicle_plate,
    sp.vehicle_color,
    sp.rating as provider_rating,
    -- User info
    u.name as provider_name,
    u.avatar_url as provider_avatar,
    u.phone_number as provider_phone,
    -- Rating info (queue_ratings uses booking_id)
    qr.rating as customer_rating,
    qr.comment as rating_comment,
    NULL as rated_at
FROM queue_bookings q
LEFT JOIN service_providers sp ON q.provider_id = sp.id
LEFT JOIN users u ON sp.user_id = u.id
LEFT JOIN queue_ratings qr ON qr.booking_id = q.id

UNION ALL

-- Moving Requests
SELECT 
    m.id,
    m.tracking_id,
    'moving' as service_type,
    m.user_id,
    m.provider_id,
    m.pickup_address as from_address,
    m.destination_address as to_address,
    m.estimated_price,
    COALESCE(m.final_price, m.estimated_price) as final_price,
    m.status,
    m.created_at,
    m.completed_at,
    m.service_type as service_subtype,
    -- Provider info
    sp.tracking_id as provider_tracking_id,
    sp.vehicle_type,
    sp.vehicle_plate,
    sp.vehicle_color,
    sp.rating as provider_rating,
    -- User info
    u.name as provider_name,
    u.avatar_url as provider_avatar,
    u.phone_number as provider_phone,
    -- Rating info (moving_ratings uses request_id)
    mr.rating as customer_rating,
    mr.comment as rating_comment,
    NULL as rated_at
FROM moving_requests m
LEFT JOIN service_providers sp ON m.provider_id = sp.id
LEFT JOIN users u ON sp.user_id = u.id
LEFT JOIN moving_ratings mr ON mr.request_id = m.id

UNION ALL

-- Laundry Requests
SELECT 
    l.id,
    l.tracking_id,
    'laundry' as service_type,
    l.user_id,
    l.provider_id,
    l.pickup_address as from_address,
    'บริการซักรีด' as to_address,
    l.estimated_price,
    COALESCE(l.final_price, l.estimated_price) as final_price,
    l.status,
    l.created_at,
    l.delivered_at as completed_at,
    NULL as service_subtype,
    -- Provider info
    sp.tracking_id as provider_tracking_id,
    sp.vehicle_type,
    sp.vehicle_plate,
    sp.vehicle_color,
    sp.rating as provider_rating,
    -- User info
    u.name as provider_name,
    u.avatar_url as provider_avatar,
    u.phone_number as provider_phone,
    -- Rating info (laundry_ratings uses request_id)
    lr.rating as customer_rating,
    lr.comment as rating_comment,
    NULL as rated_at
FROM laundry_requests l
LEFT JOIN service_providers sp ON l.provider_id = sp.id
LEFT JOIN users u ON sp.user_id = u.id
LEFT JOIN laundry_ratings lr ON lr.request_id = l.id;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT SELECT ON order_history_view TO authenticated;
GRANT SELECT ON order_history_view TO anon;

-- =====================================================
-- CREATE INDEX FUNCTION FOR FASTER QUERIES
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_order_history(
    p_user_id UUID,
    p_service_type TEXT DEFAULT NULL,
    p_status TEXT[] DEFAULT ARRAY['completed', 'cancelled', 'delivered'],
    p_limit INTEGER DEFAULT 30
)
RETURNS TABLE (
    id UUID,
    tracking_id TEXT,
    service_type TEXT,
    from_address TEXT,
    to_address TEXT,
    final_price DECIMAL,
    status TEXT,
    created_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    service_subtype TEXT,
    provider_name TEXT,
    provider_tracking_id TEXT,
    vehicle_type TEXT,
    customer_rating INTEGER,
    rated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.tracking_id,
        v.service_type,
        v.from_address,
        v.to_address,
        v.final_price,
        v.status,
        v.created_at,
        v.completed_at,
        v.service_subtype,
        v.provider_name,
        v.provider_tracking_id,
        v.vehicle_type,
        v.customer_rating,
        v.rated_at
    FROM order_history_view v
    WHERE v.user_id = p_user_id
      AND (p_service_type IS NULL OR v.service_type = p_service_type)
      AND v.status = ANY(p_status)
    ORDER BY v.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_order_history TO authenticated;

COMMENT ON VIEW order_history_view IS 'Unified view for all service order history with provider info';
COMMENT ON FUNCTION get_user_order_history IS 'Get user order history with optional filters';
