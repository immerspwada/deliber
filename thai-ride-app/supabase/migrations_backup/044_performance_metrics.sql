-- =============================================
-- Migration: 044_performance_metrics.sql
-- Feature: F172-F201 - Performance Monitoring System
-- Description: ตารางสำหรับเก็บ performance metrics และ alerts
-- =============================================

-- =============================================
-- 1. PERFORMANCE METRICS TABLE
-- เก็บ metrics จาก client-side monitoring
-- =============================================

CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Session info
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    device_type TEXT, -- 'mobile', 'tablet', 'desktop'
    browser TEXT,
    os TEXT,
    
    -- Core Web Vitals
    fcp NUMERIC, -- First Contentful Paint (ms)
    lcp NUMERIC, -- Largest Contentful Paint (ms)
    fid NUMERIC, -- First Input Delay (ms)
    cls NUMERIC, -- Cumulative Layout Shift
    ttfb NUMERIC, -- Time to First Byte (ms)
    
    -- Page metrics
    page_load_time NUMERIC, -- Total page load time (ms)
    dom_content_loaded NUMERIC, -- DOM content loaded time (ms)
    
    -- Memory metrics
    js_heap_size BIGINT, -- Used JS heap size (bytes)
    total_heap_size BIGINT, -- Total JS heap size (bytes)
    memory_usage_percent NUMERIC, -- Memory usage percentage
    
    -- Network metrics
    effective_type TEXT, -- '4g', '3g', '2g', 'slow-2g'
    downlink NUMERIC, -- Downlink speed (Mbps)
    rtt INTEGER, -- Round trip time (ms)
    
    -- API metrics
    api_call_count INTEGER DEFAULT 0,
    avg_api_response_time NUMERIC, -- Average API response time (ms)
    slowest_api_time NUMERIC, -- Slowest API call (ms)
    
    -- Cache metrics
    cache_hit_rate NUMERIC, -- Cache hit rate percentage
    
    -- Page info
    page_url TEXT,
    page_name TEXT,
    
    -- Timestamps
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying
CREATE INDEX idx_performance_metrics_session ON performance_metrics(session_id);
CREATE INDEX idx_performance_metrics_user ON performance_metrics(user_id);
CREATE INDEX idx_performance_metrics_recorded ON performance_metrics(recorded_at DESC);
CREATE INDEX idx_performance_metrics_page ON performance_metrics(page_name);

-- =============================================
-- 2. PERFORMANCE ALERTS TABLE
-- แจ้งเตือนเมื่อ performance ต่ำกว่าเกณฑ์
-- =============================================

CREATE TABLE IF NOT EXISTS performance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Alert info
    alert_type TEXT NOT NULL, -- 'slow_page_load', 'high_memory', 'slow_api', 'poor_lcp', 'high_cls'
    severity TEXT NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
    
    -- Threshold info
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    threshold_value NUMERIC NOT NULL,
    
    -- Context
    session_id TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    page_url TEXT,
    page_name TEXT,
    device_type TEXT,
    browser TEXT,
    
    -- Additional data
    details JSONB DEFAULT '{}',
    
    -- Status
    status TEXT DEFAULT 'new', -- 'new', 'acknowledged', 'resolved', 'ignored'
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying
CREATE INDEX idx_performance_alerts_type ON performance_alerts(alert_type);
CREATE INDEX idx_performance_alerts_severity ON performance_alerts(severity);
CREATE INDEX idx_performance_alerts_status ON performance_alerts(status);
CREATE INDEX idx_performance_alerts_created ON performance_alerts(created_at DESC);

-- =============================================
-- 3. API PERFORMANCE LOG TABLE
-- เก็บ log ของ API calls ที่ช้า
-- =============================================

