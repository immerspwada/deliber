-- ============================================================================
-- Migration: 107_cross_role_events.sql
-- Description: Cross-Role Events System for Thai Ride App
-- Feature: F174 - Cross-Role Event Bus
-- Feature: F175 - Cross-Role Sync
-- 
-- This migration creates the infrastructure for tracking and synchronizing
-- events across different roles (Customer, Provider, Admin, System)
-- ============================================================================

-- ============================================================================
-- TABLE: cross_role_events
-- Purpose: Log all events that occur across different roles in the system
-- ============================================================================
CREATE TABLE IF NOT EXISTS cross_role_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event identification
    event_type TEXT NOT NULL,
    event_category TEXT NOT NULL CHECK (event_category IN (
        'booking', 
        'status_change', 
        'location', 
        'payment', 
        'rating', 
        'cancellation', 
        'notification', 
        'system'
    )),
    
    -- Source information (who triggered the event)
    source_role TEXT NOT NULL CHECK (source_role IN ('customer', 'provider', 'admin', 'system')),
    source_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Target information (who should receive/process the event)
    target_role TEXT CHECK (target_role IN ('customer', 'provider', 'admin', 'system', NULL)),
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Service context
    service_type TEXT, -- 'ride', 'delivery', 'shopping', 'queue', 'moving', 'laundry'
    request_id UUID,   -- Reference to the specific request
    tracking_id TEXT,  -- Human-readable tracking ID (e.g., RID-20251216-000001)
    
    -- Event payload
    event_data JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Processing status
    processed BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE cross_role_events IS 'Stores all cross-role events for tracking and synchronization between Customer, Provider, and Admin roles';
COMMENT ON COLUMN cross_role_events.event_type IS 'Specific event type (e.g., ride_created, status_updated, payment_completed)';
COMMENT ON COLUMN cross_role_events.event_category IS 'Category of the event for filtering and analytics';
COMMENT ON COLUMN cross_role_events.source_role IS 'Role that triggered the event';
COMMENT ON COLUMN cross_role_events.target_role IS 'Role that should receive/process the event (NULL for broadcast)';
COMMENT ON COLUMN cross_role_events.event_data IS 'JSON payload containing event-specific data';
COMMENT ON COLUMN cross_role_events.metadata IS 'Additional metadata (device info, IP, etc.)';
COMMENT ON COLUMN cross_role_events.processed IS 'Whether the event has been processed by all targets';

-- ============================================================================
-- TABLE: role_sync_status
-- Purpose: Track synchronization status of service requests across all roles
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Service identification
    service_type TEXT NOT NULL,
    request_id UUID NOT NULL,
    tracking_id TEXT,
    
    -- Current status
    current_status TEXT NOT NULL,
    previous_status TEXT,
    
    -- Customer sync status
    customer_synced BOOLEAN DEFAULT FALSE,
    customer_synced_at TIMESTAMPTZ,
    customer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Provider sync status
    provider_synced BOOLEAN DEFAULT FALSE,
    provider_synced_at TIMESTAMPTZ,
    provider_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Admin notification status
    admin_notified BOOLEAN DEFAULT FALSE,
    admin_notified_at TIMESTAMPTZ,
    
    -- Location tracking
    last_known_lat NUMERIC(10, 7),
    last_known_lng NUMERIC(10, 7),
    location_updated_at TIMESTAMPTZ,
    
    -- Sync health
    sync_attempts INTEGER DEFAULT 0,
    last_sync_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(service_type, request_id)
);

-- Add comments for documentation
COMMENT ON TABLE role_sync_status IS 'Tracks synchronization status of service requests across Customer, Provider, and Admin roles';
COMMENT ON COLUMN role_sync_status.current_status IS 'Current status of the service request';
COMMENT ON COLUMN role_sync_status.customer_synced IS 'Whether the customer has received the latest status update';
COMMENT ON COLUMN role_sync_status.provider_synced IS 'Whether the provider has received the latest status update';
COMMENT ON COLUMN role_sync_status.admin_notified IS 'Whether admin has been notified of significant changes';
COMMENT ON COLUMN role_sync_status.sync_attempts IS 'Number of sync attempts (for retry logic)';

-- ============================================================================
-- INDEXES for performance optimization
-- ============================================================================

-- cross_role_events indexes
CREATE INDEX IF NOT EXISTS idx_cross_role_events_event_type 
    ON cross_role_events(event_type);

