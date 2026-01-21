-- =====================================================
-- Fix Admin Service Views RPC Functions
-- =====================================================
-- Migration: 161
-- Purpose: Fix RPC functions to use correct column names from actual schema
-- Fixes: Column name mismatches in migration 160

-- =====================================================
-- DROP OLD FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS get_all_deliveries_for_admin(TEXT, INT, INT);
DROP FUNCTION IF EXISTS count_deliveries_for_admin(TEXT);
DROP FUNCTION IF EXISTS get_all_shopping_for_admin(TEXT, INT, INT);
DROP FUNCTION IF EXISTS count_shopping_for_admin(TEXT);
DROP FUNCTION IF EXISTS get_all_queues_for_admin(TEXT, INT, INT);
DROP FUNCTION IF EXISTS count_queues_for_admin(TEXT);
DROP FUNCTION IF EXISTS get_all_moving_for_admin(TEXT, INT, INT);
DROP FUNCTION IF EXISTS count_moving_for_admin(TEXT);
DROP FUNCTION IF EXISTS get_all_laundry_for_admin(TEXT, INT, INT);
DROP FUNCTION IF EXISTS count_laundry_for_admin(TEXT);
DROP FUNCTION IF EXISTS get_all_cancellations_for_admin(TEXT, INT, INT);
DROP FUNCTION IF EXISTS get_active_providers_locations();

