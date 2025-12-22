-- =====================================================
-- Admin Service Views RPC Functions
-- =====================================================
-- Migration: 160
-- Purpose: Create RPC functions for admin to access all service data
-- Features: F03, F04, F158, F159, F160

-- =====================================================
-- DELIVERY REQUESTS
-- =====================================================

CREATE OR REPLACE FUNCTION get_all_deliveries_for_admin(
    p_status TEXT DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    tracking_id TEXT,
    status TEXT,
    user_id UUID,
    user_name TEXT,
    user_phone TEXT,
    provider_id UUID,
    provider_name TEXT,
    provider_phone TEXT,
    pickup_address TEXT,
    destination_address TEXT,
    package_description TEXT,
    package_weight NUMERIC,
    recipient_name TEXT,
    recipient_phone TEXT,
    amount NUMERIC,
    payment_method TEXT,
    created_at TIMESTAMPTZ,
    matched_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.tracking_id,
        d.status,
        d.user_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_name,
        u.phone_number as user_phone,
        d.provider_id,
        CASE 
            WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.email)
            ELSE NULL
        END as provider_name,
        pu.phone_number as provider_phone,
        d.pickup_address,
        d.destination_address,
        d.package_description,
        d.package_weight,
        d.recipient_name,
        d.recipient_phone,
        d.total_amount as amount,
        d.payment_method,
        d.created_at,
        d.matched_at,
        d.completed_at,
        d.cancelled_at
    FROM delivery_requests d
    LEFT JOIN users u ON d.user_id = u.id
    LEFT JOIN service_providers sp ON d.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE (p_status IS NULL OR d.status = p_status)
    ORDER BY d.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION count_deliveries_for_admin(
    p_status TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*)::INT INTO v_count
    FROM delivery_requests
    WHERE (p_status IS NULL OR status = p_status);
    
    RETURN v_count;
END;
$$;

-- =====================================================
-- SHOPPING REQUESTS
-- =====================================================

CREATE OR REPLACE FUNCTION get_all_shopping_for_admin(
    p_status TEXT DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    tracking_id TEXT,
    status TEXT,
    user_id UUID,
    user_name TEXT,
    user_phone TEXT,
    provider_id UUID,
    provider_name TEXT,
    provider_phone TEXT,
    store_name TEXT,
    store_address TEXT,
    delivery_address TEXT,
    shopping_list TEXT,
    estimated_cost NUMERIC,
    actual_cost NUMERIC,
    amount NUMERIC,
    payment_method TEXT,
    created_at TIMESTAMPTZ,
    matched_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.tracking_id,
        s.status,
        s.user_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_name,
        u.phone_number as user_phone,
        s.provider_id,
        CASE 
            WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.email)
            ELSE NULL
        END as provider_name,
        pu.phone_number as provider_phone,
        s.store_name,
        s.store_address,
        s.delivery_address,
        s.shopping_list,
        s.estimated_cost,
        s.actual_cost,
        s.total_amount as amount,
        s.payment_method,
        s.created_at,
        s.matched_at,
        s.completed_at,
        s.cancelled_at
    FROM shopping_requests s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN service_providers sp ON s.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE (p_status IS NULL OR s.status = p_status)
    ORDER BY s.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION count_shopping_for_admin(
    p_status TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*)::INT INTO v_count
    FROM shopping_requests
    WHERE (p_status IS NULL OR status = p_status);
    
    RETURN v_count;
END;
$$;

-- =====================================================
-- QUEUE BOOKINGS
-- =====================================================