CREATE INDEX IF NOT EXISTS idx_cross_role_events_event_category 
    ON cross_role_events(event_category);

CREATE INDEX IF NOT EXISTS idx_cross_role_events_source_role 
    ON cross_role_events(source_role);

CREATE INDEX IF NOT EXISTS idx_cross_role_events_source_user 
    ON cross_role_events(source_user_id) 
    WHERE source_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cross_role_events_target_role 
    ON cross_role_events(target_role) 
    WHERE target_role IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cross_role_events_target_user 
    ON cross_role_events(target_user_id) 
    WHERE target_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cross_role_events_service_type 
    ON cross_role_events(service_type) 
    WHERE service_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cross_role_events_request_id 
    ON cross_role_events(request_id) 
    WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cross_role_events_tracking_id 
    ON cross_role_events(tracking_id) 
    WHERE tracking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cross_role_events_processed 
    ON cross_role_events(processed) 
    WHERE processed = FALSE;

CREATE INDEX IF NOT EXISTS idx_cross_role_events_created_at 
    ON cross_role_events(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_cross_role_events_category_created 
    ON cross_role_events(event_category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cross_role_events_service_category 
    ON cross_role_events(service_type, event_category, created_at DESC);

-- role_sync_status indexes
CREATE INDEX IF NOT EXISTS idx_role_sync_status_service_type 
    ON role_sync_status(service_type);

CREATE INDEX IF NOT EXISTS idx_role_sync_status_request_id 
    ON role_sync_status(request_id);

CREATE INDEX IF NOT EXISTS idx_role_sync_status_tracking_id 
    ON role_sync_status(tracking_id) 
    WHERE tracking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_role_sync_status_current_status 
    ON role_sync_status(current_status);

CREATE INDEX IF NOT EXISTS idx_role_sync_status_customer_user 
    ON role_sync_status(customer_user_id) 
    WHERE customer_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_role_sync_status_provider_user 
    ON role_sync_status(provider_user_id) 
    WHERE provider_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_role_sync_status_unsynced 
    ON role_sync_status(customer_synced, provider_synced) 
    WHERE customer_synced = FALSE OR provider_synced = FALSE;

CREATE INDEX IF NOT EXISTS idx_role_sync_status_updated_at 
    ON role_sync_status(updated_at DESC);

-- ============================================================================
-- TRIGGER: Auto-update updated_at for role_sync_status
-- ============================================================================
CREATE OR REPLACE FUNCTION update_role_sync_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_role_sync_status_updated_at ON role_sync_status;
CREATE TRIGGER trigger_role_sync_status_updated_at
    BEFORE UPDATE ON role_sync_status
    FOR EACH ROW
    EXECUTE FUNCTION update_role_sync_status_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE cross_role_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_sync_status ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- cross_role_events policies
-- ============================================================================

-- Admin can read all events
CREATE POLICY "admin_read_all_cross_role_events" ON cross_role_events
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Admin can insert events
CREATE POLICY "admin_insert_cross_role_events" ON cross_role_events
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Admin can update events (mark as processed)
CREATE POLICY "admin_update_cross_role_events" ON cross_role_events
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Providers can read events where they are source or target
CREATE POLICY "provider_read_own_cross_role_events" ON cross_role_events
    FOR SELECT
    TO authenticated
    USING (
        source_user_id = auth.uid() 
        OR target_user_id = auth.uid()
        OR (
            target_role = 'provider' 
            AND EXISTS (
                SELECT 1 FROM service_providers 
                WHERE service_providers.user_id = auth.uid()
            )
        )
    );

-- Customers can read events where they are source or target
CREATE POLICY "customer_read_own_cross_role_events" ON cross_role_events
    FOR SELECT
    TO authenticated
    USING (
        source_user_id = auth.uid() 
        OR target_user_id = auth.uid()
    );

-- System/Service role can insert events (for triggers and functions)
CREATE POLICY "system_insert_cross_role_events" ON cross_role_events
    FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

-- ============================================================================
-- role_sync_status policies
-- ============================================================================

-- Admin can read all sync status
CREATE POLICY "admin_read_all_role_sync_status" ON role_sync_status
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Admin can manage all sync status
CREATE POLICY "admin_manage_role_sync_status" ON role_sync_status
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Providers can read their own sync status
CREATE POLICY "provider_read_own_role_sync_status" ON role_sync_status
    FOR SELECT
    TO authenticated
    USING (
        provider_user_id = auth.uid()
    );

-- Customers can read their own sync status
CREATE POLICY "customer_read_own_role_sync_status" ON role_sync_status
    FOR SELECT
    TO authenticated
    USING (
        customer_user_id = auth.uid()
    );

-- System can insert/update sync status
CREATE POLICY "system_manage_role_sync_status" ON role_sync_status
    FOR ALL
    TO authenticated
    WITH CHECK (TRUE);

-- ============================================================================
-- ENABLE REALTIME
-- ============================================================================

-- Enable realtime for cross_role_events
ALTER PUBLICATION supabase_realtime ADD TABLE cross_role_events;

-- Enable realtime for role_sync_status
ALTER PUBLICATION supabase_realtime ADD TABLE role_sync_status;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- ============================================================================
-- Function: log_cross_role_event
-- Purpose: Log a new cross-role event
-- ============================================================================
CREATE OR REPLACE FUNCTION log_cross_role_event(
    p_event_type TEXT,
    p_event_category TEXT,
    p_source_role TEXT,
    p_source_user_id UUID DEFAULT NULL,
    p_target_role TEXT DEFAULT NULL,
    p_target_user_id UUID DEFAULT NULL,
    p_service_type TEXT DEFAULT NULL,
    p_request_id UUID DEFAULT NULL,
    p_tracking_id TEXT DEFAULT NULL,
    p_event_data JSONB DEFAULT '{}'::jsonb,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO cross_role_events (
        event_type,
        event_category,
        source_role,
        source_user_id,
        target_role,
        target_user_id,
        service_type,
        request_id,
        tracking_id,
        event_data,
        metadata
    ) VALUES (
        p_event_type,
        p_event_category,
        p_source_role,
        p_source_user_id,
        p_target_role,
        p_target_user_id,
        p_service_type,
        p_request_id,
        p_tracking_id,
        p_event_data,
        p_metadata
    )
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION log_cross_role_event IS 'Log a new cross-role event with all relevant context';

-- ============================================================================
-- Function: get_role_sync_stats
-- Purpose: Get synchronization statistics for the specified time period
-- ============================================================================
CREATE OR REPLACE FUNCTION get_role_sync_stats(
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    total_requests BIGINT,
    fully_synced BIGINT,
    customer_pending BIGINT,
    provider_pending BIGINT,
    admin_pending BIGINT,
    sync_rate NUMERIC,
    avg_sync_attempts NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_requests,
        COUNT(*) FILTER (
            WHERE customer_synced = TRUE 
            AND provider_synced = TRUE 
            AND admin_notified = TRUE
        )::BIGINT AS fully_synced,
        COUNT(*) FILTER (WHERE customer_synced = FALSE)::BIGINT AS customer_pending,
        COUNT(*) FILTER (WHERE provider_synced = FALSE)::BIGINT AS provider_pending,
        COUNT(*) FILTER (WHERE admin_notified = FALSE)::BIGINT AS admin_pending,
        ROUND(
            (COUNT(*) FILTER (
                WHERE customer_synced = TRUE 
                AND provider_synced = TRUE
            )::NUMERIC / NULLIF(COUNT(*), 0) * 100),
            2
        ) AS sync_rate,
        ROUND(AVG(sync_attempts)::NUMERIC, 2) AS avg_sync_attempts
    FROM role_sync_status
    WHERE created_at >= NOW() - (p_hours || ' hours')::INTERVAL;
END;
$$;

COMMENT ON FUNCTION get_role_sync_stats IS 'Get synchronization statistics for monitoring dashboard';

-- ============================================================================
-- Function: get_recent_cross_role_events
-- Purpose: Get recent cross-role events with optional filtering
-- ============================================================================
CREATE OR REPLACE FUNCTION get_recent_cross_role_events(
    p_limit INTEGER DEFAULT 50,
    p_service_type TEXT DEFAULT NULL,
    p_event_category TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    event_type TEXT,
    event_category TEXT,
    source_role TEXT,
    source_user_id UUID,
    target_role TEXT,
    target_user_id UUID,
    service_type TEXT,
    request_id UUID,
    tracking_id TEXT,
    event_data JSONB,
    metadata JSONB,
    processed BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cre.id,
        cre.event_type,
        cre.event_category,
        cre.source_role,
        cre.source_user_id,
        cre.target_role,
        cre.target_user_id,
        cre.service_type,
        cre.request_id,
        cre.tracking_id,
        cre.event_data,
        cre.metadata,
        cre.processed,
        cre.created_at
    FROM cross_role_events cre
    WHERE 
        (p_service_type IS NULL OR cre.service_type = p_service_type)
        AND (p_event_category IS NULL OR cre.event_category = p_event_category)
    ORDER BY cre.created_at DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_recent_cross_role_events IS 'Get recent cross-role events with optional filtering by service type and category';

-- ============================================================================
-- Function: get_service_breakdown
-- Purpose: Get breakdown of events by service type for the specified period
-- ============================================================================
CREATE OR REPLACE FUNCTION get_service_breakdown(
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    service_type TEXT,
    total_events BIGINT,
    booking_events BIGINT,
    status_events BIGINT,
    location_events BIGINT,
    payment_events BIGINT,
    rating_events BIGINT,
    cancellation_events BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(cre.service_type, 'unknown') AS service_type,
        COUNT(*)::BIGINT AS total_events,
        COUNT(*) FILTER (WHERE cre.event_category = 'booking')::BIGINT AS booking_events,
        COUNT(*) FILTER (WHERE cre.event_category = 'status_change')::BIGINT AS status_events,
        COUNT(*) FILTER (WHERE cre.event_category = 'location')::BIGINT AS location_events,
        COUNT(*) FILTER (WHERE cre.event_category = 'payment')::BIGINT AS payment_events,
        COUNT(*) FILTER (WHERE cre.event_category = 'rating')::BIGINT AS rating_events,
        COUNT(*) FILTER (WHERE cre.event_category = 'cancellation')::BIGINT AS cancellation_events
    FROM cross_role_events cre
    WHERE cre.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY COALESCE(cre.service_type, 'unknown')
    ORDER BY total_events DESC;
END;
$$;

COMMENT ON FUNCTION get_service_breakdown IS 'Get breakdown of events by service type for analytics';

-- ============================================================================
-- Function: mark_role_synced
-- Purpose: Mark a specific role as synced for a service request
-- ============================================================================
CREATE OR REPLACE FUNCTION mark_role_synced(
    p_service_type TEXT,
    p_request_id UUID,
    p_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated BOOLEAN := FALSE;
BEGIN
    -- Validate role
    IF p_role NOT IN ('customer', 'provider', 'admin') THEN
        RAISE EXCEPTION 'Invalid role: %. Must be customer, provider, or admin', p_role;
    END IF;
    
    -- Update the appropriate sync column
    IF p_role = 'customer' THEN
        UPDATE role_sync_status
        SET 
            customer_synced = TRUE,
            customer_synced_at = NOW(),
            sync_attempts = sync_attempts + 1
        WHERE service_type = p_service_type AND request_id = p_request_id;
    ELSIF p_role = 'provider' THEN
        UPDATE role_sync_status
        SET 
            provider_synced = TRUE,
            provider_synced_at = NOW(),
            sync_attempts = sync_attempts + 1
        WHERE service_type = p_service_type AND request_id = p_request_id;
    ELSIF p_role = 'admin' THEN
        UPDATE role_sync_status
        SET 
            admin_notified = TRUE,
            admin_notified_at = NOW(),
            sync_attempts = sync_attempts + 1
        WHERE service_type = p_service_type AND request_id = p_request_id;
    END IF;
    
    -- Check if update was successful
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION mark_role_synced IS 'Mark a specific role as synced for a service request';

-- ============================================================================
-- Function: upsert_role_sync_status
-- Purpose: Create or update sync status for a service request
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_role_sync_status(
    p_service_type TEXT,
    p_request_id UUID,
    p_tracking_id TEXT DEFAULT NULL,
    p_current_status TEXT DEFAULT 'pending',
    p_customer_user_id UUID DEFAULT NULL,
    p_provider_user_id UUID DEFAULT NULL,
    p_lat NUMERIC DEFAULT NULL,
    p_lng NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sync_id UUID;
    v_previous_status TEXT;
BEGIN
    -- Get previous status if exists
    SELECT current_status INTO v_previous_status
    FROM role_sync_status
    WHERE service_type = p_service_type AND request_id = p_request_id;
    
    -- Upsert the sync status
    INSERT INTO role_sync_status (
        service_type,
        request_id,
        tracking_id,
        current_status,
        previous_status,
        customer_user_id,
        provider_user_id,
        last_known_lat,
        last_known_lng,
        location_updated_at,
        customer_synced,
        provider_synced,
        admin_notified
    ) VALUES (
        p_service_type,
        p_request_id,
        p_tracking_id,
        p_current_status,
        v_previous_status,
        p_customer_user_id,
        p_provider_user_id,
        p_lat,
        p_lng,
        CASE WHEN p_lat IS NOT NULL THEN NOW() ELSE NULL END,
        FALSE,
        FALSE,
        FALSE
    )
    ON CONFLICT (service_type, request_id) DO UPDATE SET
        tracking_id = COALESCE(EXCLUDED.tracking_id, role_sync_status.tracking_id),
        previous_status = role_sync_status.current_status,
        current_status = EXCLUDED.current_status,
        customer_user_id = COALESCE(EXCLUDED.customer_user_id, role_sync_status.customer_user_id),
        provider_user_id = COALESCE(EXCLUDED.provider_user_id, role_sync_status.provider_user_id),
        last_known_lat = COALESCE(EXCLUDED.last_known_lat, role_sync_status.last_known_lat),
        last_known_lng = COALESCE(EXCLUDED.last_known_lng, role_sync_status.last_known_lng),
        location_updated_at = CASE 
            WHEN EXCLUDED.last_known_lat IS NOT NULL THEN NOW() 
            ELSE role_sync_status.location_updated_at 
        END,
        -- Reset sync flags when status changes
        customer_synced = CASE 
            WHEN role_sync_status.current_status != EXCLUDED.current_status THEN FALSE 
            ELSE role_sync_status.customer_synced 
        END,
        provider_synced = CASE 
            WHEN role_sync_status.current_status != EXCLUDED.current_status THEN FALSE 
            ELSE role_sync_status.provider_synced 
        END,
        admin_notified = CASE 
            WHEN role_sync_status.current_status != EXCLUDED.current_status THEN FALSE 
            ELSE role_sync_status.admin_notified 
        END,
        updated_at = NOW()
    RETURNING id INTO v_sync_id;
    
    RETURN v_sync_id;
END;
$$;

COMMENT ON FUNCTION upsert_role_sync_status IS 'Create or update sync status for a service request, resetting sync flags on status change';

-- ============================================================================
-- Function: get_unsynced_requests
-- Purpose: Get requests that have pending sync for any role
-- ============================================================================
CREATE OR REPLACE FUNCTION get_unsynced_requests(
    p_role TEXT DEFAULT NULL,
    p_service_type TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    service_type TEXT,
    request_id UUID,
    tracking_id TEXT,
    current_status TEXT,
    customer_synced BOOLEAN,
    provider_synced BOOLEAN,
    admin_notified BOOLEAN,
    customer_user_id UUID,
    provider_user_id UUID,
    sync_attempts INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        rss.id,
        rss.service_type,
        rss.request_id,
        rss.tracking_id,
        rss.current_status,
        rss.customer_synced,
        rss.provider_synced,
        rss.admin_notified,
        rss.customer_user_id,
        rss.provider_user_id,
        rss.sync_attempts,
        rss.created_at,
        rss.updated_at
    FROM role_sync_status rss
    WHERE 
        (p_service_type IS NULL OR rss.service_type = p_service_type)
        AND (
            p_role IS NULL 
            OR (p_role = 'customer' AND rss.customer_synced = FALSE)
            OR (p_role = 'provider' AND rss.provider_synced = FALSE)
            OR (p_role = 'admin' AND rss.admin_notified = FALSE)
        )
        AND (
            p_role IS NOT NULL 
            OR rss.customer_synced = FALSE 
            OR rss.provider_synced = FALSE 
            OR rss.admin_notified = FALSE
        )
    ORDER BY rss.updated_at DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_unsynced_requests IS 'Get requests that have pending sync for any or specific role';

-- ============================================================================
-- Grant execute permissions on functions
-- ============================================================================
GRANT EXECUTE ON FUNCTION log_cross_role_event TO authenticated;
GRANT EXECUTE ON FUNCTION get_role_sync_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_cross_role_events TO authenticated;
GRANT EXECUTE ON FUNCTION get_service_breakdown TO authenticated;
GRANT EXECUTE ON FUNCTION mark_role_synced TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_role_sync_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_unsynced_requests TO authenticated;

-- ============================================================================
-- End of Migration
-- ============================================================================