CREATE TABLE IF NOT EXISTS api_performance_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Request info
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL, -- 'GET', 'POST', 'PUT', 'DELETE'
    
    -- Timing
    duration_ms NUMERIC NOT NULL,
    
    -- Response
    status_code INTEGER,
    response_size BIGINT, -- bytes
    
    -- Context
    session_id TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamps
    requested_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying slow APIs
CREATE INDEX idx_api_performance_endpoint ON api_performance_log(endpoint);
CREATE INDEX idx_api_performance_duration ON api_performance_log(duration_ms DESC);
CREATE INDEX idx_api_performance_requested ON api_performance_log(requested_at DESC);

-- Partial index for slow requests only (> 1000ms)
CREATE INDEX idx_api_performance_slow ON api_performance_log(duration_ms DESC) 
WHERE duration_ms > 1000;

-- =============================================
-- 4. PERFORMANCE THRESHOLDS TABLE
-- กำหนดเกณฑ์สำหรับ alerts
-- =============================================

CREATE TABLE IF NOT EXISTS performance_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    metric_name TEXT NOT NULL UNIQUE,
    
    -- Thresholds
    warning_threshold NUMERIC NOT NULL,
    critical_threshold NUMERIC NOT NULL,
    
    -- Settings
    is_enabled BOOLEAN DEFAULT true,
    alert_cooldown_minutes INTEGER DEFAULT 60, -- ไม่แจ้งซ้ำภายในเวลานี้
    
    -- Metadata
    description TEXT,
    unit TEXT, -- 'ms', 'percent', 'bytes'
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default thresholds
INSERT INTO performance_thresholds (metric_name, warning_threshold, critical_threshold, description, unit) VALUES
    ('page_load_time', 3000, 5000, 'Total page load time', 'ms'),
    ('lcp', 2500, 4000, 'Largest Contentful Paint', 'ms'),
    ('fid', 100, 300, 'First Input Delay', 'ms'),
    ('cls', 0.1, 0.25, 'Cumulative Layout Shift', 'score'),
    ('ttfb', 800, 1800, 'Time to First Byte', 'ms'),
    ('memory_usage_percent', 70, 90, 'Memory usage percentage', 'percent'),
    ('api_response_time', 1000, 3000, 'API response time', 'ms'),
    ('cache_hit_rate', 50, 30, 'Cache hit rate (lower is worse)', 'percent')
ON CONFLICT (metric_name) DO NOTHING;

-- =============================================
-- 5. FUNCTIONS
-- =============================================

