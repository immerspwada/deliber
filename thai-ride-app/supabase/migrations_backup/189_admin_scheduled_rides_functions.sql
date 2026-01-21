-- Migration: 189_admin_scheduled_rides_functions.sql
-- Feature: Admin Scheduled Rides Management
-- Description: RPC functions for admin to manage scheduled rides

-- =====================================================
-- 1. GET ALL SCHEDULED RIDES FOR ADMIN
-- =====================================================
DROP FUNCTION IF EXISTS get_all_scheduled_rides_for_admin(TEXT, INT, INT);

CREATE OR REPLACE FUNCTION get_all_scheduled_rides_for_admin(
    p_status TEXT DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    customer_name TEXT,
    customer_phone TEXT,
    pickup_address TEXT,
    pickup_lat DECIMAL(10,8),
    pickup_lng DECIMAL(11,8),
    destination_address TEXT,
    destination_lat DECIMAL(10,8),
    destination_lng DECIMAL(11,8),
    scheduled_datetime TIMESTAMPTZ,
    ride_type VARCHAR(20),
    estimated_fare DECIMAL(10,2),
    notes TEXT,
    reminder_sent BOOLEAN,
    status VARCHAR(20),
    ride_request_id UUID,
    passenger_count INT,
    special_requests TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sr.id,
        sr.user_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.first_name, 'ไม่ระบุชื่อ')::TEXT as customer_name,
        COALESCE(u.phone_number, '')::TEXT as customer_phone,
        sr.pickup_address,
        sr.pickup_lat,
        sr.pickup_lng,
        sr.destination_address,
        sr.destination_lat,
        sr.destination_lng,
        sr.scheduled_datetime,
        sr.ride_type,
        sr.estimated_fare,
        sr.notes,
        sr.reminder_sent,
        sr.status,
        sr.ride_request_id,
        sr.passenger_count,
        sr.special_requests,
        sr.created_at,
        sr.updated_at
    FROM scheduled_rides sr
    LEFT JOIN users u ON sr.user_id = u.id
    WHERE (p_status IS NULL OR sr.status = p_status)
    ORDER BY sr.scheduled_datetime ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- =====================================================
-- 2. COUNT SCHEDULED RIDES FOR ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION count_scheduled_rides_for_admin(
    p_status TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_count BIGINT;
BEGIN
    SELECT COUNT(*)
    INTO total_count
    FROM scheduled_rides sr
    WHERE (p_status IS NULL OR sr.status = p_status);
    
    RETURN total_count;
END;
$$;

-- =====================================================
-- 3. UPDATE SCHEDULED RIDE STATUS
-- =====================================================
CREATE OR REPLACE FUNCTION admin_update_scheduled_ride_status(
    p_ride_id UUID,
    p_new_status TEXT,
    p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_status TEXT;
    v_result JSONB;
BEGIN
    -- Get current status
    SELECT status INTO v_old_status
    FROM scheduled_rides
    WHERE id = p_ride_id;
    
    IF v_old_status IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Scheduled ride not found'
        );
    END IF;
    
    -- Validate status transition
    IF p_new_status NOT IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'expired') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid status: ' || p_new_status
        );
    END IF;
    
    -- Update status
    UPDATE scheduled_rides
    SET 
        status = p_new_status,
        updated_at = NOW()
    WHERE id = p_ride_id;
    
    -- Log the change if audit log exists
    BEGIN
        INSERT INTO admin_audit_log (
            admin_id,
            action,
            entity_type,
            entity_id,
            old_value,
            new_value,
            created_at
        ) VALUES (
            COALESCE(p_admin_id, auth.uid()),
            'update_status',
            'scheduled_ride',
            p_ride_id,
            jsonb_build_object('status', v_old_status),
            jsonb_build_object('status', p_new_status),
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        -- Ignore if audit log table doesn't exist
        NULL;
    END;
    
    RETURN jsonb_build_object(
        'success', true,
        'old_status', v_old_status,
        'new_status', p_new_status
    );
END;
$$;

-- =====================================================
-- 4. CANCEL SCHEDULED RIDE
-- =====================================================
CREATE OR REPLACE FUNCTION admin_cancel_scheduled_ride(
    p_ride_id UUID,
    p_reason TEXT DEFAULT NULL,
    p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_status TEXT;
BEGIN
    -- Get current status
    SELECT status INTO v_old_status
    FROM scheduled_rides
    WHERE id = p_ride_id;
    
    IF v_old_status IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Scheduled ride not found'
        );
    END IF;
    
    IF v_old_status IN ('completed', 'cancelled') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot cancel ride with status: ' || v_old_status
        );
    END IF;
    
    -- Update to cancelled
    UPDATE scheduled_rides
    SET 
        status = 'cancelled',
        notes = COALESCE(notes || E'\n', '') || 'Cancelled by admin: ' || COALESCE(p_reason, 'No reason provided'),
        updated_at = NOW()
    WHERE id = p_ride_id;
    
    -- Log the change
    BEGIN
        INSERT INTO admin_audit_log (
            admin_id,
            action,
            entity_type,
            entity_id,
            old_value,
            new_value,
            created_at
        ) VALUES (
            COALESCE(p_admin_id, auth.uid()),
            'cancel',
            'scheduled_ride',
            p_ride_id,
            jsonb_build_object('status', v_old_status),
            jsonb_build_object('status', 'cancelled', 'reason', p_reason),
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Scheduled ride cancelled successfully'
    );
