-- Advanced Job Management System
-- Migration: 261_advanced_job_management_system.sql
-- Description: Job Priority, Auto-Accept Rules, and Heat Map system with Admin controls
-- Date: 2026-01-13

BEGIN;

-- =====================================================
-- 1. JOB PRIORITY SYSTEM
-- =====================================================

-- Job priority configuration table
CREATE TABLE IF NOT EXISTS job_priority_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    distance_weight DECIMAL(3,2) DEFAULT 0.4, -- 40% weight for distance
    fare_weight DECIMAL(3,2) DEFAULT 0.3,     -- 30% weight for fare
    rating_weight DECIMAL(3,2) DEFAULT 0.2,   -- 20% weight for customer rating
    time_weight DECIMAL(3,2) DEFAULT 0.1,     -- 10% weight for time (newer = higher)
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT check_weights_sum CHECK (
        distance_weight + fare_weight + rating_weight + time_weight = 1.0
    )
);

-- Enable RLS
ALTER TABLE job_priority_config ENABLE ROW LEVEL SECURITY;

-- Admin can manage priority configs
CREATE POLICY "admin_manage_job_priority" ON job_priority_config
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Insert default priority config
INSERT INTO job_priority_config (name, description, is_active) VALUES
('default', 'Default job priority algorithm', true)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 2. AUTO-ACCEPT RULES SYSTEM
-- =====================================================

-- Auto-accept rules table
CREATE TABLE IF NOT EXISTS auto_accept_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    
    -- Rule conditions
    max_distance_km DECIMAL(5,2), -- Maximum distance in km
    min_fare DECIMAL(10,2),       -- Minimum fare amount
    max_fare DECIMAL(10,2),       -- Maximum fare amount
    min_customer_rating DECIMAL(2,1), -- Minimum customer rating (1.0-5.0)
    allowed_service_types TEXT[], -- ['ride', 'delivery', 'shopping']
    allowed_time_start TIME,      -- Start time (e.g., '06:00')
    allowed_time_end TIME,        -- End time (e.g., '22:00')
    allowed_days INTEGER[],       -- Days of week (1=Monday, 7=Sunday)
    
    -- Geographic restrictions
    allowed_pickup_areas JSONB,   -- GeoJSON polygons for pickup areas
    blocked_pickup_areas JSONB,   -- GeoJSON polygons to avoid
    
    -- Provider settings
    provider_id UUID REFERENCES providers_v2(id) ON DELETE CASCADE,
    priority_order INTEGER DEFAULT 1, -- Rule execution order
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_fare_range CHECK (min_fare IS NULL OR max_fare IS NULL OR min_fare <= max_fare),
    CONSTRAINT check_rating_range CHECK (min_customer_rating IS NULL OR (min_customer_rating >= 1.0 AND min_customer_rating <= 5.0)),
    CONSTRAINT check_time_range CHECK (allowed_time_start IS NULL OR allowed_time_end IS NULL OR allowed_time_start < allowed_time_end)
);

-- Enable RLS
ALTER TABLE auto_accept_rules ENABLE ROW LEVEL SECURITY;

-- Providers can manage their own rules
CREATE POLICY "provider_own_auto_accept_rules" ON auto_accept_rules
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM providers_v2 
            WHERE providers_v2.id = auto_accept_rules.provider_id 
            AND providers_v2.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM providers_v2 
            WHERE providers_v2.id = auto_accept_rules.provider_id 
            AND providers_v2.user_id = auth.uid()
        )
    );

-- Admin can view all rules
CREATE POLICY "admin_view_all_auto_accept_rules" ON auto_accept_rules
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- =====================================================
-- 3. JOB HEAT MAP SYSTEM
-- =====================================================