-- =====================================================
-- DELIVERY REQUESTS (Fixed column names)
-- Schema: sender_address, recipient_address, estimated_fee, actual_fee
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
        COALESCE(d.tracking_id, 'DEL-' || SUBSTRING(d.id::TEXT, 1, 8)) as tracking_id,
        d.status,
        d.user_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as user_name,
        u.phone_number as user_phone,
        d.provider_id,
        CASE 
            WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.email)
            ELSE NULL
        END as provider_name,
        pu.phone_number as provider_phone,
        d.sender_address as pickup_address,
        d.recipient_address as destination_address,
        d.package_description,
        d.package_weight,
        d.recipient_name,
        d.recipient_phone,
        COALESCE(d.actual_fee, d.estimated_fee, 0) as amount,
        'cash'::TEXT as payment_method,
        d.created_at,
        d.updated_at as matched_at,
        CASE WHEN d.status = 'delivered' THEN d.updated_at ELSE NULL END as completed_at,
        CASE WHEN d.status = 'cancelled' THEN d.updated_at ELSE NULL END as cancelled_at
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
-- SHOPPING REQUESTS (Fixed column names)
-- Schema: item_list, service_fee, items_cost, total_cost
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
        COALESCE(s.tracking_id, 'SHP-' || SUBSTRING(s.id::TEXT, 1, 8)) as tracking_id,
        s.status,
        s.user_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as user_name,
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
        s.item_list as shopping_list,
        s.budget_limit as estimated_cost,
        s.items_cost as actual_cost,
        COALESCE(s.total_cost, s.service_fee, 0) as amount,
        'cash'::TEXT as payment_method,
        s.created_at,
        s.updated_at as matched_at,
        CASE WHEN s.status = 'completed' THEN s.updated_at ELSE NULL END as completed_at,
        CASE WHEN s.status = 'cancelled' THEN s.updated_at ELSE NULL END as cancelled_at
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
-- QUEUE BOOKINGS (Fixed column names)
-- Schema: category, service_fee, scheduled_date, scheduled_time
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
    scheduled_date DATE,
    scheduled_time TIME,
    details TEXT,
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
        COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as user_name,
        u.phone_number as user_phone,
        q.provider_id,
        CASE 
            WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.email)
            ELSE NULL
        END as provider_name,
        pu.phone_number as provider_phone,
        q.place_name,
        q.place_address,
        q.category as queue_type,
        q.scheduled_date,
        q.scheduled_time,
        q.details,
        COALESCE(q.final_fee, q.service_fee, 0) as amount,
        'cash'::TEXT as payment_method,
        q.created_at,
        CASE WHEN q.status = 'confirmed' THEN q.updated_at ELSE NULL END as confirmed_at,
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
-- MOVING REQUESTS (Fixed column names)
-- Schema: estimated_price, final_price, item_description, helper_count
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
    helper_count INT,
    item_description TEXT,
    amount NUMERIC,
    payment_method TEXT,
    created_at TIMESTAMPTZ,
    matched_at TIMESTAMPTZ,
    pickup_at TIMESTAMPTZ,
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
        COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as user_name,
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
        m.helper_count,
        m.item_description,
        COALESCE(m.final_price, m.estimated_price, 0) as amount,
        'cash'::TEXT as payment_method,
        m.created_at,
        CASE WHEN m.status = 'matched' THEN m.updated_at ELSE NULL END as matched_at,
        m.pickup_at,
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
-- LAUNDRY REQUESTS (Fixed column names)
-- Schema: services (JSONB), estimated_price, final_price, notes, scheduled_pickup
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
    services JSONB,
    estimated_weight NUMERIC,
    actual_weight NUMERIC,
    notes TEXT,
    scheduled_pickup TIMESTAMPTZ,
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
        COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as user_name,
        u.phone_number as user_phone,
        l.provider_id,
        CASE 
            WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.email)
            ELSE NULL
        END as provider_name,
        pu.phone_number as provider_phone,
        l.pickup_address,
        l.services,
        l.estimated_weight,
        l.actual_weight,
        l.notes,
        l.scheduled_pickup,
        COALESCE(l.final_price, l.estimated_price, 0) as amount,
        'cash'::TEXT as payment_method,
        l.created_at,
        CASE WHEN l.status = 'matched' THEN l.updated_at ELSE NULL END as matched_at,
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
-- CANCELLATIONS (ALL SERVICES - Fixed)
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
    cancel_reason TEXT,
    amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- Rides
    SELECT 
        r.id,
        COALESCE(r.tracking_id, 'RID-' || SUBSTRING(r.id::TEXT, 1, 8)) as tracking_id,
        'ride'::TEXT as service_type,
        r.status,
        COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as user_name,
        CASE 
            WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.email)
            ELSE NULL
        END as provider_name,
        r.updated_at as cancelled_at,
        r.special_requests as cancel_reason,
        COALESCE(r.actual_fare, r.estimated_fare, 0) as amount
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
        COALESCE(d.tracking_id, 'DEL-' || SUBSTRING(d.id::TEXT, 1, 8)) as tracking_id,
        'delivery'::TEXT as service_type,
        d.status,
        COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as user_name,
        CASE 
            WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.email)
            ELSE NULL
        END as provider_name,
        d.updated_at as cancelled_at,
        NULL as cancel_reason,
        COALESCE(d.actual_fee, d.estimated_fee, 0) as amount
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
        COALESCE(s.tracking_id, 'SHP-' || SUBSTRING(s.id::TEXT, 1, 8)) as tracking_id,
        'shopping'::TEXT as service_type,
        s.status,
        COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as user_name,
        CASE 
            WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.email)
            ELSE NULL
        END as provider_name,
        s.updated_at as cancelled_at,
        s.special_instructions as cancel_reason,
        COALESCE(s.total_cost, s.service_fee, 0) as amount
    FROM shopping_requests s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN service_providers sp ON s.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE s.status = 'cancelled'
        AND (p_service_type IS NULL OR p_service_type = 'shopping')
    
    UNION ALL
    
    -- Queue Bookings
    SELECT 
        q.id,
        q.tracking_id,
        'queue'::TEXT as service_type,
        q.status,
        COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as user_name,
        CASE 
            WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.email)
            ELSE NULL
        END as provider_name,
        q.cancelled_at,
        q.cancel_reason,
        COALESCE(q.final_fee, q.service_fee, 0) as amount
    FROM queue_bookings q
    LEFT JOIN users u ON q.user_id = u.id
    LEFT JOIN service_providers sp ON q.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE q.status = 'cancelled'
        AND (p_service_type IS NULL OR p_service_type = 'queue')
    
    UNION ALL
    
    -- Moving
    SELECT 
        m.id,
        m.tracking_id,
        'moving'::TEXT as service_type,
        m.status,
        COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as user_name,
        CASE 
            WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.email)
            ELSE NULL
        END as provider_name,
        m.cancelled_at,
        m.cancel_reason,
        COALESCE(m.final_price, m.estimated_price, 0) as amount
    FROM moving_requests m
    LEFT JOIN users u ON m.user_id = u.id
    LEFT JOIN service_providers sp ON m.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE m.status = 'cancelled'
        AND (p_service_type IS NULL OR p_service_type = 'moving')
    
    UNION ALL
    
    -- Laundry
    SELECT 
        l.id,
        l.tracking_id,
        'laundry'::TEXT as service_type,
        l.status,
        COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as user_name,
        CASE 
            WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, pu.email)
            ELSE NULL
        END as provider_name,
        l.cancelled_at,
        l.cancel_reason,
        COALESCE(l.final_price, l.estimated_price, 0) as amount
    FROM laundry_requests l
    LEFT JOIN users u ON l.user_id = u.id
    LEFT JOIN service_providers sp ON l.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE l.status = 'cancelled'
        AND (p_service_type IS NULL OR p_service_type = 'laundry')
    
    ORDER BY cancelled_at DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- =====================================================
-- DRIVER TRACKING (REALTIME LOCATIONS - Fixed)
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
    is_online BOOLEAN,
    rating NUMERIC,
    total_trips INT,
    last_updated TIMESTAMPTZ
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
        COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') as user_name,
        u.phone_number,
        sp.current_lat,
        sp.current_lng,
        sp.is_online,
        sp.rating,
        sp.total_trips,
        sp.updated_at as last_updated
    FROM service_providers sp
    LEFT JOIN users u ON sp.user_id = u.id
    WHERE sp.is_online = true
        AND sp.current_lat IS NOT NULL
        AND sp.current_lng IS NOT NULL
    ORDER BY sp.updated_at DESC;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

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
