-- =============================================
-- Migration: 045_advanced_system.sql
-- Feature: F202-F251 - Advanced System Features
-- Description: ตารางสำหรับ Feature Flags, A/B Testing, User Preferences, Analytics
-- =============================================

-- =============================================
-- 1. FEATURE FLAGS TABLE (F202)
-- =============================================

CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT false,
    rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    target_users UUID[] DEFAULT '{}',
    target_roles TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feature_flags_key ON feature_flags(key);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled);

-- =============================================
-- 2. A/B TESTS TABLE (F203)
-- =============================================

CREATE TABLE IF NOT EXISTS ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ab_test_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    weight INTEGER DEFAULT 50 CHECK (weight >= 0 AND weight <= 100),
    is_control BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ab_test_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES ab_test_variants(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(test_id, user_id)
);

CREATE TABLE IF NOT EXISTS ab_test_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES ab_test_variants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    converted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ab_tests_status ON ab_tests(status);
CREATE INDEX idx_ab_test_assignments_user ON ab_test_assignments(user_id);
CREATE INDEX idx_ab_test_conversions_test ON ab_test_conversions(test_id);

-- =============================================
-- 3. USER PREFERENCES TABLE (F204)
-- =============================================

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    language TEXT DEFAULT 'th',
    notifications JSONB DEFAULT '{"push": true, "email": true, "sms": true, "marketing": false}',
    privacy JSONB DEFAULT '{"shareLocation": true, "shareRideHistory": false, "allowAnalytics": true}',
    accessibility JSONB DEFAULT '{"fontSize": "medium", "highContrast": false, "reduceMotion": false}',
    ride_preferences JSONB DEFAULT '{"defaultPaymentMethod": null, "preferredVehicleType": null, "autoTip": 0, "quietRide": false}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);

-- =============================================
-- 4. ANALYTICS EVENTS TABLE (F237)
-- =============================================

CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_name TEXT NOT NULL,
    event_category TEXT NOT NULL,
    properties JSONB DEFAULT '{}',
    page_url TEXT,
    page_name TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_category ON analytics_events(event_category);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at DESC);

-- =============================================
-- 5. SYSTEM HEALTH LOG TABLE (F251)
-- =============================================

CREATE TABLE IF NOT EXISTS system_health_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
    uptime_ms BIGINT,
    memory_used BIGINT,
    memory_total BIGINT,
    memory_percentage NUMERIC,
    network_online BOOLEAN,
    network_latency NUMERIC,
    storage_used BIGINT,
    storage_quota BIGINT,
    storage_percentage NUMERIC,
    details JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_health_status ON system_health_log(status);
CREATE INDEX idx_system_health_recorded ON system_health_log(recorded_at DESC);

-- =============================================
-- 6. FUNCTIONS
-- =============================================