END;
$$;

-- =====================================================
-- 5. GET SCHEDULED RIDE STATS
-- =====================================================
CREATE OR REPLACE FUNCTION get_scheduled_rides_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total', COUNT(*),
        'scheduled', COUNT(*) FILTER (WHERE status = 'scheduled'),
        'confirmed', COUNT(*) FILTER (WHERE status = 'confirmed'),
        'completed', COUNT(*) FILTER (WHERE status = 'completed'),
        'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
        'expired', COUNT(*) FILTER (WHERE status = 'expired'),
        'upcoming_today', COUNT(*) FILTER (
            WHERE status IN ('scheduled', 'confirmed') 
            AND scheduled_datetime::date = CURRENT_DATE
        ),
        'upcoming_week', COUNT(*) FILTER (
            WHERE status IN ('scheduled', 'confirmed') 
            AND scheduled_datetime BETWEEN NOW() AND NOW() + INTERVAL '7 days'
        )
    )
    INTO v_stats
    FROM scheduled_rides;
    
    RETURN v_stats;
END;
$$;

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_all_scheduled_rides_for_admin TO anon;
GRANT EXECUTE ON FUNCTION get_all_scheduled_rides_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_scheduled_rides_for_admin TO service_role;

GRANT EXECUTE ON FUNCTION count_scheduled_rides_for_admin TO anon;
GRANT EXECUTE ON FUNCTION count_scheduled_rides_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION count_scheduled_rides_for_admin TO service_role;

GRANT EXECUTE ON FUNCTION admin_update_scheduled_ride_status TO anon;
GRANT EXECUTE ON FUNCTION admin_update_scheduled_ride_status TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_scheduled_ride_status TO service_role;

GRANT EXECUTE ON FUNCTION admin_cancel_scheduled_ride TO anon;
GRANT EXECUTE ON FUNCTION admin_cancel_scheduled_ride TO authenticated;
GRANT EXECUTE ON FUNCTION admin_cancel_scheduled_ride TO service_role;

GRANT EXECUTE ON FUNCTION get_scheduled_rides_stats TO anon;
GRANT EXECUTE ON FUNCTION get_scheduled_rides_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_scheduled_rides_stats TO service_role;

-- =====================================================
-- 7. ENSURE RLS POLICIES FOR ADMIN ACCESS
-- =====================================================
DO $$
BEGIN
    -- Drop existing policies if any
    DROP POLICY IF EXISTS "Admin full access to scheduled_rides" ON scheduled_rides;
    
    -- Create admin full access policy
    CREATE POLICY "Admin full access to scheduled_rides" ON scheduled_rides
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
        
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Policy creation skipped: %', SQLERRM;
END;
$$;

-- Enable RLS if not already enabled
ALTER TABLE scheduled_rides ENABLE ROW LEVEL SECURITY;
