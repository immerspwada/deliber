-- =====================================================
-- Migration: 081_admin_audit_log.sql
-- Feature: F23 - Admin Dashboard Security
-- 
-- Creates audit log table for tracking all admin actions
-- Supports RBAC, session management, and compliance
-- =====================================================

-- Admin Audit Log Table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Admin info
  admin_id UUID REFERENCES auth.users(id),
  admin_email TEXT NOT NULL,
  admin_role TEXT NOT NULL DEFAULT 'admin',
  
  -- Action details
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  
  -- Request details
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending', 'rolled_back')),
  error_message TEXT,
  
  -- Rollback support
  rollback_data JSONB,
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for common queries
  CONSTRAINT valid_action CHECK (action <> ''),
  CONSTRAINT valid_resource CHECK (resource <> '')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON admin_audit_log(resource);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_status ON admin_audit_log(status);

-- Admin Sessions Table (for session management)
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Session info
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  end_reason TEXT -- 'logout', 'expired', 'forced', 'security'
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_active ON admin_sessions(is_active) WHERE is_active = true;

-- Admin Roles Table
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_system BOOLEAN DEFAULT false, -- System roles cannot be deleted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO admin_roles (name, display_name, description, permissions, is_system) VALUES
  ('super_admin', 'Super Admin', 'Full system access', ARRAY[
    'users.view', 'users.edit', 'users.delete', 'users.verify',
    'providers.view', 'providers.edit', 'providers.approve', 'providers.suspend',
    'orders.view', 'orders.edit', 'orders.cancel', 'orders.refund',
    'payments.view', 'payments.process', 'payments.refund',
    'support.view', 'support.respond', 'support.escalate', 'support.close',
    'promos.view', 'promos.create', 'promos.edit', 'promos.delete',
    'settings.view', 'settings.edit', 'settings.maintenance',
    'system.audit_log', 'system.feature_flags', 'system.analytics',
    'destructive.delete_user', 'destructive.reset_system', 'destructive.bulk_operations'
  ], true),
  ('admin', 'Admin', 'Standard admin access', ARRAY[
    'users.view', 'users.edit', 'users.verify',
    'providers.view', 'providers.edit', 'providers.approve', 'providers.suspend',
    'orders.view', 'orders.edit', 'orders.cancel', 'orders.refund',
    'payments.view', 'payments.process', 'payments.refund',
    'support.view', 'support.respond', 'support.escalate', 'support.close',
    'promos.view', 'promos.create', 'promos.edit', 'promos.delete',
    'settings.view', 'settings.edit',
    'system.audit_log', 'system.analytics'
  ], true),
  ('moderator', 'Moderator', 'Content moderation access', ARRAY[
    'users.view', 'users.edit',
    'providers.view', 'providers.edit',
    'orders.view', 'orders.edit', 'orders.cancel',
    'support.view', 'support.respond', 'support.close',
    'promos.view'
  ], true),
  ('support', 'Support', 'Customer support access', ARRAY[
    'users.view',
    'providers.view',
    'orders.view',
    'support.view', 'support.respond', 'support.close'
  ], true),
  ('viewer', 'Viewer', 'Read-only access', ARRAY[
    'users.view',
    'providers.view',
    'orders.view',
    'payments.view',
    'support.view',
    'promos.view',
    'settings.view'
  ], true)
ON CONFLICT (name) DO NOTHING;

-- Function to log admin action
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id UUID,
  p_admin_email TEXT,
  p_admin_role TEXT,
  p_action TEXT,
  p_resource TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}',
  p_status TEXT DEFAULT 'success',
  p_rollback_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO admin_audit_log (
    admin_id, admin_email, admin_role,
    action, resource, resource_id,
    details, status, rollback_data
  ) VALUES (
    p_admin_id, p_admin_email, p_admin_role,
    p_action, p_resource, p_resource_id,
    p_details, p_status, p_rollback_data
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin audit logs with filters
CREATE OR REPLACE FUNCTION get_admin_audit_logs(
  p_admin_id UUID DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_resource TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_from_date TIMESTAMPTZ DEFAULT NULL,
  p_to_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  admin_id UUID,
  admin_email TEXT,
  admin_role TEXT,
  action TEXT,
  resource TEXT,
  resource_id TEXT,
  details JSONB,
  status TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.admin_id,
    al.admin_email,
    al.admin_role,
    al.action,
    al.resource,
    al.resource_id,
    al.details,
    al.status,
    al.created_at
  FROM admin_audit_log al
  WHERE 
    (p_admin_id IS NULL OR al.admin_id = p_admin_id)
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_resource IS NULL OR al.resource = p_resource)
    AND (p_status IS NULL OR al.status = p_status)
    AND (p_from_date IS NULL OR al.created_at >= p_from_date)
    AND (p_to_date IS NULL OR al.created_at <= p_to_date)
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON admin_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Only admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
  ON admin_audit_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Admins can view their own sessions
CREATE POLICY "Admins can view own sessions"
  ON admin_sessions FOR SELECT
  USING (admin_id = auth.uid());

-- Super admins can view all sessions
CREATE POLICY "Super admins can view all sessions"
  ON admin_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Anyone can view roles (for UI)
CREATE POLICY "Anyone can view roles"
  ON admin_roles FOR SELECT
  USING (true);

-- Grant permissions
GRANT SELECT ON admin_audit_log TO authenticated;
GRANT INSERT ON admin_audit_log TO authenticated;
GRANT SELECT ON admin_sessions TO authenticated;
GRANT SELECT ON admin_roles TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_audit_logs TO authenticated;

-- Comments
COMMENT ON TABLE admin_audit_log IS 'Audit trail for all admin actions - F23 Admin Dashboard Security';
COMMENT ON TABLE admin_sessions IS 'Admin session management for security';
COMMENT ON TABLE admin_roles IS 'RBAC role definitions with permissions';