-- Heat map data aggregation table
CREATE TABLE IF NOT EXISTS job_heat_map_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grid_lat DECIMAL(10,8) NOT NULL,  -- Grid center latitude
    grid_lng DECIMAL(11,8) NOT NULL,  -- Grid center longitude
    grid_size_km DECIMAL(5,2) DEFAULT 1.0, -- Grid cell size in km
    
    -- Time period
    date_hour TIMESTAMPTZ NOT NULL,   -- Hour bucket (e.g., 2026-01-13 14:00:00)
    
    -- Metrics
    total_requests INTEGER DEFAULT 0,
    completed_requests INTEGER DEFAULT 0,
    cancelled_requests INTEGER DEFAULT 0,
    avg_fare DECIMAL(10,2),
    avg_wait_time_minutes INTEGER,
    avg_trip_duration_minutes INTEGER,
    
    -- Demand/Supply ratio
    demand_score DECIMAL(5,2) DEFAULT 0, -- Higher = more demand
    supply_score DECIMAL(5,2) DEFAULT 0, -- Higher = more providers
    heat_score DECIMAL(5,2) DEFAULT 0,   -- Combined heat score
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(grid_lat, grid_lng, grid_size_km, date_hour)
);

-- Enable RLS
ALTER TABLE job_heat_map_data ENABLE ROW LEVEL SECURITY;

-- Providers and admins can read heat map data
CREATE POLICY "providers_read_heat_map" ON job_heat_map_data
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM providers_v2 
            WHERE providers_v2.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Indexes for heat map queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_heat_map_location_time 
ON job_heat_map_data(grid_lat, grid_lng, date_hour DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_heat_map_heat_score 
ON job_heat_map_data(heat_score DESC, date_hour DESC);

-- =====================================================
-- 4. ADMIN CONFIGURATION TABLES
-- =====================================================

-- System configuration for admin
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    
    UNIQUE(category, key)
);

-- Enable RLS
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Admin can manage system config
CREATE POLICY "admin_manage_system_config" ON system_config
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Insert default system configurations
INSERT INTO system_config (category, key, value, description) VALUES
('job_priority', 'enabled', 'true', 'Enable job priority system'),
('job_priority', 'algorithm', '"weighted_score"', 'Priority algorithm type'),
('auto_accept', 'enabled', 'true', 'Enable auto-accept rules'),
('auto_accept', 'max_rules_per_provider', '10', 'Maximum rules per provider'),
('heat_map', 'enabled', 'true', 'Enable heat map system'),
('heat_map', 'grid_size_km', '1.0', 'Default grid size in kilometers'),
('heat_map', 'update_interval_minutes', '15', 'Heat map update interval'),
('heat_map', 'retention_days', '30', 'Heat map data retention period')
ON CONFLICT (category, key) DO NOTHING;

-- =====================================================
-- 5. FUNCTIONS FOR JOB PRIORITY CALCULATION
-- =====================================================