-- Function: Get feature flag status for user
CREATE OR REPLACE FUNCTION get_feature_flag(
    p_flag_key TEXT,
    p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_flag RECORD;
    v_hash INTEGER;
BEGIN
    SELECT * INTO v_flag FROM feature_flags WHERE key = p_flag_key;
    
    IF NOT FOUND OR NOT v_flag.enabled THEN
        RETURN FALSE;
    END IF;
    
    -- Check target users
    IF p_user_id IS NOT NULL AND v_flag.target_users IS NOT NULL AND array_length(v_flag.target_users, 1) > 0 THEN
        IF p_user_id = ANY(v_flag.target_users) THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    -- Check rollout percentage
    IF v_flag.rollout_percentage < 100 AND p_user_id IS NOT NULL THEN
        v_hash := abs(hashtext(p_user_id::text || p_flag_key)) % 100;
        RETURN v_hash < v_flag.rollout_percentage;
    END IF;
    
    RETURN v_flag.enabled;
END;
$$;

-- Function: Assign user to A/B test variant
CREATE OR REPLACE FUNCTION assign_ab_test_variant(
    p_test_id UUID,
    p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing UUID;
    v_variant RECORD;
    v_total_weight INTEGER;
    v_random INTEGER;
    v_cumulative INTEGER := 0;
BEGIN
    -- Check existing assignment
    SELECT variant_id INTO v_existing 
    FROM ab_test_assignments 
    WHERE test_id = p_test_id AND user_id = p_user_id;
    
    IF FOUND THEN
        RETURN v_existing;
    END IF;
    
    -- Get total weight
    SELECT SUM(weight) INTO v_total_weight 
    FROM ab_test_variants 
    WHERE test_id = p_test_id;
    
    -- Random selection based on weight
    v_random := abs(hashtext(p_user_id::text || p_test_id::text)) % v_total_weight;
    
    FOR v_variant IN 
        SELECT id, weight FROM ab_test_variants WHERE test_id = p_test_id ORDER BY id
    LOOP
        v_cumulative := v_cumulative + v_variant.weight;
        IF v_random < v_cumulative THEN
            INSERT INTO ab_test_assignments (test_id, user_id, variant_id)
            VALUES (p_test_id, p_user_id, v_variant.id);
            RETURN v_variant.id;
        END IF;
    END LOOP;
    
    RETURN NULL;
END;
$$;

-- Function: Track A/B test conversion
CREATE OR REPLACE FUNCTION track_ab_conversion(
    p_test_id UUID,
    p_user_id UUID,
    p_event_name TEXT,
    p_event_data JSONB DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_variant_id UUID;
BEGIN
    SELECT variant_id INTO v_variant_id 
    FROM ab_test_assignments 
    WHERE test_id = p_test_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    INSERT INTO ab_test_conversions (test_id, variant_id, user_id, event_name, event_data)
    VALUES (p_test_id, v_variant_id, p_user_id, p_event_name, p_event_data);
    
    RETURN TRUE;
END;
$$;

-- Function: Get A/B test results
CREATE OR REPLACE FUNCTION get_ab_test_results(p_test_id UUID)
RETURNS TABLE (
    variant_id UUID,
    variant_name TEXT,
    is_control BOOLEAN,
    total_users BIGINT,
    total_conversions BIGINT,
    conversion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.name,
        v.is_control,
        COUNT(DISTINCT a.user_id)::BIGINT as total_users,
        COUNT(DISTINCT c.user_id)::BIGINT as total_conversions,
        CASE 
            WHEN COUNT(DISTINCT a.user_id) > 0 
            THEN ROUND((COUNT(DISTINCT c.user_id)::NUMERIC / COUNT(DISTINCT a.user_id)::NUMERIC) * 100, 2)
            ELSE 0
        END as conversion_rate
    FROM ab_test_variants v
    LEFT JOIN ab_test_assignments a ON a.variant_id = v.id
    LEFT JOIN ab_test_conversions c ON c.variant_id = v.id
    WHERE v.test_id = p_test_id
    GROUP BY v.id, v.name, v.is_control
    ORDER BY v.is_control DESC, v.name;
END;
$$;

-- Function: Get analytics summary
CREATE OR REPLACE FUNCTION get_analytics_summary(
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    total_events BIGINT,
    unique_users BIGINT,
    unique_sessions BIGINT,
    top_events JSONB,
    top_pages JSONB,
    device_breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH events AS (
        SELECT * FROM analytics_events
        WHERE created_at > NOW() - (p_hours || ' hours')::INTERVAL
    )
    SELECT
        COUNT(*)::BIGINT,
        COUNT(DISTINCT user_id)::BIGINT,
        COUNT(DISTINCT session_id)::BIGINT,
        (
            SELECT COALESCE(jsonb_agg(row_to_json(te)), '[]'::jsonb)
            FROM (
                SELECT event_name, COUNT(*) as count
                FROM events
                GROUP BY event_name
                ORDER BY count DESC
                LIMIT 10
            ) te
        ),
        (
            SELECT COALESCE(jsonb_agg(row_to_json(tp)), '[]'::jsonb)
            FROM (
                SELECT page_name, COUNT(*) as count
                FROM events
                WHERE page_name IS NOT NULL
                GROUP BY page_name
                ORDER BY count DESC
                LIMIT 10
            ) tp
        ),
        (
            SELECT COALESCE(jsonb_agg(row_to_json(db)), '[]'::jsonb)
            FROM (
                SELECT device_type, COUNT(*) as count
                FROM events
                WHERE device_type IS NOT NULL
                GROUP BY device_type
            ) db
        )
    FROM events;
END;
$$;

-- =============================================
-- 7. RLS POLICIES
-- =============================================

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_log ENABLE ROW LEVEL SECURITY;

-- Feature flags: Read for all, write for admin
CREATE POLICY "Anyone can read feature flags" ON feature_flags
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage feature flags" ON feature_flags
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- A/B Tests: Admin only for management
CREATE POLICY "Admins can manage ab tests" ON ab_tests
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage ab test variants" ON ab_test_variants
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- A/B Test assignments: Users can read own, admin can read all
CREATE POLICY "Users can read own ab assignments" ON ab_test_assignments
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage ab assignments" ON ab_test_assignments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- User preferences: Users can manage own
CREATE POLICY "Users can manage own preferences" ON user_preferences
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can read all preferences" ON user_preferences
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Analytics: Insert for all, read for admin
CREATE POLICY "Anyone can insert analytics" ON analytics_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read analytics" ON analytics_events
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- System health: Admin only
CREATE POLICY "Admins can manage system health" ON system_health_log
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- 8. INSERT DEFAULT FEATURE FLAGS
-- =============================================

INSERT INTO feature_flags (key, name, description, enabled, rollout_percentage) VALUES
    ('dark_mode', 'Dark Mode', 'เปิดใช้งาน Dark Mode', true, 100),
    ('new_booking_flow', 'New Booking Flow', 'UI ใหม่สำหรับการจอง', false, 0),
    ('voice_navigation', 'Voice Navigation', 'นำทางด้วยเสียง', true, 50),
    ('loyalty_program', 'Loyalty Program', 'ระบบแต้มสะสม', true, 100),
    ('scheduled_rides', 'Scheduled Rides', 'จองล่วงหน้า', true, 100),
    ('fare_splitting', 'Fare Splitting', 'แบ่งค่าโดยสาร', true, 100),
    ('in_app_chat', 'In-App Chat', 'แชทในแอป', true, 100),
    ('safety_toolkit', 'Safety Toolkit', 'เครื่องมือความปลอดภัย', true, 100)
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE feature_flags IS 'Feature flags สำหรับ gradual rollout (F202)';
COMMENT ON TABLE ab_tests IS 'A/B Testing experiments (F203)';
COMMENT ON TABLE user_preferences IS 'User preferences และ settings (F204)';
COMMENT ON TABLE analytics_events IS 'Analytics events tracking (F237)';
COMMENT ON TABLE system_health_log IS 'System health monitoring log (F251)';