CREATE OR REPLACE FUNCTION get_all_queues_for_admin(
    p_status TEXT DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    tracking_id TEXT,
    status TEXT,
    user_id UUID,
    user_name TEXT,
    user_phone TEXT,
    provider_id UUID,
    provider_name TEXT,
    provider_phone TEXT,
    place_name TEXT,
    place_address TEXT,
    queue_type TEXT,
    party_size INT,
    special_requests TEXT,
    estimated_wait_time INT,
    queue_number TEXT,
    amount NUMERIC,
    payment_method TEXT,
    created_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id,
        q.tracking_id,
        q.status,
        q.user_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_name,
        u.phone_number as user_phone,
        q.provider_id,
        CASE 
            WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.email)
            ELSE NULL
        END as provider_name,
        pu.phone_number as provider_phone,
        q.place_name,
        q.place_address,
        q.queue_type,
        q.party_size,
        q.special_requests,
        q.estimated_wait_time,
        q.queue_number,
        q.total_amount as amount,
        q.payment_method,
        q.created_at,
        q.confirmed_at,
        q.completed_at,
        q.cancelled_at
    FROM queue_bookings q
    LEFT JOIN users u ON q.user_id = u.id
    LEFT JOIN service_providers sp ON q.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE (p_status IS NULL OR q.status = p_status)
    ORDER BY q.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION count_queues_for_admin(
    p_status TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*)::INT INTO v_count
    FROM queue_bookings
    WHERE (p_status IS NULL OR status = p_status);
    
    RETURN v_count;
END;
$$;

-- =====================================================
-- MOVING REQUESTS
-- =====================================================

CREATE OR REPLACE FUNCTION get_all_moving_for_admin(
    p_status TEXT DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    tracking_id TEXT,
    status TEXT,
    user_id UUID,
    user_name TEXT,
    user_phone TEXT,
    provider_id UUID,
    provider_name TEXT,
    provider_phone TEXT,
    pickup_address TEXT,
    destination_address TEXT,
    service_type TEXT,
    floor_origin INT,
    floor_destination INT,
    has_elevator_origin BOOLEAN,
    has_elevator_destination BOOLEAN,
    num_helpers INT,
    items_description TEXT,
    estimated_volume NUMERIC,
    amount NUMERIC,
    payment_method TEXT,
    created_at TIMESTAMPTZ,
    matched_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.tracking_id,
        m.status,
        m.user_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_name,
        u.phone_number as user_phone,
        m.provider_id,
        CASE 
            WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.email)
            ELSE NULL
        END as provider_name,
        pu.phone_number as provider_phone,
        m.pickup_address,
        m.destination_address,
        m.service_type,
        m.floor_origin,
        m.floor_destination,
        m.has_elevator_origin,
        m.has_elevator_destination,
        m.num_helpers,
        m.items_description,
        m.estimated_volume,
        m.total_amount as amount,
        m.payment_method,
        m.created_at,
        m.matched_at,
        m.completed_at,
        m.cancelled_at
    FROM moving_requests m
    LEFT JOIN users u ON m.user_id = u.id
    LEFT JOIN service_providers sp ON m.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE (p_status IS NULL OR m.status = p_status)
    ORDER BY m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION count_moving_for_admin(
    p_status TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*)::INT INTO v_count
    FROM moving_requests
    WHERE (p_status IS NULL OR status = p_status);
    
    RETURN v_count;
END;
$$;

-- =====================================================
-- LAUNDRY REQUESTS
-- =====================================================

CREATE OR REPLACE FUNCTION get_all_laundry_for_admin(
    p_status TEXT DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    tracking_id TEXT,
    status TEXT,
    user_id UUID,
    user_name TEXT,
    user_phone TEXT,
    provider_id UUID,
    provider_name TEXT,
    provider_phone TEXT,
    pickup_address TEXT,
    delivery_address TEXT,
    service_type TEXT,
    weight_kg NUMERIC,
    special_instructions TEXT,
    pickup_time TIMESTAMPTZ,
    delivery_time TIMESTAMPTZ,
    amount NUMERIC,
    payment_method TEXT,
    created_at TIMESTAMPTZ,
    matched_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.tracking_id,
        l.status,
        l.user_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_name,
        u.phone_number as user_phone,
        l.provider_id,
        CASE 
            WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.email)
            ELSE NULL
        END as provider_name,
        pu.phone_number as provider_phone,
        l.pickup_address,
        l.delivery_address,
        l.service_type,
        l.weight_kg,
        l.special_instructions,
        l.pickup_time,
        l.delivery_time,
        l.total_amount as amount,
        l.payment_method,
        l.created_at,
        l.matched_at,
        l.picked_up_at,
        l.ready_at,
        l.delivered_at,
        l.cancelled_at
    FROM laundry_requests l
    LEFT JOIN users u ON l.user_id = u.id
    LEFT JOIN service_providers sp ON l.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE (p_status IS NULL OR l.status = p_status)
    ORDER BY l.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION count_laundry_for_admin(
    p_status TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*)::INT INTO v_count
    FROM laundry_requests
    WHERE (p_status IS NULL OR status = p_status);
    
    RETURN v_count;