-- Function to calculate job priority score
CREATE OR REPLACE FUNCTION calculate_job_priority_score(
    p_ride_id UUID,
    p_provider_lat DECIMAL,
    p_provider_lng DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
    v_config RECORD;
    v_ride RECORD;
    v_customer_rating DECIMAL;
    v_distance_km DECIMAL;
    v_time_hours DECIMAL;
    v_distance_score DECIMAL;
    v_fare_score DECIMAL;
    v_rating_score DECIMAL;
    v_time_score DECIMAL;
    v_final_score DECIMAL;
BEGIN
    -- Get active priority configuration
    SELECT * INTO v_config 
    FROM job_priority_config 
    WHERE is_active = true 
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN 0.5; -- Default neutral score
    END IF;
    
    -- Get ride details
    SELECT * INTO v_ride
    FROM ride_requests
    WHERE id = p_ride_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Calculate distance (Haversine formula)
    v_distance_km := (
        6371 * acos(
            cos(radians(p_provider_lat)) * 
            cos(radians(v_ride.pickup_lat)) * 
            cos(radians(v_ride.pickup_lng) - radians(p_provider_lng)) + 
            sin(radians(p_provider_lat)) * 
            sin(radians(v_ride.pickup_lat))
        )
    );
    
    -- Get customer rating (default 4.0 if no ratings)
    SELECT COALESCE(AVG(rating), 4.0) INTO v_customer_rating
    FROM ride_ratings
    WHERE customer_id = v_ride.user_id;
    
    -- Calculate time since request (in hours)
    v_time_hours := EXTRACT(EPOCH FROM (NOW() - v_ride.created_at)) / 3600.0;
    
    -- Calculate component scores (0.0 to 1.0)
    -- Distance: closer = higher score (inverse relationship)
    v_distance_score := GREATEST(0, 1.0 - (v_distance_km / 20.0)); -- Max 20km
    
    -- Fare: higher fare = higher score
    v_fare_score := LEAST(1.0, (v_ride.estimated_fare - 50.0) / 500.0); -- 50-550 baht range
    
    -- Rating: higher rating = higher score
    v_rating_score := (v_customer_rating - 1.0) / 4.0; -- 1-5 scale to 0-1
    
    -- Time: newer requests = higher score
    v_time_score := GREATEST(0, 1.0 - (v_time_hours / 2.0)); -- Max 2 hours
    
    -- Calculate weighted final score
    v_final_score := (
        v_distance_score * v_config.distance_weight +
        v_fare_score * v_config.fare_weight +
        v_rating_score * v_config.rating_weight +
        v_time_score * v_config.time_weight
    );
    
    RETURN LEAST(1.0, GREATEST(0.0, v_final_score));
END;
$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_job_priority_score(UUID, DECIMAL, DECIMAL) TO authenticated;

-- =====================================================
-- 6. FUNCTIONS FOR AUTO-ACCEPT RULES
-- =====================================================

-- Function to check if a job matches auto-accept rules
CREATE OR REPLACE FUNCTION check_auto_accept_rules(
    p_ride_id UUID,
    p_provider_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
    v_rule RECORD;
    v_ride RECORD;
    v_customer_rating DECIMAL;
    v_distance_km DECIMAL;
    v_current_time TIME;
    v_current_day INTEGER;
BEGIN
    -- Check if auto-accept is enabled
    IF NOT EXISTS (
        SELECT 1 FROM system_config 
        WHERE category = 'auto_accept' 
        AND key = 'enabled' 
        AND value::boolean = true
    ) THEN
        RETURN false;
    END IF;
    
    -- Get ride details
    SELECT * INTO v_ride
    FROM ride_requests
    WHERE id = p_ride_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Get customer rating
    SELECT COALESCE(AVG(rating), 4.0) INTO v_customer_rating
    FROM ride_ratings
    WHERE customer_id = v_ride.user_id;
    
    -- Get current time and day
    v_current_time := CURRENT_TIME;
    v_current_day := EXTRACT(DOW FROM CURRENT_DATE); -- 0=Sunday, 1=Monday, etc.
    v_current_day := CASE WHEN v_current_day = 0 THEN 7 ELSE v_current_day END; -- Convert to 1-7
    
    -- Check each active rule for this provider (ordered by priority)
    FOR v_rule IN 
        SELECT * FROM auto_accept_rules 
        WHERE provider_id = p_provider_id 
        AND is_active = true 
        ORDER BY priority_order ASC
    LOOP
        -- Calculate distance if distance rule exists
        IF v_rule.max_distance_km IS NOT NULL THEN
            SELECT current_lat, current_lng INTO v_distance_km, v_distance_km
            FROM providers_v2 
            WHERE id = p_provider_id;
            
            v_distance_km := (
                6371 * acos(
                    cos(radians(v_distance_km)) * 
                    cos(radians(v_ride.pickup_lat)) * 
                    cos(radians(v_ride.pickup_lng) - radians(v_distance_km)) + 
                    sin(radians(v_distance_km)) * 
                    sin(radians(v_ride.pickup_lat))
                )
            );
            
            IF v_distance_km > v_rule.max_distance_km THEN
                CONTINUE; -- Skip this rule
            END IF;
        END IF;
        
        -- Check fare range
        IF v_rule.min_fare IS NOT NULL AND v_ride.estimated_fare < v_rule.min_fare THEN
            CONTINUE;
        END IF;
        
        IF v_rule.max_fare IS NOT NULL AND v_ride.estimated_fare > v_rule.max_fare THEN
            CONTINUE;
        END IF;
        
        -- Check customer rating
        IF v_rule.min_customer_rating IS NOT NULL AND v_customer_rating < v_rule.min_customer_rating THEN
            CONTINUE;
        END IF;
        
        -- Check service type
        IF v_rule.allowed_service_types IS NOT NULL AND NOT ('ride' = ANY(v_rule.allowed_service_types)) THEN
            CONTINUE;
        END IF;
        
        -- Check time range
        IF v_rule.allowed_time_start IS NOT NULL AND v_rule.allowed_time_end IS NOT NULL THEN
            IF v_current_time < v_rule.allowed_time_start OR v_current_time > v_rule.allowed_time_end THEN
                CONTINUE;
            END IF;
        END IF;
        
        -- Check days
        IF v_rule.allowed_days IS NOT NULL AND NOT (v_current_day = ANY(v_rule.allowed_days)) THEN
            CONTINUE;
        END IF;
        
        -- If we reach here, the rule matches
        RETURN true;
    END LOOP;
    
    -- No matching rules found
    RETURN false;
END;
$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_auto_accept_rules(UUID, UUID) TO authenticated;

-- =====================================================
-- 7. FUNCTIONS FOR HEAT MAP DATA
-- =====================================================

-- Function to update heat map data
CREATE OR REPLACE FUNCTION update_heat_map_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
    v_grid_size DECIMAL;
    v_current_hour TIMESTAMPTZ;
BEGIN
    -- Get grid size from config
    SELECT (value::text)::decimal INTO v_grid_size
    FROM system_config
    WHERE category = 'heat_map' AND key = 'grid_size_km';
    
    v_grid_size := COALESCE(v_grid_size, 1.0);
    
    -- Get current hour bucket
    v_current_hour := date_trunc('hour', NOW());
    
    -- Update heat map data for the current hour
    INSERT INTO job_heat_map_data (
        grid_lat, grid_lng, grid_size_km, date_hour,
        total_requests, completed_requests, cancelled_requests,
        avg_fare, avg_wait_time_minutes, heat_score
    )
    SELECT 
        ROUND(pickup_lat / v_grid_size) * v_grid_size as grid_lat,
        ROUND(pickup_lng / v_grid_size) * v_grid_size as grid_lng,
        v_grid_size,
        v_current_hour,
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_requests,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_requests,
        AVG(estimated_fare) as avg_fare,
        AVG(EXTRACT(EPOCH FROM (accepted_at - created_at)) / 60) as avg_wait_time_minutes,
        -- Simple heat score: requests per hour
        COUNT(*)::decimal as heat_score
    FROM ride_requests
    WHERE created_at >= v_current_hour - INTERVAL '1 hour'
        AND created_at < v_current_hour
        AND pickup_lat IS NOT NULL
        AND pickup_lng IS NOT NULL
    GROUP BY grid_lat, grid_lng
    ON CONFLICT (grid_lat, grid_lng, grid_size_km, date_hour)
    DO UPDATE SET
        total_requests = EXCLUDED.total_requests,
        completed_requests = EXCLUDED.completed_requests,
        cancelled_requests = EXCLUDED.cancelled_requests,
        avg_fare = EXCLUDED.avg_fare,
        avg_wait_time_minutes = EXCLUDED.avg_wait_time_minutes,
        heat_score = EXCLUDED.heat_score,
        updated_at = NOW();
END;
$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_heat_map_data() TO authenticated;

-- =====================================================
-- 8. ENHANCED GET NEARBY RIDES WITH PRIORITY
-- =====================================================

-- Enhanced function with priority scoring
CREATE OR REPLACE FUNCTION get_nearby_pending_rides_with_priority(
    provider_lat DECIMAL,
    provider_lng DECIMAL,
    radius_km DECIMAL DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    tracking_id TEXT,
    user_id UUID,
    pickup_lat DECIMAL,
    pickup_lng DECIMAL,
    pickup_address TEXT,
    destination_lat DECIMAL,
    destination_lng DECIMAL,
    destination_address TEXT,
    estimated_fare DECIMAL,
    created_at TIMESTAMPTZ,
    distance_km DECIMAL,
    priority_score DECIMAL,
    auto_accept_eligible BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
    v_provider_id UUID;
BEGIN
    -- Get provider ID
    SELECT p.id INTO v_provider_id
    FROM providers_v2 p
    WHERE p.user_id = auth.uid()
    AND p.status IN ('approved', 'active')
    AND p.is_online = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Access denied: Not an active provider';
    END IF;

    RETURN QUERY
    SELECT 
        r.id,
        COALESCE(r.tracking_id, r.id::text) as tracking_id,
        r.user_id,
        r.pickup_lat,
        r.pickup_lng,
        r.pickup_address,
        r.destination_lat,
        r.destination_lng,
        r.destination_address,
        r.estimated_fare,
        r.created_at,
        -- Calculate distance
        (
            6371 * acos(
                cos(radians(provider_lat)) * 
                cos(radians(r.pickup_lat)) * 
                cos(radians(r.pickup_lng) - radians(provider_lng)) + 
                sin(radians(provider_lat)) * 
                sin(radians(r.pickup_lat))
            )
        )::DECIMAL as distance_km,
        -- Calculate priority score
        calculate_job_priority_score(r.id, provider_lat, provider_lng) as priority_score,
        -- Check auto-accept eligibility
        check_auto_accept_rules(r.id, v_provider_id) as auto_accept_eligible
    FROM ride_requests r
    WHERE r.status = 'pending'
        AND r.provider_id IS NULL
        AND r.pickup_lat IS NOT NULL
        AND r.pickup_lng IS NOT NULL
        -- Pre-filter by bounding box
        AND r.pickup_lat BETWEEN provider_lat - (radius_km / 111.0) AND provider_lat + (radius_km / 111.0)
        AND r.pickup_lng BETWEEN provider_lng - (radius_km / (111.0 * cos(radians(provider_lat)))) AND provider_lng + (radius_km / (111.0 * cos(radians(provider_lat))))
    HAVING (
        6371 * acos(
            cos(radians(provider_lat)) * 
            cos(radians(r.pickup_lat)) * 
            cos(radians(r.pickup_lng) - radians(provider_lng)) + 
            sin(radians(provider_lat)) * 
            sin(radians(r.pickup_lat))
        )
    ) <= radius_km
    ORDER BY 
        priority_score DESC,  -- Highest priority first
        distance_km ASC,      -- Then by distance
        r.created_at ASC      -- Then by time
    LIMIT 20;
END;
$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_nearby_pending_rides_with_priority(DECIMAL, DECIMAL, DECIMAL) TO authenticated;

-- =====================================================
-- 9. TRIGGERS AND AUTOMATION
-- =====================================================

-- Trigger to update heat map data periodically
CREATE OR REPLACE FUNCTION trigger_update_heat_map()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $
BEGIN
    -- Update heat map when ride status changes to completed or cancelled
    IF (OLD.status != NEW.status AND NEW.status IN ('completed', 'cancelled')) THEN
        PERFORM update_heat_map_data();
    END IF;
    
    RETURN NEW;
END;
$;

-- Create trigger
DROP TRIGGER IF EXISTS update_heat_map_on_ride_complete ON ride_requests;
CREATE TRIGGER update_heat_map_on_ride_complete
    AFTER UPDATE ON ride_requests
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_heat_map();

COMMIT;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE job_priority_config IS 'Configuration for job priority algorithm with weighted scoring';
COMMENT ON TABLE auto_accept_rules IS 'Provider-specific rules for automatic job acceptance';
COMMENT ON TABLE job_heat_map_data IS 'Aggregated data for job demand heat map visualization';
COMMENT ON TABLE system_config IS 'System-wide configuration managed by admins';

COMMENT ON FUNCTION calculate_job_priority_score IS 'Calculate priority score for a job based on distance, fare, rating, and time';
COMMENT ON FUNCTION check_auto_accept_rules IS 'Check if a job matches provider auto-accept rules';
COMMENT ON FUNCTION get_nearby_pending_rides_with_priority IS 'Get nearby rides with priority scores and auto-accept flags';
COMMENT ON FUNCTION update_heat_map_data IS 'Update heat map data aggregation for demand analysis';