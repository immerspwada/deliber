-- Migration: 118_production_audit_compliance.sql
-- Audit & Compliance System
-- Features: Comprehensive audit logging, compliance tracking, data retention

-- =====================================================
-- Comprehensive Audit Log
-- =====================================================
CREATE TABLE IF NOT EXISTS comprehensive_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- create, read, update, delete, login, logout, export, etc.
  entity_type TEXT NOT NULL, -- user, ride, payment, provider, etc.
  entity_id UUID,
  actor_id UUID REFERENCES users(id),
  actor_type TEXT DEFAULT 'user', -- user, admin, system, api
  actor_ip INET,
  actor_user_agent TEXT,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  risk_level TEXT DEFAULT 'low', -- low, medium, high, critical
  is_sensitive BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_event ON comprehensive_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON comprehensive_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON comprehensive_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_time ON comprehensive_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_risk ON comprehensive_audit_log(risk_level);

-- =====================================================
-- Compliance Requirements Table
-- =====================================================
CREATE TABLE IF NOT EXISTS compliance_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  regulation TEXT NOT NULL, -- PDPA, GDPR, PCI-DSS, etc.
  category TEXT NOT NULL, -- data_protection, security, privacy, financial
  status TEXT DEFAULT 'pending', -- pending, compliant, non_compliant, in_progress
  last_audit_date DATE,
  next_audit_date DATE,
  evidence_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Data Retention Policies
-- =====================================================
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  retention_days INTEGER NOT NULL,
  archive_before_delete BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  last_cleanup_at TIMESTAMPTZ,
  records_deleted INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(table_name)
);

-- =====================================================
-- Function: Log Audit Event
-- =====================================================
CREATE OR REPLACE FUNCTION log_audit_event(
  p_event_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_actor_type TEXT DEFAULT 'user',
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_risk_level TEXT DEFAULT 'low',
  p_is_sensitive BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO comprehensive_audit_log (
    event_type, entity_type, entity_id, actor_id, actor_type,
    old_values, new_values, metadata, risk_level, is_sensitive
  ) VALUES (
    p_event_type, p_entity_type, p_entity_id, p_actor_id, p_actor_type,
    p_old_values, p_new_values, p_metadata, p_risk_level, p_is_sensitive
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- =====================================================
-- Function: Get Audit Trail for Entity
-- =====================================================
CREATE OR REPLACE FUNCTION get_audit_trail(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  actor_id UUID,
  actor_type TEXT,
  old_values JSONB,
  new_values JSONB,
  risk_level TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cal.id,
    cal.event_type,
    cal.actor_id,
    cal.actor_type,
    cal.old_values,
    cal.new_values,
    cal.risk_level,
    cal.created_at
  FROM comprehensive_audit_log cal
  WHERE cal.entity_type = p_entity_type
    AND cal.entity_id = p_entity_id
  ORDER BY cal.created_at DESC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- Function: Get High Risk Events
-- =====================================================
CREATE OR REPLACE FUNCTION get_high_risk_events(
  p_hours INTEGER DEFAULT 24,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  actor_id UUID,
  risk_level TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cal.id,
    cal.event_type,
    cal.entity_type,
    cal.entity_id,
    cal.actor_id,
    cal.risk_level,
    cal.metadata,
    cal.created_at
  FROM comprehensive_audit_log cal
  WHERE cal.risk_level IN ('high', 'critical')
    AND cal.created_at > NOW() - (p_hours || ' hours')::INTERVAL
  ORDER BY cal.created_at DESC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- Function: Apply Data Retention
-- =====================================================
CREATE OR REPLACE FUNCTION apply_data_retention()
RETURNS TABLE (
  table_name TEXT,
  records_deleted INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_policy RECORD;
  v_deleted INTEGER;
  v_sql TEXT;
BEGIN
  FOR v_policy IN SELECT * FROM data_retention_policies WHERE is_active = true LOOP
    -- Build dynamic SQL for deletion
    v_sql := format(
      'DELETE FROM %I WHERE created_at < NOW() - INTERVAL ''%s days''',
      v_policy.table_name,
      v_policy.retention_days
    );
    
    BEGIN
      EXECUTE v_sql;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
      
      -- Update policy stats
      UPDATE data_retention_policies
      SET last_cleanup_at = NOW(),
          records_deleted = data_retention_policies.records_deleted + v_deleted,
          updated_at = NOW()
      WHERE id = v_policy.id;
      
      table_name := v_policy.table_name;
      records_deleted := v_deleted;
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue
      RAISE NOTICE 'Error cleaning %: %', v_policy.table_name, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- =====================================================
-- Default Retention Policies
-- =====================================================
INSERT INTO data_retention_policies (table_name, retention_days, archive_before_delete) VALUES
  ('api_request_log', 7, false),
  ('db_query_log', 7, false),
  ('uptime_log', 30, false),
  ('comprehensive_audit_log', 365, true),
  ('alert_history', 90, true),
  ('user_activity_log', 180, true)
ON CONFLICT (table_name) DO NOTHING;

-- =====================================================
-- Default Compliance Requirements (PDPA Thailand)
-- =====================================================
INSERT INTO compliance_requirements (name, description, regulation, category, status) VALUES
  ('Data Collection Consent', 'ต้องได้รับความยินยอมก่อนเก็บข้อมูลส่วนบุคคล', 'PDPA', 'data_protection', 'compliant'),
  ('Data Access Rights', 'ผู้ใช้สามารถขอดูข้อมูลของตนเองได้', 'PDPA', 'privacy', 'compliant'),
  ('Data Deletion Rights', 'ผู้ใช้สามารถขอลบข้อมูลของตนเองได้', 'PDPA', 'privacy', 'compliant'),
  ('Data Breach Notification', 'แจ้งเตือนเมื่อเกิดการรั่วไหลของข้อมูล', 'PDPA', 'security', 'compliant'),
  ('Data Encryption', 'เข้ารหัสข้อมูลที่สำคัญ', 'PDPA', 'security', 'compliant'),
  ('Payment Card Security', 'ปฏิบัติตามมาตรฐาน PCI-DSS', 'PCI-DSS', 'financial', 'in_progress')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE comprehensive_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admin can view comprehensive_audit_log" ON comprehensive_audit_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can manage compliance_requirements" ON compliance_requirements
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can manage data_retention_policies" ON data_retention_policies
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