END;
$$;

-- =====================================================
-- CANCELLATIONS (ALL SERVICES)
-- =====================================================

CREATE OR REPLACE FUNCTION get_all_cancellations_for_admin(
    p_service_type TEXT DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    tracking_id TEXT,
    service_type TEXT,
    status TEXT,
    user_name TEXT,
    provider_name TEXT,
    cancelled_at TIMESTAMPTZ,
    cancelled_by TEXT,
    cancel_reason TEXT,
    amount NUMERIC,
    refund_amount NUMERIC,
    refund_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- Rides
    SELECT 
        r.id,
        r.tracking_id,
        'ride'::TEXT as service_type,
        r.status,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_name,
        CASE 
            WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.email)
            ELSE NULL
        END as provider_name,
        r.cancelled_at,
        r.cancelled_by,
        r.cancel_reason,
        r.total_fare as amount,
        r.refund_amount,
        r.refund_status
    FROM ride_requests r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN service_providers sp ON r.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE r.status = 'cancelled'
        AND (p_service_type IS NULL OR p_service_type = 'ride')
    
    UNION ALL
    
    -- Deliveries
    SELECT 
        d.id,
        d.tracking_id,
        'delivery'::TEXT as service_type,
        d.status,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_name,
        CASE 
            WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.email)
            ELSE NULL
        END as provider_name,
        d.cancelled_at,
        d.cancelled_by,
        d.cancel_reason,
        d.total_amount as amount,
        d.refund_amount,
        d.refund_status
    FROM delivery_requests d
    LEFT JOIN users u ON d.user_id = u.id
    LEFT JOIN service_providers sp ON d.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE d.status = 'cancelled'
        AND (p_service_type IS NULL OR p_service_type = 'delivery')
    
    UNION ALL
    
    -- Shopping
    SELECT 
        s.id,
        s.tracking_id,
        'shopping'::TEXT as service_type,
        s.status,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_name,
        CASE 
            WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.email)
            ELSE NULL
        END as provider_name,
        s.cancelled_at,
        s.cancelled_by,
        s.cancel_reason,
        s.total_amount as amount,
        s.refund_amount,
        s.refund_status
    FROM shopping_requests s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN service_providers sp ON s.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE s.status = 'cancelled'
        AND (p_service_type IS NULL OR p_service_type = 'shopping')
    
    ORDER BY cancelled_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- =====================================================
-- DRIVER TRACKING (REALTIME LOCATIONS)
-- =====================================================

CREATE OR REPLACE FUNCTION get_active_providers_locations()
RETURNS TABLE (
    id UUID,
    provider_uid TEXT,
    provider_type TEXT,
    user_name TEXT,
    phone_number TEXT,
    current_lat NUMERIC,
    current_lng NUMERIC,
    is_available BOOLEAN,
    current_job_id UUID,
    current_job_type TEXT,
    last_location_update TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.id,
        sp.provider_uid,
        sp.provider_type,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_name,
        u.phone_number,
        sp.current_lat,
        sp.current_lng,
        sp.is_available,
        sp.current_job_id,
        sp.current_job_type,
        sp.last_location_update
    FROM service_providers sp
    LEFT JOIN users u ON sp.user_id = u.id
    WHERE sp.status = 'approved'
        AND sp.is_available = true
        AND sp.current_lat IS NOT NULL
        AND sp.current_lng IS NOT NULL
    ORDER BY sp.last_location_update DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_deliveries_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION count_deliveries_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_shopping_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION count_shopping_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_queues_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION count_queues_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_moving_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION count_moving_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_laundry_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION count_laundry_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_cancellations_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_providers_locations TO authenticated;