-- Function: Record performance metrics
CREATE OR REPLACE FUNCTION record_performance_metrics(
    p_session_id TEXT,
    p_user_id UUID DEFAULT NULL,
    p_device_type TEXT DEFAULT NULL,
    p_browser TEXT DEFAULT NULL,
    p_os TEXT DEFAULT NULL,
    p_fcp NUMERIC DEFAULT NULL,
    p_lcp NUMERIC DEFAULT NULL,
    p_fid NUMERIC DEFAULT NULL,
    p_cls NUMERIC DEFAULT NULL,
    p_ttfb NUMERIC DEFAULT NULL,
    p_page_load_time NUMERIC DEFAULT NULL,
    p_dom_content_loaded NUMERIC DEFAULT NULL,
    p_js_heap_size BIGINT DEFAULT NULL,
    p_total_heap_size BIGINT DEFAULT NULL,
    p_memory_usage_percent NUMERIC DEFAULT NULL,
    p_effective_type TEXT DEFAULT NULL,
    p_downlink NUMERIC DEFAULT NULL,
    p_rtt INTEGER DEFAULT NULL,
    p_api_call_count INTEGER DEFAULT 0,
    p_avg_api_response_time NUMERIC DEFAULT NULL,
    p_slowest_api_time NUMERIC DEFAULT NULL,
    p_cache_hit_rate NUMERIC DEFAULT NULL,
    p_page_url TEXT DEFAULT NULL,
    p_page_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_metric_id UUID;
BEGIN
    -- Insert metrics
    INSERT INTO performance_metrics (
        session_id, user_id, device_type, browser, os,
        fcp, lcp, fid, cls, ttfb,
        page_load_time, dom_content_loaded,
        js_heap_size, total_heap_size, memory_usage_percent,
        effective_type, downlink, rtt,
        api_call_count, avg_api_response_time, slowest_api_time,
        cache_hit_rate, page_url, page_name
    ) VALUES (
        p_session_id, p_user_id, p_device_type, p_browser, p_os,
        p_fcp, p_lcp, p_fid, p_cls, p_ttfb,
        p_page_load_time, p_dom_content_loaded,
        p_js_heap_size, p_total_heap_size, p_memory_usage_percent,
        p_effective_type, p_downlink, p_rtt,
        p_api_call_count, p_avg_api_response_time, p_slowest_api_time,
        p_cache_hit_rate, p_page_url, p_page_name
    )
    RETURNING id INTO v_metric_id;
    
    -- Check thresholds and create alerts
    PERFORM check_performance_thresholds(
        v_metric_id, p_session_id, p_user_id,
        p_page_load_time, p_lcp, p_fid, p_cls, p_ttfb,
        p_memory_usage_percent, p_avg_api_response_time, p_cache_hit_rate,
        p_page_url, p_page_name, p_device_type, p_browser
    );
    
    RETURN v_metric_id;
END;
$$;

-- Function: Check thresholds and create alerts
CREATE OR REPLACE FUNCTION check_performance_thresholds(
    p_metric_id UUID,
    p_session_id TEXT,
    p_user_id UUID,
    p_page_load_time NUMERIC,
    p_lcp NUMERIC,
    p_fid NUMERIC,
    p_cls NUMERIC,
    p_ttfb NUMERIC,
    p_memory_usage_percent NUMERIC,
    p_api_response_time NUMERIC,
    p_cache_hit_rate NUMERIC,
    p_page_url TEXT,
    p_page_name TEXT,
    p_device_type TEXT,
    p_browser TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_threshold RECORD;
    v_severity TEXT;
    v_metric_value NUMERIC;
    v_alert_type TEXT;
BEGIN
    -- Check each threshold
    FOR v_threshold IN 
        SELECT * FROM performance_thresholds WHERE is_enabled = true
    LOOP
        -- Get metric value based on metric name
        CASE v_threshold.metric_name
            WHEN 'page_load_time' THEN v_metric_value := p_page_load_time;
            WHEN 'lcp' THEN v_metric_value := p_lcp;
            WHEN 'fid' THEN v_metric_value := p_fid;
            WHEN 'cls' THEN v_metric_value := p_cls;
            WHEN 'ttfb' THEN v_metric_value := p_ttfb;
            WHEN 'memory_usage_percent' THEN v_metric_value := p_memory_usage_percent;
            WHEN 'api_response_time' THEN v_metric_value := p_api_response_time;
            WHEN 'cache_hit_rate' THEN v_metric_value := p_cache_hit_rate;
            ELSE CONTINUE;
        END CASE;
        
        -- Skip if no value
        IF v_metric_value IS NULL THEN
            CONTINUE;
        END IF;
        
        -- Determine severity (cache_hit_rate is inverted - lower is worse)
        IF v_threshold.metric_name = 'cache_hit_rate' THEN
            IF v_metric_value < v_threshold.critical_threshold THEN
                v_severity := 'critical';
            ELSIF v_metric_value < v_threshold.warning_threshold THEN
                v_severity := 'warning';
            ELSE
                CONTINUE; -- No alert needed
            END IF;
        ELSE
            IF v_metric_value >= v_threshold.critical_threshold THEN
                v_severity := 'critical';
            ELSIF v_metric_value >= v_threshold.warning_threshold THEN
                v_severity := 'warning';
            ELSE
                CONTINUE; -- No alert needed
            END IF;
        END IF;
        
        -- Determine alert type
        v_alert_type := 'poor_' || v_threshold.metric_name;
        
        -- Check cooldown - don't create duplicate alerts within cooldown period
        IF EXISTS (
            SELECT 1 FROM performance_alerts
            WHERE alert_type = v_alert_type
            AND session_id = p_session_id
            AND created_at > NOW() - (v_threshold.alert_cooldown_minutes || ' minutes')::INTERVAL
        ) THEN
            CONTINUE;
        END IF;
        
        -- Create alert
        INSERT INTO performance_alerts (
            alert_type, severity, metric_name, metric_value, threshold_value,
            session_id, user_id, page_url, page_name, device_type, browser,
            details
        ) VALUES (
            v_alert_type, v_severity, v_threshold.metric_name, v_metric_value,
            CASE WHEN v_severity = 'critical' THEN v_threshold.critical_threshold ELSE v_threshold.warning_threshold END,
            p_session_id, p_user_id, p_page_url, p_page_name, p_device_type, p_browser,
            jsonb_build_object('metric_id', p_metric_id, 'unit', v_threshold.unit)
        );
    END LOOP;
END;
$$;

-- Function: Get performance summary for admin dashboard
CREATE OR REPLACE FUNCTION get_performance_summary(
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    total_sessions BIGINT,
    avg_page_load_time NUMERIC,
    avg_lcp NUMERIC,
    avg_fid NUMERIC,
    avg_cls NUMERIC,
    avg_ttfb NUMERIC,
    avg_memory_usage NUMERIC,
    avg_api_response_time NUMERIC,
    avg_cache_hit_rate NUMERIC,
    slow_page_count BIGINT,
    critical_alerts_count BIGINT,
    warning_alerts_count BIGINT,
    top_slow_pages JSONB,
    device_breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH metrics AS (
        SELECT * FROM performance_metrics
        WHERE recorded_at > NOW() - (p_hours || ' hours')::INTERVAL
    ),
    alerts AS (
        SELECT * FROM performance_alerts
        WHERE created_at > NOW() - (p_hours || ' hours')::INTERVAL
    )
    SELECT
        COUNT(DISTINCT m.session_id)::BIGINT,
        ROUND(AVG(m.page_load_time)::NUMERIC, 2),
        ROUND(AVG(m.lcp)::NUMERIC, 2),
        ROUND(AVG(m.fid)::NUMERIC, 2),
        ROUND(AVG(m.cls)::NUMERIC, 4),
        ROUND(AVG(m.ttfb)::NUMERIC, 2),
        ROUND(AVG(m.memory_usage_percent)::NUMERIC, 2),
        ROUND(AVG(m.avg_api_response_time)::NUMERIC, 2),
        ROUND(AVG(m.cache_hit_rate)::NUMERIC, 2),
        COUNT(CASE WHEN m.page_load_time > 3000 THEN 1 END)::BIGINT,
        (SELECT COUNT(*) FROM alerts WHERE severity = 'critical')::BIGINT,
        (SELECT COUNT(*) FROM alerts WHERE severity = 'warning')::BIGINT,
        (
            SELECT COALESCE(jsonb_agg(row_to_json(sp)), '[]'::jsonb)
            FROM (
                SELECT page_name, ROUND(AVG(page_load_time)::NUMERIC, 2) as avg_load_time, COUNT(*) as count
                FROM metrics
                WHERE page_name IS NOT NULL
                GROUP BY page_name
                ORDER BY AVG(page_load_time) DESC
                LIMIT 5
            ) sp
        ),
        (
            SELECT COALESCE(jsonb_agg(row_to_json(db)), '[]'::jsonb)
            FROM (
                SELECT device_type, COUNT(*) as count, ROUND(AVG(page_load_time)::NUMERIC, 2) as avg_load_time
                FROM metrics
                WHERE device_type IS NOT NULL
                GROUP BY device_type
            ) db
        )
    FROM metrics m;
END;
$$;

-- Function: Log slow API call
CREATE OR REPLACE FUNCTION log_slow_api_call(
    p_endpoint TEXT,
    p_method TEXT,
    p_duration_ms NUMERIC,
    p_status_code INTEGER DEFAULT NULL,
    p_response_size BIGINT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO api_performance_log (
        endpoint, method, duration_ms, status_code, response_size, session_id, user_id
    ) VALUES (
        p_endpoint, p_method, p_duration_ms, p_status_code, p_response_size, p_session_id, p_user_id
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- Function: Get slow API endpoints
CREATE OR REPLACE FUNCTION get_slow_api_endpoints(
    p_hours INTEGER DEFAULT 24,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    endpoint TEXT,
    method TEXT,
    avg_duration_ms NUMERIC,
    max_duration_ms NUMERIC,
    call_count BIGINT,
    error_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.endpoint,
        l.method,
        ROUND(AVG(l.duration_ms)::NUMERIC, 2),
        MAX(l.duration_ms),
        COUNT(*)::BIGINT,
        COUNT(CASE WHEN l.status_code >= 400 THEN 1 END)::BIGINT
    FROM api_performance_log l
    WHERE l.requested_at > NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY l.endpoint, l.method
    ORDER BY AVG(l.duration_ms) DESC
    LIMIT p_limit;
END;
$$;

-- =============================================
-- 6. RLS POLICIES
-- =============================================

ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_performance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_thresholds ENABLE ROW LEVEL SECURITY;

-- Performance metrics: Users can insert their own, admins can read all
CREATE POLICY "Users can insert own metrics" ON performance_metrics
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read all metrics" ON performance_metrics
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Performance alerts: Admins only
CREATE POLICY "Admins can manage alerts" ON performance_alerts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- API performance log: Users can insert, admins can read
CREATE POLICY "Users can insert api logs" ON api_performance_log
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read api logs" ON api_performance_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Performance thresholds: Admins only
CREATE POLICY "Admins can manage thresholds" ON performance_thresholds
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- 7. CLEANUP JOB (Optional - run via cron)
-- =============================================

-- Function to cleanup old performance data
CREATE OR REPLACE FUNCTION cleanup_old_performance_data(
    p_days_to_keep INTEGER DEFAULT 30
)
RETURNS TABLE (
    metrics_deleted BIGINT,
    api_logs_deleted BIGINT,
    alerts_resolved BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_metrics_deleted BIGINT;
    v_api_logs_deleted BIGINT;
    v_alerts_resolved BIGINT;
BEGIN
    -- Delete old metrics
    WITH deleted AS (
        DELETE FROM performance_metrics
        WHERE recorded_at < NOW() - (p_days_to_keep || ' days')::INTERVAL
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_metrics_deleted FROM deleted;
    
    -- Delete old API logs
    WITH deleted AS (
        DELETE FROM api_performance_log
        WHERE requested_at < NOW() - (p_days_to_keep || ' days')::INTERVAL
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_api_logs_deleted FROM deleted;
    
    -- Auto-resolve old alerts
    WITH updated AS (
        UPDATE performance_alerts
        SET status = 'resolved', resolved_at = NOW()
        WHERE status IN ('new', 'acknowledged')
        AND created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_alerts_resolved FROM updated;
    
    RETURN QUERY SELECT v_metrics_deleted, v_api_logs_deleted, v_alerts_resolved;
END;
$$;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE performance_metrics IS 'เก็บ performance metrics จาก client-side monitoring (F172-F201)';
COMMENT ON TABLE performance_alerts IS 'แจ้งเตือนเมื่อ performance ต่ำกว่าเกณฑ์';
COMMENT ON TABLE api_performance_log IS 'Log ของ API calls ที่ช้า';
COMMENT ON TABLE performance_thresholds IS 'กำหนดเกณฑ์สำหรับ performance alerts';
