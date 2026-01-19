-- Migration: 115_production_alerting.sql
-- Production Alerting System
-- Features: Alert rules, thresholds, notification channels

-- =====================================================
-- Alert Rules Table
-- =====================================================
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  metric_type TEXT NOT NULL, -- error_rate, response_time, service_down, etc.
  condition TEXT NOT NULL, -- gt, lt, eq, gte, lte
  threshold NUMERIC NOT NULL,
  severity TEXT DEFAULT 'warning', -- info, warning, critical
  is_enabled BOOLEAN DEFAULT true,
  cooldown_minutes INTEGER DEFAULT 15,
  notification_channels TEXT[] DEFAULT ARRAY['admin_notification'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Alert History Table
-- =====================================================
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES alert_rules(id),
  rule_name TEXT NOT NULL,
  severity TEXT NOT NULL,
  metric_value NUMERIC,
  threshold_value NUMERIC,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'triggered', -- triggered, acknowledged, resolved
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_history_status ON alert_history(status);
CREATE INDEX IF NOT EXISTS idx_alert_history_severity ON alert_history(severity);
CREATE INDEX IF NOT EXISTS idx_alert_history_created ON alert_history(created_at);

-- =====================================================
-- Alert Notification Log
-- =====================================================
CREATE TABLE IF NOT EXISTS alert_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES alert_history(id),
  channel TEXT NOT NULL,
  recipient TEXT,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Function: Trigger Alert
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_alert(
  p_rule_id UUID,
  p_metric_value NUMERIC,
  p_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rule RECORD;
  v_alert_id UUID;
  v_last_alert TIMESTAMPTZ;
BEGIN
  -- Get rule details
  SELECT * INTO v_rule FROM alert_rules WHERE id = p_rule_id AND is_enabled = true;
  
  IF v_rule IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Check cooldown
  SELECT MAX(created_at) INTO v_last_alert
  FROM alert_history
  WHERE rule_id = p_rule_id
    AND created_at > NOW() - (v_rule.cooldown_minutes || ' minutes')::INTERVAL;
  
  IF v_last_alert IS NOT NULL THEN
    RETURN NULL; -- Still in cooldown
  END IF;
  
  -- Create alert
  INSERT INTO alert_history (
    rule_id, rule_name, severity, metric_value, threshold_value, message
  ) VALUES (
    p_rule_id, v_rule.name, v_rule.severity, p_metric_value, v_rule.threshold,
    COALESCE(p_message, v_rule.name || ': ' || p_metric_value || ' ' || v_rule.condition || ' ' || v_rule.threshold)
  )
  RETURNING id INTO v_alert_id;
  
  -- Queue notifications
  INSERT INTO alert_notification_log (alert_id, channel)
  SELECT v_alert_id, unnest(v_rule.notification_channels);
  
  RETURN v_alert_id;
END;
$$;


-- =====================================================
-- Function: Acknowledge Alert
-- =====================================================
CREATE OR REPLACE FUNCTION acknowledge_alert(
  p_alert_id UUID,
  p_admin_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE alert_history
  SET status = 'acknowledged',
      acknowledged_by = p_admin_id,
      acknowledged_at = NOW()
  WHERE id = p_alert_id
    AND status = 'triggered';
  
  RETURN FOUND;
END;
$$;

-- =====================================================
-- Function: Resolve Alert
-- =====================================================
CREATE OR REPLACE FUNCTION resolve_alert(
  p_alert_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE alert_history
  SET status = 'resolved',
      resolved_at = NOW()
  WHERE id = p_alert_id
    AND status IN ('triggered', 'acknowledged');
  
  RETURN FOUND;
END;
$$;

-- =====================================================
-- Function: Get Active Alerts
-- =====================================================
CREATE OR REPLACE FUNCTION get_active_alerts()
RETURNS TABLE (
  id UUID,
  rule_name TEXT,
  severity TEXT,
  metric_value NUMERIC,
  threshold_value NUMERIC,
  message TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ah.id,
    ah.rule_name,
    ah.severity,
    ah.metric_value,
    ah.threshold_value,
    ah.message,
    ah.status,
    ah.created_at
  FROM alert_history ah
  WHERE ah.status IN ('triggered', 'acknowledged')
  ORDER BY 
    CASE ah.severity 
      WHEN 'critical' THEN 1 
      WHEN 'warning' THEN 2 
      ELSE 3 
    END,
    ah.created_at DESC;
END;
$$;

-- =====================================================
-- Function: Check Alert Rules
-- =====================================================
CREATE OR REPLACE FUNCTION check_alert_rules()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rule RECORD;
  v_metric_value NUMERIC;
  v_triggered INTEGER := 0;
BEGIN
  FOR v_rule IN SELECT * FROM alert_rules WHERE is_enabled = true LOOP
    -- Calculate metric based on type
    CASE v_rule.metric_type
      WHEN 'error_rate' THEN
        SELECT COALESCE(
          COUNT(*) FILTER (WHERE status_code >= 400)::NUMERIC / NULLIF(COUNT(*), 0) * 100,
          0
        ) INTO v_metric_value
        FROM api_request_log
        WHERE request_time > NOW() - INTERVAL '5 minutes';
        
      WHEN 'avg_response_time' THEN
        SELECT COALESCE(AVG(response_time_ms), 0) INTO v_metric_value
        FROM api_request_log
        WHERE request_time > NOW() - INTERVAL '5 minutes';
        
      WHEN 'service_down_count' THEN
        SELECT COUNT(*) INTO v_metric_value
        FROM service_dependency_health
        WHERE status = 'down';
        
      ELSE
        CONTINUE;
    END CASE;
    
    -- Check condition
    IF (v_rule.condition = 'gt' AND v_metric_value > v_rule.threshold) OR
       (v_rule.condition = 'gte' AND v_metric_value >= v_rule.threshold) OR
       (v_rule.condition = 'lt' AND v_metric_value < v_rule.threshold) OR
       (v_rule.condition = 'lte' AND v_metric_value <= v_rule.threshold) OR
       (v_rule.condition = 'eq' AND v_metric_value = v_rule.threshold) THEN
      
      PERFORM trigger_alert(v_rule.id, v_metric_value);
      v_triggered := v_triggered + 1;
    END IF;
  END LOOP;
  
  RETURN v_triggered;
END;
$$;

-- =====================================================
-- Default Alert Rules
-- =====================================================
INSERT INTO alert_rules (name, description, metric_type, condition, threshold, severity) VALUES
  ('High Error Rate', 'Error rate exceeds 5%', 'error_rate', 'gt', 5, 'warning'),
  ('Critical Error Rate', 'Error rate exceeds 10%', 'error_rate', 'gt', 10, 'critical'),
  ('Slow Response Time', 'Average response time exceeds 2 seconds', 'avg_response_time', 'gt', 2000, 'warning'),
  ('Service Down', 'One or more services are down', 'service_down_count', 'gt', 0, 'critical')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_notification_log ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admin can manage alert_rules" ON alert_rules
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can view alert_history" ON alert_history
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can update alert_history" ON alert_history
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can view alert_notification_log" ON alert_notification_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
