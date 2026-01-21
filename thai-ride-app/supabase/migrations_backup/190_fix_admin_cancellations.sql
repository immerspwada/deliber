-- =====================================================
-- Migration: 190_fix_admin_cancellations.sql
-- Feature: F53 - Fix Admin Cancellations View
-- Applied via MCP Supabase on 2024-12-27
-- =====================================================

-- 1. ADD CANCELLATION COLUMNS TO TABLES
ALTER TABLE ride_requests 
ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cancel_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cancellation_fee DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) DEFAULT NULL;

ALTER TABLE delivery_requests 
ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cancel_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cancellation_fee DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) DEFAULT NULL;

ALTER TABLE shopping_requests 
ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cancel_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cancellation_fee DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) DEFAULT NULL;

-- 2. DROP AND RECREATE FUNCTION
DROP FUNCTION IF EXISTS get_all_cancellations_for_admin(TEXT, INT, INT);
DROP FUNCTION IF EXISTS count_cancellations_for_admin(TEXT);

-- 3. CREATE MAIN FUNCTION
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
    user_id UUID,
    user_name TEXT,
    user_phone TEXT,
    provider_id UUID,
    provider_name TEXT,
    cancelled_by TEXT,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    amount NUMERIC,
    cancellation_fee NUMERIC,
    refund_amount NUMERIC,
    refund_status TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- Rides
    SELECT 
        r.id,
        COALESCE(r.tracking_id, 'RID-' || SUBSTRING(r.id::TEXT, 1, 8))::TEXT,
        'ride'::TEXT,
        r.status::TEXT,
        r.user_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown')::TEXT,
        COALESCE(u.phone_number, '')::TEXT,
        r.provider_id,
        CASE WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, '') ELSE '' END::TEXT,
        COALESCE(r.cancelled_by, 'customer')::TEXT,
        COALESCE(r.cancelled_at, r.updated_at),
        COALESCE(r.cancel_reason, 'ไม่ระบุเหตุผล')::TEXT,
        COALESCE(r.final_fare, r.estimated_fare, 0)::NUMERIC,
        COALESCE(r.cancellation_fee, 0)::NUMERIC,
        COALESCE(r.refund_amount, 0)::NUMERIC,
        r.refund_status::TEXT,
        r.created_at
    FROM ride_requests r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN service_providers sp ON r.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE r.status = 'cancelled'
        AND (p_service_type IS NULL OR p_service_type = '' OR p_service_type = 'ride')
    
    UNION ALL
    
    -- Deliveries
    SELECT 
        d.id,
        COALESCE(d.tracking_id, 'DEL-' || SUBSTRING(d.id::TEXT, 1, 8))::TEXT,
        'delivery'::TEXT,
        d.status::TEXT,
        d.user_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown')::TEXT,
        COALESCE(u.phone_number, '')::TEXT,
        d.provider_id,
        CASE WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, '') ELSE '' END::TEXT,
        COALESCE(d.cancelled_by, 'customer')::TEXT,
        COALESCE(d.cancelled_at, d.updated_at),
        COALESCE(d.cancel_reason, 'ไม่ระบุเหตุผล')::TEXT,
        COALESCE(d.final_fee, d.estimated_fee, 0)::NUMERIC,
        COALESCE(d.cancellation_fee, 0)::NUMERIC,
        COALESCE(d.refund_amount, 0)::NUMERIC,
        d.refund_status::TEXT,
        d.created_at
    FROM delivery_requests d
    LEFT JOIN users u ON d.user_id = u.id
    LEFT JOIN service_providers sp ON d.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE d.status = 'cancelled'
        AND (p_service_type IS NULL OR p_service_type = '' OR p_service_type = 'delivery')
    
    UNION ALL
    
    -- Shopping
    SELECT 
        s.id,
        COALESCE(s.tracking_id, 'SHP-' || SUBSTRING(s.id::TEXT, 1, 8))::TEXT,
        'shopping'::TEXT,
        s.status::TEXT,
        s.user_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown')::TEXT,
        COALESCE(u.phone_number, '')::TEXT,
        s.provider_id,
        CASE WHEN sp.id IS NOT NULL THEN COALESCE(pu.first_name || ' ' || pu.last_name, '') ELSE '' END::TEXT,
        COALESCE(s.cancelled_by, 'customer')::TEXT,
        COALESCE(s.cancelled_at, s.updated_at),
        COALESCE(s.cancel_reason, 'ไม่ระบุเหตุผล')::TEXT,
        COALESCE(s.total_cost, s.service_fee, 0)::NUMERIC,
        COALESCE(s.cancellation_fee, 0)::NUMERIC,
        COALESCE(s.refund_amount, 0)::NUMERIC,
        s.refund_status::TEXT,
        s.created_at
    FROM shopping_requests s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN service_providers sp ON s.provider_id = sp.id
    LEFT JOIN users pu ON sp.user_id = pu.id
    WHERE s.status = 'cancelled'
        AND (p_service_type IS NULL OR p_service_type = '' OR p_service_type = 'shopping')
    
    ORDER BY cancelled_at DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 4. CREATE COUNT FUNCTION FOR PAGINATION
CREATE OR REPLACE FUNCTION count_cancellations_for_admin(
    p_service_type TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INT := 0;
    v_temp INT;
BEGIN
    IF p_service_type IS NULL OR p_service_type = '' OR p_service_type = 'ride' THEN
        SELECT COUNT(*)::INT INTO v_temp FROM ride_requests WHERE status = 'cancelled';
        v_count := v_count + COALESCE(v_temp, 0);
    END IF;
    
    IF p_service_type IS NULL OR p_service_type = '' OR p_service_type = 'delivery' THEN
        SELECT COUNT(*)::INT INTO v_temp FROM delivery_requests WHERE status = 'cancelled';
        v_count := v_count + COALESCE(v_temp, 0);
    END IF;
    
    IF p_service_type IS NULL OR p_service_type = '' OR p_service_type = 'shopping' THEN
        SELECT COUNT(*)::INT INTO v_temp FROM shopping_requests WHERE status = 'cancelled';
        v_count := v_count + COALESCE(v_temp, 0);
    END IF;
    
    RETURN v_count;
END;
$$;

-- 5. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION get_all_cancellations_for_admin TO anon;
GRANT EXECUTE ON FUNCTION get_all_cancellations_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_cancellations_for_admin TO service_role;

GRANT EXECUTE ON FUNCTION count_cancellations_for_admin TO anon;
GRANT EXECUTE ON FUNCTION count_cancellations_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION count_cancellations_for_admin TO service_role;
